/* Noyau commun : mode calme, mesures, défilement fluide, curseur, transitions de page. */

const doc = document.documentElement;
const CLE_CALME = "kosons-calme";
const CLE_RETOUR = "kosons-retour";
const CLE_RIDEAU = "kosons-rideau";

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const amortir = (actuel, cible, lambda, dt) => actuel + (cible - actuel) * (1 - Math.exp(-lambda * dt));

/* Chemin normalisé : /, /realisations, /tarifs… (avec ou sans .html, avec ou sans index) */
export function chemin(p) {
  p = p.replace(/\/index(\.html)?$/, "/").replace(/\.html$/, "");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

function lireCalme() {
  try { return localStorage.getItem(CLE_CALME); } catch (e) { return null; }
}

export function noyau() {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const plugins = [ScrollTrigger, window.Flip, window.SplitText].filter(Boolean);
  if (gsap) gsap.registerPlugin(...plugins);

  const calme = doc.classList.contains("calme");
  const finPointeur = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const ctx = { gsap, ScrollTrigger, calme, finPointeur, page: document.body.dataset.page };

  /* ----------------------------------------------------------- mesures */
  const entete = document.querySelector(".entete");
  const barre = document.querySelector(".barre-mobile");
  function mesurer() {
    const h = entete ? entete.offsetHeight : 64;
    doc.style.setProperty("--entete-h", h + "px");
    const visible = barre && getComputedStyle(barre).display !== "none";
    doc.style.setProperty("--barres-h", visible ? (barre.offsetHeight + 16) + "px" : "0px");
  }
  mesurer();
  let attente;
  window.addEventListener("resize", () => {
    clearTimeout(attente);
    attente = setTimeout(() => { mesurer(); }, 80);
  });
  ctx.mesurer = mesurer;

  /* ----------------------------------------------------------- mode calme */
  const boutonCalme = document.querySelector(".bouton-calme");
  if (boutonCalme) {
    boutonCalme.setAttribute("aria-pressed", calme ? "true" : "false");
    boutonCalme.addEventListener("click", () => {
      try { localStorage.setItem(CLE_CALME, calme ? "0" : "1"); } catch (e) {}
      memoriserPosition();
      location.reload();
    });
  }
  /* bloc de référence : la section, ou son espace d'épinglage (pin-spacer) */
  const bloc = (el) => (el.parentElement && el.parentElement.classList.contains("pin-spacer") ? el.parentElement : el);
  function memoriserPosition() {
    const y = (entete ? entete.offsetHeight : 64) + 8;
    let ancre = null;
    for (const el of document.elementsFromPoint(innerWidth / 2, y)) {
      let s = el.closest("main > *, .pied");
      if (s && s.classList.contains("pin-spacer")) s = s.firstElementChild;
      if (s) { ancre = s; break; }
    }
    if (!ancre) return;
    if (!ancre.id) ancre.id = "bloc-" + [...document.querySelectorAll("main > *")].indexOf(bloc(ancre));
    const b = bloc(ancre), top = b.getBoundingClientRect().top;
    try { sessionStorage.setItem(CLE_RETOUR, JSON.stringify({ chemin: chemin(location.pathname), id: ancre.id, ratio: -top / Math.max(1, b.offsetHeight) })); } catch (e) {}
  }
  ctx.restaurerPosition = function () {
    let r = null;
    try { r = JSON.parse(sessionStorage.getItem(CLE_RETOUR) || "null"); sessionStorage.removeItem(CLE_RETOUR); } catch (e) {}
    if (!r || r.chemin !== chemin(location.pathname)) return false;
    let el = document.getElementById(r.id);
    if (!el && /^bloc-\d+$/.test(r.id)) { const k = +r.id.split("-")[1]; const tous = [...document.querySelectorAll("main > *")].map((x) => (x.classList.contains("pin-spacer") ? x.firstElementChild : x)); el = tous[k]; }
    if (!el) return false;
    const b = bloc(el);
    const base = b.getBoundingClientRect().top + scrollY;
    const delta = clamp(r.ratio * b.offsetHeight, 0, Math.max(0, b.offsetHeight - 40));
    window.scrollTo(0, base + delta);
    return true;
  };

  /* ----------------------------------------------------------- en-tête & menu */
  const majEntete = () => entete && entete.classList.toggle("defile", scrollY > 8);
  window.addEventListener("scroll", majEntete, { passive: true });
  majEntete();
  const menuBouton = document.querySelector(".menu-bouton");
  function fermerMenu() {
    doc.classList.remove("menu-ouvert");
    if (menuBouton) { menuBouton.setAttribute("aria-expanded", "false"); menuBouton.setAttribute("aria-label", "Ouvrir le menu"); }
  }
  if (menuBouton) {
    menuBouton.addEventListener("click", () => {
      const ouvert = !doc.classList.contains("menu-ouvert");
      doc.classList.toggle("menu-ouvert", ouvert);
      menuBouton.setAttribute("aria-expanded", String(ouvert));
      menuBouton.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermerMenu(); });
  }

  /* ----------------------------------------------------------- vitesse de défilement (lissée, selon le temps) */
  let dernierY = scrollY, vitesse = 0, vitesseBrute = 0;
  if (gsap) {
    gsap.ticker.add((t, deltaMs) => {
      const dt = Math.max(1, deltaMs) / 1000;
      const y = scrollY;
      vitesseBrute = (y - dernierY) / dt;
      dernierY = y;
      vitesse = amortir(vitesse, clamp(vitesseBrute, -6000, 6000), 6, dt);
    });
  }
  ctx.vitesse = () => vitesse;

  /* ----------------------------------------------------------- défilement fluide (le natif reste la référence) */
  ctx.defil = (!calme && finPointeur) ? defilementFluide() : null;

  ctx.allerA = function (cible, instant) {
    let y = 0;
    if (typeof cible === "number") y = cible;
    else if (cible) {
      const parent = cible.parentElement;
      const st = parent && parent.classList.contains("pin-spacer") ? parent : cible;
      y = st.getBoundingClientRect().top + scrollY;
    }
    y = clamp(y, 0, doc.scrollHeight - innerHeight);
    if (instant || calme) window.scrollTo(0, y);
    else if (ctx.defil) ctx.defil.vers(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  /* ----------------------------------------------------------- liens : ancres, pages, rideau */
  const rideau = document.querySelector(".rideau");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    if (u.origin !== location.origin) return;
    const memePage = chemin(u.pathname) === chemin(location.pathname);
    if (memePage) {
      if (u.hash && u.hash.startsWith("#oeuvre-")) return; // géré par la page Réalisations
      e.preventDefault();
      fermerMenu();
      const cible = u.hash ? document.getElementById(decodeURIComponent(u.hash.slice(1))) : null;
      ctx.allerA(cible || 0);
      if (u.hash) history.replaceState(null, "", u.hash);
      if (cible && cible.matches("#devis")) setTimeout(() => { const f = cible.querySelector("input, button"); if (f && ctx.finPointeur) f.focus({ preventScroll: true }); }, 900);
      return;
    }
    if (calme || !rideau || !gsap) return;
    e.preventDefault();
    fermerMenu();
    try { sessionStorage.setItem(CLE_RIDEAU, "1"); } catch (er) {}
    gsap.fromTo(rideau, { yPercent: 101 }, { yPercent: 0, duration: .55, ease: "power3.inOut", onComplete: () => { location.href = u.href; } });
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && rideau && gsap) gsap.set(rideau, { yPercent: 101 });
  });
  ctx.rideauOuvrir = function () {
    let venu = false;
    try { venu = sessionStorage.getItem(CLE_RIDEAU) === "1"; sessionStorage.removeItem(CLE_RIDEAU); } catch (e) {}
    if (!venu || !rideau || !gsap || calme) return 0;
    gsap.set(rideau, { yPercent: 0 });
    gsap.to(rideau, { yPercent: -101, duration: .7, ease: "power3.inOut", delay: .05 });
    return .35;
  };

  /* ----------------------------------------------------------- barre mobile masquée sur le devis et le pied */
  if (barre && "IntersectionObserver" in window) {
    const zones = [document.getElementById("devis"), document.getElementById("pied")].filter(Boolean);
    const vus = new Set();
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((en) => en.isIntersecting ? vus.add(en.target) : vus.delete(en.target));
      barre.classList.toggle("masquee", vus.size > 0);
    }, { threshold: 0.05 });
    zones.forEach((z) => io.observe(z));
  }

  /* ----------------------------------------------------------- curseur, loupe, aimants */
  if (finPointeur && !calme && gsap) curseurEtLoupe(ctx);

  /* ----------------------------------------------------------- prêt : polices chargées (délai court) */
  ctx.pret = new Promise((resoudre) => {
    const fin = () => { doc.classList.remove("chargement"); resoudre(); };
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(fin);
    } else fin();
  });
  return ctx;
}

