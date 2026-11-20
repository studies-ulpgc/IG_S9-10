#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        v += amp * noise(p);
        p *= 2.05;
        amp *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = vec2(uv.x * aspect, uv.y);

    // Coordenadas turbulentas ascendentes
    vec2 q = p * vec2(4.0, 3.0) - vec2(0.0, u_time * 1.8);
    float turb = fbm(q + vec2(0.0, fbm(q * 1.5)));

    // Foco de calor interactivo en la posición del ratón
    vec2 mouse = vec2((u_mouse.x / u_resolution.x) * aspect, u_mouse.y / u_resolution.y);
    float calorRaton = u_mouse.x > 0.0 ? smoothstep(0.45, 0.0, length(p - mouse)) * 0.75 : 0.0;

    // Intensidad combinada: hoguera inferior + llamarada del cursor
    float fuego = clamp(turb * 1.5 - uv.y * 1.15 + calorRaton, 0.0, 1.0);

    // Paleta térmica física: negro -> rojo -> naranja -> amarillo blanco
    vec3 color = vec3(1.8 * fuego, 1.2 * pow(fuego, 2.2), 0.8 * pow(fuego, 4.5));
    gl_FragColor = vec4(color, 1.0);
}