/* Kosons — point d'entrée. Tous les modules du site portent le même numéro de version. */
import { noyau } from "./noyau.js?v=4";
import { effets, introReperage, preparerReperage } from "./effets.js?v=4";

const ctx = noyau();
/* polices et image d'ouverture prêtes (délais courts), puis la page pose ses états de départ, puis on révèle :
   ainsi rien ne s'affiche dans son état final avant de rejouer son animation */
await ctx.pret;
effets(ctx);

try {
  if (ctx.page === "accueil") (await import("./accueil.js?v=4")).accueil(ctx);
  else if (ctx.page === "realisations") (await import("./realisations.js?v=4")).realisations(ctx);
  else if (ctx.page === "tarifs") (await import("./tarifs.js?v=4")).tarifs(ctx);
  else autres(ctx);
} catch (e) {
  console.error(e);
}

if (ctx.ScrollTrigger) ctx.ScrollTrigger.refresh();
if (!ctx.restaurerPosition() && location.hash && !location.hash.startsWith("#oeuvre-")) {
  const cible = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (cible) ctx.allerA(cible, true);
}
ctx.reveler();
ctx.rideauOuvrir(); /* sans effet s'il est déjà levé ; garantit qu'il ne reste jamais baissé */
window.addEventListener("load", () => { if (ctx.ScrollTrigger) ctx.ScrollTrigger.refresh(); });

/* 404 et mentions légales */
function autres(c) {
  const { gsap, calme } = c;
  if (!gsap || calme) return;
  const delai = c.rideauOuvrir();
  const h1 = document.querySelector(".page-404 h1");
  if (!h1) return;
  const tl = gsap.timeline({ delay: delai });
  const rep = introReperage(h1, gsap, tl, 0);
  /* la feuille gâchée : les plaques suivent le pointeur */
  const plaques = preparerReperage(h1, gsap);
  const qc = { x: gsap.quickTo(plaques.c, "x", { duration: .6 }), y: gsap.quickTo(plaques.c, "y", { duration: .6 }) };
  const qm = { x: gsap.quickTo(plaques.m, "x", { duration: .8 }), y: gsap.quickTo(plaques.m, "y", { duration: .8 }) };
  let pret = false;
  tl.add(() => { rep.libre = false; pret = true; }, 1.25);
  window.addEventListener("pointermove", (e) => {
    if (!pret) return;
    const dx = (e.clientX / innerWidth - .5) * 40, dy = (e.clientY / innerHeight - .5) * 24;
    qc.x(-dx); qc.y(-dy); qm.x(dx * .8); qm.y(dy * .7);
  });
}
