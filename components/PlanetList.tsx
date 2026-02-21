import React, { useState } from "react";
import { PlanetData, CameraPoint } from "../types";
import { PLANETS, SUN_DATA } from "../constants";
import { useCameraPoints } from "../hooks/useCameraPoints";

interface PlanetListProps {
  onSelect: (p: PlanetData) => void;
  onFollow: (p: PlanetData) => void;
  selectedId: string | undefined;
  followingId: string | undefined;
  isFollowingActive: boolean;
  onGoTo?: (planetId: string) => void;
  onGoToCameraPoint?: (point: CameraPoint) => void;
}

const PlanetList: React.FC<PlanetListProps> = ({
  onSelect,
  onFollow,
  selectedId,
  followingId,
  isFollowingActive,
  onGoTo,
  onGoToCameraPoint,
}) => {
  const { points, addPoint, removePoint, editPoint, getPointsForPlanet } = useCameraPoints();
  const [addingForPlanet, setAddingForPlanet] = useState<string | null>(null);
  const [editingPoint, setEditingPoint] = useState<string | null>(null);

  const renderItem = (p: PlanetData, depth = 0) => {
    const isSelected = selectedId === p.id;
    const isFollowed = isFollowingActive && followingId === p.id;
    const planetPoints = getPointsForPlanet(p.id);

    return (
      <div key={p.id} className="flex flex-col">
        <div
          className={`group flex items-center justify-between pr-1.5 py-0.5 text-[11px] transition-colors
                    ${isSelected ? "bg-blue-600/20 border-l-2 border-blue-500" : "hover:bg-white/5 border-l-2 border-transparent"}
                    `}
          style={{ paddingLeft: `${depth * 10 + 8}px` }}
        >
          <button
            onClick={() => onSelect(p)}
            className="flex-1 text-left flex items-center gap-1.5 outline-none min-w-0"
          >
            {p.textureUrl ? (
              <img
                src={p.textureUrl}
                alt=""
                className="w-3.5 h-3.5 rounded-full object-cover border border-white/30 flex-shrink-0"
              />
            ) : (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30 flex-shrink-0"
                style={{ backgroundColor: p.color }}
              ></span>
            )}
            <span
              className={`truncate ${isSelected ? "text-white font-bold" : "text-gray-400 group-hover:text-gray-200"}`}
            >
              {p.name}
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onFollow(p);
            }}
            title="Follow Body"
            className={`p-1 rounded-md transition-all flex-shrink-0 ${isFollowed ? "text-green-400 bg-green-400/10" : "text-gray-600 hover:text-white hover:bg-white/10"}`}
          >
            {isFollowed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="22" y1="12" x2="18" y2="12"></line>
                <line x1="6" y1="12" x2="2" y2="12"></line>
                <line x1="12" y1="6" x2="12" y2="2"></line>
                <line x1="12" y1="22" x2="12" y2="18"></line>
              </svg>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddingForPlanet(addingForPlanet === p.id ? null : p.id);
            }}
            title="Add Camera Point"
            className={`p-1 rounded-md transition-all flex-shrink-0 ml-1 ${addingForPlanet === p.id ? "text-yellow-400 bg-yellow-400/10" : "text-gray-600 hover:text-white hover:bg-white/10"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </button>

          {onGoTo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGoTo(p.id);
              }}
              title="Go To Surface"
              className="p-1 rounded-md text-gray-600 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 ml-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </button>
          )}
        </div>

        {/* Camera Points */}
        {planetPoints.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-0.5 mb-1" style={{ paddingLeft: `${(depth + 1) * 10 + 8}px` }}>
            {planetPoints.map(cp => (
              <div key={cp.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] bg-black/30 pr-1.5 py-0.5 rounded border border-white/5">
                  <span className="text-blue-300 truncate flex-1 min-w-0 pl-1">{cp.name}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPoint(editingPoint === cp.id ? null : cp.id);
                      }}
                      className="text-gray-400 hover:text-blue-400 p-0.5 rounded transition-colors"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    {onGoToCameraPoint && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onGoToCameraPoint(cp);
                        }}
                        className="text-gray-400 hover:text-green-400 p-0.5 rounded transition-colors"
                        title="Go"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePoint(cp.id);
                      }}
                      className="text-gray-400 hover:text-red-400 p-0.5 rounded transition-colors"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>

                {/* Edit Camera Point Form */}
                {editingPoint === cp.id && (
                  <div className="p-2 bg-black/50 border border-white/10 rounded mr-2">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        if (p.type === 'satellite') {
                          editPoint(cp.id, {
                            name: (fd.get("name") as string) || "Point",
                            pos: [parseFloat(fd.get("posX") as string) || 0, parseFloat(fd.get("posY") as string) || 0, parseFloat(fd.get("posZ") as string) || 0],
                            rot: [parseFloat(fd.get("rotX") as string) || 0, parseFloat(fd.get("rotY") as string) || 0, parseFloat(fd.get("rotZ") as string) || 0],
                            fov: parseFloat(fd.get("fov") as string) || 45,
                          });
                        } else {
                          editPoint(cp.id, {
                            name: (fd.get("name") as string) || "Point",
                            lat: parseFloat(fd.get("lat") as string) || 0,
                            lon: parseFloat(fd.get("lon") as string) || 0,
                            altitude: parseFloat(fd.get("altitude") as string) || 1000,
                            fov: parseFloat(fd.get("fov") as string) || 45,
                          });
                        }
                        setEditingPoint(null);
                      }}
                      className="flex flex-col gap-1.5 text-[10px]"
                    >
                      <div className="flex items-center gap-2">
                        <label className="text-gray-400 w-8">Name</label>
                        <input name="name" type="text" required defaultValue={cp.name} className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                      </div>

                      {p.type === 'satellite' ? (
                        <>
                          <div className="flex gap-1 items-center">
                            <label className="text-gray-400 w-8 shrink-0">Pos</label>
                            <input name="posX" min="none" max="none" type="number" step="any" required defaultValue={cp.pos?.[0] ?? 0} placeholder="X" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                            <input name="posY" min="none" max="none" type="number" step="any" required defaultValue={cp.pos?.[1] ?? 0} placeholder="Y" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                            <input name="posZ" min="none" max="none" type="number" step="any" required defaultValue={cp.pos?.[2] ?? 0} placeholder="Z" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                          </div>
                          <div className="flex gap-1 items-center">
                            <label className="text-gray-400 w-8 shrink-0">Rot</label>
                            <input name="rotX" min="none" max="none" type="number" step="any" required defaultValue={cp.rot?.[0] ?? 0} placeholder="X" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                            <input name="rotY" min="none" max="none" type="number" step="any" required defaultValue={cp.rot?.[1] ?? 0} placeholder="Y" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                            <input name="rotZ" min="none" max="none" type="number" step="any" required defaultValue={cp.rot?.[2] ?? 0} placeholder="Z" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <label className="text-gray-400 w-8">Lat</label>
                            <input name="lat" type="number" step="any" required defaultValue={cp.lat} className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-gray-400 w-8">Lon</label>
                            <input name="lon" type="number" step="any" required defaultValue={cp.lon} className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-gray-400 w-8">Alt</label>
                            <input name="altitude" type="number" step="any" required defaultValue={cp.altitude} className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-2">
                        <label className="text-gray-400 w-8">FOV</label>
                        <input name="fov" type="number" step="any" required defaultValue={cp.fov} className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                      </div>
                      <div className="flex justify-end gap-1 mt-1">
                        <button type="button" onClick={() => setEditingPoint(null)} className="px-2 py-0.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors">Cancel</button>
                        <button type="submit" className="px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors">Save</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Camera Point Form */}
        {addingForPlanet === p.id && (
          <div className="mx-2 mb-2 p-2 bg-black/50 border border-white/10 rounded" style={{ marginLeft: `${(depth + 1) * 10 + 8}px`, marginRight: '8px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                if (p.type === 'satellite') {
                  addPoint({
                    planetId: p.id,
                    name: (fd.get("name") as string) || "Point",
                    lat: 0, lon: 0, altitude: 0, // unused for satellites
                    pos: [parseFloat(fd.get("posX") as string) || 0, parseFloat(fd.get("posY") as string) || 0, parseFloat(fd.get("posZ") as string) || 0],
                    rot: [parseFloat(fd.get("rotX") as string) || 0, parseFloat(fd.get("rotY") as string) || 0, parseFloat(fd.get("rotZ") as string) || 0],
                    fov: parseFloat(fd.get("fov") as string) || 45,
                  });
                } else {
                  addPoint({
                    planetId: p.id,
                    name: (fd.get("name") as string) || "Point",
                    lat: parseFloat(fd.get("lat") as string) || 0,
                    lon: parseFloat(fd.get("lon") as string) || 0,
                    altitude: parseFloat(fd.get("altitude") as string) || 1000,
                    fov: parseFloat(fd.get("fov") as string) || 45,
                  });
                }
                setAddingForPlanet(null);
              }}
              className="flex flex-col gap-1.5 text-[10px]"
            >
              <div className="flex items-center gap-2">
                <label className="text-gray-400 w-8">Name</label>
                <input name="name" type="text" required placeholder="My Point" className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
              </div>

              {p.type === 'satellite' ? (
                <>
                  <div className="flex gap-1 items-center">
                    <label className="text-gray-400 w-8 shrink-0">Pos</label>
                    <input name="posX" min="none" max="none" type="number" step="any" required defaultValue="0" placeholder="X" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                    <input name="posY" min="none" max="none" type="number" step="any" required defaultValue="0" placeholder="Y" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                    <input name="posZ" min="none" max="none" type="number" step="any" required defaultValue="0" placeholder="Z" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                  </div>
                  <div className="flex gap-1 items-center">
                    <label className="text-gray-400 w-8 shrink-0">Rot</label>
                    <input name="rotX" min="none" max="none" type="number" step="any" required defaultValue="0" placeholder="X" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                    <input name="rotY" min="none" max="none" type="number" step="any" required defaultValue="0" placeholder="Y" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                    <input name="rotZ" min="none" max="none" type="number" step="any" required defaultValue="0" placeholder="Z" className="w-0 flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-400 w-8">Lat</label>
                    <input name="lat" type="number" step="any" required defaultValue="0" className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-400 w-8">Lon</label>
                    <input name="lon" type="number" step="any" required defaultValue="0" className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-400 w-8">Alt</label>
                    <input name="altitude" type="number" step="any" required defaultValue="1000" className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <label className="text-gray-400 w-8">FOV</label>
                <input name="fov" type="number" step="any" required defaultValue="45" className="flex-1 bg-black border border-white/20 rounded px-1 py-0.5 text-white" />
              </div>
              <div className="flex justify-end gap-1 mt-1">
                <button type="button" onClick={() => setAddingForPlanet(null)} className="px-2 py-0.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors">Cancel</button>
                <button type="submit" className="px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors">Save</button>
              </div>
            </form>
          </div>
        )}

        {p.moons && p.moons.map((m) => renderItem(m, depth + 1))}
      </div>
    );
  };

  return (
    <div className="py-1">
      {renderItem(SUN_DATA)}
      {PLANETS.map((p) => renderItem(p))}
    </div>
  );
};

export default React.memo(PlanetList);
