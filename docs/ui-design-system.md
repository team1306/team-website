# Purchasing app UI conventions

## Foundation

The app uses shadcn **base-vega** with Base UI behavior, Lucide icons, and semantic Tailwind theme tokens. Shared primitives were taken from the official Vega registry. Registry imports and icon placeholders were adapted to this repository; Input retains Base UI's `onValueChange` prop typing.

- [Configuration](../components.json)
- [Theme](../src/app/globals.css)
- [Shared components](../src/components/ui)
- [Official theming guidance](https://ui.shadcn.com/docs/theming)

## Component sizing

Use the supplied variants rather than page-specific heights:

| Control | Default | Small | Large |
| --- | --- | --- | --- |
| Button | 36px | 32px | 40px |
| Icon button | 36px square | 32px square | 40px square |
| Input | 36px | — | — |
| Select | 36px | 32px | — |
| Standard button icon | 16px | 16px | 16px |

These are the downloaded Vega component defaults. Field text follows the input component's responsive defaults. Do not add another global rule that overrides every input or button.

## Typography and color

Open Sans is the body, heading and control font. JetBrains Mono is reserved for the team/application branding. Red-tinted dark surfaces use the semantic background/card/popover/muted/accent tokens. Logo red `#c12323` is the primary action color, paired with white text. Approved badges use a readable lighter red foreground over a subtle tinted surface.

Use `Button` variants for primary, outline, secondary, ghost and destructive actions. Status filters use the supplied outline ToggleGroup. Status badges can carry semantic color; do not repeat that color across the entire row or filter toolbar.

## Layout and behavior

- One responsive navigation and one request-form instance across screen widths.
- Main pages share a heading, description and action area, inside a centered maximum-width container.
- Purchase summaries retain cost and status on mobile. Tags share a left-aligned column in a compact group beside the cost on desktop.
- Purchase detail sections use dividers. The drawer has a named title, close action and contained scrolling.
- New-request details precede items, followed by a compact budget summary. The total/actions remain outside the scrolling form body.
- New and existing item fields use shared Input components and visible labels.
- Forms preserve drafts on unsuccessful requests; cancellation resets existing purchase drafts.
- Use visible pending states and accurate success/error feedback. Never show success from a `finally` block.

## Verification performed

- TypeScript compilation (`tsc --noEmit --incremental false`) passed after the screen migration and import cleanup.
- Desktop screenshots reviewed for login, purchase list and purchase editor.
- New-request form opened with a local item draft and resized to 390px: the same item remained present; settled dialog bounds were x=16, width=358, y=16, height=812 within a 390×844 viewport.
- Mobile budget bounds did not exceed the viewport with the current sample data.
- Draft used for visual review was discarded. No purchase was submitted, approved, rejected, deleted, or marked purchased during this pass.
- Development server restarted at http://127.0.0.1:3000/.

## Remaining review

Manager-only budget forms, team access, bulk purchase and status override were migrated in source, but have not been visually exercised with an authorized manager/admin account. Production sign-in remains the existing local-test flow. Failure paths were reviewed in code; no live failing write requests were induced. The earlier audit remains a backlog, including URL-based navigation, further keyboard/assistive-technology review and the large-value Kraken display policy.
