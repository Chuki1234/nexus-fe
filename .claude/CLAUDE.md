
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
- Prefer inline templates for small components
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

```
src/app/
├── core/      Global services, no UI. `core/api/` holds data services.
├── ui/        Design-system primitives. MUST NOT know what Nexus is —
│              Avatar, StatusDot, SearchField would work in any project.
├── layout/    Dashboard chrome that lives OUTSIDE the router outlet.
└── pages/     Route-level pages.
```

One question decides where a component goes:

| Question | Folder |
|---|---|
| Used in several places **and** contains no Nexus vocabulary? | `ui/` |
| Always on screen, outside the router outlet? | `layout/` |
| Shared by several pages in one area? | `pages/<area>/components/` |
| Used by exactly one page? | `pages/<area>/<page>/components/` |

- A `.page.ts` only assembles children and reads route data. It must not hold
  detailed markup. Past ~80 lines is the signal to split.
- Never hardcode a hex colour or px value when `styles.css` has a token. The token
  set comes from `DESIGN-voltagent.md` — that file, not Material's defaults, is the
  design system.
- Types shared with the backend go in `src/shared/`, mirrored byte-for-byte into
  `nexus-be`. Run `npm run check:shared` after touching it.
