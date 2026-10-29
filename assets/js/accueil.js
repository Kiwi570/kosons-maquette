/* Accueil : ouverture, ruban, nuancier, méthode, planche-contact, bon de commande. */
import { introReperage, tracerCoupes, rouleau, tamponner, aLEntree } from "./effets.js?v=3";
import { papierVivant } from "./papier.js?v=3";
import { amortir, clamp } from "./noyau.js?v=3";

const CONDITION_EPINGLE = "(min-width: 900px) and (min-height: 520px)";

export function accueil(ctx) {
  const { gsap, calme } = ctx;
  formulaire(ctx);
  if (!gsap) return;
  if (calme) { calmeAccueil(ctx); return; }
  const delai = ctx.rideauOuvrir();
  ouverture(ctx, delai);
  ruban(ctx);
  nuancier(ctx);
  methode(ctx);
  bandes(ctx);
}

/* ------------------------------------------------------------------ ouverture (moins de 3 s) */
function ouverture(ctx, t0) {
  const { gsap } = ctx;
  const sec = document.getElementById("ouverture");
  const h1 = sec.querySelector(".titre-ouverture");
  const point = h1.querySelector(":scope > .ligne .point-k");
  const tirP = sec.querySelector(".tirage--principal");
  const tirS = sec.querySelector(".tirage--second");
  const intro = sec.querySelectorAll("[data-intro]");
  const pied = sec.querySelector(".pied-ouverture");
  const mire = sec.querySelector(".mire");
  const encre = papierVivant(sec);

  gsap.set([tirP, tirS, pied, mire, point], { autoAlpha: 0 });
  gsap.set(intro, { clipPath: "inset(-4% 100% -8% 0)" });
  [tirP, tirS].forEach((f) => gsap.set(f.querySelectorAll(":scope > .coupe line"), { strokeDasharray: 1, strokeDashoffset: 1 }));

  const tl = gsap.timeline({ delay: t0, defaults: { ease: "power3.out" } });
  tl.timeScale(1.2);
  introReperage(h1, gsap, tl, 0);
  tl.fromTo(mire, { autoAlpha: 0, rotation: -90, scale: .6 }, { autoAlpha: 1, rotation: 0, scale: 1, duration: .8 }, .1)
    .fromTo(tirP, { autoAlpha: 0, y: 46, rotation: 3 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 1, ease: "expo.out" }, .45)
    .fromTo(tirS, { autoAlpha: 0, x: -50, rotation: -14 }, { autoAlpha: 1, x: 0, rotation: -4, duration: 1, ease: "expo.out" }, .7)
    .add(() => { tracerCoupes(tirP, gsap); tracerCoupes(tirS, gsap, .1); }, .9)
    .fromTo(point, { autoAlpha: 0, y: () => -innerHeight * .5, scaleX: .8, scaleY: 1.25 }, { autoAlpha: 1, y: 0, duration: .42, ease: "power2.in" }, .95)
    .to(point, { scaleX: 1.45, scaleY: .62, duration: .07, ease: "power1.out" })
    .to(point, { scaleX: 1, scaleY: 1, duration: .7, ease: "elastic.out(1, .35)" })
    .add(() => { if (encre) { encre.demarrer(); const r = point.getBoundingClientRect(), s = sec.getBoundingClientRect(); encre.goutte(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, 46); } }, 1.4);
  intro.forEach((el, i) => tl.add(rouleau(el, gsap, { duree: .8 }), 1.05 + i * .2));
  tl.fromTo(pied, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .6 }, 1.5);
  tl.eventCallback("onComplete", () => { window.kosonsOuverture = performance.now(); });
  tl.add(() => { window.kosonsTitre = performance.now(); }, 1.25);

  /* les tirages flottent légèrement au défilement */
  gsap.fromTo(sec.querySelector(".tirages"), { yPercent: 0 }, { yPercent: -10, ease: "none", scrollTrigger: { trigger: sec, start: "top top", end: "bottom top", scrub: .5 } });
}

