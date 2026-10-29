/* Réalisations : table lumineuse, filtres animés (Flip), visionneuse avec loupe. */
import { introReperage, rouleau } from "./effets.js?v=4";

export function realisations(ctx) {
  const { gsap, calme } = ctx;
  const anime = !!gsap && !calme;
  const items = [...document.querySelectorAll(".oeuvre")];
  const onglets = [...document.querySelectorAll(".onglet")];
  const annonce = document.getElementById("annonce-filtre");
  const galerie = document.getElementById("galerie");
  const grille = galerie.querySelector(".grille");
  const barreFiltres = document.querySelector(".filtres");

  /* ---------------------------------------------------------- vignettes : fond papier, apparition douce au chargement */
  const vignettes = items.map((it) => it.querySelector(".cliche img"));
  vignettes.forEach((im) => {
    if (im.complete && im.naturalWidth) im.classList.add("charge");
    else im.addEventListener("load", () => im.classList.add("charge"), { once: true });
  });
  /* une fois la page posée, toutes les vignettes sont chargées en tâche de fond : les filtres n'affichent jamais de cases vides */
  const tout = () => vignettes.forEach((im) => { im.loading = "eager"; });
  const plusTard = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  if (document.readyState === "complete") plusTard(tout); else window.addEventListener("load", () => plusTard(tout), { once: true });

  /* ---------------------------------------------------------- ouverture */
  if (anime) {
    const delai = ctx.rideauOuvrir();
    const sec = document.getElementById("ouverture");
    const h1 = sec.querySelector("h1");
    const intro = sec.querySelectorAll("[data-intro]");
    const tirages = [...sec.querySelectorAll(".table-lumineuse .tirage")];
    gsap.set(intro, { clipPath: "inset(-4% 100% -8% 0)" });
    const rot = tirages.map((t) => gsap.getProperty(t, "rotation"));
    gsap.set(tirages, { autoAlpha: 0 });
    const tl = gsap.timeline({ delay: delai });
    introReperage(h1, gsap, tl, 0);
    tl.eventCallback("onComplete", () => { window.kosonsOuverture = performance.now(); });
    tl.add(() => { window.kosonsTitre = performance.now(); }, 1.25);
    intro.forEach((el, i) => tl.add(rouleau(el, gsap, { duree: .8 }), .7 + i * .2));
    tirages.forEach((t, i) => {
      tl.fromTo(t, { autoAlpha: 0, y: -70, scale: 1.18, rotation: rot[i] + (i % 2 ? 10 : -10) }, { autoAlpha: 1, y: 0, scale: 1, rotation: rot[i], duration: .7, ease: "back.out(1.3)" }, .3 + i * .11);
    });
    /* la table réagit au pointeur */
    if (ctx.finPointeur) {
      const qs = tirages.map((t, i) => ({ x: gsap.quickTo(t, "x", { duration: .9, ease: "power3" }), y: gsap.quickTo(t, "y", { duration: .9, ease: "power3" }), k: 6 + (i % 3) * 5 }));
      sec.addEventListener("pointermove", (e) => {
        const px = e.clientX / innerWidth - .5, py = e.clientY / innerHeight - .5;
        qs.forEach((q) => { q.x(-px * q.k * 2); q.y(-py * q.k * 2); });
      });
    }
    /* chaque vignette sort de l'imprimante en entrant */
    ctx.ScrollTrigger.batch(items, {
      start: "top 92%", once: true,
      onEnter: (lot) => gsap.fromTo(lot.map((o) => o.querySelector(".cliche")), { clipPath: "inset(0% 0% 100% 0%)", y: -14 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: .8, ease: "power2.out", stagger: .06, clearProps: "clipPath,transform" }),
    });
  }

  /* ---------------------------------------------------------- filtres */
  let filtreEnCours = null;
  function filtrer(cat) {
    const Flip = window.Flip;
    if (filtreEnCours) filtreEnCours.progress(1).kill();
    /* 1. si le haut de la grille est passé sous la barre de filtres, on y revient d'un coup :
          la barre reste à sa place sous le doigt, seul le contenu change */
    const haut = grille.getBoundingClientRect().top + scrollY - (barreFiltres ? barreFiltres.offsetHeight : 0) - ctx.enteteH() - 16;
    if (scrollY > haut + 4) { if (ctx.defil) ctx.defil.arreter(); ctx.allerA(haut, true); }
    /* 2. la grille garde sa hauteur le temps de l'animation : la page ne s'effondre pas sous le lecteur */
    const hAvant = grille.offsetHeight;
    const etat = Flip && anime ? Flip.getState(items) : null;
    let n = 0;
    items.forEach((it) => { const ok = cat === "tout" || it.dataset.cat === cat; it.hidden = !ok; if (ok) { n++; const im = it.querySelector("img"); im.loading = "eager"; } });
    onglets.forEach((o) => o.setAttribute("aria-pressed", String(o.dataset.filtre === cat)));
    const lab = onglets.find((o) => o.dataset.filtre === cat);
    if (annonce) annonce.textContent = `${n} réalisation${n > 1 ? "s" : ""} : ${lab ? lab.firstChild.textContent : ""}`;
    if (!etat) { ctx.ScrollTrigger && ctx.ScrollTrigger.refresh(); return; }
    const hApres = grille.offsetHeight;
    grille.style.minHeight = Math.max(hAvant, hApres) + "px";
    filtreEnCours = Flip.from(etat, {
      duration: .6, ease: "power3.inOut", absolute: true, scale: false, stagger: .01, prune: true,
      /* fondu enchaîné serré : la grille n'est jamais vide entre deux filtres */
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: .94 }, { autoAlpha: 1, scale: 1, duration: .4, delay: .04, ease: "power2.out" }),
      onLeave: (els) => gsap.fromTo(els, { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: .94, duration: .28, ease: "power1.in" }),
      onComplete: () => {
        gsap.to(grille, { minHeight: hApres, duration: .35, ease: "power2.out", onComplete: () => { grille.style.minHeight = ""; ctx.ScrollTrigger && ctx.ScrollTrigger.refresh(); } });
        filtreEnCours = null;
      },
    });
  }
  onglets.forEach((o) => o.addEventListener("click", () => filtrer(o.dataset.filtre)));

  /* ---------------------------------------------------------- visionneuse */
  const dlg = document.querySelector(".visionneuse");
  const scene = dlg.querySelector(".scene-v");
  const img = scene.querySelector("img");
  const titre = dlg.querySelector(".v-titre"), type = dlg.querySelector(".v-type"), compteur = dlg.querySelector(".compteur");
  let liste = [], pos = 0, origine = null, enFermeture = false;
  const visibles = () => items.filter((it) => !it.hidden);

  /* taille exacte de l'image dans la scène, calculée avant tout chargement : aucune animation ne part d'une taille fausse */
  function ajuster(it) {
    const cs = getComputedStyle(scene);
    const lw = scene.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const lh = scene.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const w = +it.dataset.w, h = +it.dataset.h, cadre = 12;
    const k = Math.min((lw - cadre) / w, (lh - cadre) / h, 1.6);
    img.style.width = Math.round(w * k + cadre) + "px";
    img.style.height = Math.round(h * k + cadre) + "px";
  }
  function charger(it) {
    const mini = it.querySelector("img");
    img.src = mini.currentSrc || mini.src;           /* la vignette, déjà en mémoire, s'affiche tout de suite */
    const grande = new Image();
    grande.src = it.dataset.grand;
    const poser = () => { if (liste[pos] === it) { img.src = it.dataset.grand; if (ctx.rafraichirLoupe) ctx.rafraichirLoupe(); } };
    (grande.decode ? grande.decode() : Promise.resolve()).then(poser, poser);
    [1, -1].forEach((d) => { const v = liste[(pos + d + liste.length) % liste.length]; if (v) { const p = new Image(); p.src = v.dataset.grand; } });
  }
  function montrer(k, sens = 0) {
    pos = (k + liste.length) % liste.length;
    const it = liste[pos];
    ajuster(it);
    charger(it);
    img.alt = it.querySelector("img").alt;
    img.dataset.loupe = it.dataset.grand;
    titre.textContent = it.dataset.titre;
    type.textContent = it.dataset.type;
    compteur.textContent = `${pos + 1} / ${liste.length}`;
    history.replaceState(null, "", "#oeuvre-" + it.dataset.id);
    if (anime && sens) gsap.fromTo(img, { x: sens * 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .45, ease: "power3.out" });
    if (ctx.rafraichirLoupe) requestAnimationFrame(() => ctx.rafraichirLoupe());
  }
  function vol(depuis, versLaVignette) {
    const a = depuis.getBoundingClientRect(), b = img.getBoundingClientRect();
    if (!a.width || !b.width) return null;
    const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2), s = a.width / b.width;
    return versLaVignette
      ? gsap.to(img, { x: dx, y: dy, scale: s, duration: .45, ease: "power3.in" })
      : gsap.fromTo(img, { x: dx, y: dy, scale: s }, { x: 0, y: 0, scale: 1, duration: .6, ease: "expo.out" });
  }
  function ouvrir(it) {
    liste = visibles(); if (!liste.includes(it)) liste = items;
    origine = it;
    document.documentElement.classList.add("verrou");
    const curseur = document.querySelector(".curseur"), loupe = document.querySelector(".loupe");
    if (curseur) dlg.append(curseur, loupe);
    dlg.showModal();
    montrer(liste.indexOf(it));
    if (anime) {
      gsap.set(img, { x: 0, y: 0, scale: 1, autoAlpha: 1 });
      vol(it.querySelector("img"), false);
      gsap.fromTo(dlg, { backgroundColor: "rgba(18,20,20,0)" }, { backgroundColor: "rgba(18,20,20,.96)", duration: .4, clearProps: "backgroundColor" });
      /* opacité seule : un bouton masqué perdrait le focus clavier */
      gsap.fromTo(dlg.querySelectorAll(".haut, .bas, .precedent, .suivant"), { opacity: 0 }, { opacity: 1, duration: .35, delay: .2 });
    }
    dlg.querySelector(".fermer").focus({ preventScroll: true });
  }
  function fermer() {
    if (!dlg.open || enFermeture) return;
    if (ctx.rafraichirLoupe) ctx.rafraichirLoupe(true);
    if (!anime) { dlg.close(); return; }
    enFermeture = true;
    const cible = liste[pos] && !liste[pos].hidden ? liste[pos].querySelector("img") : null;
    const r = cible ? cible.getBoundingClientRect() : null;
    const visible = r && r.bottom > 0 && r.top < innerHeight;
    gsap.to(dlg.querySelectorAll(".haut, .bas, .precedent, .suivant"), { opacity: 0, duration: .2 });
    gsap.to(dlg, { backgroundColor: "rgba(18,20,20,0)", duration: .45, ease: "power2.in" });
    const fin = () => { enFermeture = false; dlg.close(); gsap.set([img, ...dlg.querySelectorAll(".haut, .bas, .precedent, .suivant")], { clearProps: "all" }); };
    const anim = visible ? vol(cible, true) : gsap.to(img, { scale: .92, autoAlpha: 0, duration: .35, ease: "power2.in" });
    if (anim) anim.eventCallback("onComplete", fin); else fin();
  }
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); fermer(); });
  dlg.addEventListener("close", () => {
    document.documentElement.classList.remove("verrou");
    const curseur = dlg.querySelector(".curseur"), loupe = dlg.querySelector(".loupe");
    if (curseur) document.body.append(curseur, loupe);
    if (ctx.rafraichirLoupe) ctx.rafraichirLoupe(true);
    history.replaceState(null, "", location.pathname + location.search);
    const retour = liste[pos] && !liste[pos].hidden ? liste[pos] : origine;
    if (retour) retour.focus({ preventScroll: true });
  });
  window.addEventListener("resize", () => { if (dlg.open && liste[pos]) ajuster(liste[pos]); });
  items.forEach((it) => it.addEventListener("click", (e) => { e.preventDefault(); ouvrir(it); }));
  dlg.querySelector(".fermer").addEventListener("click", fermer);
  dlg.querySelector(".precedent").addEventListener("click", () => montrer(pos - 1, -1));
  dlg.querySelector(".suivant").addEventListener("click", () => montrer(pos + 1, 1));
  document.addEventListener("keydown", (e) => {
    if (!dlg.open || enFermeture) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); montrer(pos - 1, -1); }
    if (e.key === "ArrowRight") { e.preventDefault(); montrer(pos + 1, 1); }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target === scene) fermer(); });
  let x0 = null;
  img.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") x0 = e.clientX; });
  img.addEventListener("pointerup", (e) => { if (x0 !== null) { const d = e.clientX - x0; if (Math.abs(d) > 50) montrer(pos + (d < 0 ? 1 : -1), d < 0 ? 1 : -1); x0 = null; } });

  /* lien direct vers une réalisation (#oeuvre-…) */
  const depuisAdresse = () => {
    const m = location.hash.match(/^#oeuvre-(.+)$/);
    return m ? document.getElementById("oeuvre-" + m[1]) : null;
  };
  const ouvrirDepuisAdresse = (it, attente) => {
    if (it.hidden) filtrer("tout");
    ctx.allerA(it.getBoundingClientRect().top + scrollY - innerHeight / 3, true);
    setTimeout(() => ouvrir(it), calme ? 0 : attente);
  };
  const premier = depuisAdresse();
  if (premier) ouvrirDepuisAdresse(premier, 500);
  window.addEventListener("hashchange", () => {
    const it = depuisAdresse();
    if (!it) return;
    if (!dlg.open) ouvrirDepuisAdresse(it, 60);
    else if (!enFermeture) { if (!liste.includes(it)) liste = items; montrer(liste.indexOf(it)); }
    else dlg.addEventListener("close", () => ouvrirDepuisAdresse(it, 60), { once: true });
  });
}