/* ===================================================================== défilement fluide */
function defilementFluide() {
  let cible = scrollY, actuel = scrollY, actif = false, dernier = 0, raf = 0;
  const lambda = 10;
  const max = () => doc.scrollHeight - innerHeight;

  function defilableDans(el, dy) {
    while (el && el !== document.body && el !== doc) {
      if (el.nodeType === 1) {
        const s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
          if ((dy < 0 && el.scrollTop > 0) || (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1)) return true;
        }
      }
      el = el.parentNode;
    }
    return false;
  }
  function boucle(maintenant) {
    const dt = Math.min(.05, (maintenant - dernier) / 1000 || .016);
    dernier = maintenant;
    actuel = amortir(actuel, cible, lambda, dt);
    if (Math.abs(cible - actuel) < .4) { actuel = cible; actif = false; }
    window.scrollTo(0, actuel);
    if (actif) raf = requestAnimationFrame(boucle);
  }
  function lancer() {
    if (actif) return;
    actif = true; dernier = performance.now();
    raf = requestAnimationFrame(boucle);
  }
  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.defaultPrevented || doc.classList.contains("verrou")) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (defilableDans(e.target, e.deltaY)) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 36; else if (e.deltaMode === 2) d *= innerHeight;
    if (!actif) { cible = actuel = scrollY; }
    cible = Math.min(max(), Math.max(0, cible + d));
    lancer();
  }, { passive: false });
  window.addEventListener("scroll", () => {
    if (!actif) { cible = actuel = scrollY; return; }
    if (Math.abs(scrollY - actuel) > 3) { cible = actuel = scrollY; actif = false; cancelAnimationFrame(raf); }
  }, { passive: true });
  return {
    vers(y) { if (!actif) { cible = actuel = scrollY; } cible = Math.min(max(), Math.max(0, y)); lancer(); },
    arreter() { actif = false; cancelAnimationFrame(raf); cible = actuel = scrollY; },
  };
}