/* ------------------------------------------------------------------ ruban : vitesse et largeur liées au défilement */
function ruban(ctx) {
  const { gsap } = ctx;
  const el = document.querySelector(".ruban");
  if (!el) return;
  const piste = el.querySelector(".ruban-piste");
  const mots = el.querySelectorAll(".ruban-mot");
  let x = 0, sens = -1, visible = true, largeur = 0, l = 100;
  const mesurer = () => { largeur = piste.firstElementChild.offsetWidth; };
  mesurer(); window.addEventListener("resize", mesurer);
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(el);
  const poserX = gsap.quickSetter(piste, "x", "px");
  gsap.ticker.add((t, ms) => {
    if (!visible || !largeur) return;
    const dt = Math.max(1, ms) / 1000;
    const v = ctx.vitesse();
    if (Math.abs(v) > 40) sens = v > 0 ? -1 : 1;
    const vit = 70 + Math.min(900, Math.abs(v) * .35);
    x += sens * vit * dt;
    if (x <= -largeur) x += largeur; else if (x > 0) x -= largeur;
    poserX(x);
    const cible = clamp(100 + Math.abs(v) * .02, 100, 125);
    const nl = amortir(l, cible, 6, dt);
    if (Math.abs(nl - l) > .05) { l = nl; mots.forEach((m) => { m.style.fontStretch = l.toFixed(1) + "%"; }); }
  });
}

/* ------------------------------------------------------------------ nuancier épinglé qui s'éventaille */
function nuancier(ctx) {
  const { gsap } = ctx;
  const sec = document.getElementById("prestations");
  if (!sec) return;
  const lames = [...sec.querySelectorAll(".lame")];
  const piste = sec.querySelector(".nuancier-piste");
  const fen = sec.querySelector(".nuancier-fenetre");
  const jauge = sec.querySelector(".jauge i");
  const n = lames.length;
  const mm = gsap.matchMedia();

  mm.add(CONDITION_EPINGLE, () => {
    sec.classList.add("epingle");
    const pad = () => parseFloat(getComputedStyle(fen).paddingLeft) || 0;
    const distance = () => Math.max(0, piste.scrollWidth - (fen.clientWidth - pad() * 2));
    const ecart = (i) => -(lames[i].offsetLeft - lames[0].offsetLeft) + i * 14;
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: sec, start: "top top", end: () => "+=" + Math.round(innerHeight * .9 + distance()),
        pin: true, scrub: .7, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (s) => { if (jauge) jauge.style.transform = `scaleX(${s.progress})`; },
      },
    });
    /* nuancier fermé : lames empilées en éventail, la première dessus, légèrement réduites pour rester sous le titre */
    const angle = (i) => (i - (n - 1) / 2) * 6 - 4;
    const ECH = .86;
    const lever = (i) => -(lames[i].offsetHeight * .15 * (1 - ECH)) - (lames[i].offsetWidth / 2) * ECH * Math.sin(Math.abs(angle(i)) * Math.PI / 180) - 4;
    gsap.set(lames, { zIndex: (i) => n - i });
    tl.fromTo(lames, { x: (i) => ecart(i), y: (i) => lever(i), rotation: angle, scale: ECH }, { x: 0, y: 0, rotation: 0, scale: 1, duration: 1, stagger: { each: .02, from: "start" } }, 0)
      .fromTo(piste, { x: 0 }, { x: () => -distance(), duration: 1.4 }, 1.05)
      .to({}, { duration: .3 });
    return () => { sec.classList.remove("epingle"); gsap.set([piste, ...lames], { clearProps: "transform,zIndex" }); };
  });
  mm.add("(max-width: 899px), (max-height: 519px)", () => {
    const tl = gsap.timeline({ paused: true });
    aLEntree(tl, { trigger: fen, start: "top 80%" });
    tl.fromTo(lames, { x: (i) => -i * 40, rotation: (i) => (i - (n - 1) / 2) * 8 }, { x: 0, rotation: 0, duration: 1.1, ease: "expo.out", stagger: .05 });
  });
}

