import React from 'react';
import { PlanetData } from '../types';

interface InfoPanelProps {
    planet: PlanetData | null;
    onClose: () => void;
    onFollow: () => void;
    isFollowingThisPlanet: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ planet, onClose, onFollow, isFollowingThisPlanet }) => {
    if (!planet) return null;

    const { elements } = planet;
    // Removed absolute top-0 right-0 h-full w-80
    // Added w-full flex-1 min-h-0 to fit in flex column
    return (
        <div className="w-full flex flex-col bg-black/80 backdrop-blur-md border border-white/10 text-white p-6 rounded-lg shadow-2xl overflow-hidden flex-1 min-h-0 relative pointer-events-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="mt-4 mb-6">
                {planet.textureUrl && (
                    <div className="w-full h-24 mb-4 rounded-lg overflow-hidden border border-white/10 relative group">
                        <img
                            src={planet.textureUrl}
                            alt={`${planet.name} Texture`}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-1 right-2 text-[8px] text-gray-500 uppercase tracking-widest font-mono">Texture Preview</div>
                    </div>
                )}
                <h2 className="text-4xl font-thin tracking-wider mb-2" style={{ color: planet.color }}>{planet.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 uppercase tracking-widest text-gray-400">{planet.type}</span>
                    {planet.moons && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 uppercase tracking-widest text-gray-400">
                            {planet.moons.length} Moon{planet.moons.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-white/20 pl-3">
                    {planet.description}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 border-b border-white/10 pb-1">Physical Characteristics</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                        <div className="text-gray-400">Radius</div>
                        <div className="font-mono text-right">{planet.radius.toFixed(3)} x Earth</div>

                        <div className="text-gray-400">Atmosphere</div>
                        <div className="font-mono text-right text-xs truncate">
                            {planet.atmosphereColor ?
                                <span style={{ color: planet.atmosphereColor }}>Detected</span> :
                                <span className="text-gray-600">None</span>
                            }
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 border-b border-white/10 pb-1">Orbital Data</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                        <div className="text-gray-400">Semi-Major Axis</div>
                        <div className="font-mono text-right">{elements.semiMajorAxis.toFixed(4)} AU</div>

                        <div className="text-gray-400">Orbital Period</div>
                        <div className="font-mono text-right">{planet.period.toFixed(4)} Yrs</div>

                        <div className="text-gray-400">Eccentricity</div>
                        <div className="font-mono text-right">{elements.eccentricity.toFixed(4)}</div>

                        <div className="text-gray-400">Inclination</div>
                        <div className="font-mono text-right">{elements.inclination.toFixed(2)}°</div>

                        <div className="text-gray-400">Ascending Node</div>
                        <div className="font-mono text-right">{elements.ascendingNode.toFixed(1)}°</div>

                        <div className="text-gray-400">Perihelion</div>
                        <div className="font-mono text-right">{elements.perihelion.toFixed(1)}°</div>
                    </div>
                </div>

                {planet.moons && planet.moons.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 border-b border-white/10 pb-1">Satellites</h3>
                        <div className="flex flex-wrap gap-2">
                            {planet.moons.map(m => (
                                <span key={m.id} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/5">
                                    {m.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 mt-auto border-t border-white/10">
                <button
                    onClick={onFollow}
                    className={`w-full py-3 rounded text-sm font-bold uppercase tracking-widest transition-all
                        ${isFollowingThisPlanet
                            ? 'bg-green-900/50 text-green-400 border border-green-500/50 hover:bg-green-900 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/50'
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