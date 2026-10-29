# Kosons, maquette v2

Maquette du futur site de Kosons, atelier graphique de Virginie à Béziers (site actuel : kosons.fr).
Direction artistique « L'Imprimerie » : papier, encres pétrole et rouge, repérage des plaques, repères de coupe, tampons.

Site statique (HTML, CSS, JavaScript), sans étape de construction, prêt pour Vercel.

## Pages

| Adresse | Contenu |
|---|---|
| `/` | Ouverture, savoir-faire, atelier, nuancier des prestations, étiquettes de vin, méthode en 5 étapes, réalisations choisies, extrait des tarifs, bon de commande (simulation) |
| `/realisations` | Les 60 réalisations du site actuel, filtres par catégorie, visionneuse avec loupe, lien direct `#oeuvre-…` |
| `/tarifs` | Tous les tarifs publiés, estimateur de budget relié au bon de commande, avant-propos |
| `/mentions-legales` | Mentions légales et données personnelles, à compléter |
| `404.html` | Page introuvable |

## Structure

```
assets/css/site.css          styles (version ?v=1)
assets/js/main.js            point d'entrée (module)
assets/js/noyau.js           mode calme, mesures, défilement fluide, curseur et loupe, transitions
assets/js/effets.js          repérage, repères de coupe, rouleau encreur, tampons, compteurs
assets/js/papier.js          papier vivant WebGL (OGL)
assets/js/accueil.js         accueil : ouverture, ruban, nuancier et méthode épinglés, bon de commande
assets/js/realisations.js    filtres (GSAP Flip), visionneuse
assets/js/tarifs.js          estimateur
assets/js/lib/               GSAP 3.15 (ScrollTrigger, Flip, SplitText), OGL
assets/fonts/                Fraunces, Archivo (WOFF2, OFL)
assets/img/r/                réalisations (WebP, 3 tailles), noms vérifiés d'après le contenu
assets/img/ambiance/         images d'ambiance générées avec Grok
assets/img/identite/         logo, K, illustration de Virginie
assets/og/                   images de partage 1200×630
```

## Mise à jour (cache)

Les pages appellent les styles et scripts avec `?v=2`, à l'identique dans les pages et dans les `import` JavaScript.
À chaque nouvelle version livrée, ce numéro change partout. Aucune règle Cache-Control dans `vercel.json` :
Vercel fait revérifier chaque fichier à chaque visite.

## Historique

- v2 : transition entre pages réparée, ancres placées sous l'en-tête, loupe immédiate, menu téléphone plein écran avec contact,
  cartes de prestations cliquables vers les tarifs et puces de nuancier lisibles, éventail qui ne couvre plus le titre,
  méthode plus lisible, ouverture téléphone recomposée, tarifs téléphone avec le nuancier visible, images des familles
  de tarifs à la bonne taille, contrastes et tailles de texte conformes, tampon du reçu repositionné.
- v1 : première version.

## À retirer à la mise en ligne définitive

- La balise `<meta name="robots" content="noindex, nofollow">` dans chaque page.
- L'en-tête `X-Robots-Tag: noindex, nofollow` dans `vercel.json`.
- Les mentions « Maquette : rien n'est envoyé » et le fonctionnement simulé du bon de commande (brancher un vrai envoi).
- L'adresse `https://kosons-maquette.vercel.app` dans les balises `og:url` et `og:image`, à remplacer par l'adresse définitive.
- La mention « Cette maquette est hébergée par Vercel » dans les mentions légales.

## À compléter avec la cliente

- Nom de famille, statut juridique, adresse postale, directrice de la publication, hébergeur définitif.
- Politique de confidentialité (formulaire de devis : durée de conservation, base légale, droits).
- Avis clients réels (aucun sur le site actuel).
- Année et contexte de chaque réalisation.
- Accord des particuliers figurant sur les faire-part (prénoms visibles).
- Lien Facebook à confirmer : le site actuel en affiche deux différents.

## Points relevés sur le site actuel

- Boutons « Demander un devis » cassés (lien http vers l'adresse e-mail).
- Pas de mentions légales ; mention TVA à corriger en « TVA non applicable, art. 293 B du CGI ».
- Page « Contact » vide et article « Hello world! » de WordPress encore en ligne.
- Coquilles : « spiritueuxn », « community mamaner », « Afin l'améliorere », « PACKACHING », « Tarofs ».

## Vin et loi Évin

Les étiquettes sont présentées comme des créations graphiques, sans scène de consommation dans les images d'ambiance.
Le message « L'abus d'alcool est dangereux pour la santé, à consommer avec modération » accompagne la section vins
et la galerie, par précaution.

## Licences

GSAP : licence standard GreenSock (gratuite). OGL : MIT. Fraunces et Archivo : SIL Open Font License.
