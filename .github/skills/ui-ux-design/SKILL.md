---
name: ui-ux-design
description: "Design and implement polished, accessible, responsive web interfaces. Use for UI/UX work, frontend redesigns, React screens, dashboards, forms, workflows, visual systems, interaction design, and browser-based visual QA."
argument-hint: "Describe the screen, workflow, audience, and existing components to improve."
user-invocable: true
disable-model-invocation: false
---

# UI/UX Design

Create interfaces that are purposeful, usable, visually distinctive, and validated in the running application. Preserve established product conventions when working in an existing app; introduce a new visual language only when the product needs one.

## When to Use

- Build or redesign a page, component, dashboard, form, or user workflow.
- Improve usability, hierarchy, accessibility, responsive behavior, or visual consistency.
- Turn a product requirement or rough idea into an implemented frontend experience.
- Review a frontend screen for interaction, layout, or visual quality problems.

## Procedure

### 1. Establish the product context

1. Identify the primary user, task, frequency of use, and most important action.
2. Inspect the nearest existing route, component, styles, assets, and package conventions before editing.
3. Reuse existing primitives, icons, typography, spacing, colors, and interaction patterns where they are coherent.
4. State one local design hypothesis, such as: "The main task is hard to scan because the page gives equal visual weight to primary and secondary information." Use the implementation and validation to test it.

### 2. Define the experience before styling

1. Map the main happy path and the important alternate states: loading, empty, error, disabled, success, validation, permission, and destructive confirmation where relevant.
2. Define the information hierarchy: page purpose, primary action, key status or result, supporting details, and secondary actions.
3. Choose a clear visual direction suited to the domain. Specify type roles, color roles, surface treatment, spacing rhythm, shape language, and one or two meaningful motion moments.
4. Prefer expressive, purposeful typography over default-looking stacks. Avoid purple-on-white defaults, generic card grids, and decoration that competes with the task.
5. Keep sections unframed unless they are genuinely grouped tools or repeated items. Avoid nesting cards inside cards.

### 3. Implement the smallest coherent slice

1. Build the primary workflow first, then add the states and controls a real user would need to complete it.
2. Use semantic HTML and accessible names. Use buttons for actions, links for navigation, labels for inputs, headings in logical order, and live regions for important asynchronous feedback.
3. Use the project’s existing icon library when available. Icon-only controls need tooltips or accessible labels; familiar actions should use recognizable symbols rather than text inside decorative rounded rectangles.
4. Define stable dimensions for grids, toolbars, tiles, counters, and other fixed-format elements so content and hover states do not shift layout.
5. Make responsive behavior intentional: identify what collapses, stacks, scrolls, hides, or changes priority at narrow widths. Ensure long labels and user content wrap without overlap.
6. Keep motion restrained and meaningful. Use page-load or staggered reveals only when they clarify hierarchy, and respect `prefers-reduced-motion`.
7. Keep changes close to the owning component and preserve public APIs unless the feature requires a contract change.

### 4. Validate behavior and visual quality

1. Run the narrowest relevant check first, then run the project’s build and lint scripts when available.
2. Open the running app and test the primary workflow with keyboard and pointer input.
3. Check desktop and mobile widths. Look specifically for overflow, clipped text, unstable layout, unreachable controls, poor focus visibility, and accidental overlap.
4. Verify contrast, labels, focus order, keyboard operation, error association, and status feedback. Do not rely on color alone to communicate state.
5. Inspect the console and network failures introduced by the change. Confirm images, icons, fonts, and data states render as intended.
6. Revisit the original design hypothesis. If the check disproves it, make the smallest nearby correction and repeat the focused validation.

## Quality Gates

- The primary user task is obvious within the first viewport and has a clear next action.
- Content hierarchy supports scanning rather than giving every element equal weight.
- The experience has intentional loading, empty, error, disabled, success, and validation behavior where applicable.
- The layout remains usable at mobile and desktop widths without text or controls colliding.
- Keyboard users can reach and understand every interactive control, with visible focus states.
- Typography, color, spacing, icons, surfaces, and motion form a coherent system rather than unrelated decoration.
- The interface does not depend on gradients, blobs, excessive rounded cards, or one-note color palettes to feel designed.
- At least one executable validation has passed after the final edit; report any unavailable browser or visual checks explicitly.

## Output

When finishing a UI/UX task, summarize the user-visible change, the main interaction states covered, and the validation performed. Mention known gaps or assumptions briefly, especially when browser inspection or visual regression tooling is unavailable.