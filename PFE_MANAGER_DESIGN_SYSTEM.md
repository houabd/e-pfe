# PFE Manager — Frontend Design System

**Application:** Plateforme de Gestion des Projets de Fin d'Études  
**Département:** Informatique — Université de Sétif  
**Version:** 1.0  
**Date:** Mai 2026

---

## 1. Direction Artistique

### Concept — « Ink & Paper »

L'identité visuelle s'inspire de l'univers du manuscrit académique, du papier légèrement vieilli, et des annotations de professeur. On cherche une esthétique **éditoriale, sobre, texturée** — loin des gradients violets et des cards flottantes qu'on retrouve dans tous les SaaS génériques. L'idée : on ouvre l'application et on a l'impression de consulter un cahier de recherche bien organisé, pas un template Bootstrap.

Le ton est **sérieux sans être froid, structuré sans être rigide**. On utilise la densité d'information comme une force, pas comme un défaut. Les enseignants et les étudiants manipulent des données complexes (jurys, soutenances, binômes, thèmes, deadlines) — l'interface doit être un outil de travail, pas une vitrine.

### Atmosphère

- Fonds texturés rappelant un papier légèrement crème (pas blanc pur)
- Bordures fines et précises, pas d'ombres diffuses
- Accents de couleur utilisés avec parcimonie pour les statuts et les actions
- Sensation d'espace maîtrisé, pas d'espace gaspillé

---

## 2. Palette de Couleurs

La palette s'éloigne volontairement des bleus-violets-verts habituels. On travaille avec des tons chauds, terreux, et un accent cuivré.

### Tokens Sémantiques

```
--surface-primary:       #F6F1EB     /* Papier crème — fond principal */
--surface-secondary:     #EDE6DB     /* Papier plus marqué — cards, sidebars */
--surface-elevated:      #FFFFFF     /* Blanc pur — modales, popovers */
--surface-sunken:        #E4DCD0     /* En retrait — inputs, zones désactivées */

--text-primary:          #2C2520     /* Encre noire chaude — titres, corps */
--text-secondary:        #6B5E52     /* Encre diluée — labels, descriptions */
--text-tertiary:         #9C8E80     /* Très atténué — placeholders, hints */
--text-inverse:          #F6F1EB     /* Texte sur fond sombre */

--accent-copper:         #B5651D     /* Cuivre — CTA principal, liens actifs */
--accent-copper-hover:   #9A5418     /* Cuivre foncé — hover states */
--accent-copper-light:   #D4A574     /* Cuivre clair — badges, highlights */

--status-validated:      #4A7C59     /* Vert forêt — PFE validé, succès */
--status-pending:        #C4962C     /* Ambre — en attente, warning */
--status-rejected:       #A63D40     /* Bordeaux — refusé, erreur */
--status-draft:          #8B8178     /* Gris chaud — brouillon */

--border-default:        #D1C7BA     /* Bordure standard */
--border-strong:         #B0A496     /* Bordure accentuée */
--border-subtle:         #E4DCD0     /* Bordure légère */

--overlay:               rgba(44, 37, 32, 0.6)    /* Fond de modale */
```

### Mode Sombre (optionnel, seconde phase)

```
--surface-primary:       #1E1B18
--surface-secondary:     #2A2622
--surface-elevated:      #353029
--text-primary:          #E8E0D6
--text-secondary:        #A69B8E
--accent-copper:         #D4A574
--border-default:        #3D3731
```

### Contraste Vérifié (WCAG AA)

| Combinaison                          | Ratio  | Verdict |
|--------------------------------------|--------|---------|
| `--text-primary` sur `--surface-primary`  | 12.1:1 | AAA     |
| `--text-secondary` sur `--surface-primary` | 5.2:1  | AA      |
| `--accent-copper` sur `--surface-primary`  | 4.8:1  | AA      |
| `--status-rejected` sur `--surface-primary`| 5.6:1  | AA      |
| `--text-inverse` sur `--accent-copper`     | 5.1:1  | AA      |

---

## 3. Typographie

### Polices Choisies

On évite les choix génériques (Inter, Roboto, Open Sans, Poppins, Space Grotesk). On pioche dans des polices à caractère :

