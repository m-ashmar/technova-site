"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { buildStarSamples } from "@/lib/star";
import { novaState } from "@/lib/novaState";

const vert = /* glsl */ `
  attribute vec3 aScatter;
  attribute float aSeed;
  attribute float aKind;

  uniform float uProgress;
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uIdle;
  uniform vec2 uMouse;

  varying float vSeed;
  varying float vKind;
  varying float vHot;

  float easeOutQuint(float t) { return 1.0 - pow(1.0 - t, 5.0); }

  void main() {
    vSeed = aSeed;
    vKind = aKind;

    // Per-particle stagger so the birth ripples instead of moving as one block.
    float stag = aSeed * 0.30;
    float p = clamp((uProgress - stag) / (1.0 - stag), 0.0, 1.0);
    float pa = smoothstep(0.0, 0.62, p); // dust -> collapsing core
    float pb = smoothstep(0.62, 1.0, p); // core -> star shape

    vec3 target = position;
    vec3 drift = aScatter + 0.16 * vec3(
      sin(uTime * 0.24 + aSeed * 17.0),
      cos(uTime * 0.20 + aSeed * 23.0),
      sin(uTime * 0.17 + aSeed * 11.0));
    vec3 core = target * 0.05 + 0.05 * vec3(
      sin(aSeed * 93.0), cos(aSeed * 57.0), sin(aSeed * 31.0));

    vec3 pos = mix(mix(drift, core, pow(pa, 1.7)), target, easeOutQuint(pb));

    // Breathing idle once formed; flare particles sway a little more.
    float formed = pb;
    pos += formed * uIdle * 0.02 * (1.0 + vKind * 1.2) * vec3(
      sin(uTime * 0.9 + aSeed * 40.0),
      cos(uTime * 0.8 + aSeed * 31.0),
      sin(uTime * 0.7 + aSeed * 21.0));

    pos *= uScale;

    // Cursor repulsion (world units at the z=0 plane).
    vec2 dm = pos.xy - uMouse;
    float md = length(dm);
    pos.xy += (dm / max(md, 1e-3)) * smoothstep(0.6, 0.0, md) * 0.24 * formed * uScale;

    // White-hot while collapsed, cools as the star forms.
    vHot = pow(pa, 2.0) * (1.0 - pb);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (0.55 + 0.9 * fract(aSeed * 3.71)) * (1.0 + vHot * 1.6) / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  precision mediump float;

  varying float vSeed;
  varying float vKind;
  varying float vHot;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = smoothstep(0.5, 0.06, d);
    vec3 metal = vec3(0.92, 0.94, 1.0);
    vec3 nova = vec3(0.055, 0.52, 1.0);
    vec3 col = mix(metal, nova, clamp(vKind + 0.38 * fract(vSeed * 5.31), 0.0, 1.0));
    col += vHot;
    float alpha = disc * (0.5 + 0.5 * fract(vSeed * 2.93));
    gl_FragColor = vec4(col, alpha);
  }
`;

function Particles({ count }: { count: number }) {
  const { targets, scatters, seeds, kinds } = useMemo(
    () => buildStarSamples(count),
    [count]
  );

  const uniforms = useMemo(
    () => ({
      uProgress: { value: novaState.progress },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uSize: { value: 10 },
      uIdle: { value: 1 },
      uMouse: { value: new THREE.Vector2(99, 99) },
    }),
    []
  );

  useFrame((state, delta) => {
    uniforms.uTime.value += delta;
    uniforms.uProgress.value = novaState.progress;
    uniforms.uIdle.value = novaState.idle;
    uniforms.uScale.value = Math.min(
      state.viewport.height * 0.36,
      state.viewport.width * 0.55
    );
    uniforms.uSize.value = 7.5 * (state.size.height / 900) * state.viewport.dpr;
    uniforms.uMouse.value.set(
      (state.pointer.x * state.viewport.width) / 2,
      (state.pointer.y * state.viewport.height) / 2
    );
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[targets, 3]} />
        <bufferAttribute attach="attributes-aScatter" args={[scatters, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aKind" args={[kinds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Verification aid, active only with ?rafshim in the URL: exposes the R3F
 * state so automated checks in throttled/hidden tabs can size the canvas and
 * force-render frames manually. Inert in normal use.
 */
function DevBridge() {
  const three = useThree();
  useEffect(() => {
    if (!window.location.search.includes("rafshim")) return;
    (window as unknown as Record<string, unknown>).__novaDev = {
      three,
      novaState,
    };
  }, [three]);
  return null;
}

function Effects() {
  const bloom = useRef<{ intensity: number } | null>(null);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = novaState.bloom;
  });
  return (
    <EffectComposer>
      <Bloom
        ref={bloom as never}
        mipmapBlur
        luminanceThreshold={0.18}
        intensity={1.15}
        radius={0.7}
      />
    </EffectComposer>
  );
}

export default function NovaScene({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 42, position: [0, 0, 3.4] }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        // Allow automatic context restoration (mobile Safari / GPU pressure /
        // hidden-tab eviction): preventDefault on loss lets the browser restore,
        // and three re-uploads GPU resources on the restored event.
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => e.preventDefault(),
          false
        );
      }}
    >
      <Particles count={count} />
      <Effects />
      <DevBridge />
    </Canvas>
  );
}
