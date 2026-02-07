import React, { memo } from 'react';
import AccordionSection from './ui/AccordionSection';
import { SIMULATION_EPOCH } from '../constants';

interface ControlsProps {
    speedLog: number;
    setSpeedLog: (s: number) => void;
    scaleFactor: number;
    setScaleFactor: (s: number) => void;
    showOrbits: boolean;
    setShowOrbits: (b: boolean) => void;
    showLabels: boolean;
    setShowLabels: (b: boolean) => void;
    isFollowing: boolean;
    setIsFollowing: (b: boolean) => void;
    atmOpacity: number;
    setAtmOpacity: (v: number) => void;
    atmPow: number;
    setAtmPow: (v: number) => void;
    atmSamples: number;
    setAtmSamples: (v: number) => void;
    onResetCamera: () => void;
    ambientLight: number;
    setAmbientLight: (v: number) => void;
    sunLuminosity: number;
    setSunLuminosity: (v: number) => void;
    shadowEnabled: boolean;
    setShadowEnabled: (b: boolean) => void;
    shadowMapSize: number;
    setShadowMapSize: (v: number) => void;
    shadowRadius: number;
    setShadowRadius: (v: number) => void;
    renderScale: number;
    setRenderScale: (v: number) => void;
    starsCount: number;
    setStarsCount: (v: number) => void;
    // Star Settings
    starSize: number;
    setStarSize: (v: number) => void;
    starSizeMagShape: number;
    setStarSizeMagShape: (v: number) => void;
    starBrightness: number;
    setStarBrightness: (v: number) => void;
    starBrightnessMagShape: number;
    setStarBrightnessMagShape: (v: number) => void;
    starSaturation: number;
    setStarSaturation: (v: number) => void;
    showConstellations: boolean;
    setShowConstellations: (v: boolean) => void;
    showCelestialGrid: boolean;
    setShowCelestialGrid: (v: boolean) => void;
    showEarthGrid: boolean;
    setShowEarthGrid: (v: boolean) => void;
    gridMode: 'equatorial' | 'ecliptic';
    setGridMode: (m: 'equatorial' | 'ecliptic') => void;
    cameraMode: 'equatorial' | 'ecliptic';
    setCameraMode: (m: 'equatorial' | 'ecliptic') => void;
    issModel: 'small' | 'big';
    setIssModel: (m: 'small' | 'big') => void;
    bloomThreshold: number;
    setBloomThreshold: (v: number) => void;
    bloomIntensity: number;
    setBloomIntensity: (v: number) => void;
    bloomRadius: number;
    setBloomRadius: (v: number) => void;
    noiseOpacity: number;
    setNoiseOpacity: (v: number) => void;
    vignetteDarkness: number;
    setVignetteDarkness: (v: number) => void;
    vignetteOffset: number;
    setVignetteOffset: (v: number) => void;
    chromaticAberrationOffset: number;
    setChromaticAberrationOffset: (v: number) => void;
    brightness: number;
    setBrightness: (v: number) => void;
    contrast: number;
    setContrast: (v: number) => void;
    exposure: number;
    setExposure: (v: number) => void;
    bloomSmoothing: number;
    setBloomSmoothing: (v: number) => void;
    hue: number;
    setHue: (v: number) => void;
    saturation: number;
    setSaturation: (v: number) => void;
    bloomMipmapBlur: boolean;
    setBloomMipmapBlur: (v: boolean) => void;
    toneMappingAdaptive: boolean;
    setToneMappingAdaptive: (v: boolean) => void;
    vignetteEskil: boolean;
    setVignetteEskil: (v: boolean) => void;
    noisePremultiply: boolean;
    setNoisePremultiply: (v: boolean) => void;
    chromaticRadial: boolean;
    setChromaticRadial: (v: boolean) => void;
    chromaticModulation: number;
    setChromaticModulation: (v: number) => void;
    enableBloom: boolean;
    setEnableBloom: (v: boolean) => void;
    enableNoise: boolean;
    setEnableNoise: (v: boolean) => void;
    enableVignette: boolean;
    setEnableVignette: (v: boolean) => void;
    enableChromaticAberration: boolean;
    setEnableChromaticAberration: (v: boolean) => void;
    enableBrightnessContrast: boolean;
    setEnableBrightnessContrast: (v: boolean) => void;
    enableHueSaturation: boolean;
    setEnableHueSaturation: (v: boolean) => void;
    enableAO: boolean;
    setEnableAO: (v: boolean) => void;
    aoIntensity: number;
    setAoIntensity: (v: number) => void;
    aoRadius: number;
    setAoRadius: (v: number) => void;
    aoDistanceFalloff: number;
    setAoDistanceFalloff: (v: number) => void;
    aoScreenSpace: boolean;
    setAoScreenSpace: (v: boolean) => void;

