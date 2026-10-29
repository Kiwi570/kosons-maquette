/* Effets d'imprimerie : repères de coupe, repérage des plaques, rouleau encreur, tampons, compteurs. */
import { clamp } from "./noyau.js?v=3";

const SVG = "http://www.w3.org/2000/svg";
const COINS = ["hg", "hd", "bg", "bd"];

/* ------------------------------------------------------------------ repères de coupe */
export function poserCoupes(racine = document) {
  racine.querySelectorAll("[data-coupe]").forEach((el) => {
    if (el.querySelector(":scope > .coupe")) return;
    COINS.forEach((c) => {
      const s = document.createElementNS(SVG, "svg");
      s.setAttribute("class", "coupe coupe--" + c);
      s.setAttribute("viewBox", "0 0 18 18");
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = '<line x1="0" y1="17.5" x2="11" y2="17.5" pathLength="1"/><line x1="17.5" y1="0" x2="17.5" y2="11" pathLength="1"/>';
      el.appendChild(s);
    });
  });
}
export function tracerCoupes(el, gsap, delai = 0) {
  const lignes = el.querySelectorAll(":scope > .coupe line");
  if (!lignes.length) return null;
  return gsap.fromTo(lignes, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .6, ease: "power2.out", stagger: .04, delay: delai });
}

