"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildStarSamples } from "@/lib/star";
import { buildGraphSamples, buildWordSamples } from "@/lib/shapes";
import { novaState } from "@/lib/novaState";
import {
  webglSupported,
  SCENE_FAILED_EVENT,
  SCENE_READY_EVENT,
} from "@/lib/webgl";
import { useApp } from "@/components/providers/AppProvider";

/** Cursor position in client px, fed by a window listener (the canvas itself
 *  is pointer-events-none so the page under it stays fully interactive). */
const cursor = { x: -1e4, y: -1e4 };

const vert = /* glsl */ `
  attribute vec3 aScatter;
  attribute vec3 aGraphA;
  attribute vec3 aGraphB;
  attribute float aGraphT;
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
  uniform float uFlowDir;
  uniform vec2 uMouse;

  varying float vSeed;
  varying float vKind;
  varying float vHot;
  varying float vEnergy;
  varying float vFade;

  float easeOutQuint(float t) { return 1.0 - pow(1.0 - t, 5.0); }

  float hash1(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  /**
   * Stage 2 — THE FLOW. Not a shape: a current. Particles are dealt into
   * lanes and travel along them as loose packets, wrapping around forever,
   * so the stage reads as data in motion rather than an object.
   */
  vec3 flowPos(float seed, float time) {
    float lanes = 7.0;
    float lane = floor(seed * lanes);
    float inLane = fract(seed * lanes);
    float laneY = (lane / (lanes - 1.0) - 0.5) * 1.22;

    float packets = 10.0;
    float packet = floor(inLane * packets);
    float inPacket = fract(inLane * packets);

    float speed = 0.13 + 0.06 * fract(seed * 17.0);
    float t = fract(packet / packets + inPacket * 0.030 + time * speed);

    float x = (t - 0.5) * 3.0 * uFlowDir;
    float y = laneY + 0.10 * sin(x * 2.0 + lane * 1.9) + (inPacket - 0.5) * 0.045;
    float z = 0.09 * sin(x * 1.4 + lane * 0.8);
    return vec3(x, y, z);
  }

  /** Nodes are never still — each orbits its own base on its own phase. */
  vec3 nodeDrift(vec3 base, float time) {
    float ph = hash1(base) * 6.2831;
    return base + 0.05 * vec3(
      sin(time * 0.55 + ph),
      cos(time * 0.47 + ph * 1.3),
      sin(time * 0.39 + ph * 0.7));
  }

  void main() {
    vSeed = aSeed;
    vKind = aKind;

    // ---- scroll morph chain: star -> flow -> living graph -> wordmark ----
    float ms = aSeed * 0.18; // per-particle morph stagger
    float m1 = smoothstep(0.0, 1.0, clamp((uMorph - ms) / (1.0 - ms), 0.0, 1.0));
    float m2 = smoothstep(0.0, 1.0, clamp((uMorph - 1.0 - ms) / (1.0 - ms), 0.0, 1.0));
    float m3 = smoothstep(0.0, 1.0, clamp((uMorph - 2.0 - ms) / (1.0 - ms), 0.0, 1.0));

    // ---- stage 3 — THE LIVING GRAPH ----
    // Links breathe in and out; when one dies its particles retract into the
    // node instead of hanging in space, so the network visibly rewires. A
    // pulse of energy runs the length of every live link.
    float isEdge = step(0.001, distance(aGraphA, aGraphB));
    vec3 na = nodeDrift(aGraphA, uTime);
    vec3 nb = nodeDrift(aGraphB, uTime);
    float ePh = hash1(aGraphA + aGraphB * 1.7) * 6.2831;
    float alive = smoothstep(0.25, 0.75, sin(uTime * 0.33 + ePh) * 0.5 + 0.5);
    float tEdge = aGraphT * mix(1.0, alive, isEdge);
    vec3 graphP = mix(na, nb, tEdge);
    // cluster spread lives here, not in the buffer, so a node moves as one
    vec3 jit = vec3(fract(aSeed * 91.7), fract(aSeed * 37.3), fract(aSeed * 13.1)) - 0.5;
    graphP += jit * mix(0.048, 0.018, isEdge);

    float head = fract(uTime * 0.45 + ePh * 0.159);
    float dHead = abs(aGraphT - head);
    dHead = min(dHead, 1.0 - dHead);
    float pulse = exp(-dHead * dHead * 140.0) * isEdge * alive;

    vec3 flowP = flowPos(aSeed, uTime);

    vec3 tgt = mix(position, flowP, m1);
    tgt = mix(tgt, graphP, m2);
    tgt = mix(tgt, aWord, m3);

    // graph effects only apply while the graph is the thing on screen
    float gw = m2 * (1.0 - m3);
    vEnergy = pulse * gw;
    vFade = mix(1.0, mix(0.18, 1.0, alive), isEdge * gw);

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
      * (1.0 + vHot * 1.6 + vEnergy * 1.3) * (0.6 + 0.4 * uZoom) / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  precision mediump float;

  varying float vSeed;
  varying float vKind;
  varying float vHot;
  varying float vEnergy;
  varying float vFade;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disc = smoothstep(0.5, 0.06, d);
    vec3 metal = vec3(0.92, 0.94, 1.0);
    vec3 nova = vec3(0.055, 0.52, 1.0);
    vec3 col = mix(metal, nova, clamp(vKind + 0.38 * fract(vSeed * 5.31), 0.0, 1.0));
    col += vHot;
    // energy running the links: blue-white, hot enough for bloom to catch it
    col += vEnergy * vec3(0.45, 0.72, 1.0) * 1.7;
    float alpha = disc * (0.5 + 0.5 * fract(vSeed * 2.93)) * vFade;
    gl_FragColor = vec4(col, alpha);
  }
`;

