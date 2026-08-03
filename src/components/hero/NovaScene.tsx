"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildStarSamples } from "@/lib/star";
import {
  buildPhoneSamples,
  buildWebSamples,
  buildWordSamples,
} from "@/lib/shapes";
import { novaState } from "@/lib/novaState";
import { useApp } from "@/components/providers/AppProvider";

/** Cursor position in client px, fed by a window listener (the canvas itself
 *  is pointer-events-none so the page under it stays fully interactive). */
const cursor = { x: -1e4, y: -1e4 };

const vert = /* glsl */ `
  attribute vec3 aScatter;
  attribute vec3 aPhone;
  attribute vec3 aWeb;
  attribute vec3 aWord;
  attribute float aSeed;
  attribute float aKind;

  uniform float uProgress;
  uniform float uMorph;
  uniform float uTime;
  uniform float uScale;
  uniform float uZoom;
  uniform vec2 uOffset;
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

    // ---- scroll morph chain: star -> phone -> web -> wordmark ----
    float ms = aSeed * 0.18; // per-particle morph stagger
    float m1 = smoothstep(0.0, 1.0, clamp((uMorph - ms) / (1.0 - ms), 0.0, 1.0));
    float m2 = smoothstep(0.0, 1.0, clamp((uMorph - 1.0 - ms) / (1.0 - ms), 0.0, 1.0));
    float m3 = smoothstep(0.0, 1.0, clamp((uMorph - 2.0 - ms) / (1.0 - ms), 0.0, 1.0));
    vec3 tgt = mix(position, aPhone, m1);
    tgt = mix(tgt, aWeb, m2);
    tgt = mix(tgt, aWord, m3);

    // ---- birth: dust -> collapsing core -> shape ----
    float stag = aSeed * 0.30;
    float p = clamp((uProgress - stag) / (1.0 - stag), 0.0, 1.0);
    float pa = smoothstep(0.0, 0.62, p);
    float pb = smoothstep(0.62, 1.0, p);

    vec3 drift = aScatter + 0.16 * vec3(
      sin(uTime * 0.24 + aSeed * 17.0),
      cos(uTime * 0.20 + aSeed * 23.0),
      sin(uTime * 0.17 + aSeed * 11.0));
    vec3 core = tgt * 0.05 + 0.05 * vec3(
      sin(aSeed * 93.0), cos(aSeed * 57.0), sin(aSeed * 31.0));

    vec3 pos = mix(mix(drift, core, pow(pa, 1.7)), tgt, easeOutQuint(pb));

    // breathing idle once formed
    float formed = pb;
    pos += formed * uIdle * 0.02 * (1.0 + vKind * 1.2) * vec3(
      sin(uTime * 0.9 + aSeed * 40.0),
      cos(uTime * 0.8 + aSeed * 31.0),
      sin(uTime * 0.7 + aSeed * 21.0));

    float eff = uScale * uZoom;
    pos *= eff;
    pos.xy += uOffset;

    // cursor repulsion in world units
    vec2 dm = pos.xy - uMouse;
    float md = length(dm);
    pos.xy += (dm / max(md, 1e-3)) * smoothstep(0.6, 0.0, md) * 0.24 * formed * eff;

    vHot = pow(pa, 2.0) * (1.0 - pb);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (0.55 + 0.9 * fract(aSeed * 3.71))
      * (1.0 + vHot * 1.6) * (0.6 + 0.4 * uZoom) / max(-mv.z, 0.1);
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

function cssFont(varName: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return v || "sans-serif";
}

function Particles({ count }: { count: number }) {
  const { locale } = useApp();
  const { targets, scatters, seeds, kinds, phone, web } = useMemo(() => {
    const star = buildStarSamples(count);
    return {
      targets: star.targets,
      scatters: star.scatters,
      seeds: star.seeds,
      kinds: star.kinds,
      phone: buildPhoneSamples(count),
      web: buildWebSamples(count),
    };
  }, [count]);

  // The wordmark cloud is locale-dependent and needs the real webfonts;
  // build immediately (placeholder if fonts pending), rebuild when ready.
  const [word, setWord] = useState<{ arr: Float32Array; v: number }>(() => ({
    arr: new Float32Array(count * 3),
    v: 0,
  }));
  useEffect(() => {
    let alive = true;
    const make = () => {
      if (!alive) return;
      const text = locale === "ar" ? "تكنوفا" : "TECHNOVA";
      const family =
        locale === "ar" ? cssFont("--font-ar") : cssFont("--font-orbitron");
      const arr = buildWordSamples(count, text, family);
      setWord((w) => ({ arr, v: w.v + 1 }));
    };
    make();
    document.fonts?.ready.then(make);
    return () => {
      alive = false;
    };
  }, [count, locale]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: novaState.progress },
      uMorph: { value: novaState.morph },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uZoom: { value: 1 },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uSize: { value: 10 },
      uIdle: { value: 1 },
      uMouse: { value: new THREE.Vector2(99, 99) },
    }),
    []
  );

  useFrame((state, delta) => {
    const u = uniforms;
    u.uTime.value += delta;
    u.uProgress.value = novaState.progress;
    u.uMorph.value = novaState.morph;
    u.uZoom.value = novaState.zoom;
    u.uIdle.value = novaState.idle;
    u.uScale.value = Math.min(
      state.viewport.height * 0.36,
      state.viewport.width * 0.55
    );
    u.uOffset.value.set(
      novaState.offX * state.viewport.width * 0.5,
      novaState.offY * state.viewport.height * 0.5
    );
    u.uSize.value = 7.5 * (state.size.height / 900) * state.viewport.dpr;
    // client px -> world units on the z=0 plane
    const nx = (cursor.x / state.size.width) * 2 - 1;
    const ny = (cursor.y / state.size.height) * 2 - 1;
    u.uMouse.value.set(
      (nx * state.viewport.width) / 2,
      (-ny * state.viewport.height) / 2
    );
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[targets, 3]} />
        <bufferAttribute attach="attributes-aScatter" args={[scatters, 3]} />
        <bufferAttribute attach="attributes-aPhone" args={[phone, 3]} />
        <bufferAttribute attach="attributes-aWeb" args={[web, 3]} />
        <bufferAttribute
          key={`word-${word.v}`}
          attach="attributes-aWord"
          args={[word.arr, 3]}
        />
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
 * Dev-only verification bridge: exposes the R3F state so automated checks can
 * inspect uniforms/geometry and force frames. Compiled out of production.
 */
function DevBridge() {
  const three = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
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

/**
 * The organism: one fixed, page-wide canvas. It is born in the hero and then
 * travels/morphs with the scroll (driven by ScrollDirector via novaState).
 */
export default function NovaScene() {
  const [count, setCount] = useState(0);
  const [maxDpr, setMaxDpr] = useState(2);

  useEffect(() => {
    const small = window.innerWidth < 768;
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
    setCount(small || weak ? 32000 : 90000);
    // Bloom is fill-rate bound; cap the buffer on phones and weak GPUs.
    setMaxDpr(small || weak ? 1.5 : 2);

    const onMove = (e: PointerEvent) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  if (count <= 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        style={{ position: "absolute", inset: 0 }}
        dpr={[1, maxDpr]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, position: [0, 0, 3.4] }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          // Allow automatic context restoration (mobile Safari / GPU pressure /
          // hidden-tab eviction): preventDefault on loss lets the browser
          // restore, and three re-uploads GPU resources on the restored event.
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
    </div>
  );
}
