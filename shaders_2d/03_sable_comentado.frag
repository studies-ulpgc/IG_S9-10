#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 p = uv;

    // Normalizamos ratón en [0, 1] (con valor por defecto si aún no se ha movido)
    vec2 m = u_mouse / u_resolution.xy;
    if (u_mouse.x == 0.0 && u_mouse.y == 0.0) m = vec2(0.5, 0.25);

    // 1. Movimiento pendular fluido y autónomo (sin interferencia del ratón)
    float t = u_time * 1.6;
    float pendulo = sin(t) - 0.12 * sin(3.0 * t); 
    float angulo = pendulo * 0.42;
    p = rot(angulo) * p;
    p.y += 0.35;

    // 2. Hoja láser y distorsión de plasma
    float plasmaWave = sin(p.y * 35.0 - u_time * 45.0) * 0.0025 * smoothstep(0.0, 0.1, p.y);
    float yHoja = clamp(p.y, 0.0, 1.15);
    float distHoja = length(p - vec2(0.0, yHoja));

    // 3. Color controlado por la altura del ratón (m.y): Azul -> Verde -> Morado -> Rojo Sith
    vec3 cAzul   = vec3(0.08, 0.45, 1.0);
    vec3 cVerde  = vec3(0.10, 0.95, 0.30);
    vec3 cMorado = vec3(0.65, 0.15, 1.0);
    vec3 cRojo   = vec3(1.00, 0.08, 0.12);

    vec3 colorSable = mix(cAzul, cVerde, smoothstep(0.0, 0.33, m.y));
    colorSable = mix(colorSable, cMorado, smoothstep(0.33, 0.66, m.y));
    colorSable = mix(colorSable, cRojo, smoothstep(0.66, 1.0, m.y));

    // 4. Luz ambiental, doble halo y núcleo blanco
    float luzAmbiente = exp(-length(p - vec2(0.0, 0.5)) * 1.4);
    float vineta = 1.0 - 0.45 * dot(uv, uv);
    vec3 fondo = colorSable * luzAmbiente * 0.18 * vineta;

    float vibra = 1.0 + 0.06 * sin(u_time * 75.0 + p.y * 25.0);
    float haloAncho = exp(-distHoja * 5.5) * 0.45;
    float haloCercano = exp(-distHoja * 22.0) * 1.6;
    float nucleo = smoothstep(0.022, 0.008, distHoja);

    vec3 col = fondo + colorSable * (haloAncho + haloCercano) + vec3(1.0) * nucleo;

    // 5. Empuñadura cilíndrica con sombreado 3D y reflejo del láser
    float yMango = clamp(p.y, -0.36, 0.0);
    float distMango = length(p - vec2(0.0, yMango));
    float radioMango = 0.034 - 0.004 * step(p.y, -0.32);
    float mango = smoothstep(radioMango + 0.002, radioMango - 0.002, distMango);

    if (mango > 0.0) {
        float nx = clamp(p.x / radioMango, -1.0, 1.0);
        float brilloMetal = pow(1.0 - abs(nx - 0.25), 3.0);
        float anillos = step(0.45, fract(p.y * 28.0)) * step(p.y, -0.06);
        float emisor = smoothstep(-0.04, 0.0, p.y);
        float boton = step(length(p - vec2(0.0, -0.14)), 0.011);

        vec3 metal = vec3(0.15 + 0.55 * brilloMetal) * (1.0 - 0.55 * anillos);
        metal += vec3(0.25) * emisor;
        metal += colorSable * smoothstep(-0.22, 0.02, p.y) * 0.55;
        metal = mix(metal, colorSable * 1.5 + 0.3, boton);

        col = mix(col, metal, mango);
    }

    // 6. Chispas de energía en la base
    float tChispa = fract(u_time * 1.8);
    float idChispa = floor(u_time * 1.8);
    vec2 dirChispa = vec2((hash(vec2(idChispa, 1.0)) - 0.5) * 0.6, hash(vec2(idChispa, 2.0)) * 0.8 + 0.1);
    float chispa = smoothstep(0.015 * (1.0 - tChispa), 0.0, length(p - dirChispa * tChispa)) * (1.0 - tChispa);
    col += (colorSable + 0.5) * chispa * 1.5;

    col = col / (1.0 + col * 0.35);
    gl_FragColor = vec4(col, 1.0);
}