type NovaUniforms = {
  uProgress: { value: number };
  uMorph: { value: number };
  uTime: { value: number };
  uScale: { value: number };
  uZoom: { value: number };
  uOffset: { value: THREE.Vector2 };
  uSize: { value: number };
  uIdle: { value: number };
  uFlowDir: { value: number };
  uMouse: { value: THREE.Vector2 };
};

function cssFont(varName: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return v || "sans-serif";
}

function Particles({ count }: { count: number }) {
  const { locale } = useApp();
  const { targets, scatters, seeds, kinds, graph } = useMemo(() => {
    const star = buildStarSamples(count);
    return {
      targets: star.targets,
      scatters: star.scatters,
      seeds: star.seeds,
      kinds: star.kinds,
      graph: buildGraphSamples(count),
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

  // One stable uniforms object, handed to the GPU and mutated in place by the
  // frame loop. That mutation is react-three-fiber's core idiom — the render
  // loop lives outside React and must never trigger a re-render — so the
  // compiler's immutability rule is deliberately waived here.
  const uniforms = useMemo<NovaUniforms>(
    () => ({
      uProgress: { value: novaState.progress },
      uMorph: { value: novaState.morph },
      uTime: { value: 0 },
      uScale: { value: 1 },
      uZoom: { value: 1 },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uSize: { value: 10 },
      uIdle: { value: 1 },
      uFlowDir: { value: 1 },
      uMouse: { value: new THREE.Vector2(99, 99) },
    }),
    []
  );

  /* eslint-disable react-hooks/immutability --
     Writing GPU uniforms in place is react-three-fiber's core idiom: the
     render loop runs outside React and must never trigger a re-render. */
  /**
   * Write through the MATERIAL's own uniforms, never the object we passed in.
   * react-three-fiber does not keep our object by reference — the material
   * ends up holding a copy — so mutating the local one updated nothing and
   * the shader rendered forever from the snapshot taken at mount (the star
   * frozen in whatever pose novaState happened to be in when the canvas
   * appeared: dust during the intro, a rigid star afterwards).
   */
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    const u = mat.uniforms as unknown as NovaUniforms;
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
    // the current runs with the reading direction
    u.uFlowDir.value = locale === "ar" ? -1 : 1;
    // client px -> world units on the z=0 plane
    const nx = (cursor.x / state.size.width) * 2 - 1;
    const ny = (cursor.y / state.size.height) * 2 - 1;
    u.uMouse.value.set(
      (nx * state.viewport.width) / 2,
      (-ny * state.viewport.height) / 2
    );
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[targets, 3]} />
        <bufferAttribute attach="attributes-aScatter" args={[scatters, 3]} />
        <bufferAttribute attach="attributes-aGraphA" args={[graph.a, 3]} />
        <bufferAttribute attach="attributes-aGraphB" args={[graph.b, 3]} />
        <bufferAttribute attach="attributes-aGraphT" args={[graph.t, 1]} />
        <bufferAttribute
          key={`word-${word.v}`}
          attach="attributes-aWord"
          args={[word.arr, 3]}
        />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aKind" args={[kinds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
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
    if (!webglSupported()) {
      window.dispatchEvent(new Event(SCENE_FAILED_EVENT));
      return;
    }
    const small = window.innerWidth < 768;
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- device budget is client-only
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
          // The hero waits for this before igniting, so a slow chunk on a slow
          // connection delays the birth rather than the visitor missing it.
          window.dispatchEvent(new Event(SCENE_READY_EVENT));
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
