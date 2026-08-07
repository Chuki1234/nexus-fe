
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Create every component with `ng generate component <path>` — never by hand, and
  **without** `--type=page` (no `.page` suffix; see Folder structure). This is a hard
  project rule: each component folder must hold the full set of files (`.ts`, `.html`,
  `.css`, `.spec.ts`), so templates and styles always live in their own file, never
  inline in the decorator.
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Folder structure

Vocabulary follows the implement-skill canonical tree (`.claude/skills/implement-skill/`
→ `reference/folder-structure-nexus-client.md`).

```
src/app/
├── core/         Global singletons, no UI. `core/api/` holds data services.
├── shared/ui/    Design-system primitives. MUST NOT know what Nexus is —
│                 Avatar, StatusDot, SearchField would work in any project.
├── layouts/      App chrome OUTSIDE the router outlet (app-layout + its components/).
└── features/     Route-level feature areas (auth, dashboard, ...).
```

One question decides where a component goes:

| Question | Folder |
|---|---|
| Used in several places **and** contains no Nexus vocabulary? | `shared/ui/` |
| Always on screen, outside the router outlet? | `layouts/app-layout/components/` |
| Shared by several pages in one feature area? | `features/<area>/components/` |
| Used by exactly one page? | `features/<area>/<page>/components/` |

- **No `.page` suffix.** A page is `login.ts` / `friends.ts` (file), matching the skill
  tree — not `login.page.ts`. Create it with plain `ng generate component`, no `--type=page`.
- A page file only assembles children and reads route data. It must not hold detailed
  markup. Past ~80 lines is the signal to split.
- Never hardcode a hex colour or px value when `styles.css` has a token. The token
  set comes from `DESIGN-nexuscord-hybrid.md` (supersedes the old `DESIGN-voltagent.md`)
  — that file, not Material's defaults, is the design system. Currently only **dark
  mode** is wired (MongoDB deep-teal); light mode (Starbucks) is a later phase.
- Buttons and status badges are **pill** (`rounded-full`); cards are `rounded-lg` (12px).
  Text tokens use the new scale (`heading-1..5`, `body-md`, `caption`, `micro-uppercase`);
  colour tokens use `charcoal/slate/steel/stone`, `surface/surface-soft`, `brand-green`.
- Cross-backend types go in `src/shared/` (mirrored byte-for-byte into `nexus-be`;
  run `npm run check:shared`). Note this is `src/shared/`, distinct from `src/app/shared/ui/`.
