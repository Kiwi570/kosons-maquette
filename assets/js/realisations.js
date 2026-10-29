/* Réalisations : table lumineuse, filtres animés (Flip), visionneuse avec loupe. */
import { introReperage, rouleau } from "./effets.js?v=3";

export function realisations(ctx) {
  const { gsap, calme } = ctx;
  const items = [...document.querySelectorAll(".oeuvre")];
  const onglets = [...document.querySelectorAll(".onglet")];
  const annonce = document.getElementById("annonce-filtre");
  const galerie = document.getElementById("galerie");

  /* ---------------------------------------------------------- ouverture */
  if (gsap && !calme) {
    const delai = ctx.rideauOuvrir();
    const sec = document.getElementById("ouverture");
    const h1 = sec.querySelector("h1");
    const intro = sec.querySelectorAll("[data-intro]");
    const tirages = [...sec.querySelectorAll(".table-lumineuse .tirage")];
    gsap.set(intro, { clipPath: "inset(-4% 100% -8% 0)" });
    const tl = gsap.timeline({ delay: delai });
    introReperage(h1, gsap, tl, 0);
    tl.eventCallback("onComplete", () => { window.kosonsOuverture = performance.now(); });
    tl.add(() => { window.kosonsTitre = performance.now(); }, 1.25);
    intro.forEach((el, i) => tl.add(rouleau(el, gsap, { duree: .8 }), .7 + i * .2));
    tirages.forEach((t, i) => {
      const r = gsap.getProperty(t, "rotation");
      tl.fromTo(t, { autoAlpha: 0, y: -70, scale: 1.18, rotation: r + (i % 2 ? 10 : -10) }, { autoAlpha: 1, y: 0, scale: 1, rotation: r, duration: .7, ease: "back.out(1.3)" }, .3 + i * .11);
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
  function filtrer(cat) {
    const Flip = window.Flip;
    const etat = Flip && gsap && !calme ? Flip.getState(items) : null;
    let n = 0;
    items.forEach((it) => { const ok = cat === "tout" || it.dataset.cat === cat; it.hidden = !ok; if (ok) n++; });
    onglets.forEach((o) => o.setAttribute("aria-pressed", String(o.dataset.filtre === cat)));
    const lab = onglets.find((o) => o.dataset.filtre === cat);
    if (annonce) annonce.textContent = `${n} réalisation${n > 1 ? "s" : ""} : ${lab ? lab.firstChild.textContent : ""}`;
    if (etat) {
      Flip.from(etat, {
        duration: .65, ease: "power3.inOut", absolute: true, scale: false, stagger: .012,
        onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: .92 }, { autoAlpha: 1, scale: 1, duration: .5, delay: .15 }),
        onLeave: (els) => gsap.fromTo(els, { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: .92, duration: .35 }),
        onComplete: () => ctx.ScrollTrigger && ctx.ScrollTrigger.refresh(),
      });
    }
    const haut = galerie.getBoundingClientRect().top + scrollY - (document.querySelector(".filtres")?.offsetHeight || 0) - 10;
    if (scrollY > haut) ctx.allerA(haut);
  }
  onglets.forEach((o) => o.addEventListener("click", () => filtrer(o.dataset.filtre)));

  /* ---------------------------------------------------------- visionneuse */
  const dlg = document.querySelector(".visionneuse");
  const img = dlg.querySelector(".scene-v img");
  const titre = dlg.querySelector(".v-titre"), type = dlg.querySelector(".v-type"), compteur = dlg.querySelector(".compteur");
  let liste = [], pos = 0, origine = null;
  const visibles = () => items.filter((it) => !it.hidden);

  function montrer(k, sens = 0) {
    pos = (k + liste.length) % liste.length;
    const it = liste[pos];
    img.src = it.dataset.grand;
    img.width = +it.dataset.w; img.height = +it.dataset.h;
    img.alt = it.querySelector("img").alt;
    img.dataset.loupe = it.dataset.grand;
    titre.textContent = it.dataset.titre;
    type.textContent = it.dataset.type;
    compteur.textContent = `${pos + 1} / ${liste.length}`;
    history.replaceState(null, "", "#oeuvre-" + it.dataset.id);
    if (gsap && !calme && sens) gsap.fromTo(img, { x: sens * 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .45, ease: "power3.out" });
  }
  function ouvrir(it) {
    liste = visibles(); if (!liste.includes(it)) liste = items;
    origine = it;
    montrer(liste.indexOf(it));
    document.documentElement.classList.add("verrou");
    const curseur = document.querySelector(".curseur"), loupe = document.querySelector(".loupe");
    if (curseur) dlg.append(curseur, loupe);
    dlg.showModal();
    if (gsap && !calme) {
      const a = it.querySelector("img").getBoundingClientRect();
      requestAnimationFrame(() => {
        const b = img.getBoundingClientRect();
        if (b.width) gsap.fromTo(img, { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width }, { x: 0, y: 0, scale: 1, duration: .6, ease: "expo.out" });
      });
      gsap.fromTo(dlg, { backgroundColor: "rgba(18,20,20,0)" }, { backgroundColor: "rgba(18,20,20,.96)", duration: .4, clearProps: "backgroundColor" });
    }
  }
  function fermer() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener("close", () => {
    document.documentElement.classList.remove("verrou");
    const curseur = dlg.querySelector(".curseur"), loupe = dlg.querySelector(".loupe");
    if (curseur) document.body.append(curseur, loupe);
    history.replaceState(null, "", location.pathname + location.search);
    if (origine) origine.focus({ preventScroll: true });
  });
  items.forEach((it) => it.addEventListener("click", (e) => { e.preventDefault(); ouvrir(it); }));
  dlg.querySelector(".fermer").addEventListener("click", fermer);
  dlg.querySelector(".precedent").addEventListener("click", () => montrer(pos - 1, -1));
  dlg.querySelector(".suivant").addEventListener("click", () => montrer(pos + 1, 1));
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); montrer(pos - 1, -1); }
    if (e.key === "ArrowRight") { e.preventDefault(); montrer(pos + 1, 1); }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.classList.contains("scene-v")) fermer(); });
  let x0 = null;
  img.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") x0 = e.clientX; });
  img.addEventListener("pointerup", (e) => { if (x0 !== null) { const d = e.clientX - x0; if (Math.abs(d) > 50) montrer(pos + (d < 0 ? 1 : -1), d < 0 ? 1 : -1); x0 = null; } });

  /* lien direct vers une réalisation (#oeuvre-…) */
  const ouvrirDepuisAdresse = () => {
    const m = location.hash.match(/^#oeuvre-(.+)$/);
    if (!m) return;
    const it = document.getElementById("oeuvre-" + m[1]);
    if (it) { ctx.allerA(it.getBoundingClientRect().top + scrollY - innerHeight / 3, true); setTimeout(() => ouvrir(it), calme ? 0 : 500); }
  };
  ouvrirDepuisAdresse();
  window.addEventListener("hashchange", () => { if (!dlg.open) ouvrirDepuisAdresse(); });
}
