import React, { memo } from "react";
import AccordionSection from "./ui/AccordionSection";
import { SIMULATION_EPOCH } from "../constants";
import { AppSettings, SettingsSetter } from "../settings/types";

interface ControlsProps {
  settings: AppSettings;
  set: SettingsSetter;
  resetSettings: () => void;
  isFollowing: boolean;
  setIsFollowing: (b: boolean) => void;
  onResetCamera: () => void;
  accordionState: Record<string, boolean>;
  toggleAccordion: (id: string) => void;
  date: number;
  onSetTime: (t: number) => void;
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}> = ({ label, value, min, max, step, onChange, format, disabled }) => (
  <div className={`flex flex-col gap-0.5 ${disabled ? "opacity-40" : ""}`}>
    <div className="flex justify-between text-[10px] text-gray-400">
      <span>{label}</span>
      <span className="font-mono">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

const Toggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between text-[10px] text-gray-400">
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-blue-500"
    />
  </div>
);
const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center text-[10px] text-gray-400">
    <span>{label}</span>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-6 h-4 border-none p-0 bg-transparent cursor-pointer"
    />
  </div>
);

const Controls: React.FC<ControlsProps> = ({
  settings: s,
  set,
  resetSettings,
  isFollowing,
  setIsFollowing,
  onResetCamera,
  accordionState,
  toggleAccordion,
  date,
  onSetTime,
}) => {
  // Date/Time Helpers
  const currentTimestamp = SIMULATION_EPOCH + date * 86400 * 1000;
  const currentDate = new Date(currentTimestamp);
  const localIsoString = new Date(
    currentDate.getTime() - currentDate.getTimezoneOffset() * 60000,
  )
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
      <AccordionSection
        title="Camera"
        isOpen={accordionState.camera ?? true}
        onToggle={() => toggleAccordion("camera")}
      >
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${isFollowing
              ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]"
              : "bg-transparent border-white/20 text-gray-400 hover:text-white hover:border-white/50"
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

        <div className="mt-2">
          <Slider
            label="Transition Speed"
            value={s.cameraTransitionSpeed}
            min={0.01}
            max={2}
            step={0.01}
            onChange={(v) => set("cameraTransitionSpeed", v)}
            format={(v) => v.toFixed(2)}
          />
        </div>

        <div className="mt-2 text-[10px] text-gray-400">
          <span className="mb-1 block">Alignment (Up)</span>
          <div className="flex gap-1">
            <button
              onClick={() => set("cameraMode", "equatorial")}
              className={`flex-1 py-1 rounded border transition-colors ${s.cameraMode === "equatorial" ? "bg-blue-600 border-blue-500 text-white" : "border-gray-600 text-gray-400 hover:border-white"}`}
            >
              Equatorial
            </button>
            <button
              onClick={() => set("cameraMode", "ecliptic")}
              className={`flex-1 py-1 rounded border transition-colors ${s.cameraMode === "ecliptic" ? "bg-orange-600 border-orange-500 text-white" : "border-gray-600 text-gray-400 hover:border-white"}`}
            >
              Ecliptic
            </button>
          </div>
        </div>
      </AccordionSection>

      {/* Earth Graphics */}
      <AccordionSection
        title="Earth Graphics"
        isOpen={accordionState.earth ?? true}
        onToggle={() => toggleAccordion("earth")}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>Texture Quality</span>
            <div className="flex gap-1">
              {["low", "med", "high", "ultra"].map((lod) => (
                <button
                  key={lod}
                  onClick={() => set("earthTextureLOD", lod as any)}
                  className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${s.earthTextureLOD === lod
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}
                >
                  {lod}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1 mt-1 border-t border-white/5">
            <Toggle
              label="Clouds"
              checked={s.showClouds}
              onChange={(v) => set("showClouds", v)}
            />
            {s.showClouds && (
              <div className="flex flex-col gap-1 mt-1 pl-2 border-l border-white/5">
                <Slider
                  label="Speed"
                  value={s.cloudSpeed}
                  min={0}
                  max={0.2}
                  step={0.001}
                  onChange={(v) => set("cloudSpeed", v)}
                  format={(v) => v.toFixed(3)}
                />
                <Slider
                  label="Opacity"
                  value={s.cloudOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => set("cloudOpacity", v)}
                  format={(v) => v.toFixed(2)}
                />
                <Slider
                  label="Offset"
                  value={s.cloudRotationOffset}
                  min={0}
                  max={6.28}
                  step={0.01}
                  onChange={(v) => set("cloudRotationOffset", v)}
                  format={(v) => ((v * 180) / Math.PI).toFixed(0) + "°"}
                />
              </div>
            )}
          </div>

          <div className="pt-1 mt-1 border-t border-white/5">
            <Toggle
              label="Night Lights"
              checked={s.showNightLights}
              onChange={(v) => set("showNightLights", v)}
            />
          </div>

          <div className="pt-1 mt-1 border-t border-white/5">
            <Slider
              label="Normal Scale"
              value={s.bumpScale}
              min={0}
              max={3.0}
              step={0.1}
              onChange={(v) => set("bumpScale", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Displacement"
              value={s.displacementScale}
              min={0}
              max={0.2}
              step={0.001}
              onChange={(v) => set("displacementScale", v)}
              format={(v) => v.toFixed(3)}
            />
            <Slider
              label="Specular Strength"
              value={s.specularStrength}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => set("specularStrength", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Night Intensity"
              value={s.nightLightIntensity}
              min={0}
              max={10}
              step={0.1}
              onChange={(v) => set("nightLightIntensity", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Day Intensity"
              value={s.dayIntensity}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => set("dayIntensity", v)}
              format={(v) => v.toFixed(1)}
            />

            <div className="pt-1 mt-1 border-t border-white/5">
              <h4 className="text-[9px] uppercase font-bold text-gray-500 mb-1">
                Alignment Calibration
              </h4>
              <Slider
                label="Mesh Rotation"
                value={s.earthRotationOffset}
                min={0}
                max={6.28}
                step={0.01}
                onChange={(v) => set("earthRotationOffset", v)}
                format={(v) => ((v * 180) / Math.PI).toFixed(0) + "°"}
              />
              <Slider
                label="Layer Offset"
                value={s.earthTextureOffset}
                min={0}
                max={6.28}
                step={0.01}
                onChange={(v) => set("earthTextureOffset", v)}
                format={(v) => ((v * 180) / Math.PI).toFixed(0) + "°"}
              />
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Simulation */}
      <AccordionSection
        title="Simulation"
        isOpen={accordionState.simulation ?? true}
        onToggle={() => toggleAccordion("simulation")}
      >
        {/* Date Control */}
        <div className="flex flex-col gap-2 mb-4 bg-black/40 p-2 rounded border border-white/5 relative group">
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span className="uppercase tracking-widest text-[9px] font-bold">
              Flight Time
            </span>
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
                <span className="text-[9px] text-gray-500 font-mono uppercase">
                  UTC{localIsoString.slice(19)}
                </span>
              </div>
            </div>

            {/* Hidden Input Overlay */}
            <input
              type="datetime-local"
              value={localIsoString}
              onChange={handleDateChange}
              onClick={(e) => {
                try {
                  if ("showPicker" in e.currentTarget) {
                    (e.currentTarget as any).showPicker();
                  }
                } catch {
                  // Ignore errors if showPicker is not supported or allowed
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 border border-blue-500/0 group-hover:border-blue-500/30 rounded pointer-events-none transition-all duration-500 shadow-[0_0_0_0_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_0_rgba(59,130,246,0.15)]" />
          </div>
        </div>

        <Slider
          label="Time Speed"
          value={s.speedLog}
          min={0}
          max={100}
          step={1}
          onChange={(v) => set("speedLog", v)}
          format={(v) => `${v.toFixed(0)}%`}
        />

        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-white/5 rounded border border-white/5">
          <label className="flex items-center gap-1.5 cursor-pointer select-none group">
            <div
              className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center transition-colors ${s.showOrbits ? "bg-blue-500 border-blue-500" : "border-gray-500 group-hover:border-white"}`}
            >
              {s.showOrbits && (
                <svg
                  className="w-2 h-2 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={4}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-[10px] text-gray-300 group-hover:text-white">
              Orbits
            </span>
            <input
              type="checkbox"
              checked={s.showOrbits}
              onChange={(e) => set("showOrbits", e.target.checked)}
              className="hidden"
            />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none group">
            <div
              className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center transition-colors ${s.showLabels ? "bg-blue-500 border-blue-500" : "border-gray-500 group-hover:border-white"}`}
            >
              {s.showLabels && (
                <svg
                  className="w-2 h-2 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={4}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-[10px] text-gray-300 group-hover:text-white">
              Labels
            </span>
            <input
              type="checkbox"
              checked={s.showLabels}
              onChange={(e) => set("showLabels", e.target.checked)}
              className="hidden"
            />
          </label>
        </div>

        <Slider
          label="Planet Scale"
          value={s.scaleFactor}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(v) => set("scaleFactor", v)}
          format={(v) => `${v.toFixed(1)}x`}
        />
      </AccordionSection>

      {/* Gravity Field */}
      <AccordionSection
        title="Gravity Field"
        isOpen={accordionState.gravity ?? false}
        onToggle={() => toggleAccordion("gravity")}
      >
        <div className="pb-1 border-b border-white/5 mb-1">
          <Toggle
            label="Show Potential"
            checked={s.gravityVisible}
            onChange={(v) => set("gravityVisible", v)}
          />
          <Toggle
            label="Show Particles (100k)"
            checked={s.gravityParticlesVisible}
            onChange={(v) => set("gravityParticlesVisible", v)}
          />
        </div>
        {s.gravityVisible && (
          <div className="flex flex-col gap-1 mt-1">
            <Toggle
              label="Show Direction"
              checked={s.gravityShowDirection}
              onChange={(v) => set("gravityShowDirection", v)}
            />
            <Toggle
              label="Show Contours"
              checked={s.gravityShowContours}
              onChange={(v) => set("gravityShowContours", v)}
            />
            <Toggle
              label="Show Equilibrium"
              checked={s.gravityShowEquilibrium}
              onChange={(v) => set("gravityShowEquilibrium", v)}
            />
            <Toggle
              label="Show Eff. Potential"
              checked={s.gravityShowEffective}
              onChange={(v) => set("gravityShowEffective", v)}
            />
            <Toggle
              label="Exclude Sun"
              checked={s.gravityExcludeSun}
              onChange={(v) => set("gravityExcludeSun", v)}
            />
            {s.gravityShowEquilibrium && (
              <Slider
                label="Equilibrium Thresh (Log)"
                value={Math.log10(s.gravityEquilibriumThreshold)}
                min={-10}
                max={1}
                step={0.1}
                onChange={(v) =>
                  set("gravityEquilibriumThreshold", Math.pow(10, v))
                }
                format={(v) => `1e${v.toFixed(1)}`}
              />
            )}
            {s.gravityShowContours && (
              <Slider
                label="Contour Frequency"
                value={s.gravityContourFreq}
                min={10}
                max={1000}
                step={10}
                onChange={(v) => set("gravityContourFreq", v)}
                format={(v) => v.toFixed(0)}
              />
            )}
            <Slider
              label="Opacity"
              value={s.gravityOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => set("gravityOpacity", v)}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Min Strength (Log)"
              value={Math.log10(s.gravityMin)}
              min={-10}
              max={-2}
              step={0.1}
              onChange={(v) => set("gravityMin", Math.pow(10, v))}
              format={(v) => `1e${v.toFixed(1)}`}
            />
            <Slider
              label="Max Strength (Log)"
              value={Math.log10(s.gravityMax)}
              min={-8}
              max={0}
              step={0.1}
              onChange={(v) => set("gravityMax", Math.pow(10, v))}
              format={(v) => `1e${v.toFixed(1)}`}
            />
            <Slider
              label="Intensity Power"
              value={s.gravityIntensityPow}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(v) => set("gravityIntensityPow", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Direction Saturation"
              value={s.gravityDirectionSat}
              min={0.0}
              max={2.0}
              step={0.1}
              onChange={(v) => set("gravityDirectionSat", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Plane Size (AU)"
              value={s.gravityPlaneSize}
              min={50}
              max={500}
              step={10}
              onChange={(v) => set("gravityPlaneSize", v)}
              format={(v) => v.toFixed(0)}
            />
            <Slider
              label="Y Offset"
              value={s.gravityYOffset}
              min={-50}
              max={50}
              step={1}
              onChange={(v) => set("gravityYOffset", v)}
              format={(v) => v.toFixed(1)}
            />
          </div>
        )}
      </AccordionSection>

      {/* Volumetric Light */}
      <AccordionSection
        title="Volumetric Light"
        isOpen={accordionState.volumetric ?? false}
        onToggle={() => toggleAccordion("volumetric")}
      >
        <Toggle
          label="Enable"
          checked={s.volumetricEnabled}
          onChange={(v) => set("volumetricEnabled", v)}
        />
        {s.volumetricEnabled && (
          <div className="flex flex-col gap-1 mt-1">
            <Slider
              label="Intensity"
              value={s.volumetricIntensity}
              min={0}
              max={2}
              step={0.01}
              onChange={(v) => set("volumetricIntensity", v)}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Samples"
              value={s.volumetricSamples}
              min={16}
              max={128}
              step={8}
              onChange={(v) => set("volumetricSamples", Math.round(v))}
              format={(v) => v.toFixed(0)}
            />
            <Slider
              label="Decay"
              value={s.volumetricDecay}
              min={0.5}
              max={5}
              step={0.1}
              onChange={(v) => set("volumetricDecay", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Shadow Sharpness"
              value={s.volumetricShadowSharpness}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => set("volumetricShadowSharpness", v)}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="Shadow Scale"
              value={s.volumetricShadowScale}
              min={1}
              max={2000}
              step={1}
              onChange={(v) => set("volumetricShadowScale", v)}
              format={(v) => `${v.toFixed(0)}x`}
            />
            <Slider
              label="Max Distance (AU)"
              value={s.volumetricMaxDistance}
              min={1}
              max={30}
              step={1}
              onChange={(v) => set("volumetricMaxDistance", v)}
              format={(v) => v.toFixed(0)}
            />
            <ColorPicker
              label="Scatter Color"
              value={s.volumetricScatterColor}
              onChange={(v) => set("volumetricScatterColor", v)}
            />
          </div>
        )}
      </AccordionSection>

      {/* Lighting */}
      <AccordionSection
        title="Lighting"
        isOpen={accordionState.lighting ?? false}
        onToggle={() => toggleAccordion("lighting")}
      >
        <Slider
          label="Sun Luminosity"
          value={s.sunLuminosity}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => set("sunLuminosity", v)}
          format={(v) => v.toFixed(1)}
        />
        <Slider
          label="Ambient Light"
          value={s.ambientLight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("ambientLight", v)}
          format={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Slider
          label="Eclipse Strength"
          value={s.eclipseShadowIntensity ?? 0}
          min={0}
          max={10}
          step={0.05}
          onChange={(v) => set("eclipseShadowIntensity", v)}
          format={(v) => v.toFixed(2)}
        />
      </AccordionSection>

      {/* Sun Shader */}
      <AccordionSection
        title="Sun"
        isOpen={accordionState.sun ?? false}
        onToggle={() => toggleAccordion("sun")}
      >
        <Toggle
          label="Enable Shader"
          checked={s.sunShaderEnabled}
          onChange={(v) => set("sunShaderEnabled", v)}
        />
        {s.sunShaderEnabled && (
          <div className="flex flex-col gap-1 mt-1">
            <ColorPicker
              label="Core Color"
              value={s.sunColorA}
              onChange={(v) => set("sunColorA", v)}
            />
            <ColorPicker
              label="Edge Color"
              value={s.sunColorB}
              onChange={(v) => set("sunColorB", v)}
            />
            <Slider
              label="Animation Speed"
              value={s.sunSpeed}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => set("sunSpeed", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Noise Scale"
              value={s.sunNoiseScale}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(v) => set("sunNoiseScale", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Turbulence"
              value={s.sunTurbulence}
              min={0}
              max={2}
              step={0.1}
              onChange={(v) => set("sunTurbulence", v)}
              format={(v) => v.toFixed(1)}
            />
            <Slider
              label="Ray Count"
              value={s.sunRayCount}
              min={4}
              max={20}
              step={1}
              onChange={(v) => set("sunRayCount", v)}
              format={(v) => v.toFixed(0)}
            />
            <div className="pt-1 mt-1 border-t border-white/5 flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold text-gray-500 mb-1">
                Advanced
              </span>
              <Toggle
                label="Coronas/Atmosphere"
                checked={s.sunCoronas}
                onChange={(v) => set("sunCoronas", v)}
              />
              <Slider
                label="Spot Intensity"
                value={s.sunSpotIntensity}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => set("sunSpotIntensity", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Spot Count"
                value={s.sunSpotCount}
                min={1}
                max={20}
                step={0.5}
                onChange={(v) => set("sunSpotCount", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Rim Power"
                value={s.sunRimPower}
                min={0.5}
                max={5}
                step={0.1}
                onChange={(v) => set("sunRimPower", v)}
                format={(v) => v.toFixed(1)}
              />
              <ColorPicker
                label="Rim Color"
                value={s.sunRimColor}
                onChange={(v) => set("sunRimColor", v)}
              />
              <Slider
                label="Corona Opacity"
                value={s.sunCoronaOpacity ?? 0.6}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set("sunCoronaOpacity", v)}
                format={(v) => v.toFixed(2)}
              />
              <Slider
                label="Prominence Size"
                value={s.sunProminenceSize ?? 1.0}
                min={0.1}
                max={3.0}
                step={0.1}
                onChange={(v) => set("sunProminenceSize", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Filament Scale"
                value={s.sunFilamentScale ?? 1.0}
                min={0.1}
                max={5.0}
                step={0.1}
                onChange={(v) => set("sunFilamentScale", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Filament Intensity"
                value={s.sunFilamentIntensity ?? 1.0}
                min={0}
                max={3.0}
                step={0.1}
                onChange={(v) => set("sunFilamentIntensity", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Surface Relief"
                value={s.sunSurfaceRelief ?? 0.1}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(v) => set("sunSurfaceRelief", v)}
                format={(v) => v.toFixed(2)}
              />
            </div>

            <div className="pt-1 mt-1 border-t border-white/5 flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold text-gray-500 mb-1">
                Lens Flare
              </span>
              <Toggle
                label="Enable Lens Flare"
                checked={s.lensflareEnabled}
                onChange={(v) => set("lensflareEnabled", v)}
              />
              {s.lensflareEnabled && (
                <Slider
                  label="Opacity"
                  value={s.lensflareOpacity}
                  min={0}
                  max={1}
                  step={0.1}
                  onChange={(v) => set("lensflareOpacity", v)}
                  format={(v) => v.toFixed(1)}
                />
              )}
            </div>
          </div>
        )}
      </AccordionSection>
      <AccordionSection
        title="Visual Quality"
        isOpen={accordionState.quality ?? false}
        onToggle={() => toggleAccordion("quality")}
      >
        <Toggle
          label="Shadows"
          checked={s.shadowEnabled}
          onChange={(v) => set("shadowEnabled", v)}
        />

        <div className={s.shadowEnabled ? "" : "opacity-40"}>
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Shadow Resolution</span>
              <span className="font-mono">{s.shadowMapSize}px</span>
            </div>
            <select
              value={s.shadowMapSize}
              onChange={(e) =>
                set("shadowMapSize", parseInt(e.target.value, 10))
              }
              disabled={!s.shadowEnabled}
              className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-gray-200"
            >
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
              <option value={8192}>8192</option>
              <option value={16384}>16384</option>
            </select>
          </div>

          <Slider
            label="Shadow Softness"
            value={s.shadowRadius}
            min={0}
            max={5}
            step={0.5}
            onChange={(v) => set("shadowRadius", v)}
            disabled={!s.shadowEnabled}
            format={(v) => v.toFixed(1)}
          />
        </div>

        <Slider
          label="Render Scale"
          value={s.renderScale}
          min={0.75}
          max={2}
          step={0.25}
          onChange={(v) => set("renderScale", v)}
          format={(v) => `${v.toFixed(2)}x`}
        />
        <Slider
          label="Star Count (Top ~N)"
          value={s.starsCount}
          min={2000}
          max={20000}
          step={1000}
          onChange={(v) => set("starsCount", Math.round(v))}
          format={(v) => `${v}`}
        />

        <div className="pt-1 mt-1 border-t border-white/5 flex flex-col gap-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Star Shader
          </span>
          <Slider
            label="Base Size"
            value={s.starSize}
            min={0.1}
            max={5.0}
            step={0.1}
            onChange={(v) => set("starSize", v)}
            format={(v) => v.toFixed(1)}
          />
          <Slider
            label="Mag -> Size"
            value={s.starSizeMagShape}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => set("starSizeMagShape", v)}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="Base Brightness"
            value={s.starBrightness}
            min={0.1}
            max={2.0}
            step={0.1}
            onChange={(v) => set("starBrightness", v)}
            format={(v) => v.toFixed(1)}
          />
          <Slider
            label="Mag -> Brightness"
            value={s.starBrightnessMagShape}
            min={0.05}
            max={1.0}
            step={0.05}
            onChange={(v) => set("starBrightnessMagShape", v)}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="Saturation"
            value={s.starSaturation}
            min={0}
            max={2.0}
            step={0.1}
            onChange={(v) => set("starSaturation", v)}
            format={(v) => v.toFixed(1)}
          />
          <div className="pt-1 mt-1 border-t border-white/5">
            <Toggle
              label="Show Constellations"
              checked={s.showConstellations}
              onChange={(v) => set("showConstellations", v)}
            />
            <Toggle
              label="Show Celestial Grid"
              checked={s.showCelestialGrid}
              onChange={(v) => set("showCelestialGrid", v)}
            />
            <Toggle
              label="Show Earth Grid"
              checked={s.showEarthGrid}
              onChange={(v) => set("showEarthGrid", v)}
            />
            {s.showCelestialGrid && (
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => set("gridMode", "equatorial")}
                  className={`flex-1 text-[9px] font-bold uppercase py-0.5 rounded border ${s.gridMode === "equatorial" ? "bg-blue-600 border-blue-500 text-white" : "border-gray-600 text-gray-400"}`}
                >
                  Equatorial
                </button>
                <button
                  onClick={() => set("gridMode", "ecliptic")}
                  className={`flex-1 text-[9px] font-bold uppercase py-0.5 rounded border ${s.gridMode === "ecliptic" ? "bg-orange-600 border-orange-500 text-white" : "border-gray-600 text-gray-400"}`}
                >
                  Ecliptic (Az)
                </button>
              </div>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* ISS Model */}
      <AccordionSection
        title="ISS Model"
        isOpen={accordionState.iss ?? false}
        onToggle={() => toggleAccordion("iss")}
      >
        <div className="flex gap-1.5">
          <button
            onClick={() => set("issModel", "small")}
            className={`flex-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${s.issModel === "small"
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white"
              }`}
          >
            Small
          </button>
          <button
            onClick={() => set("issModel", "big")}
            className={`flex-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${s.issModel === "big"
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white"
              }`}
          >
            Detailed
          </button>
        </div>
      </AccordionSection>

      {/* Atmosphere */}
      <AccordionSection
        title="Atmosphere"
        isOpen={accordionState.atmosphere ?? false}
        onToggle={() => toggleAccordion("atmosphere")}
      >
        <Slider
          label="Density / Opacity"
          value={s.atmOpacity}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => set("atmOpacity", v)}
          format={(v) => v.toFixed(1)}
        />
        <Slider
          label="Thickness (Falloff)"
          value={s.atmPow}
          min={0.5}
          max={8}
          step={0.1}
          onChange={(v) => set("atmPow", v)}
          format={(v) => v.toFixed(1)}
        />
        <Slider
          label="Quality (Samples)"
          value={s.atmSamples}
          min={8}
          max={64}
          step={1}
          onChange={(v) => set("atmSamples", Math.round(v))}
          format={(v) => `${v}`}
        />
      </AccordionSection>

      {/* Post-Processing */}
      <AccordionSection
        title="Post-Processing"
        isOpen={accordionState.postprocess ?? false}
        onToggle={() => toggleAccordion("postprocess")}
      >
        {/* Ambient Occlusion */}
        <div className="pb-1 border-b border-white/5 mb-1">
          <Toggle
            label="Ambient Occlusion"
            checked={s.enableAO}
            onChange={(v) => set("enableAO", v)}
          />
          {s.enableAO && (
            <div className="flex flex-col gap-1 mt-1">
              <Toggle
                label="Screen Space Radius"
                checked={s.aoScreenSpace}
                onChange={(v) => set("aoScreenSpace", v)}
              />
              <Slider
                label="Intensity"
                value={s.aoIntensity}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => set("aoIntensity", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Radius"
                value={s.aoRadius}
                min={0}
                max={10}
                step={0.01}
                onChange={(v) => set("aoRadius", v)}
                format={(v) => v.toFixed(2)}
              />
              <Slider
                label="Distance Falloff"
                value={s.aoDistanceFalloff}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => set("aoDistanceFalloff", v)}
                format={(v) => v.toFixed(1)}
              />
            </div>
          )}
        </div>

        <Slider
          label="Exposure"
          value={s.exposure}
          min={0}
          max={4}
          step={0.1}
          onChange={(v) => set("exposure", v)}
        />
        <Toggle
          label="Adaptive Tone Mapping"
          checked={s.toneMappingAdaptive}
          onChange={(v) => set("toneMappingAdaptive", v)}
        />

        {/* Bloom */}
        <div className="pt-1 border-t border-white/5">
          <Toggle
            label="Bloom"
            checked={s.enableBloom}
            onChange={(v) => set("enableBloom", v)}
          />
          {s.enableBloom && (
            <div className="flex flex-col gap-1 mt-1">
              <Slider
                label="Threshold"
                value={s.bloomThreshold}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => set("bloomThreshold", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Intensity"
                value={s.bloomIntensity}
                min={0}
                max={3}
                step={0.1}
                onChange={(v) => set("bloomIntensity", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Radius"
                value={s.bloomRadius}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set("bloomRadius", v)}
              />
              <Slider
                label="Smoothing"
                value={s.bloomSmoothing}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set("bloomSmoothing", v)}
              />
              <Toggle
                label="Mipmap Blur"
                checked={s.bloomMipmapBlur}
                onChange={(v) => set("bloomMipmapBlur", v)}
              />
            </div>
          )}
        </div>

        {/* Vignette */}
        <div className="pt-1 border-t border-white/5">
          <Toggle
            label="Vignette"
            checked={s.enableVignette}
            onChange={(v) => set("enableVignette", v)}
          />
          {s.enableVignette && (
            <div className="flex flex-col gap-1 mt-1">
              <Slider
                label="Darkness"
                value={s.vignetteDarkness}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set("vignetteDarkness", v)}
                format={(v) => v.toFixed(1)}
              />
              <Slider
                label="Offset"
                value={s.vignetteOffset}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set("vignetteOffset", v)}
              />
              <Toggle
                label="Eskil"
                checked={s.vignetteEskil}
                onChange={(v) => set("vignetteEskil", v)}
              />
            </div>
          )}
        </div>

        {/* Noise */}
        <div className="pt-1 border-t border-white/5">
          <Toggle
            label="Noise"
            checked={s.enableNoise}
            onChange={(v) => set("enableNoise", v)}
          />
          {s.enableNoise && (
            <div className="flex flex-col gap-1 mt-1">
              <Slider
                label="Opacity"
                value={s.noiseOpacity}
                min={0}
                max={0.2}
                step={0.005}
                onChange={(v) => set("noiseOpacity", v)}
                format={(v) => v.toFixed(3)}
              />
              <Toggle
                label="Premultiply"
                checked={s.noisePremultiply}
                onChange={(v) => set("noisePremultiply", v)}
              />
            </div>
          )}
        </div>

        {/* Chromatic Aberration */}
        <div className="pt-1 border-t border-white/5">
          <Toggle
            label="Chromatic Aberration"
            checked={s.enableChromaticAberration}
            onChange={(v) => set("enableChromaticAberration", v)}
          />
          {s.enableChromaticAberration && (
            <div className="flex flex-col gap-1 mt-1">
              <Slider
                label="Offset"
                value={s.chromaticAberrationOffset}
                min={0}
                max={0.01}
                step={0.0001}
                onChange={(v) => set("chromaticAberrationOffset", v)}
                format={(v) => v.toFixed(3)}
              />
              <Slider
                label="Modulation"
                value={s.chromaticModulation}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => set("chromaticModulation", v)}
                format={(v) => v.toFixed(1)}
              />
              <Toggle
                label="Radial"
                checked={s.chromaticRadial}
                onChange={(v) => set("chromaticRadial", v)}
              />
            </div>
          )}
        </div>

        {/* Color & Tone */}
        <div className="pt-1 border-t border-white/5">
          <Toggle
            label="Brightness / Contrast"
            checked={s.enableBrightnessContrast}
            onChange={(v) => set("enableBrightnessContrast", v)}
          />
          {s.enableBrightnessContrast && (
            <div className="flex flex-col gap-1 mt-1">
              <Slider
                label="Brightness"
                value={s.brightness}
                min={-0.5}
                max={0.5}
                step={0.05}
                onChange={(v) => set("brightness", v)}
              />
              <Slider
                label="Contrast"
                value={s.contrast}
                min={-0.5}
                max={0.5}
                step={0.05}
                onChange={(v) => set("contrast", v)}
              />
            </div>
          )}

          <div className="mt-1">
            <Toggle
              label="Hue / Saturation"
              checked={s.enableHueSaturation}
              onChange={(v) => set("enableHueSaturation", v)}
            />
          </div>
          {s.enableHueSaturation && (
            <div className="flex flex-col gap-1 mt-1">
              <Slider
                label="Hue Shift"
                value={s.hue}
                min={0}
                max={6.28}
                step={0.1}
                onChange={(v) => set("hue", v)}
              />
              <Slider
                label="Saturation"
                value={s.saturation}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => set("saturation", v)}
              />
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Reset All Settings */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={resetSettings}
          className="w-full px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 hover:border-red-500/40 hover:text-red-300 transition-all"
        >
          Reset All Settings
        </button>
      </div>
    </div>
  );
};

export default memo(Controls);
