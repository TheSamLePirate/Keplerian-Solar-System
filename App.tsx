import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import Controls from './components/Controls';
import InfoPanel from './components/InfoPanel';
import PlanetList from './components/PlanetList';
import Toolbar from './components/ui/Toolbar';
import BottomBar from './components/ui/BottomBar';
import PanelShell from './components/ui/PanelShell';
import ResizableSidebar from './components/ui/ResizableSidebar';
import SplashLoader from './components/ui/SplashLoader';
import { usePanelLayout } from './hooks/usePanelLayout';
import { PlanetData } from './types';
import { SIMULATION_EPOCH } from './constants';

const App: React.FC = () => {
    // Simulation State
    const [speedLog, setSpeedLog] = useState(0);
    const [paused, setPaused] = useState(false);
    const [scaleFactor, setScaleFactor] = useState(0.5);
    const [showOrbits, setShowOrbits] = useState(true);
    const [showLabels, setShowLabels] = useState(false);

    const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
    const [followingBody, setFollowingBody] = useState<PlanetData | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    const [simTime, setSimTime] = useState(0);
    const [fps, setFps] = useState(0);

    // Atmosphere Settings
    const [atmOpacity, setAtmOpacity] = useState(0.1);
    const [atmPow, setAtmPow] = useState(8);
    const [atmSamples, setAtmSamples] = useState(32);

    // Light Settings
    const [ambientLight, setAmbientLight] = useState(0);
    const [sunLuminosity, setSunLuminosity] = useState(3.0);
    const [shadowEnabled, setShadowEnabled] = useState(true);
    const [shadowMapSize, setShadowMapSize] = useState(4096);
    const [shadowRadius, setShadowRadius] = useState(2);
    const [renderScale, setRenderScale] = useState(1);
    const [starsCount, setStarsCount] = useState(200000);

    // Triggers
    const [forcedTime, setForcedTime] = useState<{ value: number, id: number } | undefined>(undefined);
    const [resetCameraTrigger, setResetCameraTrigger] = useState(0);

    // ISS Model Selection
    const [issModel, setIssModel] = useState<'small' | 'big'>('big');

    // Star Settings
    const [starSize, setStarSize] = useState(2.0);
    const [starSizeMagShape, setStarSizeMagShape] = useState(0.1);
    const [starBrightness, setStarBrightness] = useState(0.5);
    const [starBrightnessMagShape, setStarBrightnessMagShape] = useState(0.2);
    const [starSaturation, setStarSaturation] = useState(1.0);
    const [showConstellations, setShowConstellations] = useState(false);
    const [showCelestialGrid, setShowCelestialGrid] = useState(false);
    const [gridMode, setGridMode] = useState<'equatorial' | 'ecliptic'>('equatorial');
    const [showEarthGrid, setShowEarthGrid] = useState(false);
    const [cameraMode, setCameraMode] = useState<'equatorial' | 'ecliptic'>('equatorial');

    // Earth Graphics
    const [earthTextureLOD, setEarthTextureLOD] = useState<'low' | 'med' | 'high' | 'ultra'>('high');
    const [showClouds, setShowClouds] = useState(true);
    const [cloudSpeed, setCloudSpeed] = useState(0.0);
    const [cloudOpacity, setCloudOpacity] = useState(1.0);
    const [cloudRotationOffset, setCloudRotationOffset] = useState(Math.PI * 1.5);
    const [showNightLights, setShowNightLights] = useState(true);
    const [bumpScale, setBumpScale] = useState(0.02);
    const [specularStrength, setSpecularStrength] = useState(1.0);
    const [nightLightIntensity, setNightLightIntensity] = useState(2.0);
    const [dayIntensity, setDayIntensity] = useState(1.0);
    const [earthRotationOffset, setEarthRotationOffset] = useState(0.0);
    const [earthTextureOffset, setEarthTextureOffset] = useState(Math.PI / 2);
    const [displacementScale, setDisplacementScale] = useState(0.0);



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

    // Advanced Props
    const [bloomMipmapBlur, setBloomMipmapBlur] = useState(true);
    const [toneMappingAdaptive, setToneMappingAdaptive] = useState(true);
    const [vignetteEskil, setVignetteEskil] = useState(false);
    const [noisePremultiply, setNoisePremultiply] = useState(false);
    const [chromaticRadial, setChromaticRadial] = useState(false);
    const [chromaticModulation, setChromaticModulation] = useState(0.0);

    // Effect Toggles
    const [enableBloom, setEnableBloom] = useState(true);
    const [enableNoise, setEnableNoise] = useState(true);
    const [enableVignette, setEnableVignette] = useState(true);
    const [enableChromaticAberration, setEnableChromaticAberration] = useState(false);
    const [enableBrightnessContrast, setEnableBrightnessContrast] = useState(true);
    const [enableHueSaturation, setEnableHueSaturation] = useState(true);
    const [enableAO, setEnableAO] = useState(true);
    const [aoIntensity, setAoIntensity] = useState(5.0);
    const [aoRadius, setAoRadius] = useState(0.05);
    const [aoDistanceFalloff, setAoDistanceFalloff] = useState(1.0);
    const [aoScreenSpace, setAoScreenSpace] = useState(false);


    // Gravitational Potential Vis
    const [gravityVisible, setGravityVisible] = useState(false);
    const [gravityOpacity, setGravityOpacity] = useState(0.5);
    const [gravityMin, setGravityMin] = useState(1e-5);
    const [gravityMax, setGravityMax] = useState(0.5);
    const [gravityIntensityPow, setGravityIntensityPow] = useState(0.5);
    const [gravityDirectionSat, setGravityDirectionSat] = useState(0.8);
    const [gravityShowDirection, setGravityShowDirection] = useState(true);
    const [gravityPlaneSize, setGravityPlaneSize] = useState(200); // 200 AU wide
    const [gravityYOffset, setGravityYOffset] = useState(-5);
    const [gravityParticlesVisible, setGravityParticlesVisible] = useState(false); // Slightly below ecliptic to not cut planets
    const [gravityShowContours, setGravityShowContours] = useState(true);
    const [gravityContourFreq, setGravityContourFreq] = useState(50);
    const [gravityExcludeSun, setGravityExcludeSun] = useState(false);
    const [gravityShowEquilibrium, setGravityShowEquilibrium] = useState(false);
    const [gravityEquilibriumThreshold, setGravityEquilibriumThreshold] = useState(0.001); // Default low threshold
    const [gravityShowEffective, setGravityShowEffective] = useState(false); // Rotating frame

    // Panel Layout State
    const { panels, accordionState, togglePanel, setPanelVisible, toggleAccordion } = usePanelLayout();

    // Calculate actual speed
    const actualSpeed = useMemo(() => {
        const minSpeed = 1 / 86400;
        const maxSpeed = 365.25;
        if (speedLog === 0) return minSpeed;
        const r = Math.pow(maxSpeed / minSpeed, speedLog / 100);
        return minSpeed * r;
    }, [speedLog]);

    // Handlers
    const handle3DPlanetClick = useCallback((p: PlanetData) => {
        setSelectedPlanet(p);
        setFollowingBody(p);
        setIsFollowing(true);
        setPanelVisible('info', true);
    }, [setPanelVisible]);

    const handleBackgroundClick = useCallback(() => {
        setSelectedPlanet(null);
    }, []);

    const handleListSelect = useCallback((p: PlanetData) => {
        setSelectedPlanet(p);
        setPanelVisible('info', true);
    }, [setPanelVisible]);

    const handleListFollow = useCallback((p: PlanetData) => {
        setSelectedPlanet(p);
        setFollowingBody(p);
        setIsFollowing(true);
        setPanelVisible('info', true);
    }, [setPanelVisible]);

    const handleTrackFromPanel = useCallback(() => {
        if (selectedPlanet) {
            setFollowingBody(selectedPlanet);
            setIsFollowing(true);
        }
    }, [selectedPlanet]);

    const handleSetTime = useCallback((timestamp: number) => {
        const simDays = (timestamp - SIMULATION_EPOCH) / (1000 * 86400);
        setSimTime(simDays);
        setForcedTime({ value: simDays, id: Math.random() });
    }, []);

    const handleResetTime = useCallback(() => {
        handleSetTime(SIMULATION_EPOCH);
    }, [handleSetTime]);

    const handleResetCamera = useCallback(() => {
        setFollowingBody(null);
        setIsFollowing(false);
        setResetCameraTrigger(prev => prev + 1);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

            switch (e.key) {
                case '1': togglePanel('bodies'); break;
                case '2': togglePanel('info'); break;
                case '3': togglePanel('controls'); break;
                case ' ':
                    e.preventDefault();
                    setPaused(p => !p);
                    break;
                case 'Escape':
                    setSelectedPlanet(null);
                    setIsFollowing(false);
                    setFollowingBody(null);
                    break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [togglePanel]);

    // Determine sidebar visibility
    const leftVisible = panels.bodies;
    const rightVisible = panels.info || panels.controls;

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
            {/* Loading Screen */}
            <SplashLoader />

            {/* 3D Scene - Full screen */}
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
                sunLuminosity={sunLuminosity}
                shadowEnabled={shadowEnabled}
                shadowMapSize={shadowMapSize}
                shadowRadius={shadowRadius}
                renderScale={renderScale}
                starsCount={starsCount}
                forcedTime={forcedTime}
                resetCameraTrigger={resetCameraTrigger}
                issModel={issModel}
                starSize={starSize}
                starSizeMagShape={starSizeMagShape}
                starBrightness={starBrightness}
                starBrightnessMagShape={starBrightnessMagShape}
                starSaturation={starSaturation}
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
                enableAO={enableAO}
                aoIntensity={aoIntensity}
                aoRadius={aoRadius}
                aoDistanceFalloff={aoDistanceFalloff}
                aoScreenSpace={aoScreenSpace}

                gravityVisible={gravityVisible}
                gravityOpacity={gravityOpacity}
                gravityMin={gravityMin}
                gravityMax={gravityMax}
                gravityIntensityPow={gravityIntensityPow}
                gravityDirectionSat={gravityDirectionSat}
                gravityShowDirection={gravityShowDirection}
                gravityPlaneSize={gravityPlaneSize}
                gravityYOffset={gravityYOffset}
                gravityParticlesVisible={gravityParticlesVisible}
                gravityShowContours={gravityShowContours}
                gravityContourFreq={gravityContourFreq}
                gravityExcludeSun={gravityExcludeSun}
                gravityShowEquilibrium={gravityShowEquilibrium}
                gravityEquilibriumThreshold={gravityEquilibriumThreshold}
                gravityShowEffective={gravityShowEffective}
                showConstellations={showConstellations}
                showCelestialGrid={showCelestialGrid}
                showEarthGrid={showEarthGrid}
                gridMode={gridMode}
                cameraMode={cameraMode}

                earthTextureLOD={earthTextureLOD}
                showClouds={showClouds}
                cloudSpeed={cloudSpeed}
                cloudOpacity={cloudOpacity}
                showNightLights={showNightLights}
                bumpScale={bumpScale}
                specularStrength={specularStrength}
                nightLightIntensity={nightLightIntensity}
                dayIntensity={dayIntensity}
                earthRotationOffset={earthRotationOffset}
                earthTextureOffset={earthTextureOffset}
                displacementScale={displacementScale}
                cloudRotationOffset={cloudRotationOffset}
            />

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col">
                {/* Top Bar */}
                <div className="flex items-center gap-3 px-3 py-1.5 pointer-events-auto bg-black/60 backdrop-blur-md border-b border-white/5 flex-shrink-0">
                    {/* Title */}
                    <div className="select-none flex-shrink-0">
                        <h1 className="text-lg font-thin tracking-widest text-white/90 leading-none">ORBITAL</h1>
                        <p className="text-[8px] text-blue-400 font-bold tracking-[0.25em] uppercase leading-none">Keplerian Simulation</p>
                    </div>

                    {/* Separator */}
                    <div className="w-px h-6 bg-white/10 flex-shrink-0" />

                    {/* Toolbar */}
                    <Toolbar panels={panels} togglePanel={togglePanel} />

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Mini FPS */}
                    <span className={`text-[10px] font-mono flex-shrink-0 ${fps < 30 ? 'text-red-500' : 'text-green-500/60'}`}>
                        {fps} FPS
                    </span>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex min-h-0">
                    {/* Left Sidebar */}
                    <ResizableSidebar
                        side="left"
                        defaultWidth={220}
                        minWidth={160}
                        maxWidth={400}
                        visible={leftVisible}
                    >
                        <PanelShell title="Bodies" noPadding maxHeight="100%">
                            <PlanetList
                                onSelect={handleListSelect}
                                onFollow={handleListFollow}
                                selectedId={selectedPlanet?.id}
                                followingId={followingBody?.id}
                                isFollowingActive={isFollowing}
                            />
                        </PanelShell>
                    </ResizableSidebar>

                    {/* Center - passthrough */}
                    <div className="flex-1" />

                    {/* Right Sidebar */}
                    <ResizableSidebar
                        side="right"
                        defaultWidth={300}
                        minWidth={220}
                        maxWidth={500}
                        visible={rightVisible}
                    >
                        {/* Info Panel */}
                        {panels.info && selectedPlanet && (
                            <PanelShell title="Object Info" className="flex-shrink-0">
                                <InfoPanel
                                    planet={selectedPlanet}
                                    onClose={() => setSelectedPlanet(null)}
                                    onFollow={handleTrackFromPanel}
                                    isFollowingThisPlanet={isFollowing && followingBody?.id === selectedPlanet?.id}
                                />
                            </PanelShell>
                        )}

                        {/* Controls */}
                        {panels.controls && (
                            <PanelShell title="Settings" className="flex-1 min-h-0" maxHeight="100%">
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
                                    sunLuminosity={sunLuminosity} setSunLuminosity={setSunLuminosity}
                                    shadowEnabled={shadowEnabled} setShadowEnabled={setShadowEnabled}
                                    shadowMapSize={shadowMapSize} setShadowMapSize={setShadowMapSize}
                                    shadowRadius={shadowRadius} setShadowRadius={setShadowRadius}
                                    renderScale={renderScale} setRenderScale={setRenderScale}
                                    starsCount={starsCount} setStarsCount={setStarsCount}
                                    issModel={issModel} setIssModel={setIssModel}
                                    starSize={starSize} setStarSize={setStarSize}
                                    starSizeMagShape={starSizeMagShape} setStarSizeMagShape={setStarSizeMagShape}
                                    starBrightness={starBrightness} setStarBrightness={setStarBrightness}
                                    starBrightnessMagShape={starBrightnessMagShape} setStarBrightnessMagShape={setStarBrightnessMagShape}
                                    starSaturation={starSaturation} setStarSaturation={setStarSaturation}
                                    showConstellations={showConstellations} setShowConstellations={setShowConstellations}
                                    showCelestialGrid={showCelestialGrid} setShowCelestialGrid={setShowCelestialGrid}
                                    gridMode={gridMode} setGridMode={setGridMode}
                                    cameraMode={cameraMode} setCameraMode={setCameraMode}

                                    earthTextureLOD={earthTextureLOD} setEarthTextureLOD={setEarthTextureLOD}
                                    showClouds={showClouds} setShowClouds={setShowClouds}
                                    cloudSpeed={cloudSpeed} setCloudSpeed={setCloudSpeed}
                                    cloudOpacity={cloudOpacity} setCloudOpacity={setCloudOpacity}
                                    showNightLights={showNightLights} setShowNightLights={setShowNightLights}
                                    bumpScale={bumpScale} setBumpScale={setBumpScale}
                                    specularStrength={specularStrength}
                                    setSpecularStrength={setSpecularStrength}
                                    nightLightIntensity={nightLightIntensity}
                                    setNightLightIntensity={setNightLightIntensity}
                                    dayIntensity={dayIntensity}
                                    setDayIntensity={setDayIntensity}
                                    earthRotationOffset={earthRotationOffset}
                                    setEarthRotationOffset={setEarthRotationOffset}
                                    earthTextureOffset={earthTextureOffset}
                                    setEarthTextureOffset={setEarthTextureOffset}
                                    displacementScale={displacementScale}
                                    setDisplacementScale={setDisplacementScale}
                                    cloudRotationOffset={cloudRotationOffset}
                                    setCloudRotationOffset={setCloudRotationOffset}
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
                                    enableAO={enableAO} setEnableAO={setEnableAO}
                                    aoIntensity={aoIntensity} setAoIntensity={setAoIntensity}
                                    aoRadius={aoRadius} setAoRadius={setAoRadius}
                                    aoDistanceFalloff={aoDistanceFalloff} setAoDistanceFalloff={setAoDistanceFalloff}
                                    aoScreenSpace={aoScreenSpace} setAoScreenSpace={setAoScreenSpace}

                                    gravityVisible={gravityVisible} setGravityVisible={setGravityVisible}
                                    gravityOpacity={gravityOpacity} setGravityOpacity={setGravityOpacity}
                                    gravityMin={gravityMin} setGravityMin={setGravityMin}
                                    gravityMax={gravityMax} setGravityMax={setGravityMax}
                                    gravityIntensityPow={gravityIntensityPow} setGravityIntensityPow={setGravityIntensityPow}
                                    gravityDirectionSat={gravityDirectionSat} setGravityDirectionSat={setGravityDirectionSat}
                                    gravityShowDirection={gravityShowDirection} setGravityShowDirection={setGravityShowDirection}
                                    gravityPlaneSize={gravityPlaneSize} setGravityPlaneSize={setGravityPlaneSize}
                                    gravityYOffset={gravityYOffset} setGravityYOffset={setGravityYOffset}
                                    gravityParticlesVisible={gravityParticlesVisible} setGravityParticlesVisible={setGravityParticlesVisible}
                                    gravityShowContours={gravityShowContours} setGravityShowContours={setGravityShowContours}
                                    gravityContourFreq={gravityContourFreq} setGravityContourFreq={setGravityContourFreq}
                                    gravityExcludeSun={gravityExcludeSun} setGravityExcludeSun={setGravityExcludeSun}
                                    gravityShowEquilibrium={gravityShowEquilibrium} setGravityShowEquilibrium={setGravityShowEquilibrium}
                                    gravityEquilibriumThreshold={gravityEquilibriumThreshold} setGravityEquilibriumThreshold={setGravityEquilibriumThreshold}
                                    gravityShowEffective={gravityShowEffective} setGravityShowEffective={setGravityShowEffective}
                                    showEarthGrid={showEarthGrid} setShowEarthGrid={setShowEarthGrid}
                                    accordionState={accordionState}
                                    toggleAccordion={toggleAccordion}
                                    date={simTime}
                                    onSetTime={handleSetTime}
                                />
                            </PanelShell>
                        )}
                    </ResizableSidebar>
                </div>

                {/* Bottom Bar */}
                <div className="flex-shrink-0">
                    <BottomBar
                        date={simTime}
                        fps={fps}
                        actualSpeed={actualSpeed}
                        paused={paused}
                        setPaused={setPaused}
                        onResetTime={handleResetTime}
                        speedLog={speedLog}
                        setSpeedLog={setSpeedLog}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;
