# Simulateur impôt sur le revenu 2026

[![Deploy to GitHub Pages](https://github.com/vannhi/income-tax-calculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/vannhi/income-tax-calculator/actions/workflows/deploy.yml)

Simulateur simplifié de l'impôt 2026 sur les revenus 2025 (France).

👉 **Démo en ligne : [vannhi.github.io/income-tax-calculator](https://vannhi.github.io/income-tax-calculator/)**

## Fonctionnalités

- Calcul de l'impôt selon la situation du foyer : célibataire ou marié / pacsé, nombre d'enfants à charge, revenu net imposable
- Prise en compte du **quotient familial** et de son **plafonnement** (y compris la demi-part parent isolé, case T)
- Application de la **décote** et du **seuil de mise en recouvrement** (61 €)
- **Taux marginal réel**, incluant les effets de la décote et du plafonnement
- **Estimation de l'impôt 2027** sur les revenus 2026 avec un taux de revalorisation ajustable
- Affichage du barème par tranches
- Interface accessible (lecteurs d'écran, navigation clavier)

> ⚠️ Simulation indicative : elle ne remplace pas le [simulateur officiel](https://simulateur-ir-ifi.impots.gouv.fr/) de l'administration fiscale.

## Stack

[Svelte 5](https://svelte.dev/) · TypeScript · [Vite](https://vite.dev/) · [Tailwind CSS 4](https://tailwindcss.com/) · [daisyUI 5](https://daisyui.com/) · [Vitest](https://vitest.dev/)

## Développement

Prérequis : Node.js 24 et [pnpm](https://pnpm.io/).

```bash
pnpm install    # installer les dépendances
pnpm dev        # serveur de développement
pnpm test       # tests unitaires
pnpm check      # vérification des types
pnpm build      # build de production dans dist/
pnpm preview    # prévisualiser le build
```

Les paramètres fiscaux (tranches, plafonds, décote) se trouvent dans [`src/income-tax.ts`](src/income-tax.ts).

## Déploiement

Chaque push sur `main` lance le workflow [`deploy.yml`](.github/workflows/deploy.yml) : tests, build, puis publication sur GitHub Pages.