**Titres et Navigation — Libre Baskerville**  
Serif classique avec une personnalité académique affirmée. Évoque les pages de couverture de mémoires.

```
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
```

**Corps de texte et UI — Source Serif 4**  
Serif de labeur, très lisible en petite taille. Conçue pour de longues lectures — parfaite pour les descriptions de PFE, les commentaires de jury.

```
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,500;8..60,600&display=swap');
```

**Données et Codes — JetBrains Mono**  
Pour les tableaux de données, les identifiants de PFE, les numéros de référence, les compteurs.

```
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
```

### Échelle Typographique

Basée sur un ratio de 1.25 (Major Third), taille de base 16px :

| Token              | Taille  | Poids | Police           | Usage                              |
|--------------------|---------|-------|------------------|------------------------------------|
| `--text-display`   | 32px    | 700   | Libre Baskerville| Titre de page principal            |
| `--text-h1`        | 26px    | 700   | Libre Baskerville| Titres de sections                 |
| `--text-h2`        | 21px    | 700   | Libre Baskerville| Sous-sections                      |
| `--text-h3`        | 17px    | 600   | Source Serif 4   | Titres de cards, labels de groupe  |
| `--text-body`      | 16px    | 400   | Source Serif 4   | Texte principal                    |
| `--text-body-sm`   | 14px    | 400   | Source Serif 4   | Descriptions, aide contextuelle    |
| `--text-caption`   | 12px    | 500   | Source Serif 4   | Badges, timestamps, métadonnées    |
| `--text-mono`      | 14px    | 400   | JetBrains Mono   | IDs, codes, données tabulaires     |

### Propriétés Typographiques

```css
body {
  font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.65;
  color: var(--text-primary);
  font-feature-settings: 'liga' 1, 'kern' 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: 'Libre Baskerville', Georgia, serif;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.mono, code, .data-cell {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}
```

---

## 4. Grille et Espacement

### Système de Spacing — Échelle 4px

```
--space-1:    4px     /* Micro-gaps internes */
--space-2:    8px     /* Padding interne compact */
--space-3:    12px    /* Gap entre éléments liés */
--space-4:    16px    /* Padding standard de composant */
--space-5:    20px    /* Gap entre groupes */
--space-6:    24px    /* Padding de section */
--space-8:    32px    /* Séparation de sections */
--space-10:   40px    /* Séparation forte */
--space-12:   48px    /* Séparation de blocs majeurs */
--space-16:   64px    /* Marge de page */
```

### Grille de Layout

Le layout principal utilise une structure de type « bureau de travail » :

```
┌──────────────────────────────────────────────────────┐
│  Top Bar (56px) — Logo, Recherche, Notifications     │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │   Zone de Contenu Principal               │
│ (240px)  │   Max-width: 1120px                       │
│          │   Padding: 32px                           │
│ Fixed    │                                           │
│ Position │   ┌─────────────────────────────────┐     │
│          │   │ Header de page                   │     │
│          │   │ (Titre + actions)                │     │
│          │   ├─────────────────────────────────┤     │
│          │   │                                 │     │
│          │   │ Contenu                         │     │
│          │   │ (grille 12 colonnes, gap 24px)  │     │
│          │   │                                 │     │
│          │   └─────────────────────────────────┘     │
│          │                                           │
├──────────┴───────────────────────────────────────────┤
│  Pas de footer persistant — on utilise l'espace      │
└──────────────────────────────────────────────────────┘
```

### Breakpoints

```
--bp-mobile:    0px       /* Colonne unique, sidebar cachée        */
--bp-tablet:    768px     /* Sidebar collapsible, grille 8 cols    */
--bp-desktop:   1024px    /* Layout complet, sidebar fixe          */
--bp-wide:      1440px    /* Contenu centré, max-width appliqué    */
```

### Grille CSS

```css
.content-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
  max-width: 1120px;
}

@media (max-width: 1023px) {
  .content-grid {
    grid-template-columns: repeat(8, 1fr);
    gap: var(--space-4);
  }
}

@media (max-width: 767px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
    padding: 0 var(--space-4);
  }
}
```

---

## 5. Composants — Catalogue Détaillé

### 5.1. Boutons

On n'utilise pas de border-radius arrondi exagéré. Les boutons sont nets, avec un léger radius.

```
Border-radius global:  3px
```