    // Gravitational Potential
    gravityVisible: boolean;
    setGravityVisible: (v: boolean) => void;
    gravityOpacity: number;
    setGravityOpacity: (v: number) => void;
    gravityMin: number;
    setGravityMin: (v: number) => void;
    gravityMax: number;
    setGravityMax: (v: number) => void;
    gravityIntensityPow: number;
    setGravityIntensityPow: (v: number) => void;
    gravityDirectionSat: number;
    setGravityDirectionSat: (v: number) => void;
    gravityShowDirection: boolean;
    setGravityShowDirection: (v: boolean) => void;
    gravityPlaneSize: number;
    setGravityPlaneSize: (v: number) => void;
    gravityYOffset: number;
    setGravityYOffset: (v: number) => void;
    gravityParticlesVisible: boolean;
    setGravityParticlesVisible: (v: boolean) => void;
    gravityShowContours: boolean;
    setGravityShowContours: (v: boolean) => void;
    gravityContourFreq: number;
    setGravityContourFreq: (v: number) => void;
    gravityExcludeSun: boolean;
    setGravityExcludeSun: (v: boolean) => void;
    gravityShowEquilibrium: boolean;
    setGravityShowEquilibrium: (v: boolean) => void;
    gravityEquilibriumThreshold: number;
    setGravityEquilibriumThreshold: (v: number) => void;
    gravityShowEffective: boolean;
    setGravityShowEffective: (v: boolean) => void;
    // Accordion state from parent
    accordionState: Record<string, boolean>;
    toggleAccordion: (id: string) => void;
    date: number;
    onSetTime: (t: number) => void;
}

const Slider: React.FC<{
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; format?: (v: number) => string; disabled?: boolean;
}> = ({ label, value, min, max, step, onChange, format, disabled }) => (
    <div className={`flex flex-col gap-0.5 ${disabled ? 'opacity-40' : ''}`}>
        <div className="flex justify-between text-[10px] text-gray-400">
            <span>{label}</span>
            <span className="font-mono">{format ? format(value) : value.toFixed(2)}</span>
        </div>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);

const Toggle: React.FC<{
    label: string; checked: boolean; onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{label}</span>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-blue-500" />
    </div>
);

