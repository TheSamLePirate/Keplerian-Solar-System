import React, { memo } from 'react';
import { SIMULATION_EPOCH } from '../../constants';

interface BottomBarProps {
  date: number;
  fps: number;
  actualSpeed: number;
  paused: boolean;
  setPaused: (b: boolean) => void;
  onResetTime: () => void;
  speedLog: number;
  setSpeedLog: (v: number) => void;
}

const BottomBar: React.FC<BottomBarProps> = ({
  date, fps, actualSpeed, paused, setPaused, onResetTime, speedLog, setSpeedLog
}) => {
  const baseDate = SIMULATION_EPOCH;
  const currentDate = new Date(baseDate + date * 86400 * 1000);

  let speedDisplay = '';
  if (actualSpeed < 1 / 24) {
    speedDisplay = `${(actualSpeed * 86400).toFixed(1)} sec/s`;
  } else if (actualSpeed < 1) {
    speedDisplay = `${(actualSpeed * 24).toFixed(1)} hrs/s`;
  } else if (actualSpeed < 365) {
    speedDisplay = `${actualSpeed.toFixed(1)} days/s`;
  } else {
    speedDisplay = `${(actualSpeed / 365.25).toFixed(1)} yrs/s`;
  }

  const dateStr = currentDate.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur-md border-t border-white/10">
      {/* Play/Pause */}
      <button
        onClick={() => setPaused(!paused)}
        className={`flex items-center justify-center w-7 h-7 rounded transition-colors flex-shrink-0
          ${paused
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : 'bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500/30'
          }`}
        title={paused ? 'Resume (Space)' : 'Pause (Space)'}
      >
        {paused ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        )}
      </button>

      {/* Date */}
      <div className="flex flex-col leading-none min-w-0">
        <span className="text-[9px] text-gray-500 uppercase tracking-widest">Date</span>
        <span className="text-[11px] font-mono text-white whitespace-nowrap truncate">{dateStr}</span>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-white/10 flex-shrink-0" />

      {/* Speed Display */}
      <div className="flex flex-col leading-none">
        <span className="text-[9px] text-gray-500 uppercase tracking-widest">Rate</span>
        <span className="text-[11px] font-mono text-blue-400 whitespace-nowrap">{speedDisplay}</span>
      </div>

      {/* Speed Slider */}
      <input
        type="range"
        min="0" max="100" step="1"
        value={speedLog}
        onChange={e => setSpeedLog(parseFloat(e.target.value))}
        className="w-24 sm:w-32 accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer flex-shrink-0"
      />

      {/* Separator */}
      <div className="w-px h-5 bg-white/10 flex-shrink-0" />

      {/* FPS */}
      <span className={`text-[10px] font-mono flex-shrink-0 ${fps < 30 ? 'text-red-500' : 'text-green-500'}`}>
        {fps} FPS
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reset */}
      <button
        onClick={onResetTime}
        className="text-[9px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold flex-shrink-0"
      >
        Reset Time
      </button>
    </div>
  );
};

export default memo(BottomBar);
