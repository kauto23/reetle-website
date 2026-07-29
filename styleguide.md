# Reetle UI style guide

Typography, colour, and text styling conventions for the Reetle app and website.

**Web source of truth:** [`tailwind.config.ts`](tailwind.config.ts) and [`src/app/globals.css`](src/app/globals.css)  
**Agent rule:** [`.cursor/rules/web-ui-style.mdc`](.cursor/rules/web-ui-style.mdc)

---

## Principles

1. **Use the theme** — prefer `Theme.of(context).textTheme.<role>` over inline `TextStyle` with custom sizes.
2. **One font** — Outfit everywhere, set once on `ThemeData.fontFamily`.
3. **No magic numbers** — do not introduce one-off `fontSize` values (e.g. 15, 17) unless listed under [Allowed exceptions](#allowed-exceptions).
4. **Extend centrally** — new text roles go in `AppTheme.theme` `textTheme` first, then widgets reference them.

For the Next.js website, read this as:

1. **Use Tailwind typography tokens** — prefer `text-title-md`, `text-body-sm`, `text-label-md`, etc. over `text-[Npx]`.
2. **Keep the editorial page scale tight** — article feeds should use 4-6 recurring text sizes, 2-3 weights, primary/muted text colours, and white only on dark/brand surfaces.
3. **Document exceptions** — if a card needs fluid text, a micro badge, or another one-off, add it to [Allowed exceptions](#allowed-exceptions) instead of scattering local classes.

---

## Font

| Property | Value |
|----------|-------|
| Family | **Outfit** |
| Flutter set in | `ThemeData.fontFamily` in `AppTheme.theme` |
| Web set in | `src/app/layout.tsx` via `next/font` and `font-outfit` |

Do **not** repeat `fontFamily: 'Outfit'` / `font-outfit` in components unless there is no inherited theme context or you are matching an [allowed exception](#allowed-exceptions).

---

## Typography scale

Use `Theme.of(context).textTheme.<role>` and override with `.copyWith(...)` only for colour, `fontStyle`, `height`, `letterSpacing`, `decoration`, or state-specific `fontWeight` — **not** for one-off sizes.

On the website, use the equivalent Tailwind utility from [Flutter `textTheme` → Tailwind utilities](#flutter-texttheme--tailwind-utilities). Override weight sparingly with `font-medium` or `font-semibold`; avoid adding new pixel sizes inside components.

| Role | Size | Weight | Colour | Typical use |
|------|------|--------|--------|-------------|
| `displayLarge` | 32 | bold (700) | `AppTheme.text` | Hero numbers, large focal stats |
| `displayMedium` | 28 | bold (700) | `AppTheme.text` | Hero numbers, large focal stats |
| `displaySmall` | 24 | w600 | `AppTheme.text` | Large titles, prominent headings |
| `headlineLarge` | 26 | bold (700) | `AppTheme.text` | Purple/onboarding screen headers |
| `headlineMedium` | 20 | w600 | `AppTheme.text` | Section heroes, emphasis titles |
| `headlineSmall` | 22 | w600 | `AppTheme.text` | Section heroes, emphasis titles |
| `titleLarge` | 18 | w600 | `AppTheme.text` | Card titles, question prompts |
| `titleMedium` | 16 | w500 | `AppTheme.text` | Buttons, key labels |
| `titleSmall` | 14 | w600 | `AppTheme.text` | Pills, nav, compact headings |
| `bodyLarge` | 16 | w400 | `AppTheme.text` | Primary body copy |
| `bodyMedium` | 14 | w400 | `AppTheme.text` | Secondary body copy |
| `bodySmall` | 13 | w400 | `AppTheme.textSecondary` | Captions, meta, timestamps |
| `labelLarge` | 14 | w500 | `AppTheme.text` | Row label values |
| `labelMedium` | 12 | w500 | `AppTheme.text` | Badges, compact labels |
| `labelSmall` | 11 | w600 | `AppTheme.textSecondary` | Overlines, tiny UI chrome (letter-spacing 0.8) |

### Weight hierarchy

| Weight | Use |
|--------|-----|
| **w400** | Default body (`bodyLarge`, `bodyMedium`) |
| **w500** | UI labels, `titleMedium`, `labelLarge`, `labelMedium` |
| **w600** | Section emphasis, `titleSmall`, most card headings |
| **bold / w700** | Screen-level or numeric heroes only |

Do **not** use `FontWeight.w800`. Use w600 or bold (700) per the hierarchy above. Avoid bold on tiny captions.

---

## Website editorial page scale

Article feeds should feel like one editorial system, not many component-local text systems. Use these combinations for home/topic feed pages, article cards, topic navigation, and feed promo cards.

| Use | Web utility | Effective size / weight | Colour |
|-----|-------------|-------------------------|--------|
| Section headers | `text-headline-md lg:text-display-sm` | 20 / 24, weight 600 | `text-ui-foreground` |
| Hero article headlines | `text-headline-md sm:text-display-sm lg:text-display-md` + `font-semibold` | 20 / 24 / 28, weight 600 | `text-primary` |
| Featured article headlines | `text-title-lg sm:text-headline-md` | 18 / 20, weight 600 | `text-primary` |
| Standard card headlines | `text-title-md` + `font-semibold` | 16 / 600 | `text-primary` |
| Navigation and promo titles | `text-label-lg` or `text-title-sm` | 14 / 500-600 | primary or white |
| Feed read-more links | `text-label-md font-medium` | 12 / 500 | `text-ui-primary` |
| Metadata, filters, compact helper text | `text-label-md` or `text-label-sm` | 12 / 500 or 11 / 600 | muted, primary, or white |
| Body/supporting copy | `text-body-md` or `text-body-lg` | 14 / 400 or 16 / 400 | muted or primary |

Use only these regular weights on editorial pages:

| Weight | Use |
|--------|-----|
| 400 | Body/supporting copy |
| 500 | Buttons, nav, labels |
| 600 | Headlines, section headers, selected labels |
| 700 | Rare badges or screen-level display only |

Do not add `text-[10px]`, `text-[11px]`, `text-[13px]`, `text-[15px]`, etc. in feed components. Use `text-label-sm`, `text-label-md`, `text-body-sm`, or `text-title-md` instead.

---

## Colour

### Brand and interactive

| Token | Hex | Use |
|-------|-----|-----|
| `AppTheme.primary` | `#4A2462` | Brand purple, primary text, interactive elements |
| `AppTheme.primaryLight` | `#8C5FB3` | Lighter brand accent (e.g. translated state) |
| `AppTheme.accent` | `#FF6B6B` | Secondary accent |
| `AppTheme.accentLight` | `#FFE2E2` | Accent background tint |

### Text

| Token | Hex | Use |
|-------|-----|-----|
| `AppTheme.text` | `#4A2462` (same as primary) | Primary text |
| `AppTheme.textSecondary` | `#666276` | Muted / secondary text |

Prefer `colorScheme.onSurface` or theme-derived colours where they match existing screens. Do not add new arbitrary `Color(0xFF...)` values in widgets.

### Surfaces

| Token | Hex | Use |
|-------|-----|-----|
| `AppTheme.background` | `#F8F7FA` | Scaffold / page background |
| `AppTheme.surface` | `#FFFFFF` | Cards, sheets, elevated surfaces |
| `AppTheme.border` | `#E5E3E8` | Borders, dividers |

### Feedback (correct / incorrect only)

Use these **only** for success/error feedback — not for general UI text.

| Token | Hex |
|-------|-----|
| `AppTheme.correct` | `#34D399` |
| `AppTheme.correctBg` | `#ECF7ED` |
| `AppTheme.correctText` | `#065F46` |
| `AppTheme.incorrect` | `#F87171` |
| `AppTheme.incorrectBg` | `#FEE2E2` |
| `AppTheme.incorrectText` | `#991B1B` |

---

## Component defaults

These are defined in `AppTheme.theme` and apply automatically to Material widgets.

| Component | Size | Weight | Notes |
|-----------|------|--------|-------|
| App bar title | 20 | w600 | Primary colour |
| Elevated / outlined / text buttons | 16 | w500 | Primary or white on filled |
| Input labels | 16 | w400 | `textSecondary` |
| Bottom nav — selected | — | — | `primary` |
| Bottom nav — unselected | — | — | `textSecondary` |

Cards use 16px corner radius, zero elevation, and a 1px `border` outline.

**Exceptions:**

- **Article cards** use **square corners** with a 1px border and a subtle shadow — web: `ArticleCard.tsx` (`rounded-none`, `shadow-[0_2px_4px_rgba(0,0,0,0.04)]`); app: `lib/widgets/article_card.dart` (`BorderRadius.zero`, `black @ 4%, blur 4, offset 0,2`).
- **App onboarding buttons** (`lib/widgets/onboarding_button.dart`) use the standard 8px button radius but keep a soft primary-tinted press shadow (`primary @ 15%, blur 6, offset 0,4`) as a mobile tactile affordance — mobile-only; web buttons stay flat.

---

## Usage in code

### Do

```dart
// Primary body
Text('Hello', style: Theme.of(context).textTheme.bodyLarge);

// Emphasis with brand colour
Text(
  'Label',
  style: Theme.of(context).textTheme.titleSmall?.copyWith(
    color: AppTheme.primary,
  ),
);

// Muted caption (colour already set on bodySmall)
Text('Updated 2h ago', style: Theme.of(context).textTheme.bodySmall);
```

```tsx
// Feed section header
<h2 className="text-headline-md text-ui-foreground">Política</h2>

// Standard article card headline
<h3 className="text-title-md font-semibold text-primary">...</h3>

// Metadata / compact labels
<span className="text-label-sm uppercase text-ui-muted-foreground">MUNDO</span>
```

### Don't

```dart
// Magic size — use a textTheme role instead
Text('Label', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600));

// Redundant font family — inherited from theme
Text('Label', style: TextStyle(fontFamily: 'Outfit', fontSize: 16));

// w800 — not in the hierarchy
Text('Title', style: Theme.of(context).textTheme.titleLarge?.copyWith(
  fontWeight: FontWeight.w800,
));
```

```tsx
// One-off sizes — use the web editorial scale instead
<h3 className="text-[15px] font-semibold">...</h3>
<span className="text-[10px] font-bold uppercase">...</span>
```

### Snackbars and overlays

On non-theme surfaces (snackbars, overlays), still derive size and weight from the closest `textTheme` role via `copyWith` for colour — do not invent new base styles.

---

## Allowed exceptions

Literal `TextStyle` or fixed sizes are permitted **only** in these cases:

| Context | Size / style | Notes |
|---------|--------------|-------|
| Splash brand | 64sp | Outfit |
| Auth header brand | 44sp | Outfit |
| Flag emoji rows | ~22sp | Decorative, not semantic body |
| Article reading body | 18sp | File-level const in `article_screen.dart` — do not shrink to 16 for “consistency” |
| Grammar / translation sheet | Dedicated consts | Dark-surface styles in `article_screen.dart` |
| Queue badge | 8sp | Micro UI |
| Chart axis labels | 10sp | Micro UI |
| Chart tooltips | As defined in chart code | Micro UI |
| Referral codes | `fontFamily: 'Courier'` | Monospace for copyable codes |
| Web tall featured article headline | `lg:text-[clamp(24px,2vw,32px)]` | Only for large featured cards with tall text wells; base mobile/tablet sizes must still use tokens |
| Web article reading body | `text-[18px] leading-[1.7]` | Long-form reading surface; do not apply to cards/feed chrome |
| Web queue/audio badges | 8-10px where already present | Micro UI inside audio controls only |
| Web practice rating tracker | 28px digit, 31px row height | Slot-machine digit roll in `PracticeRatingTracker`; precise row height required for the translateY roll to align. Uses `tabular-nums` |
| Web practice question prompt | `text-title-lg` base, `text-title-md` / `leading-snug` under `@media(max-height:700px)` | `PracticeQuestionPanel` question text. Long grammar passages can overflow on short viewports; the card body scrolls internally and the type steps down a token on short screens so most passages fit without scrolling |

If you need a new exception, add it here before landing the code. Keep `.cursor/rules/web-ui-style.mdc` pointing agents back to this file rather than duplicating the whole guide.

---

## Extending the design system

1. Add the new role to `textTheme` in [`lib/themes/app_theme.dart`](lib/themes/app_theme.dart).
2. Document it in the [Typography scale](#typography-scale) table above.
3. Use the role from widgets — do not scatter new base sizes across screens.
4. For web-only roles, add the Tailwind token to [`tailwind.config.ts`](tailwind.config.ts), document it here, and keep [`.cursor/rules/web-ui-style.mdc`](.cursor/rules/web-ui-style.mdc) pointing to this guide.

---

## Web mapping (Next.js — this repo)

The website mirrors Flutter `AppTheme` via Tailwind `fontSize` tokens in [`tailwind.config.ts`](tailwind.config.ts). Prefer `text-{token}` utilities plus semantic colours (`text-ui-foreground`, `text-ui-muted-foreground`, `bg-ui-card`, …) instead of arbitrary `text-[Npx]` or undocumented hex unless listed under [Allowed exceptions](#allowed-exceptions).

### Flutter `textTheme` → Tailwind utilities

| Flutter role | Tailwind | Size / weight |
|--------------|-----------|---------------|
| `displayLarge` | `text-display-lg` | 32 / 700 |
| `displayMedium` | `text-display-md` | 28 / 700 |
| `displaySmall` | `text-display-sm` | 24 / 600 |
| `headlineLarge` | `text-headline-lg` | 26 / 700 |
| `headlineMedium` | `text-headline-md` | 20 / 600 |
| `headlineSmall` | `text-headline-sm` | 22 / 600 |
| `titleLarge` | `text-title-lg` | 18 / 600 |
| `titleMedium` | `text-title-md` | 16 / 500 (buttons default) |
| `titleSmall` | `text-title-sm` | 14 / 600 |
| `bodyLarge` | `text-body-lg` | 16 / 400 |
| `bodyMedium` | `text-body-md` | 14 / 400 |
| `bodySmall` | `text-body-sm` with `text-ui-muted-foreground` | 13 / 400 |
| `labelLarge` | `text-label-lg` | 14 / 500 |
| `labelMedium` | `text-label-md` | 12 / 500 |
| `labelSmall` | `text-label-sm` | 11 / 600, letter-spacing |

### Brand / semantic colours (Flutter → Tailwind)

| Flutter | Web |
|---------|-----|
| `AppTheme.text` / `primary` | `text-primary`, `text-ui-foreground`; icons via `stroke="currentColor"` + `text-primary` |
| `AppTheme.textSecondary` | `text-ui-muted-foreground` |
| `AppTheme.background` | `bg-background` / `bg-ui-background` |
| `AppTheme.surface` | `bg-ui-card`, `bg-surface` |
| `AppTheme.border` | `border-ui-border`, `border-border` |
| `AppTheme.accent` (coral) | `accent`, `bg-ui-coral`; Button variant `accent` |
| `AppTheme.accentLight` | `bg-ui-accent`, `accent-light` |
| Feedback tokens | `correct` / `incorrect` colour groups |