/* ------------------------------------------------------------------ repérage des plaques (pétrole, framboise, noir) */
export function preparerReperage(el, gsap) {
  if (el._rep) return el._rep;
  const contenu = el.innerHTML;
  const c = document.createElement("span");
  c.className = "plaque plaque--c"; c.setAttribute("aria-hidden", "true"); c.innerHTML = contenu;
  const m = c.cloneNode(true); m.className = "plaque plaque--m";
  [c, m].forEach((p) => p.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id")));
  el.append(c, m);
  const xc = gsap.quickSetter(c, "x", "px"), yc = gsap.quickSetter(c, "y", "px");
  const xm = gsap.quickSetter(m, "x", "px"), ym = gsap.quickSetter(m, "y", "px");
  el._rep = { c, m, decaler(d) { xc(-d); yc(-d * .45); xm(d * .85); ym(d * .6); }, libre: true };
  return el._rep;
}
export function introReperage(el, gsap, tl, t = 0) {
  const r = preparerReperage(el, gsap);
  r.libre = false;
  tl.fromTo(r.c, { x: -34, y: -12, clipPath: "inset(0 100% 0 0)" }, { x: 0, y: 0, clipPath: "inset(0 0% 0 0)", duration: 1.05, ease: "expo.out" }, t)
    .fromTo(r.m, { x: 28, y: 14, clipPath: "inset(0 100% 0 0)" }, { x: 0, y: 0, clipPath: "inset(0 0% 0 0)", duration: 1.05, ease: "expo.out" }, t + .14)
    .fromTo(el, { color: "rgba(30,33,34,0)" }, { color: getComputedStyle(el).color, duration: .55, ease: "power2.out", clearProps: "color" }, t + .42)
    .add(() => { r.libre = true; gsap.set([r.c, r.m], { clearProps: "clipPath" }); }, t + 1.2);
  return r;
}

/* ------------------------------------------------------------------ rouleau encreur */
export function rouleau(el, gsap, opts = {}) {
  let barre = el.querySelector(":scope > .barre-rouleau");
  if (!barre) { barre = document.createElement("span"); barre.className = "barre-rouleau"; barre.setAttribute("aria-hidden", "true"); el.appendChild(barre); }
  const d = opts.duree || .95;
  const tl = gsap.timeline({ delay: opts.delai || 0, paused: !!opts.entree })
    .fromTo(el, { clipPath: "inset(-4% 100% -8% 0)", filter: "blur(1.5px)" }, { clipPath: "inset(-4% 0% -8% 0)", filter: "blur(0px)", duration: d, ease: "power2.inOut" }, 0)
    .fromTo(barre, { x: -12, opacity: 1 }, { x: () => el.offsetWidth - 12, opacity: 1, duration: d, ease: "power2.inOut" }, 0)
    .to(barre, { opacity: 0, duration: .25 }, d - .15)
    .set(el, { clearProps: "clipPath,filter" });
  if (opts.entree) aLEntree(tl, opts.entree);
  return tl;
}

/* joue une animation en pause quand son déclencheur entre dans l'écran (une seule fois) */
export function aLEntree(anim, { trigger, start = "top 88%" }) {
  window.ScrollTrigger.create({ trigger, start, once: true, onEnter: () => anim.play() });
  return anim;
}

/* ------------------------------------------------------------------ tampon */
export function tamponner(el, gsap, opts = {}) {
  const angle = opts.angle ?? -12;
  const tl = gsap.timeline({ delay: opts.delai || 0, paused: !!opts.entree })
    .fromTo(el, { scale: 1.9, rotation: angle - 24, autoAlpha: 0 }, { scale: .94, rotation: angle, autoAlpha: .95, duration: .32, ease: "power4.in" })
    .to(el, { scale: 1, duration: .5, ease: "elastic.out(1, .45)" });
  if (opts.entree) aLEntree(tl, opts.entree);
  return tl;
}

/* ------------------------------------------------------------------ montants */
export function formaterEuros(n) {
  return Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ") + " €";
}

/* ================================================================== mise en place générale */
export function effets(ctx) {
  const { gsap, ScrollTrigger, calme } = ctx;
  poserCoupes();
  if (!gsap || calme) {
    document.querySelectorAll(".tampon").forEach((t) => { t.style.opacity = ".95"; t.style.transform = "rotate(-12deg)"; });
    return;
  }

  /* repères de coupe hors ouverture : tracés à l'entrée */
  document.querySelectorAll("[data-coupe]").forEach((el) => {
    if (el.closest(".ouverture, .ouverture-r, .table-lumineuse, .bande")) return;
    const lignes = el.querySelectorAll(":scope > .coupe line");
    gsap.set(lignes, { strokeDasharray: 1, strokeDashoffset: 1 });
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => tracerCoupes(el, gsap) });
  });

  /* titres ligne à ligne */
  document.querySelectorAll("[data-lignes]").forEach((el) => {
    if (window.SplitText) {
      window.SplitText.create(el, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit(self) {
          if (el._vu) return;
          const a = gsap.fromTo(self.lines, { yPercent: 108 }, { yPercent: 0, duration: 1, ease: "power4.out", stagger: .09, paused: true, onStart: () => { el._vu = true; } });
          return aLEntree(a, { trigger: el, start: "top 88%" });
        },
      });
    } else {
      rouleau(el, gsap, { entree: { trigger: el, start: "top 88%" } });
    }
  });

  /* paragraphes au rouleau (hors ouverture : animés par l'intro de la page) */
  document.querySelectorAll("[data-rouleau]").forEach((el) => {
    rouleau(el, gsap, { entree: { trigger: el, start: "top 90%" } });
  });

  /* compteurs */
  document.querySelectorAll("[data-compte]").forEach((el) => {
    const fin = +el.dataset.compte; const o = { v: 0 };
    el.textContent = "0";
    aLEntree(gsap.fromTo(o, { v: 0 }, { v: fin, duration: 1.6, ease: "power2.out", paused: true, onUpdate: () => { el.textContent = Math.round(o.v); } }), { trigger: el, start: "top 92%" });
  });

  /* tampons libres (ceux de la méthode sont pilotés par la page) */
  document.querySelectorAll(".tampon:not(.tampon-etape):not(.tampon-libre)").forEach((t) => {
    gsap.set(t, { autoAlpha: 0 });
    tamponner(t, gsap, { entree: { trigger: t.parentElement, start: "top 70%" } });
  });

  /* tickets qui s'impriment */
  document.querySelectorAll(".ticket.imprime").forEach((tk) => {
    const lignes = tk.querySelectorAll(".ligne-prix");
    const tl = gsap.timeline({ paused: true });
    aLEntree(tl, { trigger: tk, start: "top 85%" });
    tl.fromTo(tk, { clipPath: "inset(0 0 100% 0)", y: -24 }, { clipPath: "inset(0 0 0% 0)", y: 0, duration: 1.1, ease: "power2.inOut", clearProps: "clipPath" });
    lignes.forEach((l, i) => {
      const m = l.querySelector("[data-montant]"); const fin = +m.dataset.montant; const pre = m.textContent.startsWith("dès") ? "dès " : ""; const o = { v: 0 };
      tl.fromTo(l, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: .3 }, .25 + i * .12)
        .fromTo(o, { v: 0 }, { v: fin, duration: .7, ease: "power2.out", onUpdate: () => { m.textContent = pre + formaterEuros(o.v); } }, .25 + i * .12);
    });
  });

  /* profondeur (bouteilles) */
  document.querySelectorAll("[data-profondeur]").forEach((el, i) => {
    const k = [6, -4, 10, -8, 4][i % 5];
    gsap.fromTo(el, { yPercent: k }, { yPercent: -k, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: .6 } });
  });

  /* inclinaison 3D des lames et tirages au survol */
  if (ctx.finPointeur) {
    document.querySelectorAll(".lame, .cave .tirage").forEach((el) => {
      const rx = gsap.quickTo(el, "rotationX", { duration: .6, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: .6, ease: "power3" });
      gsap.set(el, { transformPerspective: 900 });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - .5) * 10);
        rx(-((e.clientY - r.top) / r.height - .5) * 8);
      });
      el.addEventListener("pointerleave", () => { rx(0); ry(0); });
    });
  }

  /* repérage qui se décale avec la vitesse de défilement */
  const titres = [...document.querySelectorAll("[data-reperage]")].map((el) => ({ el, rep: preparerReperage(el, gsap), vu: false }));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { const t = titres.find((x) => x.el === e.target); if (t) t.vu = e.isIntersecting; }));
    titres.forEach((t) => io.observe(t.el));
  }
  let d = 0;
  gsap.ticker.add((tps, ms) => {
    const dt = Math.max(1, ms) / 1000;
    const cible = clamp(ctx.vitesse() * .0045, -9, 9);
    d += (cible - d) * (1 - Math.exp(-10 * dt));
    titres.forEach((t) => { if (t.vu && t.rep.libre) t.rep.decaler(d); });
  });
}
