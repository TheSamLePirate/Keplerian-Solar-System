import React, { memo } from 'react';

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

    // New Atmosphere Controls
    atmOpacity: number;
    setAtmOpacity: (v: number) => void;
    atmPow: number;
    setAtmPow: (v: number) => void;
    atmSamples: number;
    setAtmSamples: (v: number) => void;
    // New Controls
    // New Controls
    onResetCamera: () => void;
    ambientLight: number;
    setAmbientLight: (v: number) => void;
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
    // ISS Model Selection
    issModel: 'small' | 'big';
    setIssModel: (m: 'small' | 'big') => void;
    // Post-processing
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
    // Hidden
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
    // Toggles
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
}




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
    enableHueSaturation, setEnableHueSaturation
}) => {


    return (
        <div className="pointer-events-auto bg-black/80 backdrop-blur-md rounded-lg p-4 border border-white/10 flex flex-col gap-4 w-full shadow-lg overflow-y-auto custom-scrollbar flex-shrink-0" style={{ maxHeight: '50vh' }}>

            {/* Camera Control Row */}
            < div className="flex gap-2" >
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
            </div >

            {/* Speed Slider */}
            < div className="flex flex-col gap-1" >
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
            </div >

            {/* Visibility Toggles */}
            < div className="grid grid-cols-2 gap-3 p-2 bg-white/5 rounded border border-white/5" >
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
            </div >

            {/* Size Controls */}
            < div className="flex flex-col gap-1" >
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
            </div >

            {/* Lighting Controls */}
            < div className="flex flex-col gap-1" >
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
            </div >

            {/* Visual Quality */}
            < div className="flex flex-col gap-3 border-t border-white/10 pt-3" >
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Visual Quality</div>

                <label className="flex items-center justify-between text-xs text-gray-300">
                    <span>Shadows</span>
                    <input
                        type="checkbox"
                        checked={shadowEnabled}
                        onChange={(e) => setShadowEnabled(e.target.checked)}
                        className="accent-blue-500"
                    />
                </label>

                <div className={`flex flex-col gap-1 ${shadowEnabled ? '' : 'opacity-50'}`}>
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Shadow Resolution</span>
                        <span>{shadowMapSize}px</span>
                    </div>
                    <select
                        value={shadowMapSize}
                        onChange={(e) => setShadowMapSize(parseInt(e.target.value, 10))}
                        disabled={!shadowEnabled}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-gray-200"
                    >
                        <option value={1024}>1024</option>
                        <option value={2048}>2048</option>
                        <option value={4096}>4096</option>
                        <option value={8192}>8192</option>
                        <option value={16384}>16384</option>
                    </select>
                </div>

                <div className={`flex flex-col gap-1 ${shadowEnabled ? '' : 'opacity-50'}`}>
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Shadow Softness</span>
                        <span>{shadowRadius.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={shadowRadius}
                        onChange={(e) => setShadowRadius(parseFloat(e.target.value))}
                        disabled={!shadowEnabled}
                        className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Render Scale</span>
                        <span>{renderScale.toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.75"
                        max="2"
                        step="0.25"
                        value={renderScale}
                        onChange={(e) => setRenderScale(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Star Density</span>
                        <span>{starsCount}</span>
                    </div>
                    <input
                        type="range"
                        min="2000"
                        max="20000"
                        step="1000"
                        value={starsCount}
                        onChange={(e) => setStarsCount(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div >

            {/* ISS Model Selection */}
            < div className="flex flex-col gap-2 border-t border-white/10 pt-3" >
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">ISS Model</div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIssModel('small')}
                        className={`flex-1 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all border ${issModel === 'small'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white'
                            }`}
                    >
                        Small
                    </button>
                    <button
                        onClick={() => setIssModel('big')}
                        className={`flex-1 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all border ${issModel === 'big'
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white'
                            }`}
                    >
                        Detailed
                    </button>
                </div>
            </div >

            {/* Atmosphere Controls */}
            < div className="flex flex-col gap-3 border-t border-white/10 pt-3" >
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
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Quality (Samples)</span>
                            <span>{atmSamples}</span>
                        </div>
                        <input
                            type="range"
                            min="8" max="64" step="1"
                            value={atmSamples}
                            onChange={(e) => setAtmSamples(parseInt(e.target.value, 10))}
                            className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div >

            {/* Post-Processing Controls */}
            < div className="flex flex-col gap-3 border-t border-white/10 pt-3" >
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Post-Processing</div>

                {/* Exposure */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Exposure</span>
                        <span>{exposure.toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="4" step="0.1"
                        value={exposure}
                        onChange={(e) => setExposure(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex flex-row items-center justify-between text-[10px] text-gray-400">
                    <span>Adaptive Tone Mapping</span>
                    <input
                        type="checkbox"
                        checked={toneMappingAdaptive}
                        onChange={(e) => setToneMappingAdaptive(e.target.checked)}
                        className="accent-blue-500"
                    />
                </div>

                {/* Bloom */}
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center">
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Bloom</div>
                        <input
                            type="checkbox"
                            checked={enableBloom}
                            onChange={(e) => setEnableBloom(e.target.checked)}
                            className="accent-blue-500 w-3 h-3"
                        />
                    </div>

                    {enableBloom && (
                        <>
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Threshold</span>
                                <span>{bloomThreshold.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="2" step="0.1"
                                value={bloomThreshold}
                                onChange={(e) => setBloomThreshold(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Intensity</span>
                                    <span>{bloomIntensity.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="3" step="0.1"
                                    value={bloomIntensity}
                                    onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Radius</span>
                                    <span>{bloomRadius.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.05"
                                    value={bloomRadius}
                                    onChange={(e) => setBloomRadius(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Smoothing</span>
                                    <span>{bloomSmoothing.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.05"
                                    value={bloomSmoothing}
                                    onChange={(e) => setBloomSmoothing(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-row items-center justify-between text-[10px] text-gray-400">
                                <span>Mipmap Blur</span>
                                <input
                                    type="checkbox"
                                    checked={bloomMipmapBlur}
                                    onChange={(e) => setBloomMipmapBlur(e.target.checked)}
                                    className="accent-blue-500"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Vignette */}
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center">
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Vignette</div>
                        <input
                            type="checkbox"
                            checked={enableVignette}
                            onChange={(e) => setEnableVignette(e.target.checked)}
                            className="accent-blue-500 w-3 h-3"
                        />
                    </div>

                    {enableVignette && (
                        <>
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Darkness</span>
                                <span>{vignetteDarkness.toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={vignetteDarkness}
                                onChange={(e) => setVignetteDarkness(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Offset</span>
                                    <span>{vignetteOffset.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.05"
                                    value={vignetteOffset}
                                    onChange={(e) => setVignetteOffset(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-row items-center justify-between text-[10px] text-gray-400">
                                <span>Eskil</span>
                                <input
                                    type="checkbox"
                                    checked={vignetteEskil}
                                    onChange={(e) => setVignetteEskil(e.target.checked)}
                                    className="accent-blue-500"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Noise */}
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center">
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Noise</div>
                        <input
                            type="checkbox"
                            checked={enableNoise}
                            onChange={(e) => setEnableNoise(e.target.checked)}
                            className="accent-blue-500 w-3 h-3"
                        />
                    </div>

                    {enableNoise && (
                        <>
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Opacity</span>
                                <span>{noiseOpacity.toFixed(3)}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="0.2" step="0.005"
                                value={noiseOpacity}
                                onChange={(e) => setNoiseOpacity(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />

                            <div className="flex flex-row items-center justify-between text-[10px] text-gray-400">
                                <span>Premultiply</span>
                                <input
                                    type="checkbox"
                                    checked={noisePremultiply}
                                    onChange={(e) => setNoisePremultiply(e.target.checked)}
                                    className="accent-blue-500"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Chromatic Aberration */}
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center">
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Chromatic Aberration</div>
                        <input
                            type="checkbox"
                            checked={enableChromaticAberration}
                            onChange={(e) => setEnableChromaticAberration(e.target.checked)}
                            className="accent-blue-500 w-3 h-3"
                        />
                    </div>

                    {enableChromaticAberration && (
                        <>
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Offset</span>
                                <span>{chromaticAberrationOffset.toFixed(3)}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="0.01" step="0.0001"
                                value={chromaticAberrationOffset}
                                onChange={(e) => setChromaticAberrationOffset(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Modulation</span>
                                    <span>{chromaticModulation.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="5" step="0.1"
                                    value={chromaticModulation}
                                    onChange={(e) => setChromaticModulation(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-row items-center justify-between text-[10px] text-gray-400">
                                <span>Radial</span>
                                <input
                                    type="checkbox"
                                    checked={chromaticRadial}
                                    onChange={(e) => setChromaticRadial(e.target.checked)}
                                    className="accent-blue-500"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Color & Tone */}
                <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <div className="text-[10px] uppercase text-gray-500 font-bold">Color & Tone</div>

                    {/* Brightness/Contrast Toggle */}
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-400">Brightness / Contrast</span>
                        <input
                            type="checkbox"
                            checked={enableBrightnessContrast}
                            onChange={(e) => setEnableBrightnessContrast(e.target.checked)}
                            className="accent-blue-500 w-3 h-3"
                        />
                    </div>
                    {enableBrightnessContrast && (
                        <>
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>Brightness</span>
                                <span>{brightness.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="-0.5" max="0.5" step="0.05"
                                value={brightness}
                                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                                className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Contrast</span>
                                    <span>{contrast.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-0.5" max="0.5" step="0.05"
                                    value={contrast}
                                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </>
                    )}

                    {/* Hue/Saturation Toggle */}
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-gray-400">Hue / Saturation</span>
                        <input
                            type="checkbox"
                            checked={enableHueSaturation}
                            onChange={(e) => setEnableHueSaturation(e.target.checked)}
                            className="accent-blue-500 w-3 h-3"
                        />
                    </div>
                    {enableHueSaturation && (
                        <>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Hue Shift</span>
                                    <span>{hue.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="6.28" step="0.1"
                                    value={hue}
                                    onChange={(e) => setHue(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] text-gray-400">
                                    <span>Saturation</span>
                                    <span>{saturation.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="2" step="0.05"
                                    value={saturation}
                                    onChange={(e) => setSaturation(parseFloat(e.target.value))}
                                    className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(Controls);