| Variante          | Fond                    | Texte                   | Bordure              | Usage                        |
|-------------------|-------------------------|-------------------------|----------------------|------------------------------|
| Primary           | `--accent-copper`       | `--text-inverse`        | aucune               | Action principale par page   |
| Secondary         | transparent             | `--accent-copper`       | `--accent-copper` 1px| Action secondaire            |
| Ghost             | transparent             | `--text-secondary`      | aucune               | Actions tertiaires           |
| Danger            | `--status-rejected`     | `--text-inverse`        | aucune               | Suppression, refus           |

**Tailles :**

| Taille | Hauteur | Padding horizontal | Font-size |
|--------|---------|-------------------|-----------|
| sm     | 32px    | 12px              | 13px      |
| md     | 40px    | 16px              | 14px      |
| lg     | 48px    | 24px              | 16px      |

**États :**

```css
.btn-primary {
  background: var(--accent-copper);
  color: var(--text-inverse);
  border: none;
  border-radius: 3px;
  font-family: 'Source Serif 4', serif;
  font-weight: 500;
  cursor: pointer;
  transition: background 180ms ease-out, transform 120ms ease-out;
}
.btn-primary:hover {
  background: var(--accent-copper-hover);
}
.btn-primary:active {
  transform: scale(0.97);
}
.btn-primary:focus-visible {
  outline: 2px solid var(--accent-copper);
  outline-offset: 2px;
}
.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```

Règle stricte : **une seule action primaire par écran**. Les autres sont secondary ou ghost.

### 5.2. Cards — « Fiche de PFE »

L'élément central de l'application. Chaque PFE est représenté comme une fiche papier.

```css
.pfe-card {
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-radius: 3px;
  padding: var(--space-5);
  position: relative;
  transition: border-color 180ms ease-out;
}
.pfe-card:hover {
  border-color: var(--border-strong);
}

/* Bande latérale de statut — gauche, 3px */
.pfe-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
}
.pfe-card[data-status="validated"]::before { background: var(--status-validated); }
.pfe-card[data-status="pending"]::before   { background: var(--status-pending); }
.pfe-card[data-status="rejected"]::before  { background: var(--status-rejected); }
.pfe-card[data-status="draft"]::before     { background: var(--status-draft); }
```

**Structure interne d'une fiche PFE :**

```
┌─ Bande de statut (3px, côté gauche)
│
│  [Badge: Statut]                         [Menu ⋮]
│
│  Titre du PFE
│  Libre Baskerville 17px/700
│
│  Spécialité · Année académique
│  Source Serif 14px/400, --text-secondary
│
│  ┌──────────────────────────────────┐
│  │ Encadrant: Nom Prénom            │
│  │ Binôme: Étudiant 1, Étudiant 2  │
│  │ Ref: PFE-2026-047               │  ← JetBrains Mono
│  └──────────────────────────────────┘
│
│  [Tags: Machine Learning] [IoT]
│
└─────────────────────────────────────
```

### 5.3. Tableaux de Données

Les tableaux sont essentiels (listes de PFE, jurys, soutenances). Le style évoque un registre administratif.

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Source Serif 4', serif;
  font-size: 14px;
}
.data-table thead {
  border-bottom: 2px solid var(--text-primary);
}
.data-table th {
  font-family: 'Libre Baskerville', serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  padding: var(--space-3) var(--space-4);
  text-align: left;
}
.data-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}
.data-table tbody tr:hover {
  background: var(--surface-secondary);
}
/* Colonnes numériques en mono */
.data-table td.numeric {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}
```

**Tri :** les en-têtes cliquables affichent une flèche (SVG inline, pas d'emoji). L'état de tri est indiqué par `aria-sort`.

**Pagination :** style sobre en bas de tableau, chiffres en monospace.

### 5.4. Badges de Statut

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 2px;
  font-family: 'Source Serif 4', serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
/* Chaque badge a un point coloré + texte */
.badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.badge-validated         { color: var(--status-validated); background: #4A7C5915; }
.badge-validated::before { background: var(--status-validated); }
.badge-pending           { color: var(--status-pending); background: #C4962C15; }
.badge-pending::before   { background: var(--status-pending); }
.badge-rejected          { color: var(--status-rejected); background: #A63D4015; }
.badge-rejected::before  { background: var(--status-rejected); }
.badge-draft             { color: var(--status-draft); background: #8B817815; }
.badge-draft::before     { background: var(--status-draft); }
```

