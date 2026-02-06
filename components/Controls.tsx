import React, { memo } from 'react';
import AccordionSection from './ui/AccordionSection';

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
    // Accordion state from parent
    accordionState: Record<string, boolean>;
    toggleAccordion: (id: string) => void;
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
    accordionState, toggleAccordion,
}) => {
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
            </AccordionSection>

            {/* Simulation */}
            <AccordionSection title="Simulation" isOpen={accordionState.simulation ?? true} onToggle={() => toggleAccordion('simulation')}>
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
                <Slider label="Star Density" value={starsCount} min={2000} max={20000} step={1000} onChange={v => setStarsCount(Math.round(v))} format={v => `${v}`} />
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
