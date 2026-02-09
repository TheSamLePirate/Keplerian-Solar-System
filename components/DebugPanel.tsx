import React, { useState, useEffect } from "react";
import {
  planetCullingStore,
  planetLodStore,
  planetPositionStore,
} from "./Planet";
import { cameraPositionStore } from "./Scene";
import { PLANETS } from "../constants";

// Collect all body IDs (planets + their moons) for display
function getAllBodyIds(): { id: string; name: string; depth: number }[] {
  const bodies: { id: string; name: string; depth: number }[] = [];
  for (const planet of PLANETS) {
    bodies.push({ id: planet.id, name: planet.name, depth: 0 });
    if (planet.moons) {
      for (const moon of planet.moons) {
        bodies.push({ id: moon.id, name: moon.name, depth: 1 });
      }
    }
  }
  return bodies;
}

const ALL_BODIES = getAllBodyIds();

interface DebugPanelProps {
  selectedBodyId: string | null;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ selectedBodyId }) => {
  const [, forceUpdate] = useState(0);

  // Poll the culling store at ~4Hz to avoid expensive re-renders
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 250);
    return () => clearInterval(interval);
  }, []);

  let visibleCount = 0;
  let culledCount = 0;

  const rows = ALL_BODIES.map((body) => {
    const isVisible = planetCullingStore.get(body.id);
    const lod = planetLodStore.get(body.id);
    // Bodies not yet in the store (not rendered yet) are treated as unknown
    const status =
      isVisible === undefined ? "unknown" : isVisible ? "visible" : "culled";
    if (status === "visible") visibleCount++;
    if (status === "culled") culledCount++;
    return { ...body, status, lod };
  });

  return (
    <div className="text-white text-[11px]">
      {/* Summary */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
          Frustum Culling
        </span>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-green-400">{visibleCount}</span>
          <span className="text-gray-600">/</span>
          <span className="text-yellow-400">{culledCount}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{ALL_BODIES.length}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-2 text-[9px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Visible
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          Culled
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          N/A
        </div>
      </div>

      {/* Camera Position */}
      <div className="mb-2 pb-1.5 border-b border-white/10">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
          Camera Position
        </span>
        <div className="font-mono text-[10px] text-gray-300 mt-1">
          <span className="text-red-400">X</span>{" "}
          {cameraPositionStore.x.toPrecision(10)}{" "}
          <span className="text-green-400">Y</span>{" "}
          {cameraPositionStore.y.toPrecision(10)}{" "}
          <span className="text-blue-400">Z</span>{" "}
          {cameraPositionStore.z.toPrecision(10)}
        </div>
      </div>

      {/* Selected Body Position */}
      <div className="mb-2 pb-1.5 border-b border-white/10">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
          Selected Body Position
        </span>
        {selectedBodyId && planetPositionStore.has(selectedBodyId) ? (
          <div className="font-mono text-[10px] text-gray-300 mt-1">
            {(() => {
              const pos = planetPositionStore.get(selectedBodyId)!;
              return (
                <>
                  <span className="text-purple-400">
                    {ALL_BODIES.find((b) => b.id === selectedBodyId)?.name ??
                      selectedBodyId}
                  </span>
                  <br />
                  <span className="text-red-400">X</span>{" "}
                  {pos.x.toPrecision(10)}{" "}
                  <span className="text-green-400">Y</span>{" "}
                  {pos.y.toPrecision(10)}{" "}
                  <span className="text-blue-400">Z</span>{" "}
                  {pos.z.toPrecision(10)}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="font-mono text-[10px] text-gray-600 mt-1">
            No body selected
          </div>
        )}
      </div>

      {/* Body list */}
      <div className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-white/5"
            style={{ paddingLeft: row.depth ? "16px" : "4px" }}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                row.status === "visible"
                  ? "bg-green-500"
                  : row.status === "culled"
                    ? "bg-yellow-500"
                    : "bg-gray-600"
              }`}
            />
            <span
              className={`flex-1 min-w-0 truncate ${row.status === "culled" ? "text-gray-600" : "text-gray-300"}`}
            >
              {row.depth > 0 && (
                <span className="text-gray-600 mr-1">&#x2514;</span>
              )}
              {row.name}
            </span>
            {row.lod ? (
              <span className="flex-shrink-0 font-mono text-[9px] text-blue-400/70">
                {row.lod.samples}s {(row.lod.apparentSize * 100).toFixed(1)}%
              </span>
            ) : (
              <span className="flex-shrink-0 font-mono text-[9px] text-gray-700">
                --
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(DebugPanel);
