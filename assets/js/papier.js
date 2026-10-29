/* Papier vivant : l'encre pétrole boit le papier sous le curseur, puis sèche.
   Le shader sort tout de suite là où il n'y a pas d'encre. */
import { Renderer } from "./lib/ogl/core/Renderer.js";
import { Program } from "./lib/ogl/core/Program.js";
import { Mesh } from "./lib/ogl/core/Mesh.js";
import { Triangle } from "./lib/ogl/extras/Triangle.js";

const MAX = 24;
const VIE = 1.7;

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

/* trame d'imprimerie : des points pétrole dont le diamètre suit l'encre déposée par le curseur */
const fragment = /* glsl */ `
precision highp float;
uniform float uTemps;
uniform vec4 uPoints[${MAX}];
uniform int uNombre;
uniform vec3 uEncre;
uniform float uDpr;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float bruit(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 p = gl_FragCoord.xy;
  float proche = 1e9;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uNombre) break;
    vec4 q = uPoints[i];
    proche = min(proche, length(p - q.xy) - q.w * 1.25);
  }
  if (proche > 0.0) discard;

  float champ = 0.0;
  float bord = bruit(p / (38.0 * uDpr)) - 0.5;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uNombre) break;
    vec4 q = uPoints[i];
    float age = uTemps - q.z;
    float vie = clamp(1.0 - age / ${VIE.toFixed(1)}, 0.0, 1.0);
    vie = vie * vie * (3.0 - 2.0 * vie);
    float rayon = q.w * (0.85 + age * 0.35);
    float d = length(p - q.xy) + bord * rayon * 0.45;
    champ += vie * smoothstep(rayon, rayon * 0.2, d);
  }
  champ = clamp(champ, 0.0, 1.0);

  float cellule = 6.0 * uDpr;
  mat2 rot = mat2(0.9659, -0.2588, 0.2588, 0.9659);
  vec2 c = fract(rot * p / cellule) - 0.5;
  float r = sqrt(champ) * 0.6;
  float a = smoothstep(r + 0.06, r - 0.06, length(c)) * step(0.04, champ) * 0.78;
  gl_FragColor = vec4(uEncre * a, a);
}
`;

export function papierVivant(section) {
  if (!section) return null;
  const canvas = document.createElement("canvas");
  canvas.className = "encre-gl";
  canvas.setAttribute("aria-hidden", "true");
  let renderer;
  try {
    const telephone = window.matchMedia("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, telephone ? 1 : 1.25);
    renderer = new Renderer({ canvas, dpr, alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: "low-power" });
  } catch (e) { return null; }
  const gl = renderer.gl;
  if (!gl) return null;
  gl.clearColor(0, 0, 0, 0);
  section.insertBefore(canvas, section.querySelector(".cadre"));

  const points = [];
  const tableau = new Array(MAX * 4).fill(0);
  const programme = new Program(gl, {
    vertex, fragment, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uTemps: { value: 0 }, uPoints: { value: tableau }, uNombre: { value: 0 }, uEncre: { value: [33 / 255, 87 / 255, 90 / 255] }, uDpr: { value: renderer.dpr } },
  });
  const maillage = new Mesh(gl, { geometry: new Triangle(gl), program: programme });

  let largeur = 0, hauteur = 0;
  function dimensionner() {
    const r = section.getBoundingClientRect();
    largeur = r.width; hauteur = r.height;
    renderer.setSize(largeur, hauteur);
  }
  dimensionner();
  window.addEventListener("resize", dimensionner);

  const debut = performance.now();
  const temps = () => (performance.now() - debut) / 1000;
  let actif = false, visible = true, raf = 0, dernier = null;

  function ajouter(x, y, taille) {
    const t = temps();
    points.push({ x: x * renderer.dpr, y: (hauteur - y) * renderer.dpr, t, s: taille * renderer.dpr });
    if (points.length > MAX) points.shift();
    lancer();
  }
  function rendre() {
    raf = 0;
    const t = temps();
    while (points.length && t - points[0].t > VIE) points.shift();
    points.forEach((p, i) => { tableau[i * 4] = p.x; tableau[i * 4 + 1] = p.y; tableau[i * 4 + 2] = p.t; tableau[i * 4 + 3] = p.s; });
    programme.uniforms.uTemps.value = t;
    programme.uniforms.uNombre.value = points.length;
    renderer.render({ scene: maillage });
    if (points.length && visible && actif) raf = requestAnimationFrame(rendre);
    else if (!points.length) gl.clear(gl.COLOR_BUFFER_BIT);
  }
  function lancer() { if (actif && visible && !raf) raf = requestAnimationFrame(rendre); }

  section.addEventListener("pointermove", (e) => {
    if (!actif) return;
    const r = section.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (dernier) {
      const d = Math.hypot(x - dernier.x, y - dernier.y);
      if (d < 22) return;
      ajouter(x, y, Math.min(58, 30 + d * .2));
    } else ajouter(x, y, 36);
    dernier = { x, y };
  }, { passive: true });
  section.addEventListener("pointerdown", (e) => {
    if (!actif || e.pointerType === "mouse") return;
    const r = section.getBoundingClientRect();
    ajouter(e.clientX - r.left, e.clientY - r.top, 64);
  }, { passive: true });
  section.addEventListener("pointerleave", () => { dernier = null; });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) lancer(); }).observe(section);
  }
  return {
    demarrer() { actif = true; dimensionner(); },
    goutte(x, y, taille) { ajouter(x, y, taille); },
  };
}
