import * as THREE from "three";

export const sharedShaderUniforms = {
  u_time: { value: 0.0 }
};

// Bloque GLSL común: Ruido 3D sin costuras UV y FBM de 5 octavas
const noise3DGLSL = `
  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.05 + vec3(13.1, 7.4, 5.2);
      a *= 0.5;
    }
    return v;
  }
`;

// ============================================================================
// 1. SOL CENTRAL (Plasma granular + corona Fresnel)
// ============================================================================
export function createSunShaderMaterial(sunTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: sharedShaderUniforms.u_time,
      u_texture: { value: sunTexture }
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      uniform float u_time;

      void main() {
        vPos = normalize(position);
        vec3 newPos = position + normal * sin(position.y * 2.5 + u_time * 3.0) * 0.08;
        vec4 worldPos = modelMatrix * vec4(newPos, 1.0);
        vWorldPos = worldPos.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float u_time;
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      ${noise3DGLSL}

      void main() {
        vec3 q = vPos * 4.5 + vec3(0.0, u_time * 0.15, 0.0);
        float warp = fbm(q);
        float plasma = fbm(q * 2.0 + warp * 2.2 - u_time * 0.2);

        vec3 n = normalize(vNormalW);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.2);

        vec3 col = mix(vec3(0.85, 0.12, 0.0), vec3(1.0, 0.92, 0.3), smoothstep(0.28, 0.72, plasma));
        col += vec3(1.0, 0.5, 0.05) * fresnel * 1.4;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

// ============================================================================
// 2. PLANETA MUSTAFAR (FBM 5 octavas + Domain Warping + Atmósfera ígnea)
// ============================================================================
export function createMustafarShaderMaterial(baseTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: sharedShaderUniforms.u_time,
      u_texture: { value: baseTexture }
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;

      void main() {
        vPos = normalize(position);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float u_time;
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      ${noise3DGLSL}

      void main() {
        vec3 n = normalize(vNormalW);
        vec3 luzDir = normalize(-vWorldPos); // Sol en (0,0,0)
        vec3 viewDir = normalize(cameraPosition - vWorldPos);

        // Domain warping 3D para mares y ríos de magma turbulentos
        vec3 p = vPos * 3.8;
        vec3 q = vec3(
          fbm(p + vec3(0.0, u_time * 0.06, 0.0)),
          fbm(p + vec3(5.2, 1.3, -u_time * 0.05)),
          fbm(p + vec3(2.8, 8.1, u_time * 0.04))
        );
        float magma = fbm(p + 2.4 * q);

        // Corteza volcánica oscura iluminada por el Sol
        float diff = max(dot(n, luzDir), 0.08);
        float detalleRoca = fbm(vPos * 18.0);
        vec3 corteza = vec3(0.10, 0.04, 0.03) * (0.4 + 0.8 * detalleRoca) * diff;

        // Paleta térmica de la lava (rojo oscuro -> naranja intenso -> amarillo blanco)
        float actividad = smoothstep(0.36, 0.68, magma);
        vec3 lava = mix(vec3(0.85, 0.08, 0.0), vec3(1.0, 0.42, 0.02), smoothstep(0.36, 0.54, magma));
        lava = mix(lava, vec3(1.0, 0.92, 0.45), smoothstep(0.54, 0.72, magma));

        vec3 col = mix(corteza, lava * 1.35, actividad);

        // Resplandor atmosférico naranja en el limbo del planeta (Fresnel)
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.2);
        col += vec3(1.0, 0.28, 0.04) * fresnel * 1.1;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

// ============================================================================
// 3. PLANETA HOTH (Vertex displacement + Relieve FBM 5 octavas + Atmósfera azul)
// ============================================================================
export function createHothShaderMaterial(baseTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: sharedShaderUniforms.u_time,
      u_texture: { value: baseTexture }
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      ${noise3DGLSL}

      void main() {
        vPos = normalize(position);
        // Deformación suave de geometría en el Vertex Shader
        float h = fbm(vPos * 4.0);
        vec3 newPos = position + normal * ((h - 0.45) * 0.14);

        vec4 worldPos = modelMatrix * vec4(newPos, 1.0);
        vWorldPos = worldPos.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      ${noise3DGLSL}

      // Altura detallada con cráteres y cordilleras glaciares
      float mapaHielo(vec3 p) {
        float base = fbm(p * 4.5);
        float ridges = 1.0 - abs(fbm(p * 11.0) * 2.0 - 1.0);
        return base * 0.7 + pow(ridges, 2.0) * 0.3;
      }

      void main() {
        vec3 n = normalize(vNormalW);
        vec3 luzDir = normalize(-vWorldPos);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);

        // Perturbación de normal por diferencias finitas en 3D (relieve ultra nítido)
        float e = 0.008;
        float h0 = mapaHielo(vPos);
        vec3 grad = vec3(
          mapaHielo(vPos + vec3(e, 0.0, 0.0)) - h0,
          mapaHielo(vPos + vec3(0.0, e, 0.0)) - h0,
          mapaHielo(vPos + vec3(0.0, 0.0, e)) - h0
        ) / e;
        vec3 nEsculpida = normalize(n - grad * 0.16);

        // Paleta ártica: hielo azul profundo -> glaciar cian -> nieve blanca en cumbres
        vec3 hieloOscuro = vec3(0.08, 0.24, 0.46);
        vec3 hieloMedio  = vec3(0.32, 0.62, 0.88);
        vec3 nievePura   = vec3(0.92, 0.97, 1.00);

        vec3 albedo = mix(hieloOscuro, hieloMedio, smoothstep(0.28, 0.52, h0));
        albedo = mix(albedo, nievePura, smoothstep(0.52, 0.72, h0));

        // Iluminación difusa + reflejo especular sobre el hielo
        float diff = max(dot(nEsculpida, luzDir), 0.12);
        vec3 halfVec = normalize(luzDir + viewDir);
        float spec = pow(max(dot(nEsculpida, halfVec), 0.0), 28.0) * 0.45;

        vec3 col = albedo * diff + vec3(0.75, 0.90, 1.0) * spec;

        // Atmósfera helada brillante en los bordes (Fresnel)
        float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.8);
        col += vec3(0.25, 0.68, 1.0) * fresnel * 1.15;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
}

// ============================================================================
// 4. ESCUDO DEFLECTOR DE LA ESTRELLA DE LA MUERTE (Fresnel + Rejilla)
// ============================================================================
export function createShieldShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      u_time: sharedShaderUniforms.u_time
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float u_time;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        float fresnel = pow(1.0 - abs(vNormal.z), 2.5);
        vec2 grid = fract(vUv * vec2(24.0, 12.0)) - 0.5;
        float linea = smoothstep(0.42, 0.48, max(abs(grid.x), abs(grid.y)));
        float pulso = sin(vUv.y * 25.0 - u_time * 3.0) * 0.5 + 0.5;

        float alpha = (fresnel * 0.8 + linea * 0.25) * (0.6 + 0.4 * pulso);
        vec3 colorEscudo = mix(vec3(0.0, 0.6, 1.0), vec3(0.2, 1.0, 0.8), pulso);

        gl_FragColor = vec4(colorEscudo, clamp(alpha, 0.0, 0.85));
      }
    `
  });
}