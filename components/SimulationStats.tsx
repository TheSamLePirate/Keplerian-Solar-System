import React, { memo } from 'react';
import { SIMULATION_EPOCH } from '../constants';

interface SimulationStatsProps {
    date: number;
    fps: number;
    actualSpeed: number;
    paused: boolean;
    setPaused: (b: boolean) => void;
    onResetTime: () => void;
}

const SimulationStats: React.FC<SimulationStatsProps> = ({
    date,
    fps,
    actualSpeed,
    paused,
    setPaused,
    onResetTime
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
        <div className="absolute bottom-4 left-4 pointer-events-auto bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/10 min-w-[200px] shadow-lg z-20">
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
    );
};

export default memo(SimulationStats);
