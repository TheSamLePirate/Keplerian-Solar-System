import React, { useState } from 'react';
import { PlanetData } from '../types';
import { PLANETS } from '../constants';

interface PlanetListProps {
    onSelect: (p: PlanetData) => void;
    onFollow: (p: PlanetData) => void;
    selectedId: string | undefined;
    followingId: string | undefined;
    isFollowingActive: boolean;
}

const PlanetList: React.FC<PlanetListProps> = ({ onSelect, onFollow, selectedId, followingId, isFollowingActive }) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggle = () => setIsOpen(!isOpen);

    const renderItem = (p: PlanetData, depth = 0) => {
        const isSelected = selectedId === p.id;
        const isFollowed = isFollowingActive && followingId === p.id;

        return (
            <div key={p.id} className="flex flex-col">
                <div
                    className={`group flex items-center justify-between pl-3 pr-2 py-1 text-sm transition-colors
                    ${isSelected ? 'bg-blue-600/20 border-l-2 border-blue-500' : 'hover:bg-white/5 border-l-2 border-transparent'}
                    `}
                    style={{ paddingLeft: `${depth * 12 + 12}px` }}
                >
                    <button
                        onClick={() => onSelect(p)}
                        className="flex-1 text-left flex items-center gap-2 outline-none"
                    >
                        {p.textureUrl ? (
                            <img src={p.textureUrl} alt="" className="w-4 h-4 rounded-full object-cover border border-white/30" />
                        ) : (
                            <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: p.color }}></span>
                        )}
                        <span className={isSelected ? 'text-white font-bold' : 'text-gray-400 group-hover:text-gray-200'}>
                            {p.name}
                        </span>
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFollow(p);
                        }}
                        title="Follow Body"
                        className={`p-1.5 rounded-md transition-all ${isFollowed ? 'text-green-400 bg-green-400/10' : 'text-gray-600 hover:text-white hover:bg-white/10'}`}
                    >
                        {isFollowed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
                        )}
                    </button>
                </div>
                {p.moons && p.moons.map(m => renderItem(m, depth + 1))}
            </div>
        );
    };

    return (
        <div className="absolute top-20 left-4 z-10 flex flex-col items-start pointer-events-none">
            <button
                onClick={toggle}
                className="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white mb-2 shadow-lg"
            >
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Bodies
            </button>

            {isOpen && (
                <div className="pointer-events-auto bg-black/80 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden w-56 max-h-[60vh] overflow-y-auto custom-scrollbar shadow-2xl">
                    <div className="py-2">
                        {PLANETS.map(p => renderItem(p))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanetList;