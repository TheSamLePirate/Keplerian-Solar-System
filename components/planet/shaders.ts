// Volumetric Rayleigh Scattering Shader (Local Space)
export const AtmosphereMaterial = {
    vertexShader: `
    varying vec3 vLocalPosition;

    void main() {
      vLocalPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    varying vec3 vLocalPosition;

    uniform vec3 color;
    uniform vec3 localSunPos;
    uniform vec3 localCameraPos;
    uniform float planetRadius;
    uniform float atmosphereRadius;
    uniform float densityFalloff;
    uniform float intensity;
    uniform int numSamples;

    #define PI 3.14159265359

    // Ray-Sphere intersection with sphere centered at (0,0,0)
    vec2 raySphere(vec3 origin, vec3 dir, float radius) {
        float b = dot(origin, dir);
        float c = dot(origin, origin) - radius * radius;
        float h = b*b - c;
        if (h < 0.0) return vec2(-1.0);
        h = sqrt(h);
        return vec2(-b - h, -b + h);
    }

    // Exponential density function
    float densityAtPoint(vec3 point, float pRadius, float aRadius) {
        float height = length(point) - pRadius;
        float height01 = height / (aRadius - pRadius);
        height01 = clamp(height01, 0.0, 1.0);
        return exp(-height01 * densityFalloff) * (1.0 - height01);
    }

    // Optical depth integration along a ray
    float opticalDepth(vec3 origin, vec3 dir, float rayLength, float pRadius, float aRadius) {
        float stepSize = rayLength / float(numSamples);
        float depth = 0.0;
        vec3 currentPos = origin;

        for(int i = 0; i < MAX_SAMPLES; i++) {
            if(i >= numSamples) break;
            vec3 samplePoint = currentPos + dir * (stepSize * 0.5);
            depth += densityAtPoint(samplePoint, pRadius, aRadius) * stepSize;
            currentPos += dir * stepSize;
        }
        return depth;
    }

    void main() {
        // All calculations in Local Space
        // The atmosphere sphere is centered at (0,0,0) in local space

        vec3 rayOrigin = localCameraPos;
        vec3 rayDir = normalize(vLocalPosition - localCameraPos);

        // Intersect Atmosphere (Outer Shell)
        vec2 atmHit = raySphere(rayOrigin, rayDir, atmosphereRadius);

        if (atmHit.y < 0.0) discard;

        // Start ray at camera (0) or atmosphere entry (atmHit.x)
        float startDist = max(0.0, atmHit.x);
        float endDist = atmHit.y;

        // Intersect Planet (Inner Sphere) to occlude background
        vec2 planetHit = raySphere(rayOrigin, rayDir, planetRadius);
        if (planetHit.x > 0.0) {
            endDist = min(endDist, planetHit.x);
        }

        // Ray Marching
        float rayLength = endDist - startDist;
        if (rayLength <= 0.0) discard;

        float stepSize = rayLength / float(numSamples);

        vec3 lightDir = normalize(localSunPos); // Sun direction in local space
        vec3 currentPos = rayOrigin + rayDir * startDist;

        vec3 totalScattering = vec3(0.0);
        float viewOpticalDepth = 0.0;

        // Base Rayleigh scattering coefficient with a subtle red boost
        vec3 baseCoeff = color * intensity * 18.0;
        baseCoeff.r *= 1.35;
        vec3 warmCoeff = vec3(1.0, 0.45, 0.22) * intensity * 18.0;

        float cosTheta = dot(rayDir, lightDir);
        float phase = 0.75 * (1.0 + cosTheta * cosTheta);

        for(int i = 0; i < MAX_SAMPLES; i++) {
            if(i >= numSamples) break;
            vec3 samplePoint = currentPos + rayDir * (stepSize * 0.5);

            float localDensity = densityAtPoint(samplePoint, planetRadius, atmosphereRadius);

            vec2 sunHit = raySphere(samplePoint, lightDir, atmosphereRadius);
            float sunDist = sunHit.y;

            vec2 sunPlanetHit = raySphere(samplePoint, lightDir, planetRadius);
            bool inShadow = false;
            // Intersection must be valid (>0) and closer than atmosphere exit to block sun
            if (sunPlanetHit.x > 0.0 && sunPlanetHit.x < sunDist) {
                inShadow = true;
            }

            if (!inShadow) {
                float sunOpticalDepthVal = opticalDepth(samplePoint, lightDir, sunDist, planetRadius, atmosphereRadius);
                viewOpticalDepth += localDensity * stepSize;

                // Warmer tint when the sun is near the horizon (more red/orange Rayleigh)
                float sunHeight = clamp(dot(lightDir, normalize(samplePoint)), 0.0, 1.0);
                float sunset = pow(1.0 - sunHeight, 2.0);
                vec3 scatteringCoeff = mix(baseCoeff, warmCoeff, sunset * 0.6);

                vec3 extinction = scatteringCoeff;
                vec3 transmittance = exp(-(viewOpticalDepth + sunOpticalDepthVal) * extinction);

                totalScattering += localDensity * stepSize * transmittance * scatteringCoeff * phase;
            }

            currentPos += rayDir * stepSize;
        }

        // Soften edges slightly based on path length through the atmosphere
        float thickness = rayLength / (atmosphereRadius - planetRadius);
        float edgeFade = smoothstep(0.0, 1.0, thickness);
        gl_FragColor = vec4(totalScattering * edgeFade, 1.0);
    }
    `,
};

