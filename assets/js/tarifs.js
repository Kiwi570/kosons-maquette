/* Tarifs : ouverture, estimateur sur ticket, arguments tamponnés. */
import { introReperage, rouleau, formaterEuros } from "./effets.js?v=3";

const PROJETS = {
  logo: "Logo, identité visuelle", identite: "Logo, identité visuelle",
  packaging: "Étiquette, packaging", etiquette: "Étiquette, packaging",
  cartes: "Cartes, flyers, affiches", papeterie: "Cartes, flyers, affiches", affiches: "Cartes, flyers, affiches",
  depliant: "Cartes, flyers, affiches", brochure: "Cartes, flyers, affiches", menu: "Cartes, flyers, affiches",
  evenements: "Carterie, faire-part", plv: "Signalétique, covering", goodies: "Signalétique, covering",
  site: "Site internet", banniere: "Réseaux sociaux", publications: "Réseaux sociaux",
};

export function tarifs(ctx) {
  const { gsap, calme } = ctx;

  if (gsap && !calme) {
    const delai = ctx.rideauOuvrir();
    const sec = document.getElementById("ouverture");
    const intro = sec.querySelectorAll("[data-intro]");
    gsap.set(intro, { clipPath: "inset(-4% 100% -8% 0)" });
    const tl = gsap.timeline({ delay: delai });
    introReperage(sec.querySelector("h1"), gsap, tl, 0);
    tl.eventCallback("onComplete", () => { window.kosonsOuverture = performance.now(); });
    tl.add(() => { window.kosonsTitre = performance.now(); }, 1.25);
    intro.forEach((el, i) => tl.add(rouleau(el, gsap, { duree: .8 }), .55 + i * .18));
    gsap.fromTo(sec.querySelector(".ambiance img"), { scale: 1.08 }, { scale: 1, duration: 2.2, ease: "power2.out", delay: delai });
    gsap.fromTo(sec.querySelector(".ambiance img"), { yPercent: 0 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: sec, start: "top top", end: "bottom top", scrub: .5 } });
  }

  /* ---------------------------------------------------------- arguments : un petit coup de tampon à l'ouverture */
  document.querySelectorAll(".argument").forEach((d) => {
    d.addEventListener("toggle", () => {
      if (!d.open || !gsap || calme) return;
      gsap.fromTo(d.querySelector(".signe"), { scale: 1.7, rotation: -40 }, { scale: 1, rotation: 0, duration: .5, ease: "back.out(3)" });
      gsap.fromTo(d.querySelector(".contenu"), { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: .4, ease: "power2.out" });
    });
  });

  /* ---------------------------------------------------------- estimateur */
  const lignes = [...document.querySelectorAll(".liste-estim li[data-id]")];
  const zone = document.querySelector(".ticket-lignes");
  const totalEl = document.querySelector(".ticket .total");
  const libTotal = document.querySelector(".ticket .libelle-total");
  const mensuel = document.querySelector(".ticket .mensuel");
  const envoyer = document.querySelector(".envoyer-estim");
  const etat = new Map(lignes.map((li) => [li.dataset.id, 0]));
  let totalAffiche = 0;

  lignes.forEach((li) => {
    const id = li.dataset.id;
    const coche = li.querySelector("input");
    const moins = li.querySelector("[data-moins]"), plus = li.querySelector("[data-plus]");
    const out = li.querySelector("output");
    const maj = (q, nouvelle) => {
      q = Math.max(0, Math.min(20, q));
      etat.set(id, q); out.textContent = q; coche.checked = q > 0; moins.disabled = q === 0;
      calculer(nouvelle ? id : null);
    };
    coche.addEventListener("change", () => maj(coche.checked ? 1 : 0, coche.checked));
    plus.addEventListener("click", () => maj(etat.get(id) + 1, etat.get(id) === 0));
    moins.addEventListener("click", () => maj(etat.get(id) - 1, false));
  });

  function calculer(nouvelId) {
    let total = 0, des = false, mois = 0;
    const choisis = [];
    lignes.forEach((li) => {
      const q = etat.get(li.dataset.id); if (!q) return;
      const prix = +li.dataset.prix;
      if (li.dataset.mensuel === "1") { mois += prix * q; if (li.dataset.des === "1") des = true; choisis.push({ li, q, prix, mensuel: true }); return; }
      total += prix * q; if (li.dataset.des === "1") des = true;
      choisis.push({ li, q, prix });
    });
    if (!choisis.length) { zone.innerHTML = '<p class="vide">Rien de coché pour l’instant.</p>'; }
    else {
      zone.replaceChildren(...choisis.map(({ li, q, prix, mensuel }) => {
        const d = document.createElement("div"); d.className = "ligne-prix"; d.dataset.id = li.dataset.id;
        const nom = document.createElement("span"); nom.textContent = li.dataset.nom + (q > 1 ? ` × ${q}` : "");
        const pts = document.createElement("span"); pts.className = "points";
        const m = document.createElement("span"); m.className = "montant";
        m.textContent = (li.dataset.des === "1" ? "dès " : "") + formaterEuros(prix * q) + (mensuel ? " / mois" : "");
        d.append(nom, pts, m); return d;
      }));
      const nouvelle = nouvelId && zone.querySelector(`[data-id="${nouvelId}"]`);
      if (nouvelle && gsap && !calme) gsap.fromTo(nouvelle, { clipPath: "inset(0 0 100% 0)", y: -10 }, { clipPath: "inset(0 0 0% 0)", y: 0, duration: .45, ease: "power2.out", clearProps: "clipPath" });
    }
    libTotal.textContent = des ? "Total, à partir de" : "Total";
    if (gsap && !calme) {
      const o = { v: totalAffiche };
      gsap.to(o, { v: total, duration: .6, ease: "power2.out", onUpdate: () => { totalEl.textContent = formaterEuros(o.v); } });
    } else totalEl.textContent = formaterEuros(total);
    totalAffiche = total;
    mensuel.hidden = !mois;
    mensuel.textContent = mois ? `Plus ${des ? "à partir de " : ""}${formaterEuros(mois)} par mois pour les réseaux sociaux.` : "";

    const projets = [...new Set(choisis.map(({ li }) => PROJETS[li.dataset.id]).filter(Boolean))];
    const texte = choisis.length
      ? "Estimation depuis la page Tarifs : " + choisis.map(({ li, q, prix, mensuel: mm }) => `${li.dataset.nom}${q > 1 ? " × " + q : ""} (${li.dataset.des === "1" ? "dès " : ""}${formaterEuros(prix * q)}${mm ? " / mois" : ""})`).join(", ") + `. Total indicatif : ${des ? "à partir de " : ""}${formaterEuros(total)}${mois ? " + " + formaterEuros(mois) + " / mois" : ""}.`
      : "";
    const p = new URLSearchParams();
    if (projets.length) p.set("projets", projets.join("|"));
    if (texte) p.set("estimation", texte);
    envoyer.href = "/" + (p.toString() ? "?" + p.toString() : "") + "#devis";
  }
  calculer(null);
}
