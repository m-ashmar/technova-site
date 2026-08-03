"use client";

import { Component, type ReactNode } from "react";
import { SCENE_FAILED_EVENT } from "@/lib/webgl";

/**
 * The starfield is decoration, never a dependency: if the GPU, the driver or
 * the shader compiler lets us down, the scene is dropped and the hero draws
 * the logo statically instead. The site itself keeps working.
 */
export default class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Nova scene disabled:", error);
    window.dispatchEvent(new Event(SCENE_FAILED_EVENT));
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