export const EarthMaterial = {
    vertexShader: `
    #include <common>
    #include <logdepthbuf_pars_vertex>
    #include <shadowmap_pars_vertex>

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vLocalPosition;
    varying vec3 vSunDirection;

    uniform sampler2D displacementMap;
    uniform float displacementScale;

    void main() {
        vUv = uv;
        vLocalPosition = position;
        vNormal = normal; // Local normal

        // Vertex Displacement
        float disp = texture2D(displacementMap, uv).r;
        vec3 displacedPosition = position + normal * (disp * displacementScale);

        vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;

        #include <logdepthbuf_vertex>

        // Create world position for shadow map calculations
        vec3 transformedNormal = normal;
        // Note: For perfect shadows with displacement, we would recalculate normal here,
        // but original normal is fine for bias usually.

        #include <shadowmap_vertex>
    }
    `,
    fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    uniform samplerCube dayMap;
    uniform samplerCube nightMap;
    uniform samplerCube cloudMap;
    uniform sampler2D normalMap;
    uniform sampler2D specularMap;

    uniform vec3 sunDirection; // Local space
    uniform vec3 localCameraPos; // Local space
    uniform float cloudTime;
    uniform float cloudRotationOffset;
    uniform float cloudOpacity;
    uniform bool showClouds;
    uniform bool showNightLights;
    uniform float bumpScale;
    uniform float specularStrength;
    uniform float nightLightIntensity;
    uniform float dayIntensity;
    uniform float earthTextureOffset;

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    // Eclipse Uniforms
    uniform vec3 eclipseSunPos;
    uniform float eclipseSunRadius;
    uniform vec3 eclipseMoons[4];
    uniform float eclipseMoonRadii[4];
    uniform int numEclipseMoons;
    uniform float eclipseShadowIntensity;

    float calcEclipseShadow(vec3 surfPos, vec3 sunPos, float sunRad) {
        // if (eclipseShadowIntensity <= 0.0) return 0.0; // REMOVED

        
        float occlusion = 0.0;
        
        for(int i = 0; i < 4; i++) {
             if(i >= numEclipseMoons) break;
             
             vec3 moonPos = eclipseMoons[i];
             float moonRad = eclipseMoonRadii[i];
             
             vec3 toSun = sunPos - surfPos;
             float distSun = length(toSun);
             
             vec3 toMoon = moonPos - surfPos;
             float distMoon = length(toMoon);
             
             // 1. Basic check: Moon must be closer than Sun
             if (distMoon >= distSun) continue;

             // 2. Alignment Check (Dot Product)
             vec3 dirSun = normalize(toSun);
             vec3 dirMoon = normalize(toMoon);
             float cosTheta = dot(dirSun, dirMoon);
             
             // If moon is behind us or too far off angle, skip
             if (cosTheta <= 0.0) continue;

             // 3. Angular Sizes (in radians)
             // Use small angle approximation (radius / distance) for robust math
             float angRadSun = sunRad / distSun;
             float angRadMoon = moonRad / distMoon;

             // FIX: Ensure Moon is always visually large enough to cover the Sun
             // This compensates for the "Planet Scale" expanding the Sun's visual radius
             // faster than the Moon's relative angular size.
             // angRadMoon = max(angRadMoon, angRadSun * 1.02); // REMOVED


             // 4. Angular Separation
             float separation = acos(clamp(cosTheta, -1.0, 1.0));

             // 5. Shadow Calculation
             // We want to return 1.0 if fully blocked, 0.0 if not blocked.
             
             // Hard-edge check for debugging:
             // if (separation < angRadMoon) occlusion += 1.0; 

             // Soft-edge check (Penumbra)
             // Umbra starts when separation < (angRadMoon - angRadSun)
             // Penumbra ends when separation > (angRadMoon + angRadSun)
             
             float umbraLimit = abs(angRadMoon - angRadSun);
             float penumbraLimit = angRadMoon + angRadSun;

             // Note: If Moon < Sun (Transit), we can never get full occlusion physically.
             // But for visual effect, we might want to boost it.
             // Current Logic: Physic-based overlap area is complex.
             // Simplified Logic: Smoothstep from penumbra edge to center.

             if (separation > penumbraLimit) continue;

             float factor = 0.0;
             if (separation <= umbraLimit) {
                 if (angRadMoon >= angRadSun) {
                    factor = 1.0; // Total Eclipse
                 } else {
                    // Transit (Annular)
                    // Initial area approximation: (R_moon / R_sun)^2
                    factor = (angRadMoon * angRadMoon) / (angRadSun * angRadSun);
                    
                    // BOOST: Make transits more visible for debugging/visuals
                    // factor = mix(factor, 1.0, 0.5); 
                    // Let's keep it physical-ish but ensure min visibility
                    factor = max(factor, 0.5); // Force at least 50% darkness for any transit alignment
                 }
             } else {
                 // Penumbra Region
                 // Interpolate from 0 at penumbraLimit to 'factor' at umbraLimit
                 float t = (penumbraLimit - separation) / (penumbraLimit - umbraLimit);
                 // t is 0 at edge, 1 at umbra
                 
                 // Base factor for the umbra core
                 float coreFactor = (angRadMoon >= angRadSun) ? 1.0 : max((angRadMoon*angRadMoon)/(angRadSun*angRadSun), 0.5);
                 
                 factor = t * coreFactor;
             }
             
             occlusion += factor;
        }
        
        return clamp(occlusion, 0.0, 0.95); // Cap at 0.95 to keep *some* texture visible
    }

    // Easy normal mapping for sphere
    vec3 getNormal() {
        vec3 objectNormal = normalize(vNormal);
        vec3 normalSample = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;

        // TBN Matrix
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), objectNormal));
        if (length(tangent) < 0.001) tangent = vec3(1.0, 0.0, 0.0);
        vec3 bitangent = normalize(cross(objectNormal, tangent));

        mat3 tbn = mat3(tangent, bitangent, objectNormal);

        // Use normalStrength for XY (slope) and keeping Z (up) relative
        vec3 perturbed = tbn * normalize(vec3(normalSample.xy * bumpScale, normalSample.z));
        return normalize(perturbed);
    }

    void main() {
        #include <logdepthbuf_fragment>

        vec3 normal = getNormal();
        vec3 lightDir = normalize(sunDirection);
        vec3 viewDir = normalize(localCameraPos - vLocalPosition);

        // Diffuse factor
        float NdotL = dot(normal, lightDir);
        float diffuse = max(0.0, NdotL);

        // Calculate Shadow Mask (0.0 = shadowed, 1.0 = lit)
        float shadowMask = getShadowMask();

        // Apply shadow to diffuse lighting
        diffuse *= shadowMask;

        // Apply Eclipse Shadow
        float eclipseOcc = calcEclipseShadow(vLocalPosition, eclipseSunPos, eclipseSunRadius);
        float eclipseFactor = (1.0 - eclipseOcc * eclipseShadowIntensity);
        diffuse *= eclipseFactor;

        // Day/Night Mix Factor
        // We use the SHADOWED diffuse for mixing, so night lights turn on in shadow
        float mixFactor = smoothstep(-0.2, 0.2, diffuse);

        // Sample Cubemaps
        vec3 sampleDir = normalize(vLocalPosition);

        float theta = earthTextureOffset;
        float c = cos(theta);
        float s = sin(theta);
        mat3 rot = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);

        vec3 rotatedSampleDir = rot * sampleDir;

        vec4 dayColor = textureCube(dayMap, rotatedSampleDir);
        vec4 nightColor = textureCube(nightMap, rotatedSampleDir);

        // Specular (Ocean only)
        float specularMask = texture2D(specularMap, vUv).r;
        float specular = 0.0;
        if (NdotL > 0.0) {
            vec3 halfVector = normalize(lightDir + viewDir);
            float NdotH = max(0.0, dot(normal, halfVector));
            specular = pow(NdotH, 30.0) * specularMask * specularStrength * 2.0 * shadowMask * eclipseFactor;
        }

        // Base Color Mixing
        // Use the specular map to make the ocean brighter and give it more blue
        vec3 enhancedDayColor = dayColor.rgb + (specularMask * vec3(0.0, 0.15, 0.4));
        vec3 finalColor = enhancedDayColor * diffuse * dayIntensity + vec3(specular);

        if (showNightLights) {
             // Night lights should appear where it is "dark" (low mixFactor)
             // Use original NdotL for mixFactor if we want lights ONLY on night side
             // OR use shadowMask if we want lights during eclipses too.
             // Use NdotL for terminator mixing, but maybe shadowMask for eclipses?
             // Standard: Night lights are permanent on night side. Eclipses are just dark day.
             // So let's use the GEOMETRIC day/night for mixing night lights, not shadow.

             float geoMix = smoothstep(-0.2, 0.2, NdotL);
             finalColor += nightColor.rgb * (1.0 - geoMix) * nightLightIntensity;
        } else {
             float geoMix = smoothstep(-0.2, 0.2, NdotL);
             finalColor += dayColor.rgb * (1.0 - geoMix) * 0.05;
        }

        // Clouds
        if (showClouds) {
            float totalCloudAngle = cloudTime + cloudRotationOffset;
            float c = cos(totalCloudAngle);
            float s = sin(totalCloudAngle);
            mat3 rotation = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);

            vec3 cloudDir = rotation * rotatedSampleDir;
            vec4 cloudSample = textureCube(cloudMap, cloudDir);

            vec3 shadowDir = rotation * normalize(rotatedSampleDir + lightDir * 0.02);
            float cloudShadow = textureCube(cloudMap, shadowDir).r;

            finalColor *= (1.0 - cloudShadow * cloudOpacity * 0.5 * diffuse);

            float cloudDiffuse = max(0.0, dot(normalize(cloudDir), lightDir));
            float cloudLight = cloudDiffuse * shadowMask * eclipseFactor;

            // Fade out clouds on the night side to prevent them from showing as black patches
            float daySideMask = smoothstep(0.0, 0.1, NdotL);
            vec3 cloudColor = vec3(1.0) * cloudLight;
            finalColor = mix(finalColor, cloudColor, cloudSample.r * cloudOpacity * daySideMask);
        }
        
        // DEBUG: Red Shadow
        finalColor = mix(finalColor, vec3(1.0, 0.0, 0.0), eclipseOcc * (1.0 - clamp(eclipseShadowIntensity * 2.0, 0.0, 1.0)));


        gl_FragColor = vec4(finalColor, 1.0);
    }
    `,
};

export const MoonMaterial = {
    vertexShader: EarthMaterial.vertexShader, // Reuse Earth Vertex Shader (Displacement + LogDepth + Shadows)
    fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    uniform sampler2D map;
    uniform sampler2D normalMap;

    uniform vec3 sunDirection; // Local space
    uniform vec3 localCameraPos; // Local space
    uniform float bumpScale;
    uniform float dayIntensity;

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;



    // Eclipse Uniforms
    uniform vec3 eclipseSunPos;
    uniform float eclipseSunRadius;
    uniform vec3 eclipseMoons[4];
    uniform float eclipseMoonRadii[4];
    uniform int numEclipseMoons;
    uniform float eclipseShadowIntensity;

    float calcEclipseShadow(vec3 surfPos, vec3 sunPos, float sunRad) {
        // if (eclipseShadowIntensity <= 0.0) return 0.0; // REMOVED

        
        float occlusion = 0.0;
        
        for(int i = 0; i < 4; i++) {
             if(i >= numEclipseMoons) break;
             
             vec3 moonPos = eclipseMoons[i];
             float moonRad = eclipseMoonRadii[i];
             
             vec3 toSun = sunPos - surfPos;
             float distSun = length(toSun);
             
             vec3 toMoon = moonPos - surfPos;
             float distMoon = length(toMoon);
             
             // Check if Moon is in front
             if (dot(toSun, toMoon) <= 0.0) continue; 
             
             float angSun = atan(sunRad / distSun);
             float angMoon = atan(moonRad / distMoon);
             
             float cosTheta = dot(normalize(toSun), normalize(toMoon));
             float angDist = acos(clamp(cosTheta, -1.0, 1.0));
             
             // Simple bounds checks
             if (angDist >= angSun + angMoon) continue; // No intersection
             
             float coverage = 0.0;
             
             if (angDist <= abs(angMoon - angSun)) {
                 if (angMoon >= angSun) {
                     coverage = 1.0; // Total eclipse
                 } else {
                     coverage = (angMoon * angMoon) / (angSun * angSun); // Transit
                 }
             } else {
                 // Partial
                 float r1 = angSun;
                 float r2 = angMoon;
                 float d = angDist;
                 
                 float part1Term = (d*d + r1*r1 - r2*r2)/(2.0*d*r1);
                 float part2Term = (d*d + r2*r2 - r1*r1)/(2.0*d*r2);
                 part1Term = clamp(part1Term, -1.0, 1.0);
                 part2Term = clamp(part2Term, -1.0, 1.0);

                 float part1 = r1*r1 * acos(part1Term);
                 float part2 = r2*r2 * acos(part2Term);
                 float part3 = 0.5 * sqrt(max(0.0, (-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2)));
                 
                 float area = part1 + part2 - part3;
                 float sunArea = 3.14159265 * r1 * r1;
                 coverage = area / sunArea;
             }
             
             occlusion += coverage;
        }
        
        return clamp(occlusion, 0.0, 1.0);
    }

    // Easy normal mapping for sphere
    vec3 getNormal() {
        vec3 objectNormal = normalize(vNormal);
        vec3 normalSample = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;

        // TBN Matrix
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), objectNormal));
        if (length(tangent) < 0.001) tangent = vec3(1.0, 0.0, 0.0);
        vec3 bitangent = normalize(cross(objectNormal, tangent));

        mat3 tbn = mat3(tangent, bitangent, objectNormal);

        // Use normalStrength for XY (slope) and keeping Z (up) relative
        vec3 perturbed = tbn * normalize(vec3(normalSample.xy * bumpScale, normalSample.z));
        return normalize(perturbed);
    }

    void main() {
        #include <logdepthbuf_fragment>

        vec3 normal = getNormal();
        vec3 lightDir = normalize(sunDirection);
        // vec3 viewDir = normalize(localCameraPos - vLocalPosition); // Not needed for diffuse only

        // Diffuse factor
        float NdotL = dot(normal, lightDir);
        float diffuse = max(0.0, NdotL);

        // Calculate Shadow Mask (0.0 = shadowed, 1.0 = lit)
        float shadowMask = getShadowMask();

        // Apply shadow to diffuse lighting
        diffuse *= shadowMask;

        // Apply Eclipse Shadow
        float eclipseOcc = calcEclipseShadow(vLocalPosition, eclipseSunPos, eclipseSunRadius);
        diffuse *= (1.0 - eclipseOcc * eclipseShadowIntensity);

        // Sample Texture
        vec4 texColor = texture2D(map, vUv);

        // Final Color
        // Simple Diffuse Lighting
        vec3 finalColor = texColor.rgb * diffuse * dayIntensity;

        // Ambient fill (simulated bounce light)
        finalColor += texColor.rgb * 0.02;

        // Eclipse Shadow Tint (Black)
        finalColor = mix(finalColor, vec3(0.0, 0.0, 0.0), eclipseOcc * (1.0 - clamp(eclipseShadowIntensity * 2.0, 0.0, 1.0)));


        gl_FragColor = vec4(finalColor, 1.0);
    }
    `,
};

