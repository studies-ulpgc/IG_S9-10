#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// Función pseudoaleatoria compacta para las chispas
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5);
}

void main() {
    // 1. Coordenadas centradas y corregidas por relación de aspecto
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    p.y += 0.25;

    // 2. Oscilación suave de vela + interacción con el puntero (u_mouse)
    float h = clamp(p.y + 0.5, 0.0, 1.5);
    vec2 mouse = (u_mouse * 2.0 - u_resolution.xy) / u_resolution.y;
    mouse.y += 0.25;

    p.x += sin(p.y * 3.5 - u_time * 3.2) * 0.14 * h 
         + cos(p.y * 6.0 - u_time * 5.0) * 0.04 * h
         + (p.x - mouse.x) * exp(-length(p - mouse) * 2.5) * 0.45 * h;

    // 3. Silueta en forma de gota y núcleo
    float ancho = mix(0.38, 0.01, smoothstep(-0.35, 0.95, p.y));
    float cuerpo = smoothstep(1.25, 0.1, length(vec2(p.x / ancho, (p.y - 0.15) * 1.15)));
    float nucleo = smoothstep(0.55, 0.0, length(vec2(p.x * 1.5, p.y + 0.25)));

    // 4. Lenguas internas subiendo
    float f1 = exp(-abs(p.x - sin(p.y * 5.0 - u_time * 4.0) * 0.12 * h) * 28.0);
    float f2 = exp(-abs(p.x + cos(p.y * 4.0 - u_time * 3.5) * 0.10 * h) * 32.0);
    float lenguas = (f1 + f2) * smoothstep(0.95, -0.2, p.y) * smoothstep(-0.45, -0.1, p.y);

    // 5. Chispas ascendentes (solo de mitad hacia arriba)
    vec2 uvChispa = p * 9.0 - vec2(0.0, u_time * 3.5);
    float rnd = hash(floor(uvChispa));
    vec2 offset = vec2(sin(rnd * 6.28 + u_time * 2.0), cos(rnd * 6.28)) * 0.3;
    float chispa = smoothstep(0.08, 0.0, length(fract(uvChispa) - 0.5 - offset)) * step(0.82, rnd);
    chispa *= smoothstep(0.15, 0.55, p.y) * smoothstep(1.15, 0.65, p.y) * smoothstep(0.55, 0.05, abs(p.x));

    // 6. Mezcla de luz y paleta térmica (naranja -> blanco)
    float luz = cuerpo * 0.85 + nucleo * 0.9 + lenguas * 0.55 + chispa * 1.4;
    vec3 color = vec3(1.5, 0.42, 0.06) * luz 
               + vec3(1.0, 0.88, 0.55) * pow(max(luz, 0.0), 2.6);

    // 7. Transición dinámica entre llama cálida (naranja/roja) y llama fría/oxigenada (azul)
    float cicloAzul = sin(u_time * 0.8) * 0.5 + 0.5;
    float frontera = mix(-0.6, 1.1, cicloAzul);
    float zonaAzul = smoothstep(frontera + 0.35, frontera - 0.35, p.y);
    
    vec3 colorAzul = vec3(0.0, 0.35, 1.5) * cuerpo + vec3(0.4, 0.85, 1.0) * pow(nucleo, 1.8) + vec3(0.5, 0.9, 1.0) * chispa * 1.4;
    color = mix(color, colorAzul, zonaAzul * 0.92);

    // 8. Volutas de humo subiendo y ensanchándose por encima de la llama
    float ondaHumo = sin(p.y * 4.0 - u_time * 2.0 + sin(p.y * 2.5 - u_time)) * 0.18 * h;
    float voluta = exp(-abs(p.x + ondaHumo) * (5.5 - p.y * 2.0));
    float humo = voluta * smoothstep(0.05, 0.65, p.y) * smoothstep(1.35, 0.55, p.y);
    color += vec3(0.16, 0.18, 0.22) * humo * (1.0 - clamp(luz, 0.0, 1.0));

    // 9. Halo de iluminación ambiental alrededor de la llama
    float halo = exp(-length(p * vec2(0.510,0.460)) * 2.4) * 0.14;
    vec3 colorHalo = mix(vec3(1.0, 0.35, 0.05), vec3(0.05, 0.4, 1.0), cicloAzul);
    color += colorHalo * halo;

    gl_FragColor = vec4(color, 1.0);
}