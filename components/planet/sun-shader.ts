import * as THREE from 'three';

// Shared Noise Functions
const noiseChunk = `
    // Simplex 3D Noise 
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) { 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        // Permutations
        i = mod289(i); 
        vec4 p = permute( permute( permute( 
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        float n_ = 0.142857142857; 
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );  

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                      dot(p2,x2), dot(p3,x3) ) );
    }

    float fbm(vec3 p) {
        float f = 0.0;
        float amp = 0.5;
        f += amp * abs(snoise(p)); p *= 2.0; amp *= 0.5;
        f += amp * abs(snoise(p)); p *= 2.0; amp *= 0.5;
        f += amp * abs(snoise(p)); p *= 2.0; amp *= 0.5;
        return f;
    }
`;

export const SunMaterial = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vLayer0;
    varying vec3 vLayer1;
    varying vec3 vLayer2;

    uniform float uTime;
    uniform float uSpeed;
    uniform float uNoiseScale;
    uniform float uSurfaceRelief;

    ${noiseChunk}

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      // Calculate basic noise for displacement in Vertex Shade
      // Needs to match the look of the fragment shader loosely
      float t = uTime * uSpeed * 0.05;
      
      vec3 p0 = position;
      // Simple rotation to match
      float n = fbm(p0 * uNoiseScale + vec3(0, t * 2.0, 0));
      
      // Displace
      vec3 pos = position + normal * n * uSurfaceRelief;
      
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      
      // Layers for fragment shader
      vLayer0 = pos;
      
      mat2 rot0 = mat2(cos(t), sin(t), -sin(t), cos(t));
      mat2 rot1 = mat2(cos(t * 0.7 + 2.0), sin(t * 0.7 + 2.0), -sin(t * 0.7 + 2.0), cos(t * 0.7 + 2.0));
      mat2 rot2 = mat2(cos(t * -0.4 + 4.0), sin(t * -0.4 + 4.0), -sin(t * -0.4 + 4.0), cos(t * -0.4 + 4.0));
      
      vLayer0.xy = rot0 * vLayer0.xy;
      
      vLayer1 = pos * 1.5;
      vLayer1.yz = rot1 * vLayer1.yz;
      
      vLayer2 = pos * 0.5;
      vLayer2.xz = rot2 * vLayer2.xz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uSpeed;
    uniform float uNoiseScale;
    uniform float uTurbulence;
    uniform float uRayCount;
    
    uniform float uSpotIntensity;
    uniform float uSpotCount;
    uniform float uRimPower;
    uniform vec3 uRimColor;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vLayer0;
    varying vec3 vLayer1;
    varying vec3 vLayer2;

    ${noiseChunk}

    void main() {
        // Base Surface Noise
        float n0 = fbm(vLayer0 * uNoiseScale + vec3(0, uTime * uSpeed * 0.1, 0));
        float n1 = fbm(vLayer1 * uNoiseScale * 2.0 - vec3(0, uTime * uSpeed * 0.2, 0));
        float n2 = fbm(vLayer2 * uNoiseScale * 0.5 + vec3(uTime * uSpeed * 0.05));
        
        float noiseSum = n0 * 0.5 + n1 * 0.3 + n2 * 0.2;
        noiseSum = pow(noiseSum * 1.5, uTurbulence + 0.5); 
        
        // --- SUNSPOTS REFINED ---
        // Increase frequency massively to make spots smaller
        // Add jitter to time so they don't just slide perfectly
        float spotFreq = uSpotCount * 2.0; // Multiplier to make them smaller
        vec3 spotPos = vPosition * spotFreq;
        
        // Spot noise needs to be distinct from surface noise
        float spotNoise = snoise(spotPos + vec3(uTime * 0.1 * uSpeed));
        
        // Thresholding: make spots appear only at very specific noise values (e.g., transitions)
        // or just high values. 
        // To make them small, we need a high threshold.
        // remap -1..1 to 0..1
        float sn = spotNoise * 0.5 + 0.5;
        
        // Sharp threshold for core of the spot
        float spotCore = smoothstep(0.85, 0.95, sn);
        
        // Softer ring for penumbra
        float spotPenumbra = smoothstep(0.75, 0.95, sn);
        
        
        // Color Mixing
        vec3 surfaceColor = mix(uColorB, uColorA, smoothstep(0.0, 1.0, noiseSum));
        surfaceColor += vec3(1.0, 1.0, 0.8) * smoothstep(0.8, 1.2, noiseSum);
        
        // Apply Penumbra (darkening)
        surfaceColor = mix(surfaceColor, uColorB * 0.5, spotPenumbra * (uSpotIntensity * 0.5));
        
        // Apply Core (Black/Dark)
        surfaceColor = mix(surfaceColor, vec3(0.0), spotCore * uSpotIntensity);
        
        // Rim
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = 1.0 - max(0.0, dot(viewDir, normalize(vNormal)));
        rim = pow(rim, uRimPower);
        surfaceColor += uRimColor * rim * 2.0;

        gl_FragColor = vec4(surfaceColor, 1.0);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
  `,
};

export const SunCoronaMaterial = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying float vDisplacement; 
    
    uniform float uTime;
    uniform float uSpeed;
    uniform float uSpotCount;
    uniform float uProminenceSize;

    ${noiseChunk}

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      // DISPLACEMENT
      
      // 1. Sunspots
      float spotFreq = uSpotCount * 2.0;
      vec3 spotPos = position * spotFreq;
      float spotNoise = snoise(spotPos + vec3(uTime * 0.1 * uSpeed));
      float sn = spotNoise * 0.5 + 0.5;
      float spotMask = smoothstep(0.6, 1.0, sn); 
      
      // 2. Loops
      float t = uTime * uSpeed * 0.2;
      vec3 p = position * 3.0 + vec3(0, t, 0);
      float noiseShape = fbm(p);
      
      // 3. Combine
      float displacement = spotMask * noiseShape;
      displacement += fbm(position * 6.0 - vec3(0, t * 2.0, 0)) * 0.05; // Base turbulence
      
      // 4. Arc Structure
      float loops = sin(position.y * 20.0 + t * 5.0) * 0.5 + 0.5;
      displacement *= (0.5 + 0.5 * loops);
      
      vDisplacement = displacement;
      
      // Displace
      vec3 pos = position + normal * (displacement * 0.4 * uProminenceSize); 
      
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uSpeed;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uOpacity; 
    uniform float uFilamentScale;
    uniform float uFilamentIntensity;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying float vDisplacement;
    
    ${noiseChunk}

    void main() {
        float alpha = vDisplacement;
        alpha = smoothstep(0.05, 0.5, alpha);
        
        // Edge fade
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
        rim = pow(clamp(rim, 0.0, 1.0), 0.5); // Clamp for safety
        
        // Base Color
        vec3 col = mix(uColorA, uColorB, alpha);
        col += vec3(1.0, 0.9, 0.5) * smoothstep(0.6, 1.0, alpha);
        
        // --- FILAMENTS / STRANDS (REFINED) ---
        // Use ridged noise: 1.0 - abs(noise) creates sharp valleys/ridges
        // Scale frequency by uFilamentScale
        float t = uTime * uSpeed * 0.5;
        vec3 strandPos = vPosition * (10.0 * uFilamentScale) + vec3(t, 0.0, 0.0);
        
        // High frequency noise
        float rawNoise = snoise(strandPos);
        float strands = 1.0 - abs(rawNoise); // Ridges
        strands = pow(strands, 4.0); // Sharpen the ridges
        
        // Combine with FBM for variations along the strand
        float detail = fbm(strandPos * 2.0);
        strands *= (0.5 + 0.5 * detail);

        // Modulate alpha: Gaps between strands
        float filamentFactor = mix(1.0, strands, uFilamentIntensity);
        alpha *= filamentFactor;
        
        // Brighten strands
        col += vec3(1.0, 0.8, 0.6) * strands * uFilamentIntensity * alpha;
        
        // Final Opacity
        float finalAlpha = alpha * uOpacity * rim;
        finalAlpha = clamp(finalAlpha, 0.0, 1.0);

        gl_FragColor = vec4(col, finalAlpha);
    }
  `
};
