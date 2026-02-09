import React from "react";
import { PlanetData } from "../types";
import { PLANETS, SUN_DATA } from "../constants";

interface PlanetListProps {
  onSelect: (p: PlanetData) => void;
  onFollow: (p: PlanetData) => void;
  selectedId: string | undefined;
  followingId: string | undefined;
  isFollowingActive: boolean;
}

const PlanetList: React.FC<PlanetListProps> = ({
  onSelect,
  onFollow,
  selectedId,
  followingId,
  isFollowingActive,
}) => {
  const renderItem = (p: PlanetData, depth = 0) => {
    const isSelected = selectedId === p.id;
    const isFollowed = isFollowingActive && followingId === p.id;

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
        </div>
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