export const JupiterMaterial = {
    vertexShader: EarthMaterial.vertexShader,
    fragmentShader: `
    #include <common>
    #include <logdepthbuf_pars_fragment>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    uniform sampler2D map;
    uniform sampler2D normalMap;

    uniform vec3 sunDirection; // Local space
    uniform vec3 localCameraPos; // Local space
    uniform float bumpScale;
    uniform float dayIntensity;

    varying vec2 vUv;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;

    // Eclipse Uniforms
    uniform vec3 eclipseSunPos;
    uniform float eclipseSunRadius;
    uniform vec3 eclipseMoons[4];
    uniform float eclipseMoonRadii[4];
    uniform int numEclipseMoons;
    uniform float eclipseShadowIntensity;

    float calcEclipseShadow(vec3 surfPos, vec3 sunPos, float sunRad) {
        float occlusion = 0.0;
        
        for(int i = 0; i < 4; i++) {
             if(i >= numEclipseMoons) break;
             
             vec3 moonPos = eclipseMoons[i];
             float moonRad = eclipseMoonRadii[i];
             
             vec3 toSun = sunPos - surfPos;
             float distSun = length(toSun);
             
             vec3 toMoon = moonPos - surfPos;
             float distMoon = length(toMoon);
             
             if (dot(toSun, toMoon) <= 0.0) continue; 
             
             float angSun = atan(sunRad / distSun);
             float angMoon = atan(moonRad / distMoon);
             
             float cosTheta = dot(normalize(toSun), normalize(toMoon));
             float angDist = acos(clamp(cosTheta, -1.0, 1.0));
             
             if (angDist >= angSun + angMoon) continue; 
             
             float coverage = 0.0;
             
             if (angDist <= abs(angMoon - angSun)) {
                 if (angMoon >= angSun) {
                     coverage = 1.0; 
                 } else {
                     coverage = (angMoon * angMoon) / (angSun * angSun); 
                 }
             } else {
                 float r1 = angSun;
                 float r2 = angMoon;
                 float d = angDist;
                 
                 float part1Term = (d*d + r1*r1 - r2*r2)/(2.0*d*r1);
                 float part2Term = (d*d + r2*r2 - r1*r1)/(2.0*d*r2);
                 part1Term = clamp(part1Term, -1.0, 1.0);
                 part2Term = clamp(part2Term, -1.0, 1.0);

                 float part1 = r1*r1 * acos(part1Term);
                 float part2 = r2*r2 * acos(part2Term);
                 float part3 = 0.5 * sqrt(max(0.0, (-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2)));
                 
                 float area = part1 + part2 - part3;
                 float sunArea = 3.14159265 * r1 * r1;
                 coverage = area / sunArea;
             }
             
             occlusion += coverage;
        }
        
        return clamp(occlusion, 0.0, 1.0);
    }

    vec3 getNormal() {
        vec3 objectNormal = normalize(vNormal);
        vec3 normalSample = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;

        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), objectNormal));
        if (length(tangent) < 0.001) tangent = vec3(1.0, 0.0, 0.0);
        vec3 bitangent = normalize(cross(objectNormal, tangent));

        mat3 tbn = mat3(tangent, bitangent, objectNormal);

        vec3 perturbed = tbn * normalize(vec3(normalSample.xy * bumpScale, normalSample.z));
        return normalize(perturbed);
    }

    void main() {
        #include <logdepthbuf_fragment>

        vec3 normal = getNormal();
        vec3 lightDir = normalize(sunDirection);

        float NdotL = dot(normal, lightDir);
        float diffuse = max(0.0, NdotL);

        float shadowMask = getShadowMask();
        diffuse *= shadowMask;

        float eclipseOcc = calcEclipseShadow(vLocalPosition, eclipseSunPos, eclipseSunRadius);
        diffuse *= (1.0 - eclipseOcc * eclipseShadowIntensity);

        vec4 texColor = texture2D(map, vUv);
        vec3 finalColor = texColor.rgb * diffuse * dayIntensity;
        finalColor += texColor.rgb * 0.02;

        // Eclipse Shadow Tint (Black)
        finalColor = mix(finalColor, vec3(0.0, 0.0, 0.0), eclipseOcc * (1.0 - clamp(eclipseShadowIntensity * 2.0, 0.0, 1.0)));

        gl_FragColor = vec4(finalColor, 1.0);
    }
    `,
};
