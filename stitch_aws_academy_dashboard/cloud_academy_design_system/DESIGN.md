---
name: Cloud Academy Design System
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
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#52e87c'
  on-tertiary: '#003915'
  tertiary-container: '#2ccb63'
  on-tertiary-container: '#004f20'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcbd'
  primary-fixed-dim: '#ffb86f'
  on-primary-fixed: '#2c1600'
  on-primary-fixed-variant: '#693c00'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.7'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base_unit: 4px
  container_max_width: 1280px
  gutter: 24px
  margin_mobile: 16px
  margin_desktop: 48px
---

## Brand & Style
The brand personality is authoritative, technical, and high-performance, specifically tailored for engineers and developers preparing for AWS certification. The UI evokes a "Command Center" feel—highly organized, distraction-free, and premium.

The design style is **Modern Minimalist with a focus on Zinc Dark aesthetics**. It utilizes deep neutral tones to reduce eye strain during long study sessions, punctuated by vibrant functional accents that represent the AWS ecosystem. The interface relies on precise geometry, subtle borders instead of heavy shadows, and a clear hierarchy that prioritizes information density without clutter.

## Colors
The palette is rooted in a "Zinc" scale to provide a sophisticated dark mode experience. 

- **Primary (#FF9900):** Reserved for AWS branding, primary actions, and active states. Use sparingly to maintain its impact.
- **Surface & Background:** The deep background (#09090b) and slightly elevated surface (#0c0c0f) create subtle depth without needing shadows.
- **Status Colors:** Use Success Green for passed labs/correct answers and Progress Blue for ongoing modules and cloud infrastructure visualizations.
- **Borders:** Use #27272a for all structural divisions to maintain a crisp, technical look.

## Typography
Typography is optimized for technical readability. **Inter** is used for all UI elements to provide a clean, modern sans-serif feel that performs well at all sizes. **JetBrains Mono** is strictly reserved for code blocks, terminal outputs, and AWS resource identifiers (e.g., ARNs, Instance IDs).

Use tight letter spacing on larger headings to reinforce the premium aesthetic. Ensure body text maintains a 1.6 line height to facilitate long-form reading of technical documentation and exam questions.

## Layout & Spacing
The layout follows a **Fixed Grid** model for desktop to ensure technical diagrams and code blocks remain readable within a controlled line length (max-width 1280px). 

- **Sidebar:** A fixed 280px navigation sidebar is used for course syllabus and progress tracking.
- **Grid:** Use a 12-column system for dashboard layouts and a centered 8-column layout for reading-heavy exam modules.
- **Rhythm:** Use 4px increments. Internal card padding should be 24px (space-6) to give content room to breathe.

## Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional shadows. 

1.  **Level 0 (Background):** #09090b - The base canvas.
2.  **Level 1 (Cards/Surfaces):** #0c0c0f - Used for the main content containers.
3.  **Level 2 (Popovers/Modals):** #18181b - Used for elevated elements that sit on top of the UI.

All containers must have a 1px solid border (#27272a). This "thin-stroke" aesthetic provides a technical, diagram-like feel consistent with architectural whiteboards.

## Shapes
The design system uses a **Rounded** (0.5rem base) language to soften the dark, technical environment. 

- **Small Components:** Inputs, buttons, and tags use 0.5rem (8px).
- **Large Components:** Main content cards and module containers use `rounded-xl` (1.5rem / 24px) to create a distinct framing effect.
- **Code Blocks:** Use a consistent 0.75rem (12px) radius to differentiate them from standard UI containers.

## Components
- **Buttons:** Primary buttons use a solid AWS Orange fill with black text. Secondary buttons use a transparent background with a #27272a border and white text.
- **Cards:** Cards are the primary unit of the UI. They feature a #0c0c0f background, a #27272a border, and `rounded-xl` corners.
- **Code Blocks:** Use a dedicated "Zinc" syntax highlighting theme. Include a "Copy" utility in the top right and the language label (e.g., "YAML", "CLI") in JetBrains Mono.
- **Progress Ring:** Use the Progress Blue for the stroke. For exam readiness scores, transition the stroke color from Blue to Success Green as the user passes the 72% threshold.
- **Inputs:** Dark background (#09090b), thin border, and 0.5rem roundedness. Focus state should highlight the border in AWS Orange with a subtle 2px outer glow.
- **Exam Radio Toggles:** Large, card-style selectable blocks for multiple-choice questions. Active state uses a 1px AWS Orange border and a subtle orange tint to the background.