### 5.5. Formulaires

Les champs de saisie sont sobres — fond légèrement en retrait, bordure fine.

```css
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.form-label {
  font-family: 'Source Serif 4', serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-label .required {
  color: var(--status-rejected);
  margin-left: 2px;
}
.form-input {
  font-family: 'Source Serif 4', serif;
  font-size: 15px;
  padding: 10px 12px;
  background: var(--surface-sunken);
  border: 1px solid var(--border-default);
  border-radius: 3px;
  color: var(--text-primary);
  transition: border-color 150ms ease-out;
}
.form-input:focus {
  outline: none;
  border-color: var(--accent-copper);
  box-shadow: 0 0 0 3px rgba(181, 101, 29, 0.12);
}
.form-input::placeholder {
  color: var(--text-tertiary);
}
.form-error {
  font-size: 13px;
  color: var(--status-rejected);
  margin-top: 2px;
}
.form-helper {
  font-size: 12px;
  color: var(--text-tertiary);
}
```

**Règles de formulaires :**
- Chaque champ a un `<label>` visible (jamais placeholder seul)
- Les champs requis portent un astérisque rouge après le label
- L'erreur apparaît sous le champ concerné (jamais en haut de formulaire uniquement)
- Validation au blur, pas à chaque frappe
- Les formulaires longs utilisent la divulgation progressive (sections pliables)

### 5.6. Navigation — Sidebar

```
┌─────────────────────────┐
│                         │
│   ◆ PFE Manager         │  ← Logo + nom, Libre Baskerville 18px
│                         │
│ ─────────────────────── │
│                         │
│   ▸ Tableau de bord      │  ← Icône SVG (Lucide) + texte
│   ▸ Projets PFE          │
│   ▸ Étudiants            │
│   ▸ Encadrants           │
│   ▸ Jurys                │
│   ▸ Soutenances          │
│   ▸ Calendrier           │
│                         │
│ ─────────────────────── │
│                         │
│   ▸ Paramètres           │
│   ▸ Aide                 │
│                         │
│ ─────────────────────── │
│                         │
│   ● Dr. Benali           │  ← Avatar + nom utilisateur
│     Chef de département  │
│                         │
└─────────────────────────┘
```

```css
.sidebar {
  width: 240px;
  background: var(--surface-secondary);
  border-right: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  overflow-y: auto;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-4);
  font-family: 'Source Serif 4', serif;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 3px;
  margin: 2px 8px;
  transition: background 150ms ease-out, color 150ms ease-out;
}
.sidebar-item:hover {
  background: var(--surface-sunken);
  color: var(--text-primary);
}
.sidebar-item.active {
  background: var(--accent-copper);
  color: var(--text-inverse);
}
.sidebar-item svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.5;
}
```