const Controls: React.FC<ControlsProps> = ({
    speedLog, setSpeedLog,
    scaleFactor, setScaleFactor,
    showOrbits, setShowOrbits,
    showLabels, setShowLabels,
    isFollowing, setIsFollowing,
    atmOpacity, setAtmOpacity,
    atmPow, setAtmPow,
    atmSamples, setAtmSamples,
    onResetCamera,
    ambientLight, setAmbientLight,
    sunLuminosity, setSunLuminosity,
    shadowEnabled, setShadowEnabled,
    shadowMapSize, setShadowMapSize,
    shadowRadius, setShadowRadius,
    renderScale, setRenderScale,
    starsCount, setStarsCount,
    starSize, setStarSize,
    starSizeMagShape, setStarSizeMagShape,
    starBrightness, setStarBrightness,
    starBrightnessMagShape, setStarBrightnessMagShape,
    starSaturation, setStarSaturation,
    showConstellations, setShowConstellations,
    showCelestialGrid, setShowCelestialGrid,
    showEarthGrid, setShowEarthGrid,
    gridMode, setGridMode,
    cameraMode, setCameraMode,
    issModel, setIssModel,
    bloomThreshold, setBloomThreshold,
    bloomIntensity, setBloomIntensity,
    bloomRadius, setBloomRadius,
    noiseOpacity, setNoiseOpacity,
    vignetteDarkness, setVignetteDarkness,
    vignetteOffset, setVignetteOffset,
    chromaticAberrationOffset, setChromaticAberrationOffset,
    brightness, setBrightness,
    contrast, setContrast,
    exposure, setExposure,
    bloomSmoothing, setBloomSmoothing,
    hue, setHue,
    saturation, setSaturation,
    bloomMipmapBlur, setBloomMipmapBlur,
    toneMappingAdaptive, setToneMappingAdaptive,
    vignetteEskil, setVignetteEskil,
    noisePremultiply, setNoisePremultiply,
    chromaticRadial, setChromaticRadial,
    chromaticModulation, setChromaticModulation,
    enableBloom, setEnableBloom,
    enableNoise, setEnableNoise,
    enableVignette, setEnableVignette,
    enableChromaticAberration, setEnableChromaticAberration,
    enableBrightnessContrast, setEnableBrightnessContrast,
    enableHueSaturation, setEnableHueSaturation,
    enableAO, setEnableAO,
    aoIntensity, setAoIntensity,
    aoRadius, setAoRadius,
    aoDistanceFalloff, setAoDistanceFalloff,
    aoScreenSpace, setAoScreenSpace,
    gravityVisible, setGravityVisible,
    gravityOpacity, setGravityOpacity,
    gravityMin, setGravityMin,
    gravityMax, setGravityMax,
    gravityIntensityPow, setGravityIntensityPow,
    gravityDirectionSat, setGravityDirectionSat,
    gravityShowDirection, setGravityShowDirection,
    gravityPlaneSize, setGravityPlaneSize,
    gravityYOffset, setGravityYOffset,
    gravityParticlesVisible, setGravityParticlesVisible,
    gravityShowContours, setGravityShowContours,
    gravityContourFreq, setGravityContourFreq,
    gravityExcludeSun, setGravityExcludeSun,
    gravityShowEquilibrium, setGravityShowEquilibrium,
    gravityEquilibriumThreshold, setGravityEquilibriumThreshold,
    gravityShowEffective, setGravityShowEffective,
    accordionState, toggleAccordion, date, onSetTime,
}) => {
    // Date/Time Helpers
    const currentTimestamp = SIMULATION_EPOCH + date * 86400 * 1000;
    const currentDate = new Date(currentTimestamp);
    // Format for datetime-local (YYYY-MM-DDTHH:mm) - using local time
    const localIsoString = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const d = new Date(e.target.value);
        if (!isNaN(d.getTime())) {
            onSetTime(d.getTime());
        }
    };

    const handleSetToNow = () => {
        onSetTime(Date.now());
    };

    return (
        <div className="flex flex-col w-full">
            {/* Camera */}
            <AccordionSection title="Camera" isOpen={accordionState.camera ?? true} onToggle={() => toggleAccordion('camera')}>
                <div className="flex gap-1.5">
                    <button
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${isFollowing
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                            : 'bg-transparent border-white/20 text-gray-400 hover:text-white hover:border-white/50'
                            }`}
                    >
                        {isFollowing ? "Locked On" : "Free Cam"}
                    </button>
                    <button
                        onClick={onResetCamera}
                        className="px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        Reset
                    </button>
                </div>

                <div className="mt-2 text-[10px] text-gray-400">
                    <span className="mb-1 block">Alignment (Up)</span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCameraMode('equatorial')}
                            className={`flex-1 py-1 rounded border transition-colors ${cameraMode === 'equatorial' ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 text-gray-400 hover:border-white'}`}
                        >
                            Equatorial
                        </button>
                        <button
                            onClick={() => setCameraMode('ecliptic')}
                            className={`flex-1 py-1 rounded border transition-colors ${cameraMode === 'ecliptic' ? 'bg-orange-600 border-orange-500 text-white' : 'border-gray-600 text-gray-400 hover:border-white'}`}
                        >
                            Ecliptic
                        </button>
                    </div>
                </div>
            </AccordionSection>

            {/* Simulation */}
            <AccordionSection title="Simulation" isOpen={accordionState.simulation ?? true} onToggle={() => toggleAccordion('simulation')}>
                {/* Date Control */}
                <div className="flex flex-col gap-2 mb-4 bg-black/40 p-2 rounded border border-white/5 relative group">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="uppercase tracking-widest text-[9px] font-bold">Flight Time</span>
                        <button
                            onClick={handleSetToNow}
                            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold border border-blue-500/30 transition-all uppercase tracking-wider"
                        >
                            Sync Now
                        </button>
                    </div>

                    <div className="relative">
                        {/* Styled Display */}
                        <div className="flex flex-col bg-black/60 border border-white/10 rounded overflow-hidden">
                            <div className="flex items-baseline justify-between px-2 py-1.5 border-b border-white/5">
                                <span className="font-mono text-lg text-white font-light tracking-widest">
                                    {localIsoString.slice(0, 10)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 bg-white/5">
                                <span className="font-mono text-xs text-blue-400 font-bold tracking-widest">
                                    {localIsoString.slice(11, 16)}
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono uppercase">UTC{localIsoString.slice(19)}</span>
                            </div>
                        </div>

                        {/* Hidden Input Overlay */}
                        <input
                            type="datetime-local"
                            value={localIsoString}
                            onChange={handleDateChange}
                            onClick={(e) => {
                                try {
                                    // Explicitly show picker on click for better UX
                                    if ('showPicker' in e.currentTarget) {
                                        (e.currentTarget as any).showPicker();
                                    }
                                } catch (err) {
                                    // Ignore errors if showPicker is not supported or allowed
                                }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 border border-blue-500/0 group-hover:border-blue-500/30 rounded pointer-events-none transition-all duration-500 shadow-[0_0_0_0_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_0_rgba(59,130,246,0.15)]" />
                    </div>
                </div>

                <Slider label="Time Speed" value={speedLog} min={0} max={100} step={1} onChange={setSpeedLog} format={v => `${v.toFixed(0)}%`} />

                <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-white/5 rounded border border-white/5">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                        <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center transition-colors ${showOrbits ? 'bg-blue-500 border-blue-500' : 'border-gray-500 group-hover:border-white'}`}>
                            {showOrbits && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-[10px] text-gray-300 group-hover:text-white">Orbits</span>
                        <input type="checkbox" checked={showOrbits} onChange={e => setShowOrbits(e.target.checked)} className="hidden" />
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                        <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center transition-colors ${showLabels ? 'bg-blue-500 border-blue-500' : 'border-gray-500 group-hover:border-white'}`}>
                            {showLabels && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="text-[10px] text-gray-300 group-hover:text-white">Labels</span>
                        <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} className="hidden" />
                    </label>
                </div>

                <Slider label="Planet Scale" value={scaleFactor} min={0.1} max={5} step={0.1} onChange={setScaleFactor} format={v => `${v.toFixed(1)}x`} />
            </AccordionSection>

            {/* Gravity Field */}
            <AccordionSection title="Gravity Field" isOpen={accordionState.gravity ?? false} onToggle={() => toggleAccordion('gravity')}>
                <div className="pb-1 border-b border-white/5 mb-1">
                    <Toggle label="Show Potential" checked={gravityVisible} onChange={setGravityVisible} />
                    <Toggle label="Show Particles (100k)" checked={gravityParticlesVisible} onChange={setGravityParticlesVisible} />
                </div>
                {gravityVisible && (
                    <div className="flex flex-col gap-1 mt-1">
                        <Toggle label="Show Direction" checked={gravityShowDirection} onChange={setGravityShowDirection} />
                        <Toggle label="Show Contours" checked={gravityShowContours} onChange={setGravityShowContours} />
                        <Toggle label="Show Equilibrium" checked={gravityShowEquilibrium} onChange={setGravityShowEquilibrium} />
                        <Toggle label="Show Eff. Potential" checked={gravityShowEffective} onChange={setGravityShowEffective} />
                        <Toggle label="Exclude Sun" checked={gravityExcludeSun} onChange={setGravityExcludeSun} />
                        {gravityShowEquilibrium && <Slider label="Equilibrium Thresh (Log)" value={Math.log10(gravityEquilibriumThreshold)} min={-10} max={1} step={0.1} onChange={v => setGravityEquilibriumThreshold(Math.pow(10, v))} format={v => `1e${v.toFixed(1)}`} />}
                        {gravityShowContours && <Slider label="Contour Frequency" value={gravityContourFreq} min={10} max={1000} step={10} onChange={setGravityContourFreq} format={v => v.toFixed(0)} />}
                        <Slider label="Opacity" value={gravityOpacity} min={0} max={1} step={0.05} onChange={setGravityOpacity} format={v => v.toFixed(2)} />
                        <Slider label="Min Strength (Log)" value={Math.log10(gravityMin)} min={-10} max={-2} step={0.1} onChange={v => setGravityMin(Math.pow(10, v))} format={v => `1e${v.toFixed(1)}`} />
                        <Slider label="Max Strength (Log)" value={Math.log10(gravityMax)} min={-8} max={0} step={0.1} onChange={v => setGravityMax(Math.pow(10, v))} format={v => `1e${v.toFixed(1)}`} />
                        <Slider label="Intensity Power" value={gravityIntensityPow} min={0.1} max={5} step={0.1} onChange={setGravityIntensityPow} format={v => v.toFixed(1)} />
                        <Slider label="Direction Saturation" value={gravityDirectionSat} min={0.0} max={2.0} step={0.1} onChange={setGravityDirectionSat} format={v => v.toFixed(1)} />
                        <Slider label="Plane Size (AU)" value={gravityPlaneSize} min={50} max={500} step={10} onChange={setGravityPlaneSize} format={v => v.toFixed(0)} />
                        <Slider label="Y Offset" value={gravityYOffset} min={-50} max={50} step={1} onChange={setGravityYOffset} format={v => v.toFixed(1)} />
                    </div>
                )}
            </AccordionSection>

            {/* Lighting */}
            <AccordionSection title="Lighting" isOpen={accordionState.lighting ?? false} onToggle={() => toggleAccordion('lighting')}>
                <Slider label="Sun Luminosity" value={sunLuminosity} min={0} max={10} step={0.1} onChange={setSunLuminosity} format={v => v.toFixed(1)} />
                <Slider label="Ambient Light" value={ambientLight} min={0} max={1} step={0.05} onChange={setAmbientLight} format={v => `${(v * 100).toFixed(0)}%`} />
            </AccordionSection>

            {/* Visual Quality */}
            <AccordionSection title="Visual Quality" isOpen={accordionState.quality ?? false} onToggle={() => toggleAccordion('quality')}>
                <Toggle label="Shadows" checked={shadowEnabled} onChange={setShadowEnabled} />

                <div className={shadowEnabled ? '' : 'opacity-40'}>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Shadow Resolution</span>
                            <span className="font-mono">{shadowMapSize}px</span>
                        </div>
                        <select
                            value={shadowMapSize}
                            onChange={e => setShadowMapSize(parseInt(e.target.value, 10))}
                            disabled={!shadowEnabled}
                            className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-gray-200"
                        >
                            <option value={1024}>1024</option>
                            <option value={2048}>2048</option>
                            <option value={4096}>4096</option>
                            <option value={8192}>8192</option>
                            <option value={16384}>16384</option>
                        </select>
                    </div>

                    <Slider label="Shadow Softness" value={shadowRadius} min={0} max={5} step={0.5} onChange={setShadowRadius} disabled={!shadowEnabled} format={v => v.toFixed(1)} />
                </div>

                <Slider label="Render Scale" value={renderScale} min={0.75} max={2} step={0.25} onChange={setRenderScale} format={v => `${v.toFixed(2)}x`} />
                <Slider label="Star Count (Top ~N)" value={starsCount} min={2000} max={20000} step={1000} onChange={v => setStarsCount(Math.round(v))} format={v => `${v}`} />

                <div className="pt-1 mt-1 border-t border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Star Shader</span>
                    <Slider label="Base Size" value={starSize} min={0.1} max={5.0} step={0.1} onChange={setStarSize} format={v => v.toFixed(1)} />
                    <Slider label="Mag -> Size" value={starSizeMagShape} min={0} max={0.5} step={0.01} onChange={setStarSizeMagShape} format={v => v.toFixed(2)} />
                    <Slider label="Base Brightness" value={starBrightness} min={0.1} max={2.0} step={0.1} onChange={setStarBrightness} format={v => v.toFixed(1)} />
                    <Slider label="Mag -> Brightness" value={starBrightnessMagShape} min={0.05} max={1.0} step={0.05} onChange={setStarBrightnessMagShape} format={v => v.toFixed(2)} />
                    <Slider label="Saturation" value={starSaturation} min={0} max={2.0} step={0.1} onChange={setStarSaturation} format={v => v.toFixed(1)} />
                    <div className="pt-1 mt-1 border-t border-white/5">
                        <Toggle label="Show Constellations" checked={showConstellations} onChange={setShowConstellations} />
                        <Toggle label="Show Celestial Grid" checked={showCelestialGrid} onChange={setShowCelestialGrid} />
                        <Toggle label="Show Earth Grid" checked={showEarthGrid} onChange={setShowEarthGrid} />
                        {showCelestialGrid && (
                            <div className="flex gap-1 mt-1">
                                <button
                                    onClick={() => setGridMode('equatorial')}
                                    className={`flex-1 text-[9px] font-bold uppercase py-0.5 rounded border ${gridMode === 'equatorial' ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-600 text-gray-400'}`}
                                >
                                    Equatorial
                                </button>
                                <button
                                    onClick={() => setGridMode('ecliptic')}
                                    className={`flex-1 text-[9px] font-bold uppercase py-0.5 rounded border ${gridMode === 'ecliptic' ? 'bg-orange-600 border-orange-500 text-white' : 'border-gray-600 text-gray-400'}`}
                                >
                                    Ecliptic (Az)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </AccordionSection>

            {/* ISS Model */}
            <AccordionSection title="ISS Model" isOpen={accordionState.iss ?? false} onToggle={() => toggleAccordion('iss')}>
                <div className="flex gap-1.5">
                    <button
                        onClick={() => setIssModel('small')}
                        className={`flex-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${issModel === 'small'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white'
                            }`}
                    >
                        Small
                    </button>
                    <button
                        onClick={() => setIssModel('big')}
                        className={`flex-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${issModel === 'big'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white'
                            }`}
                    >
                        Detailed
                    </button>
                </div>
            </AccordionSection>

            {/* Atmosphere */}
            <AccordionSection title="Atmosphere" isOpen={accordionState.atmosphere ?? false} onToggle={() => toggleAccordion('atmosphere')}>
                <Slider label="Density / Opacity" value={atmOpacity} min={0} max={10} step={0.1} onChange={setAtmOpacity} format={v => v.toFixed(1)} />
                <Slider label="Thickness (Falloff)" value={atmPow} min={0.5} max={8} step={0.1} onChange={setAtmPow} format={v => v.toFixed(1)} />
                <Slider label="Quality (Samples)" value={atmSamples} min={8} max={64} step={1} onChange={v => setAtmSamples(Math.round(v))} format={v => `${v}`} />
            </AccordionSection>

            {/* Post-Processing */}
            <AccordionSection title="Post-Processing" isOpen={accordionState.postprocess ?? false} onToggle={() => toggleAccordion('postprocess')}>
                {/* Ambient Occlusion */}
                <div className="pb-1 border-b border-white/5 mb-1">
                    <Toggle label="Ambient Occlusion" checked={enableAO} onChange={setEnableAO} />
                    {enableAO && (
                        <div className="flex flex-col gap-1 mt-1">
                            <Toggle label="Screen Space Radius" checked={aoScreenSpace} onChange={setAoScreenSpace} />
                            <Slider label="Intensity" value={aoIntensity} min={0} max={20} step={0.5} onChange={setAoIntensity} format={v => v.toFixed(1)} />
                            <Slider label="Radius" value={aoRadius} min={0} max={10} step={0.01} onChange={setAoRadius} format={v => v.toFixed(2)} />
                            <Slider label="Distance Falloff" value={aoDistanceFalloff} min={0} max={5} step={0.1} onChange={setAoDistanceFalloff} format={v => v.toFixed(1)} />
                        </div>
                    )}
                </div>

                <Slider label="Exposure" value={exposure} min={0} max={4} step={0.1} onChange={setExposure} />
                <Toggle label="Adaptive Tone Mapping" checked={toneMappingAdaptive} onChange={setToneMappingAdaptive} />

                {/* Bloom */}
                <div className="pt-1 border-t border-white/5">
                    <Toggle label="Bloom" checked={enableBloom} onChange={setEnableBloom} />
                    {enableBloom && (
                        <div className="flex flex-col gap-1 mt-1">
                            <Slider label="Threshold" value={bloomThreshold} min={0} max={2} step={0.1} onChange={setBloomThreshold} format={v => v.toFixed(1)} />
                            <Slider label="Intensity" value={bloomIntensity} min={0} max={3} step={0.1} onChange={setBloomIntensity} format={v => v.toFixed(1)} />
                            <Slider label="Radius" value={bloomRadius} min={0} max={1} step={0.05} onChange={setBloomRadius} />
                            <Slider label="Smoothing" value={bloomSmoothing} min={0} max={1} step={0.05} onChange={setBloomSmoothing} />
                            <Toggle label="Mipmap Blur" checked={bloomMipmapBlur} onChange={setBloomMipmapBlur} />
                        </div>
                    )}
                </div>

                {/* Vignette */}
                <div className="pt-1 border-t border-white/5">
                    <Toggle label="Vignette" checked={enableVignette} onChange={setEnableVignette} />
                    {enableVignette && (
                        <div className="flex flex-col gap-1 mt-1">
                            <Slider label="Darkness" value={vignetteDarkness} min={0} max={1} step={0.05} onChange={setVignetteDarkness} format={v => v.toFixed(1)} />
                            <Slider label="Offset" value={vignetteOffset} min={0} max={1} step={0.05} onChange={setVignetteOffset} />
                            <Toggle label="Eskil" checked={vignetteEskil} onChange={setVignetteEskil} />
                        </div>
                    )}
                </div>

                {/* Noise */}
                <div className="pt-1 border-t border-white/5">
                    <Toggle label="Noise" checked={enableNoise} onChange={setEnableNoise} />
                    {enableNoise && (
                        <div className="flex flex-col gap-1 mt-1">
                            <Slider label="Opacity" value={noiseOpacity} min={0} max={0.2} step={0.005} onChange={setNoiseOpacity} format={v => v.toFixed(3)} />
                            <Toggle label="Premultiply" checked={noisePremultiply} onChange={setNoisePremultiply} />
                        </div>
                    )}
                </div>

                {/* Chromatic Aberration */}
                <div className="pt-1 border-t border-white/5">
                    <Toggle label="Chromatic Aberration" checked={enableChromaticAberration} onChange={setEnableChromaticAberration} />
                    {enableChromaticAberration && (
                        <div className="flex flex-col gap-1 mt-1">
                            <Slider label="Offset" value={chromaticAberrationOffset} min={0} max={0.01} step={0.0001} onChange={setChromaticAberrationOffset} format={v => v.toFixed(3)} />
                            <Slider label="Modulation" value={chromaticModulation} min={0} max={5} step={0.1} onChange={setChromaticModulation} format={v => v.toFixed(1)} />
                            <Toggle label="Radial" checked={chromaticRadial} onChange={setChromaticRadial} />
                        </div>
                    )}
                </div>

                {/* Color & Tone */}
                <div className="pt-1 border-t border-white/5">
                    <Toggle label="Brightness / Contrast" checked={enableBrightnessContrast} onChange={setEnableBrightnessContrast} />
                    {enableBrightnessContrast && (
                        <div className="flex flex-col gap-1 mt-1">
                            <Slider label="Brightness" value={brightness} min={-0.5} max={0.5} step={0.05} onChange={setBrightness} />
                            <Slider label="Contrast" value={contrast} min={-0.5} max={0.5} step={0.05} onChange={setContrast} />
                        </div>
                    )}

                    <div className="mt-1">
                        <Toggle label="Hue / Saturation" checked={enableHueSaturation} onChange={setEnableHueSaturation} />
                    </div>
                    {enableHueSaturation && (
                        <div className="flex flex-col gap-1 mt-1">
                            <Slider label="Hue Shift" value={hue} min={0} max={6.28} step={0.1} onChange={setHue} />
                            <Slider label="Saturation" value={saturation} min={0} max={2} step={0.05} onChange={setSaturation} />
                        </div>
                    )}
                </div>
            </AccordionSection>
        </div>
    );
};

export default memo(Controls);
