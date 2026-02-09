import React, { useState, useEffect } from "react";
import { PlanetData } from "../types";
import { planetLodStore, PlanetLodInfo } from "./planet";

interface InfoPanelProps {
  planet: PlanetData | null;
  onClose: () => void;
  onFollow: () => void;
  isFollowingThisPlanet: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  planet,
  onClose,
  onFollow,
  isFollowingThisPlanet,
}) => {
  const [lodInfo, setLodInfo] = useState<PlanetLodInfo | null>(null);

  // Poll the LOD store at ~10 Hz to update the display without impacting perf
  const planetId = planet?.id;
  useEffect(() => {
    if (!planetId) {
      setLodInfo(null);
      return;
    }
    // Read immediately on selection, then poll
    const read = () => {
      const info = planetLodStore.get(planetId);
      setLodInfo(info ?? null);
    };
    read();
    const interval = setInterval(read, 100);
    return () => clearInterval(interval);
  }, [planetId]);

  if (!planet) return null;

  const { elements } = planet;

  return (
    <div className="w-full flex flex-col text-white overflow-hidden relative">
      <button
        onClick={onClose}
        className="absolute top-1 right-1 text-white/40 hover:text-white transition-colors z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div className="mb-2">
        {planet.textureUrl && (
          <div className="w-full h-16 mb-2 rounded overflow-hidden border border-white/10 relative group">
            <img
              src={planet.textureUrl}
              alt={`${planet.name} Texture`}
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
          </div>
        )}
        <h2
          className="text-xl font-thin tracking-wider mb-1"
          style={{ color: planet.color }}
        >
          {planet.name}
        </h2>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 uppercase tracking-widest text-gray-400">
            {planet.type}
          </span>
          {planet.moons && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 uppercase tracking-widest text-gray-400">
              {planet.moons.length} Moon{planet.moons.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-300 leading-relaxed border-l-2 border-white/20 pl-2">
          {planet.description}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="mb-3">
          <h3 className="text-[9px] font-bold uppercase text-gray-500 mb-1.5 border-b border-white/10 pb-0.5">
            Physical
          </h3>
          <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px]">
            <div className="text-gray-400">Radius</div>
            <div className="font-mono text-right">
              {planet.radius.toFixed(3)} x Earth
            </div>
            <div className="text-gray-400">Atmosphere</div>
            <div className="font-mono text-right text-[10px]">
              {planet.atmosphereColor ? (
                <span style={{ color: planet.atmosphereColor }}>Detected</span>
              ) : (
                <span className="text-gray-600">None</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 border-b border-white/10 pb-1">
            Atmosphere LOD
          </h3>
          {lodInfo ? (
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
              <div className="text-gray-400">Screen Size</div>
              <div className="font-mono text-right">
                {(lodInfo.apparentSize * 100).toFixed(1)}%
              </div>

              <div className="text-gray-400">Samples</div>
              <div className="font-mono text-right">
                <span
                  className={
                    lodInfo.samples <= 8
                      ? "text-red-400"
                      : lodInfo.samples <= 16
                        ? "text-yellow-400"
                        : lodInfo.samples <= 32
                          ? "text-blue-400"
                          : "text-green-400"
                  }
                >
                  {lodInfo.samples}
                </span>
                <span className="text-gray-600"> / 64</span>
              </div>

              <div className="text-gray-400">LOD Level</div>
              <div className="font-mono text-right">
                {lodInfo.samples <= 8 ? (
                  <span className="text-red-400">Low</span>
                ) : lodInfo.samples <= 16 ? (
                  <span className="text-yellow-400">Medium</span>
                ) : lodInfo.samples <= 32 ? (
                  <span className="text-blue-400">High</span>
                ) : (
                  <span className="text-green-400">Ultra</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 italic">
              No atmosphere shader active
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 border-b border-white/10 pb-1">
            Orbital Data
          </h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
            <div className="text-gray-400">Semi-Major Axis</div>
            <div className="font-mono text-right">
              {elements.semiMajorAxis.toFixed(4)} AU
            </div>
            <div className="text-gray-400">Period</div>
            <div className="font-mono text-right">
              {planet.period.toFixed(4)} Yrs
            </div>
            <div className="text-gray-400">Eccentricity</div>
            <div className="font-mono text-right">
              {elements.eccentricity.toFixed(4)}
            </div>
            <div className="text-gray-400">Inclination</div>
            <div className="font-mono text-right">
              {elements.inclination.toFixed(2)}&deg;
            </div>
            <div className="text-gray-400">Asc. Node</div>
            <div className="font-mono text-right">
              {elements.ascendingNode.toFixed(1)}&deg;
            </div>
            <div className="text-gray-400">Perihelion</div>
            <div className="font-mono text-right">
              {elements.perihelion.toFixed(1)}&deg;
            </div>
          </div>
        </div>

        {planet.moons && planet.moons.length > 0 && (
          <div className="mb-3">
            <h3 className="text-[9px] font-bold uppercase text-gray-500 mb-1.5 border-b border-white/10 pb-0.5">
              Satellites
            </h3>
            <div className="flex flex-wrap gap-1">
              {planet.moons.map((m) => (
                <span
                  key={m.id}
                  className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-300 border border-white/5"
                >
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 mt-auto border-t border-white/10">
        <button
          onClick={onFollow}
          className={`w-full py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all
                        ${
                          isFollowingThisPlanet
                            ? "bg-green-900/50 text-green-400 border border-green-500/50 cursor-default"
                            : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50"
                        }`}
          disabled={isFollowingThisPlanet}
        >
          {isFollowingThisPlanet ? "Tracking Active" : "Track Orbit"}
        </button>
      </div>
    </div>
  );
};

export default InfoPanel;