/* ------------------------------------------------------------------ méthode épinglée : la feuille passe sous la presse */
function methode(ctx) {
  const { gsap } = ctx;
  const sec = document.getElementById("methode");
  if (!sec) return;
  const etapes = [...sec.querySelectorAll(".etape")];
  const stations = [...sec.querySelectorAll(".station")];
  const trace = sec.querySelector(".presse .trace");
  const n = etapes.length;
  const mm = gsap.matchMedia();

  mm.add(CONDITION_EPINGLE, () => {
    sec.classList.add("epingle");
    const textes = etapes.map((e) => e.querySelector(".etape-texte"));
    const images = etapes.map((e) => e.querySelector(".etape-image"));
    const tampons = etapes.map((e) => e.querySelector(".tampon"));
    gsap.set(etapes, { zIndex: (i) => i + 1 });
    gsap.set(textes.slice(1), { autoAlpha: 0 });
    gsap.set(images.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
    gsap.set(tampons, { autoAlpha: 0 });
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: sec, start: "top top", end: () => "+=" + Math.round(innerHeight * (n - .2) * .75),
        pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
      },
    });
    tl.eventCallback("onUpdate", () => majStations(tl.time()));
    tl.fromTo(trace, { scaleX: 0 }, { scaleX: 1, duration: n - 1 }, 0);
    tl.fromTo(tampons[0], { autoAlpha: 0, scale: 1.9, rotation: -40 }, { autoAlpha: .95, scale: 1, rotation: -12, duration: .25, ease: "power4.in" }, .15);
    for (let i = 1; i < n; i++) {
      const t = i - 1 + .35;
      tl.fromTo(textes[i - 1], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, duration: .3 }, t)
        .fromTo(images[i], { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: .5, ease: "power2.inOut" }, t)
        .fromTo(textes[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .35 }, t + .2)
        .fromTo(tampons[i], { autoAlpha: 0, scale: 1.9, rotation: -40 }, { autoAlpha: .95, scale: 1, rotation: -12, duration: .25, ease: "power4.in" }, t + .55);
    }
    tl.to({}, { duration: .3 });
    const st = tl.scrollTrigger;
    const clics = stations.map((b, i) => {
      const f = () => ctx.allerA(st.start + (st.end - st.start) * Math.min(1, (i === 0 ? 0 : i - .1) / tl.duration()));
      b.addEventListener("click", f); return f;
    });
    majStations(0);
    return () => {
      sec.classList.remove("epingle");
      stations.forEach((b, i) => b.removeEventListener("click", clics[i]));
      gsap.set([...textes, ...images, ...tampons, ...etapes, trace], { clearProps: "all" });
    };
  });
  mm.add("(max-width: 899px), (max-height: 519px)", () => {
    etapes.forEach((e) => {
      const t = e.querySelector(".tampon");
      gsap.set(t, { autoAlpha: 0 });
      rouleau(e.querySelector(".etape-texte"), gsap, { entree: { trigger: e, start: "top 80%" } });
      tamponner(t, gsap, { entree: { trigger: e.querySelector(".etape-image"), start: "top 65%" } });
    });
  });

  function majStations(t) {
    const actif = Math.max(0, Math.min(n - 1, Math.floor(t + .45)));
    stations.forEach((s, i) => { s.classList.toggle("faite", i <= actif); s.classList.toggle("active", i === actif); });
  }
}

/* ------------------------------------------------------------------ planche-contact : deux bandes en sens contraire */
function bandes(ctx) {
  const { gsap } = ctx;
  const sec = document.getElementById("selection");
  if (!sec) return;
  sec.querySelectorAll(".bande").forEach((b) => {
    const sens = +b.dataset.sens;
    const course = () => Math.max(0, b.scrollWidth - innerWidth) * .75;
    gsap.fromTo(b, { x: () => (sens > 0 ? -course() : 0) }, {
      x: () => (sens > 0 ? 0 : -course()), ease: "none",
      scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: .6, invalidateOnRefresh: true },
    });
  });
}

/* ------------------------------------------------------------------ version calme : tout est visible, rien n'est épinglé */
function calmeAccueil() {
  document.querySelectorAll(".tampon").forEach((t) => { t.style.opacity = ".95"; });
}

