# Shared UI conventions

The shared UI components use shadcn's `base-vega` style, Base UI behavior, Lucide icons, and the semantic color tokens defined in [`globals.css`](../src/app/globals.css). Keep app-wide theming and screen-specific layout changes in their own pull requests.

Use the supplied component variants instead of adding page-specific control heights:

| Control | Default | Small | Large |
| --- | --- | --- | --- |
| Button | 36px | 32px | 40px |
| Icon button | 36px square | 32px square | 40px square |
| Input | 36px | — | — |
| Select | 36px | 32px | — |
| Standard button icon | 16px | 16px | 16px |

Use `Button` variants for primary, outline, secondary, ghost, and destructive actions. Keep focus styles visible, use labels for fields, and use status colors only for status indicators. Do not repeat a status color across an entire row or filter toolbar.