/* ===================================================================== curseur & loupe */
function curseurEtLoupe(ctx) {
  const { gsap } = ctx;
  const anneau = document.querySelector(".curseur");
  const loupe = document.querySelector(".loupe");
  if (!anneau || !loupe) return;
  doc.classList.add("avec-curseur");
  const ax = gsap.quickTo(anneau, "x", { duration: .35, ease: "power3" });
  const ay = gsap.quickTo(anneau, "y", { duration: .35, ease: "power3" });
  const ZOOM = 2.5, R = 95;
  let imgLoupe = null;

  function zoneImage(img) {
    const r = img.getBoundingClientRect();
    const nw = img.naturalWidth || +img.getAttribute("width"), nh = img.naturalHeight || +img.getAttribute("height");
    const fit = getComputedStyle(img).objectFit;
    if (fit !== "contain" || !nw || !nh) return r;
    const s = Math.min(r.width / nw, r.height / nh);
    const w = nw * s, h = nh * s;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  }
  function majLoupe(x, y) {
    const z = zoneImage(imgLoupe);
    if (x < z.left || x > z.left + z.width || y < z.top || y > z.top + z.height) { loupe.classList.remove("actif"); anneau.classList.remove("cache"); return; }
    loupe.classList.add("actif"); anneau.classList.add("cache");
    loupe.style.transform = `translate(${x}px, ${y}px)`;
    loupe.style.backgroundSize = `${z.width * ZOOM}px ${z.height * ZOOM}px`;
    loupe.style.backgroundPosition = `${-((x - z.left) * ZOOM - R)}px ${-((y - z.top) * ZOOM - R)}px`;
  }
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    anneau.classList.add("actif");
    ax(e.clientX); ay(e.clientY);
    const cible = e.target;
    const img = cible.closest ? cible.closest("img[data-loupe]") : null;
    if (img) {
      if (img !== imgLoupe) { imgLoupe = img; loupe.style.backgroundImage = `url("${img.dataset.loupe}")`; }
      majLoupe(e.clientX, e.clientY);
    } else if (imgLoupe) {
      imgLoupe = null; loupe.classList.remove("actif"); anneau.classList.remove("cache");
    }
    anneau.classList.toggle("sur-lien", !!(cible.closest && cible.closest("a, button, summary, label, [role=button]")));
  }, { passive: true });
  window.addEventListener("scroll", () => { if (imgLoupe) { imgLoupe = null; loupe.classList.remove("actif"); anneau.classList.remove("cache"); } }, { passive: true });
  document.addEventListener("pointerleave", () => { anneau.classList.remove("actif"); loupe.classList.remove("actif"); });

  /* boutons magnétiques */
  document.querySelectorAll(".aimant").forEach((el) => {
    const mx = gsap.quickTo(el, "x", { duration: .5, ease: "power3" });
    const my = gsap.quickTo(el, "y", { duration: .5, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      mx(Math.max(-10, Math.min(10, (e.clientX - (r.left + r.width / 2)) * .25)));
      my(Math.max(-8, Math.min(8, (e.clientY - (r.top + r.height / 2)) * .3)));
    });
    el.addEventListener("pointerleave", () => { mx(0); my(0); });
  });
}