/* ------------------------------------------------------------------ bon de commande (simulation) */
function formulaire(ctx) {
  const { gsap, calme } = ctx;
  const bon = document.getElementById("bon");
  if (!bon) return;
  const etapes = [...bon.querySelectorAll(".etape-form")];
  const suite = bon.querySelector("[data-suite]");
  const retour = bon.querySelector("[data-retour]");
  const libelle = suite.querySelector(".libelle");
  const barres = [...bon.querySelectorAll(".progression i")];
  const annonce = document.getElementById("etape-annonce");
  const recap = bon.querySelector(".recap");
  let i = 0;

  /* préremplissage depuis l'estimateur de la page Tarifs */
  const params = new URLSearchParams(location.search);
  if (params.has("projets") || params.has("estimation")) {
    (params.get("projets") || "").split("|").filter(Boolean).forEach((v) => {
      const c = bon.querySelector(`input[name="projet"][value="${CSS.escape(v)}"]`); if (c) c.checked = true;
    });
    const m = bon.querySelector("#f-message"); if (m && params.get("estimation")) m.value = params.get("estimation");
  }

  function afficher(n, focus = true) {
    etapes.forEach((e, k) => { e.hidden = k !== n; });
    barres.forEach((b, k) => b.classList.toggle("faite", k <= n));
    retour.hidden = n === 0;
    libelle.textContent = n === etapes.length - 1 ? "Envoyer la demande" : "Continuer";
    if (annonce) annonce.textContent = `Étape ${n + 1} sur ${etapes.length}`;
    if (n === etapes.length - 1) remplirRecap();
    const e = etapes[n];
    if (gsap && !calme) gsap.fromTo(e, { autoAlpha: 0, x: 24 }, { autoAlpha: 1, x: 0, duration: .45, ease: "power3.out", clearProps: "transform" });
    if (focus) { e.setAttribute("tabindex", "-1"); e.focus({ preventScroll: true }); }
  }
  function erreur(cle, msg) { const p = bon.querySelector(`[data-erreur="${cle}"]`); if (p) p.textContent = msg || ""; }
  function valider(n) {
    if (n === 0) {
      const ok = bon.querySelectorAll('input[name="projet"]:checked').length > 0;
      erreur("projet", ok ? "" : "Choisissez au moins un type de projet.");
      return ok;
    }
    if (n === 2) {
      const nom = bon.querySelector("#f-nom"), mail = bon.querySelector("#f-mail");
      if (!nom.value.trim()) { erreur("vous", "Indiquez votre nom pour que je puisse vous répondre."); nom.focus(); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim())) { erreur("vous", "Indiquez une adresse e-mail valide, par exemple prenom@exemple.fr."); mail.focus(); return false; }
      erreur("vous", "");
    }
    return true;
  }
  function remplirRecap() {
    const val = (s) => [...bon.querySelectorAll(s)].map((x) => x.value).join(", ");
    const lignes = [
      ["Projet", val('input[name="projet"]:checked')],
      ["Budget", val('input[name="budget"]:checked') || "Non précisé"],
      ["Délai", val('input[name="delai"]:checked') || "Non précisé"],
      ["Nom", bon.querySelector("#f-nom").value.trim()],
      ["Structure", bon.querySelector("#f-structure").value.trim() || "—"],
      ["E-mail", bon.querySelector("#f-mail").value.trim()],
      ["Téléphone", bon.querySelector("#f-tel").value.trim() || "—"],
      ["Message", bon.querySelector("#f-message").value.trim() || "—"],
    ];
    recap.replaceChildren(...lignes.map(([a, b]) => { const d = document.createElement("div"); const dt = document.createElement("dt"); const dd = document.createElement("dd"); dt.textContent = a; dd.textContent = b; d.append(dt, dd); return d; }));
  }
  function envoyer() {
    const contenu = [...bon.children];
    const fin = () => {
      contenu.forEach((c) => { c.hidden = true; });
      const r = document.createElement("div");
      r.className = "recu";
      r.setAttribute("tabindex", "-1");
      r.innerHTML = `<div class="bon-tete"><b>Bon de commande</b><span>Duplicata client</span></div>
<h3>Demande reçue, en simulation</h3>
<p>Ceci est une maquette : aucun message n’a été envoyé. Pour joindre Kosons dès maintenant, écrivez à <a href="mailto:virginie.kosons@gmail.com">virginie.kosons@gmail.com</a> ou appelez le <a href="tel:+33621391727">06 21 39 17 27</a>.</p>
<button type="button" class="bouton bouton--ligne nouvelle">Faire une nouvelle demande</button>`;
      const tamp = document.querySelector(".tampon-recu-modele");
      if (tamp) { const t = tamp.cloneNode(true); t.classList.remove("tampon-recu-modele"); t.hidden = false; r.appendChild(t); if (gsap && !calme) tamponner(t, gsap, { delai: .35, angle: -14 }); else t.style.opacity = ".95"; }
      bon.appendChild(r);
      r.focus({ preventScroll: true });
      if (gsap && !calme) gsap.fromTo(r, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .6, ease: "power3.out" });
      r.querySelector(".nouvelle").addEventListener("click", () => {
        r.remove(); bon.reset(); contenu.forEach((c) => { c.hidden = false; });
        i = 0; afficher(0);
      });
    };
    if (gsap && !calme) {
      gsap.timeline()
        .to(bon, { rotation: -1.2, y: -6, duration: .18, ease: "power2.out" })
        .to(contenu, { autoAlpha: 0, y: -20, duration: .3, stagger: .03 }, "<")
        .add(() => { gsap.set(contenu, { clearProps: "all" }); fin(); })
        .to(bon, { rotation: 0, y: 0, duration: .6, ease: "elastic.out(1, .5)" });
    } else fin();
  }
  suite.addEventListener("click", () => {
    if (!valider(i)) return;
    if (i < etapes.length - 1) { i++; afficher(i); } else envoyer();
  });
  retour.addEventListener("click", () => { if (i > 0) { i--; afficher(i); } });
  bon.addEventListener("submit", (e) => { e.preventDefault(); suite.click(); });
  bon.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox" && e.target.type !== "radio") { e.preventDefault(); suite.click(); }
  });
  afficher(0, false);
}