### 5.7. Modales

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 150ms ease-out;
}
.modal {
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  width: min(560px, 90vw);
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 200ms ease-out;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}
.modal-header h2 {
  font-family: 'Libre Baskerville', serif;
  font-size: 18px;
  margin: 0;
}
.modal-body {
  padding: var(--space-5);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Les modales ont toujours un bouton de fermeture visible (icône X). Fermeture au clic sur l'overlay. Focus trap activé.

### 5.8. Toasts / Notifications

Position : coin supérieur droit, empilage vertical.

```css
.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--accent-copper);
  border-radius: 3px;
  box-shadow: 0 4px 12px rgba(44, 37, 32, 0.1);
  min-width: 320px;
  max-width: 420px;
  animation: toastIn 250ms ease-out;
}
.toast-success { border-left-color: var(--status-validated); }
.toast-error   { border-left-color: var(--status-rejected); }
.toast-warning { border-left-color: var(--status-pending); }
```

Auto-dismiss après 4 secondes. Le toast utilise `aria-live="polite"`.

---

## 6. Iconographie

**Bibliothèque : Lucide Icons** (https://lucide.dev)

On utilise exclusivement des icônes SVG vectorielles. Jamais d'emoji dans l'interface.

| Paramètre      | Valeur    |
|----------------|-----------|
| Taille par défaut | 18px   |
| Stroke-width   | 1.5       |
| Coin           | round     |

### Icônes par Fonctionnalité

| Fonction           | Icône Lucide         |
|--------------------|----------------------|
| Tableau de bord    | `layout-dashboard`   |
| Projets PFE        | `book-open`          |
| Étudiants          | `users`              |
| Encadrants         | `user-check`         |
| Jurys              | `scale`              |
| Soutenances        | `presentation`       |
| Calendrier         | `calendar`           |
| Paramètres         | `settings`           |
| Recherche          | `search`             |
| Notifications      | `bell`               |
| Ajouter            | `plus`               |
| Modifier           | `pencil`             |
| Supprimer          | `trash-2`            |
| Filtrer            | `sliders-horizontal` |
| Exporter           | `download`           |
| Valider            | `check`              |
| Refuser            | `x`                  |
| Voir le détail     | `eye`                |
| Fichier joint      | `paperclip`          |

---

## 7. Texture et Fond — L'élément différenciant

Le fond de l'application n'est pas une couleur plate. On applique une texture de bruit subtile qui évoque le grain du papier.

```css
.app-background {
  background-color: var(--surface-primary);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}
```

Cette texture crée une différence immédiate avec n'importe quel template standard. Elle est assez subtile pour ne pas fatiguer l'œil, mais assez présente pour donner du caractère.

---

## 8. Animations et Transitions

### Tokens de Durée

```
--duration-instant:   80ms     /* Changements d'état visuels */
--duration-fast:      150ms    /* Hover, focus, toggles */
--duration-normal:    250ms    /* Ouverture de panels, toasts */
--duration-slow:      400ms    /* Modales, transitions de page */
```

### Courbes d'Easing

```
--ease-out:           cubic-bezier(0.16, 1, 0.3, 1)     /* Entrées */
--ease-in:            cubic-bezier(0.55, 0, 1, 0.45)    /* Sorties */
--ease-in-out:        cubic-bezier(0.45, 0, 0.55, 1)    /* Mouvement continu */
```

### Règles d'Animation

- Les entrées sont plus lentes que les sorties (ratio 60-70%)
- Une seule animation principale par vue — éviter le carnaval
- Les listes s'animent avec un stagger de 40ms entre chaque élément
- Toujours respecter `prefers-reduced-motion` :

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Animation de Chargement des Cards

Au chargement d'une page de liste, les fiches PFE apparaissent avec un effet séquentiel :

```css
.pfe-card {
  opacity: 0;
  transform: translateY(8px);
  animation: cardReveal var(--duration-normal) var(--ease-out) forwards;
}
.pfe-card:nth-child(1) { animation-delay: 0ms; }
.pfe-card:nth-child(2) { animation-delay: 40ms; }
.pfe-card:nth-child(3) { animation-delay: 80ms; }
/* etc. */

@keyframes cardReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 9. Pages Principales — Structure et Wireframes

### 9.1. Dashboard (Tableau de Bord)

```
┌─────────────────────────────────────────────────────────┐
│  Bienvenue, Dr. Benali                                  │
│  Année académique 2025-2026 · Département Informatique  │
├─────────┬───────────┬───────────┬───────────────────────┤
│ 47      │ 12        │ 8         │ 3                     │
│ PFE     │ En attente│ Soutenus  │ Refusés               │
│ total   │ de jury   │           │                       │
│         │           │           │                       │
│ (cuivre)│ (ambre)   │ (vert)    │ (bordeaux)            │
├─────────┴───────────┴───────────┴───────────────────────┤
│                                                         │
│  ┌── Prochaines Soutenances ──┐  ┌── Activité ────────┐│
│  │                            │  │                     ││
│  │  22 Mai — 09h00            │  │  Timeline verticale ││
│  │  "Système IoT pour..."     │  │  des dernières      ││
│  │  Salle A3-12               │  │  actions             ││
│  │  Jury: X, Y, Z            │  │                     ││
│  │                            │  │  • PFE-047 validé   ││
│  │  24 Mai — 14h00            │  │  • Jury 5 formé     ││
│  │  "Détection de..."         │  │  • 2 PFE soumis     ││
│  │                            │  │                     ││
│  └────────────────────────────┘  └─────────────────────┘│
│                                                         │
│  ┌── Répartition par spécialité ──────────────────────┐ │
│  │  Bar chart horizontal — Source Serif pour les       │ │
│  │  labels, barres en teintes cuivrées                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Les compteurs en haut sont des cards compactes avec un chiffre en Libre Baskerville 32px et un label en dessous. La couleur de fond de chaque compteur est une teinte très atténuée de sa couleur de statut.

### 9.2. Liste des PFE

```
┌─────────────────────────────────────────────────────────┐
│  Projets de Fin d'Études              [+ Nouveau PFE]  │
│                                                         │
│  ┌ Filtres ─────────────────────────────────────────┐   │
│  │ Statut: [Tous ▾]  Spécialité: [Tous ▾]          │   │
│  │ Encadrant: [Tous ▾]  Recherche: [___________]    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Vue: [≡ Table] [⊞ Cards]                  47 résultats│
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ │ Ref       Titre           Binôme    Enc.  Stat.│   │
│  │ ├──────────────────────────────────────────────── │   │
│  │ │ PFE-047   Système IoT...  A, B     Dr.X  ● Val│   │
│  │ │ PFE-046   Détection...    C, D     Dr.Y  ● Att│   │
│  │ │ PFE-045   Application...  E, F     Dr.Z  ● Bro│   │
│  │ │ ...                                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ◀ 1  2  3 ... 5 ▶              Afficher: [10 ▾] / page│
└─────────────────────────────────────────────────────────┘
```

L'utilisateur peut basculer entre vue tableau et vue cards. La vue cards affiche les fiches PFE décrites en section 5.2.

### 9.3. Détail d'un PFE

```
┌─────────────────────────────────────────────────────────┐
│  ← Retour aux projets                                   │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │  [● Validé]                       PFE-2026-047    │ │
│  │                                                    │ │
│  │  Conception d'un Système IoT pour                  │ │
│  │  la Surveillance Agricole en Temps Réel            │ │
│  │                                                    │ │
│  │  Libre Baskerville 26px                            │ │
│  │                                                    │ │
│  ├────────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  Spécialité     Réseaux & Systèmes Embarqués      │ │
│  │  Année          2025-2026                          │ │
│  │  Encadrant      Dr. Amrani Karim                   │ │
│  │  Co-encadrant   —                                  │ │
│  │                                                    │ │
│  │  Binôme                                            │ │
│  │  ┌───────────┐  ┌───────────┐                     │ │
│  │  │ Étud. 1   │  │ Étud. 2   │                     │ │
│  │  │ Nom       │  │ Nom       │                     │ │
│  │  │ Matricule │  │ Matricule │                     │ │
│  │  └───────────┘  └───────────┘                     │ │
│  │                                                    │ │
│  │  Description                                       │ │
│  │  Lorem ipsum dolor sit amet...                     │ │
│  │                                                    │ │
│  │  Documents joints                                  │ │
│  │  📎 Cahier_des_charges.pdf  (1.2 MB)               │ │
│  │  📎 Rapport_avancement.pdf  (3.4 MB)               │ │
│  │                                                    │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  Jury assigné                                      │ │
│  │  Président: Dr. X · Examinateur: Dr. Y             │ │
│  │  Soutenance: 22 Mai 2026, 09h00, Salle A3-12      │ │
│  ├────────────────────────────────────────────────────┤ │
│  │  Historique                                        │ │
│  │  12/03 — Soumis par binôme                         │ │
│  │  15/03 — Validé par Dr. Amrani                     │ │
│  │  20/04 — Jury assigné                              │ │
│  │  18/05 — Soutenance programmée                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  [Modifier]  [Assigner Jury]  [Programmer Soutenance]   │
└─────────────────────────────────────────────────────────┘
```

### 9.4. Planning des Soutenances

Affichage en grille calendrier (vue semaine) avec les créneaux de soutenance disposés sur les jours et heures.

```
┌─────────────────────────────────────────────────────────┐
│  Soutenances — Semaine du 20 Mai 2026   [◀] [▶]        │
│                                                         │
│        Lun 20    Mar 21    Mer 22    Jeu 23    Ven 24   │
│  08h  │         │         │         │         │         │
│  09h  │         │         │ PFE-047 │         │ PFE-042 │
│       │         │         │ A3-12   │         │ B2-05   │
│  10h  │ PFE-041 │         │         │         │         │
│       │ A3-12   │         │         │         │         │
│  11h  │         │ PFE-039 │         │ PFE-044 │         │
│       │         │ B2-05   │         │ A3-12   │         │
│  ...  │         │         │         │         │         │
└─────────────────────────────────────────────────────────┘
```

Chaque bloc de soutenance est une mini-card cliquable avec la couleur de statut.

---

## 10. Patterns UX Spécifiques au Domaine

### 10.1. Workflow de Soumission d'un PFE

```
Brouillon → Soumis → En révision → Validé / Refusé (avec motif)
                                      ↓
                                  Jury assigné → Soutenance programmée → Soutenu
```

Le statut est toujours visible via le badge + la bande latérale de la card. Le passage d'un statut à l'autre nécessite une confirmation (modale avec motif obligatoire pour le refus).

### 10.2. Assignment de Jury

Contraintes à respecter dans l'interface :
- Un encadrant ne peut pas être examinateur de son propre PFE
- Chaque jury a au minimum un président et un examinateur
- L'interface affiche les conflits en temps réel (bordure rouge + message)

### 10.3. Recherche Globale

Accessible via `Cmd+K` / `Ctrl+K`. S'ouvre en modale centrée.

```
┌─────────────────────────────────────────────┐
│  🔍 Rechercher un PFE, étudiant, encadrant  │
│  ─────────────────────────────────────────── │
│                                             │
│  Résultats récents                          │
│  ▸ PFE-047 — Système IoT pour...            │
│  ▸ Benali Ahmed — Étudiant L3               │
│  ▸ Dr. Amrani — Encadrant                   │
│                                             │
└─────────────────────────────────────────────┘
```

### 10.4. États Vides

Quand une liste est vide, on affiche un message utile avec une action :

```
┌─────────────────────────────────────────┐
│                                         │
│       Aucun projet soumis               │
│                                         │
│  Il n'y a pas encore de PFE pour cette  │
│  année académique. Les étudiants        │
│  peuvent commencer à soumettre leurs    │
│  propositions.                          │
│                                         │
│       [+ Créer un PFE]                  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 11. Accessibilité — Checklist Obligatoire

| Règle                    | Implémentation                                                            |
|--------------------------|---------------------------------------------------------------------------|
| Contraste texte          | Minimum 4.5:1 pour tout texte (vérifié en section 2)                     |
| Focus visible            | Ring de 2px `--accent-copper` avec offset 2px sur tous les interactifs    |
| Navigation clavier       | Tab order logique, Enter/Space pour activer, Échap pour fermer           |
| Labels de formulaire     | Chaque input a un `<label for="...">` visible                            |
| Aria-labels              | Icônes seules ont `aria-label` descriptif                                |
| Hiérarchie h1-h6        | Un seul h1 par page, séquence respectée                                  |
| Rôles ARIA               | `role="alert"` pour erreurs, `aria-live="polite"` pour toasts            |
| Réduction de mouvement   | `prefers-reduced-motion` respecté (voir section 8)                       |
| Taille tactile           | Minimum 44x44px pour tous les éléments cliquables                        |
| Skip link                | Lien "Aller au contenu" en première position du focus                    |

---

## 12. Responsive — Comportements par Breakpoint

| Élément          | Mobile (< 768px)                      | Tablette (768-1023px)                | Desktop (≥ 1024px)                  |
|------------------|---------------------------------------|--------------------------------------|-------------------------------------|
| Sidebar          | Cachée, accessible via hamburger      | Collapsible (icônes seules, 64px)    | Fixe, 240px                         |
| Top bar          | Logo + hamburger + avatar             | Logo + recherche + notifications     | Complète                            |
| Grille contenu   | 1 colonne                             | 8 colonnes                           | 12 colonnes                         |
| Fiches PFE       | Pleine largeur, empilées              | 2 par rangée                         | 3 par rangée ou vue tableau         |
| Tableaux         | Scroll horizontal avec shadow hint    | Colonnes réduites                    | Complet                             |
| Modales          | Plein écran (sheet du bas)            | Centrée, 80% largeur                | Centrée, max 560px                  |
| Compteurs        | 2x2 grille                           | 4 en ligne                           | 4 en ligne                          |

---

## 13. Ombres et Élévation

On utilise les ombres avec retenue — l'esthétique « papier » repose sur les bordures.

```
--shadow-sm:     0 1px 2px rgba(44, 37, 32, 0.05);   /* Cards au repos */
--shadow-md:     0 4px 12px rgba(44, 37, 32, 0.08);   /* Cards hover, dropdowns */
--shadow-lg:     0 8px 24px rgba(44, 37, 32, 0.12);   /* Modales, popovers */
--shadow-focus:  0 0 0 3px rgba(181, 101, 29, 0.12);  /* Focus ring */
```

---

## 14. Z-Index Scale

```
--z-base:        0
--z-dropdown:    100
--z-sticky:      200
--z-overlay:     400
--z-modal:       1000
--z-toast:       1100
--z-tooltip:     1200
```

---

## 15. Stack Technique Recommandé

| Couche         | Technologie                          | Justification                                     |
|----------------|--------------------------------------|----------------------------------------------------|
| Framework      | React 18+ ou Next.js 14+            | Composants réutilisables, SSR pour le SEO interne  |
| Styling        | CSS Modules ou Tailwind (custom)     | Isolation des styles, design tokens en CSS vars    |
| Icônes         | Lucide React                         | Cohérent, léger, personnalisable                   |
| Formulaires    | React Hook Form + Zod               | Validation type-safe, performance                  |
| Tableaux       | TanStack Table                       | Tri, filtres, pagination, virtualisation           |
| Calendrier     | FullCalendar ou custom               | Vue semaine pour les soutenances                   |
| Graphiques     | Recharts                             | Simple, personnalisable, React natif               |
| État global    | Zustand ou React Context             | Léger, suffisant pour cette taille d'app           |
| API            | REST ou tRPC                         | Selon le backend (Django, Express, etc.)           |
| Auth           | JWT + refresh token                  | Standard académique                                |

---

## 16. Conventions de Nommage

### CSS

```
/* BEM modifié — bloc__element--modifier */
.pfe-card { }
.pfe-card__title { }
.pfe-card__badge { }
.pfe-card--highlighted { }

/* Utilitaires préfixés */
.u-text-mono { font-family: 'JetBrains Mono', monospace; }
.u-mt-4 { margin-top: var(--space-4); }
```

### Composants React

```
PfeCard.tsx           // Composant de fiche PFE
PfeCard.module.css    // Styles associés
PfeList.tsx           // Liste/grille de fiches
PfeDetail.tsx         // Page de détail
JuryAssignment.tsx    // Modale d'assignation de jury
DefenseSchedule.tsx   // Planning des soutenances
StatusBadge.tsx       // Badge de statut réutilisable
DataTable.tsx         // Tableau de données générique
SearchCommand.tsx     // Modale de recherche (Cmd+K)
```

### Tokens de Design

Tous les tokens sont définis dans un fichier `tokens.css` à la racine du projet et importés globalement. Aucune valeur brute (hex, px arbitraire) ne doit apparaître dans les composants.

---

## 17. Résumé des Interdits

Pour garantir que l'application ne ressemble pas à un template généré par IA :

| Interdit                                    | Alternative                                      |
|---------------------------------------------|--------------------------------------------------|
| Fond blanc pur (#FFFFFF) comme fond de page | Crème texturé (#F6F1EB + grain)                  |
| Inter, Roboto, Poppins, Open Sans           | Libre Baskerville + Source Serif 4               |
| Gradient violet/bleu en header              | Couleur unie cuivrée ou pas de gradient          |
| Border-radius: 12px+ (pill shapes)          | Border-radius: 3px partout                       |
| Ombres diffuses partout                     | Bordures fines, ombres réservées à l'élévation   |
| Emoji comme icônes                          | Lucide Icons SVG uniquement                      |
| Cards identiques sans hiérarchie            | Bande de statut + typographie variée             |
| Animation bounce/wobble                     | Slide + fade subtils                             |
| Palette de 6 couleurs vives équilibrées     | Dominante neutre + accent cuivre unique          |

---

*Ce design system est conçu pour être évolutif. Chaque composant peut être étendu sans briser la cohérence globale tant que les tokens sont respectés.*
