"use client";

import dynamic from "next/dynamic";
import SceneBoundary from "./SceneBoundary";

/**
 * three.js is the heaviest thing we ship, and nothing above the fold needs it
 * to paint: the boot console is plain DOM. So the scene is split into its own
 * chunk and fetched while the agent log types itself — the star arrives for
 * its own ignition, and the first paint never waits on a megabyte of WebGL.
 *
 * The split has to happen inside a Client Component for Next to code-split it.
 */
const NovaScene = dynamic(() => import("./NovaScene"), { ssr: false });

export default function NovaStage() {
  return (
    <SceneBoundary>
      <NovaScene />
    </SceneBoundary>
  );
}
