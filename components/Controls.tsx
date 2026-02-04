import React from 'react';

interface ControlsProps {
    speedLog: number;
    setSpeedLog: (s: number) => void;
    actualSpeed: number;
    scaleFactor: number;
    setScaleFactor: (s: number) => void;
    showOrbits: boolean;
    setShowOrbits: (b: boolean) => void;
    showLabels: boolean;
    setShowLabels: (b: boolean) => void;
    paused: boolean;
    setPaused: (b: boolean) => void;
    isFollowing: boolean;
    setIsFollowing: (b: boolean) => void;
    date: number;
    fps: number;
    // New Atmosphere Controls
    atmOpacity: number;
    setAtmOpacity: (v: number) => void;
    atmPow: number;
    setAtmPow: (v: number) => void;
    // New Controls
    onResetTime: () => void;
    onResetCamera: () => void;
    ambientLight: number;
    setAmbientLight: (v: number) => void;
}

import { SIMULATION_EPOCH } from '../constants';

const Controls: React.FC<ControlsProps> = ({
    speedLog, setSpeedLog, actualSpeed,
    scaleFactor, setScaleFactor,
    showOrbits, setShowOrbits,
    showLabels, setShowLabels,
    paused, setPaused,
    isFollowing, setIsFollowing,
    date,
    fps,
    atmOpacity, setAtmOpacity,
    atmPow, setAtmPow,
    onResetTime,
    onResetCamera,
    ambientLight, setAmbientLight
}) => {
    // Start date is now dynamic based on Python export
    const baseDate = SIMULATION_EPOCH;
    const currentDate = new Date(baseDate + date * 86400 * 1000);

    let speedDisplay = "";
    if (actualSpeed < 1 / 24) {
        speedDisplay = `${(actualSpeed * 86400).toFixed(1)} sec/s`;
    } else if (actualSpeed < 1) {
        speedDisplay = `${(actualSpeed * 24).toFixed(1)} hrs/s`;
    } else if (actualSpeed < 365) {
        speedDisplay = `${actualSpeed.toFixed(1)} days/s`;
    } else {
        speedDisplay = `${(actualSpeed / 365.25).toFixed(1)} yrs/s`;
    }

    return (
        <div className="absolute bottom-0 left-0 w-full p-4 pointer-events-none flex flex-col md:flex-row justify-between items-end gap-4 z-10">

            {/* Date Display */}
            <div className="pointer-events-auto bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/10 min-w-[200px] shadow-lg">
                <div className="flex justify-between items-start mb-1">
                    <div className="text-xs text-gray-400 uppercase tracking-widest">Simulation Date</div>
                    <button onClick={onResetTime} className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-gray-300 transition-colors" title="Reset to J2000">
                        RESET
                    </button>
                </div>
                <div className="text-lg font-mono text-white mb-2 whitespace-nowrap">
                    {currentDate.toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })}
                </div>
                <div className="text-xs text-blue-400 font-bold mb-2 flex justify-between items-center">
                    <span>Rate: {speedDisplay}</span>
                    <span className={`text-[10px] font-mono ${fps < 30 ? 'text-red-500' : 'text-green-500'}`}>{fps} FPS</span>
                </div>
                {/* Play/Pause */}
                <button
                    onClick={() => setPaused(!paused)}
                    className={`w-full py-2 rounded flex items-center justify-center transition-colors font-bold text-xs tracking-wider uppercase ${paused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500/30'}`}
                >
                    {paused ? "Resume Simulation" : "Pause Simulation"}
                </button>
            </div>

            {/* Main Controls */}
            <div className="pointer-events-auto bg-black/80 backdrop-blur-md rounded-lg p-4 border border-white/10 flex flex-col gap-4 min-w-[340px] shadow-lg max-h-[60vh] overflow-y-auto custom-scrollbar">

                {/* Camera Control Row */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={`flex-1 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all border ${isFollowing
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                            : 'bg-transparent border-white/20 text-gray-400 hover:text-white hover:border-white/50'
                            }`}
                    >
                        {isFollowing ? "Locked On" : "Free Cam"}
                    </button>
                    <button
                        onClick={onResetCamera}
                        className="px-3 py-2 rounded text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                        title="Reset Camera View"
                    >
                        Reset View
                    </button>
                </div>

                {/* Speed Slider */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                        <span>Time Speed</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="100" step="1"
                        value={speedLog}
                        onChange={(e) => setSpeedLog(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Visibility Toggles */}
                <div className="grid grid-cols-2 gap-3 p-2 bg-white/5 rounded border border-white/5">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${showOrbits ? 'bg-blue-500 border-blue-500' : 'border-gray-500 group-hover:border-white'}`}>
                            {showOrbits && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-xs text-gray-300 group-hover:text-white">Show Orbits</span>
                        <input type="checkbox" checked={showOrbits} onChange={(e) => setShowOrbits(e.target.checked)} className="hidden" />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${showLabels ? 'bg-blue-500 border-blue-500' : 'border-gray-500 group-hover:border-white'}`}>
                            {showLabels && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-xs text-gray-300 group-hover:text-white">Show Labels</span>
                        <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} className="hidden" />
                    </label>
                </div>

                {/* Size Controls */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                        <span>Planet Scale</span>
                        <span>{scaleFactor.toFixed(1)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.1" max="5" step="0.1"
                        value={scaleFactor}
                        onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Lighting Controls */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider font-bold">
                        <span>Ambient Light</span>
                        <span>{(ambientLight * 100).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="1" step="0.05"
                        value={ambientLight}
                        onChange={(e) => setAmbientLight(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Atmosphere Controls (Collapsible or Block) */}
                <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Atmosphere Settings</div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Density / Opacity</span>
                                <span>{atmOpacity.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="10" step="0.1"
                                value={atmOpacity}
                                onChange={(e) => setAtmOpacity(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Thickness (Falloff)</span>
                                <span>{atmPow.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.5" max="8" step="0.1"
                                value={atmPow}
                                onChange={(e) => setAtmPow(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Controls;