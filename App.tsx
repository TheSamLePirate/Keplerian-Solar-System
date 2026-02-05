import React, { useState, useMemo, useCallback } from 'react';
import Scene from './components/Scene';
import Controls from './components/Controls';
import SimulationStats from './components/SimulationStats';
import InfoPanel from './components/InfoPanel';
import PlanetList from './components/PlanetList';
import { PlanetData } from './types';

const App: React.FC = () => {
    // Simulation State
    const [speedLog, setSpeedLog] = useState(0); // Slider 0-100
    const [paused, setPaused] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(0.5);
    const [showOrbits, setShowOrbits] = useState(true);
    const [showLabels, setShowLabels] = useState(true);

    // State separation: 
    // selectedPlanet = Planet displayed in InfoPanel / Highlighted in scene
    // followingBody = Planet the camera is tracking
    const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
    const [followingBody, setFollowingBody] = useState<PlanetData | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    const [simTime, setSimTime] = useState(0);
    const [fps, setFps] = useState(0);

    // Atmosphere Settings
    const [atmOpacity, setAtmOpacity] = useState(2.5);
    const [atmPow, setAtmPow] = useState(4.0);
    const [atmSamples, setAtmSamples] = useState(32);

    // Light Settings
    const [ambientLight, setAmbientLight] = useState(0);
    const [shadowEnabled, setShadowEnabled] = useState(true);
    const [shadowMapSize, setShadowMapSize] = useState(4096);
    const [shadowRadius, setShadowRadius] = useState(2);
    const [renderScale, setRenderScale] = useState(1);
    const [starsCount, setStarsCount] = useState(200000);

    // Triggers
    const [resetTimeTrigger, setResetTimeTrigger] = useState(0);
    const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

    // ISS Model Selection: 'small' or 'big'
    const [issModel, setIssModel] = useState<'small' | 'big'>('big');

    // Post-processing State
    const [bloomThreshold, setBloomThreshold] = useState(1.1);
    const [bloomIntensity, setBloomIntensity] = useState(1.5);
    const [bloomRadius, setBloomRadius] = useState(0.7);
    const [noiseOpacity, setNoiseOpacity] = useState(0.07);
    const [vignetteDarkness, setVignetteDarkness] = useState(0.9);
    const [vignetteOffset, setVignetteOffset] = useState(0.1);
    const [chromaticAberrationOffset, setChromaticAberrationOffset] = useState(0);
    const [brightness, setBrightness] = useState(0.0);
    const [contrast, setContrast] = useState(0.0);
    const [exposure, setExposure] = useState(1.2);
    const [bloomSmoothing, setBloomSmoothing] = useState(0.0);
    const [hue, setHue] = useState(0.0);
    const [saturation, setSaturation] = useState(0.0);

    // Advanced/Hidden Props
    const [bloomMipmapBlur, setBloomMipmapBlur] = useState(true);
    const [toneMappingAdaptive, setToneMappingAdaptive] = useState(true);
    const [vignetteEskil, setVignetteEskil] = useState(false);
    const [noisePremultiply, setNoisePremultiply] = useState(false);
    const [chromaticRadial, setChromaticRadial] = useState(false);
    const [chromaticModulation, setChromaticModulation] = useState(0.0);

    // Toggles for Effects
    const [enableBloom, setEnableBloom] = useState(true);
    const [enableNoise, setEnableNoise] = useState(true);
    const [enableVignette, setEnableVignette] = useState(true);
    const [enableChromaticAberration, setEnableChromaticAberration] = useState(false);
    const [enableBrightnessContrast, setEnableBrightnessContrast] = useState(true);
    const [enableHueSaturation, setEnableHueSaturation] = useState(true);

    // Calculate actual speed
    const actualSpeed = useMemo(() => {
        const minSpeed = 1 / 86400;
        const maxSpeed = 365.25;
        if (speedLog === 0) return minSpeed;
        const r = Math.pow(maxSpeed / minSpeed, speedLog / 100);
        return minSpeed * r;
    }, [speedLog]);

    // Handlers

    // Click on 3D Object
    // Click on 3D Object
    const handle3DPlanetClick = useCallback((p: PlanetData) => {
        setSelectedPlanet(p);
        setFollowingBody(p);
        setIsFollowing(true);
    }, []);

    const handleBackgroundClick = useCallback(() => {
        setSelectedPlanet(null);
        // Do not stop following if background is clicked, just close info panel
        // But if we want to stop following, we can use the controls or esc
    }, []);

    // List: Click Name
    const handleListSelect = useCallback((p: PlanetData) => {
        setSelectedPlanet(p);
        // Does NOT automatically follow
    }, []);

    // List: Click Scope/Target
    const handleListFollow = useCallback((p: PlanetData) => {
        setSelectedPlanet(p); // Also select it for info
        setFollowingBody(p);
        setIsFollowing(true);
    }, []);

    // InfoPanel: Click Track
    // InfoPanel: Click Track
    const handleTrackFromPanel = useCallback(() => {
        if (selectedPlanet) {
            setFollowingBody(selectedPlanet);
            setIsFollowing(true);
        }
    }, [selectedPlanet]);

    const handleResetTime = useCallback(() => {
        setSimTime(0);
        setResetTimeTrigger(prev => prev + 1);
    }, []);

    const handleResetCamera = useCallback(() => {
        setFollowingBody(null);
        setIsFollowing(false);
        setResetCameraTrigger(prev => prev + 1);
    }, []);

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
            <Scene
                speed={actualSpeed}
                paused={paused}
                scaleFactor={scaleFactor}
                showOrbits={showOrbits}
                showLabels={showLabels}
                selectedPlanet={selectedPlanet}
                followingBody={followingBody}
                isFollowing={isFollowing}
                onPlanetClick={handle3DPlanetClick}
                onBackgroundClick={handleBackgroundClick}
                onTimeUpdate={setSimTime}
                onFpsUpdate={setFps}
                atmOpacity={atmOpacity}
                atmPow={atmPow}
                atmSamples={atmSamples}
                ambientLightIntensity={ambientLight}
                shadowEnabled={shadowEnabled}
                shadowMapSize={shadowMapSize}
                shadowRadius={shadowRadius}
                renderScale={renderScale}
                starsCount={starsCount}
                resetTimeTrigger={resetTimeTrigger}
                resetCameraTrigger={resetCameraTrigger}
                issModel={issModel}
                bloomThreshold={bloomThreshold}
                bloomIntensity={bloomIntensity}
                bloomRadius={bloomRadius}
                bloomSmoothing={bloomSmoothing}
                bloomMipmapBlur={bloomMipmapBlur}
                noiseOpacity={noiseOpacity}
                noisePremultiply={noisePremultiply}
                vignetteDarkness={vignetteDarkness}
                vignetteOffset={vignetteOffset}
                vignetteEskil={vignetteEskil}
                chromaticAberrationOffset={chromaticAberrationOffset}
                chromaticRadial={chromaticRadial}
                chromaticModulation={chromaticModulation}
                brightness={brightness}
                contrast={contrast}
                exposure={exposure}
                hue={hue}
                saturation={saturation}
                toneMappingAdaptive={toneMappingAdaptive}
                enableBloom={enableBloom}
                enableNoise={enableNoise}
                enableVignette={enableVignette}
                enableChromaticAberration={enableChromaticAberration}
                enableBrightnessContrast={enableBrightnessContrast}
                enableHueSaturation={enableHueSaturation}
            />

            <PlanetList
                onSelect={handleListSelect}
                onFollow={handleListFollow}
                selectedId={selectedPlanet?.id}
                followingId={followingBody?.id}
                isFollowingActive={isFollowing}
            />

            <SimulationStats
                date={simTime}
                fps={fps}
                actualSpeed={actualSpeed}
                paused={paused}
                setPaused={setPaused}
                onResetTime={handleResetTime}
            />

            {/* Right Sidebar */}
            <div className="absolute top-4 bottom-4 right-4 w-[360px] flex flex-col gap-4 pointer-events-none z-20">
                <InfoPanel
                    planet={selectedPlanet}
                    onClose={() => setSelectedPlanet(null)}
                    onFollow={handleTrackFromPanel}
                    isFollowingThisPlanet={isFollowing && followingBody?.id === selectedPlanet?.id}
                />

                <Controls
                    speedLog={speedLog} setSpeedLog={setSpeedLog}
                    scaleFactor={scaleFactor} setScaleFactor={setScaleFactor}
                    showOrbits={showOrbits} setShowOrbits={setShowOrbits}
                    showLabels={showLabels} setShowLabels={setShowLabels}
                    isFollowing={isFollowing} setIsFollowing={setIsFollowing}
                    atmOpacity={atmOpacity} setAtmOpacity={setAtmOpacity}
                    atmPow={atmPow} setAtmPow={setAtmPow}
                    atmSamples={atmSamples} setAtmSamples={setAtmSamples}
                    onResetCamera={handleResetCamera}
                    ambientLight={ambientLight} setAmbientLight={setAmbientLight}
                    shadowEnabled={shadowEnabled} setShadowEnabled={setShadowEnabled}
                    shadowMapSize={shadowMapSize} setShadowMapSize={setShadowMapSize}
                    shadowRadius={shadowRadius} setShadowRadius={setShadowRadius}
                    renderScale={renderScale} setRenderScale={setRenderScale}
                    starsCount={starsCount} setStarsCount={setStarsCount}
                    issModel={issModel} setIssModel={setIssModel}
                    bloomThreshold={bloomThreshold} setBloomThreshold={setBloomThreshold}
                    bloomIntensity={bloomIntensity} setBloomIntensity={setBloomIntensity}
                    bloomRadius={bloomRadius} setBloomRadius={setBloomRadius}
                    bloomSmoothing={bloomSmoothing} setBloomSmoothing={setBloomSmoothing}
                    bloomMipmapBlur={bloomMipmapBlur} setBloomMipmapBlur={setBloomMipmapBlur}
                    noiseOpacity={noiseOpacity} setNoiseOpacity={setNoiseOpacity}
                    noisePremultiply={noisePremultiply} setNoisePremultiply={setNoisePremultiply}
                    vignetteDarkness={vignetteDarkness} setVignetteDarkness={setVignetteDarkness}
                    vignetteOffset={vignetteOffset} setVignetteOffset={setVignetteOffset}
                    vignetteEskil={vignetteEskil} setVignetteEskil={setVignetteEskil}
                    chromaticAberrationOffset={chromaticAberrationOffset} setChromaticAberrationOffset={setChromaticAberrationOffset}
                    chromaticRadial={chromaticRadial} setChromaticRadial={setChromaticRadial}
                    chromaticModulation={chromaticModulation} setChromaticModulation={setChromaticModulation}
                    brightness={brightness} setBrightness={setBrightness}
                    contrast={contrast} setContrast={setContrast}
                    exposure={exposure} setExposure={setExposure}
                    hue={hue} setHue={setHue}
                    saturation={saturation} setSaturation={setSaturation}
                    toneMappingAdaptive={toneMappingAdaptive} setToneMappingAdaptive={setToneMappingAdaptive}
                    enableBloom={enableBloom} setEnableBloom={setEnableBloom}
                    enableNoise={enableNoise} setEnableNoise={setEnableNoise}
                    enableVignette={enableVignette} setEnableVignette={setEnableVignette}
                    enableChromaticAberration={enableChromaticAberration} setEnableChromaticAberration={setEnableChromaticAberration}
                    enableBrightnessContrast={enableBrightnessContrast} setEnableBrightnessContrast={setEnableBrightnessContrast}
                    enableHueSaturation={enableHueSaturation} setEnableHueSaturation={setEnableHueSaturation}
                />
            </div>

            {/* Title Overlay */}
            <div className="absolute top-4 left-4 pointer-events-none z-10 select-none">
                <h1 className="text-3xl font-thin tracking-widest text-white/90 drop-shadow-md">ORBITAL</h1>
                <p className="text-xs text-blue-400 font-bold tracking-[0.3em] uppercase drop-shadow-sm">Keplerian Simulation</p>
            </div>
        </div>
    );
};

export default App;
