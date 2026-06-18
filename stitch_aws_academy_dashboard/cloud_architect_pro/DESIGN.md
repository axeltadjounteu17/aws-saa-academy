---
name: Cloud Architect Pro
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#dbc2ad'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#a38d7a'
  outline-variant: '#554434'
  surface-tint: '#ffb86f'
  primary: '#ffc082'
  on-primary: '#4a2800'
  primary-container: '#ff9900'
  on-primary-container: '#653a00'
  inverse-primary: '#8a5100'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#8ed5ff'
  on-tertiary: '#00344a'
  tertiary-container: '#04beff'
  on-tertiary-container: '#004965'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcbd'
  primary-fixed-dim: '#ffb86f'
  on-primary-fixed: '#2c1600'
  on-primary-fixed-variant: '#693c00'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7cd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
  code:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for a high-performance, developer-centric learning experience. It targets aspiring AWS Solutions Architects who value precision, technical depth, and a distraction-free environment. 

The visual style is **Modern Minimalist** with a "Developer-First" aesthetic. It prioritizes information density and hierarchy through a monochromatic Zinc base, accented by the authoritative AWS Orange. The interface should feel like a premium IDE—functional, robust, and sophisticated—evoking a sense of technical mastery and architectural clarity.

## Colors

The palette is rooted in a "Zinc Dark" spectrum to reduce eye strain during long study sessions.

*   **Primary (AWS Orange):** Used exclusively for primary actions, progress indicators, and branding elements to maintain a direct association with the AWS ecosystem.
*   **Secondary (Success Green):** Reserved for "Correct" states in quizzes, completed module markers, and system status indicators.
*   **Neutral/Background:** A deep, near-black Zinc (#09090B) provides the foundation, while slightly lighter Zinc tiers (#0C0C0F) define containers.
*   **Borders:** Consistent use of #27272A ensures structural definition without creating jarring visual breaks.

## Typography

This design system utilizes **Inter** across all levels to maintain a systematic and utilitarian feel. 

- **Display & Headlines:** Use tighter letter spacing and heavy weights (700-800) to create a strong visual anchor for lesson titles and module headers.
- **Body:** Standardized at 16px for optimal readability of technical documentation and architectural explanations.
- **Labels:** Small, uppercase labels should be used for metadata (e.g., "Difficulty: Associate" or "Time: 12 min").
- **Code:** While Inter is the primary typeface, a monospaced font must be used for AWS CLI snippets and JSON policy examples to ensure technical accuracy.

## Layout & Spacing

The layout follows a **Fixed Grid** model for learning content to ensure optimal line lengths for reading, while using a **Fluid Grid** for the student dashboard.

- **Grid:** A 12-column system with 24px gutters.
- **Max-Width:** Main content area is capped at 1280px to prevent excessive scanning on ultra-wide monitors.
- **Vertical Rhythm:** Built on an 8px base unit. Component padding should strictly follow increments of 8px (e.g., 16px, 24px, 32px).
- **Responsive Behavior:** On mobile, margins reduce to 16px and the 12-column grid collapses into a single-column stack.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Low-Contrast Outlines** rather than traditional shadows. This maintains a "flat" yet structured developer aesthetic.

1.  **Background (Level 0):** #09090B - The canvas.
2.  **Surface (Level 1):** #0C0C0F - Used for cards, sidebar navigation, and header bars.
3.  **Overlay (Level 2):** #18181B - Used for modals, dropdown menus, or tooltips.

All surfaces at Level 1 and above must have a 1px solid border (#27272A) to define the edge against the background. For active or focused states, the border color may transition to the primary AWS Orange or a lighter Zinc (#3F3F46).

## Shapes

The design system uses a **Rounded** shape language to soften the high-contrast dark theme, making the platform feel modern and approachable.

- **Default (rounded-md):** 0.5rem for standard buttons and input fields.
- **Large (rounded-lg):** 1rem for lesson thumbnails and smaller cards.
- **Extra Large (rounded-xl):** 1.5rem for main content containers, course cards, and video player wrappers.

## Components

### Buttons
- **Primary:** Solid #FF9900 with #09090B text. High emphasis.
- **Secondary:** Ghost style with #27272A border and #FAFAFA text. Hover state fills the border with #3F3F46.
- **Success:** Solid #10B981 for "Submit Answer" or "Complete Module."

### Cards
- Background: #0C0C0F.
- Border: 1px #27272A.
- Corner Radius: 1.5rem (rounded-xl).
- Card titles should use `headline-sm`.

### Input Fields & Selects
- Background: #09090B (recessed).
- Border: 1px #27272A.
- Focused State: 1px solid #FF9900 with a subtle glow (0px 0px 8px rgba(255, 153, 0, 0.2)).

### Progress Bars
- Track: #27272A.
- Fill: #FF9900 linear gradient or solid.
- Height: 8px for course lists; 4px for top-of-page reading progress.

### Chips / Badges
- Used for AWS Service categories (e.g., "Compute", "Storage").
- Subtle background: #18181B.
- Text: #A1A1AA, 12px semi-bold.

### Code Blocks
- Background: #000000.
- Border: 1px #27272A.
- Syntax highlighting: Use a customized "Dark+ / Monokai" adjacent theme that complements the Zinc palette.