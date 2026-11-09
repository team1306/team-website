# UI audit and improvement plan

Date: 2026-11-08
Status: Initial audit complete. Findings and proposed work only; no product code changed in this pass. Role-restricted visual coverage remains outstanding.

## Audit plan

1. Inventory all application screens, dialogs, menus, shared primitives, and role gates.
2. Review UI source for styling consistency, accessible names, keyboard behavior, responsive layouts, and loading/error/empty states.
3. Inspect available screens at desktop, medium, and mobile sizes. Open menus and dialogs without submitting data or changing permissions.
4. Record evidence, severity, affected files, and a concrete proposed fix for each issue.
5. Separate visually confirmed findings from code findings and role-restricted/unverified states.
6. Propose a prioritized implementation sequence and acceptance criteria.

## Scope

- Login and application navigation
- Purchase list, search, category/status/sort controls, Kraken mode
- Purchase details, editing, approvals, actions and status dialogs
- New request and item entry
- Budget categories, creation/edit dialogs
- Administration, user roles/names, export and bulk purchasing
- Shared controls, theme, typography, spacing, responsiveness and accessibility

## Review constraints

Use existing test data. Do not approve, reject, save, delete, purchase, export, or change account roles during the audit. Role-restricted screens will receive source review if unavailable to the signed-in account.

## Overall assessment

Keep the charcoal background, red brand accent, Open Sans body text, and intentional JetBrains Mono branding. A different visual style is unnecessary. The biggest problems are inconsistent form density, competing color treatments, mobile information hierarchy, and incomplete feedback for asynchronous actions.

The recent purchase-detail dividers, larger edit fields, explicit pending-approval messages, and approval loading state are useful improvements. The purchase search also has a clear “No matching requests” state with a recovery action. Build on these patterns.

## Coverage and limits

Reviewed the application entry/login, navigation, purchase list and detail components, create/edit item forms, approval component, budget management, administration, exports, bulk purchasing, Kraken meter, global theme, and shared control/overlay implementations. This is a UI audit, not a backend/security review.

| Area | Browser inspection | Source inspection / remaining coverage |
| --- | --- | --- |
| Login | Mobile screenshot, rendered text and font, button, page bounds | Test-only sign-in; did not create another session |
| Purchases | Desktop/mobile layouts, search/no-results, category dropdown, sort options, status controls | Search/filter handlers and responsive branches reviewed |
| Mobile navigation | Expanded menu and Filters dialog opened; screenshot of filter dialog | New Request is hidden behind menu; Kraken/refresh missing here |
| New request | Desktop and mobile screenshots; added then discarded a local draft item; measured input sizes | Validation, submission, category/vendor choices reviewed; no submission |
| Purchase details | Needs Approval and Purchased samples opened; screenshot of details; approval requirements visible | Role-dependent branches reviewed; no approval or withdrawal |
| Edit purchase | Opened editor, inspected labels and budget display | Save/cancel and notes flow reviewed; no edit saved |
| Purchase actions | Student-lead action menus opened; On Hold and Mark Received dialogs opened | Reject and admin override/delete/expedite reviewed in code; not all role-dependent dialogs visually inspected |
| Budget | Desktop screenshot, mobile page bounds, all three phase sections | Create/edit drawer source reviewed; controls unavailable to current student-lead account |
| Team access | Not available to current account | User cards, role/name menus and request handling reviewed in code |
| Bulk purchase / export | Not available to current account | Source reviewed; no purchase or export executed |
| Shared controls/theme | Rendered examples and selected computed styles inspected | Input/button/badge/toggle/checkbox/field/select/dialog/drawer and supporting styles reviewed |

Responsive probes used 1440, 1024, 768, 390, and 320 CSS-pixel widths. The purchase-page document did not exceed the viewport in these probes with the current three samples. This does **not** establish that every nested element, long value, dialog, or role-specific toolbar fits. New-request and login mobile layouts were inspected at 390 pixels. Budget mobile bounds also fit the current sample data.

Browser-host limitations: the embedded browser sometimes reset viewport dimensions and retained closing overlay nodes during animation. Screenshots were cross-checked with DOM measurements where possible. Do not treat scaled screenshot edges or transient closing portals as confirmed application bugs. A final visible-browser keyboard and resize pass is still needed, particularly for focus restoration, hover contrast, nested dialogs, and manager-only screens.

Evidence labels below: **Observed** = browser/DOM evidence; **Source** = directly identified in code; **Risk** = requires runtime reproduction. Priorities: **P1** blocks dependable use or basic accessibility; **P2** materially affects clarity/consistency; **P3** polish/maintenance.

## Findings

### P1 — dependable interactions and accessibility

1. **New-request drafts split across responsive layouts.** **Observed + Source.** Adding an item on desktop and switching to mobile showed a different, empty draft. Two independent `CreatePurchase` instances are controlled by the breakpoint. A resize should never appear to lose work. Render one form instance, or lift its draft state above the responsive branches. [Purchase list](../src/components/orders/page.tsx), around lines 521 and 574.

2. **Item notes are not reliably preserved.** **Source.** New-item notes stay in local state and are absent from the `onUpdate` payload. Existing-item editing initializes notes to an empty string, does not receive existing comments as a prop, and sends that empty string when another field changes. This can discard existing notes. Carry comments through the form model and initialize/reset them with the draft. [New item](../src/components/createPurchase/itemCard.tsx), [existing item](../src/components/dispalayPurchase/itemCard.tsx), [parent editor](../src/components/dispalayPurchase/purchaseCard.tsx).

3. **Save and cancel do not have a complete draft lifecycle.** **Source.** Save exits editing before the request finishes; `editPurchase` does not inspect `res.ok` or display a failure. Exit edit mode only changes the mode flag, leaving local edited values in place. Keep a separate draft, preserve it on failure, reset it on cancel, and show “Saving…” until confirmed. [Purchase editor](../src/components/dispalayPurchase/purchaseCard.tsx), lines 406 and 496–497.

4. **Validation relies on red borders.** **Source.** New-request and item validators produce useful error keys, but fields mostly consume them only for border styling. Missing items/category/vendor/name errors need visible explanations and accessible associations. Use the shared field/error components, `aria-invalid`, and focus the first invalid field. [New request](../src/components/createPurchase/createPurchase.tsx), [new item](../src/components/createPurchase/itemCard.tsx), [field primitives](../src/components/ui/field.tsx).

5. **Export can announce success after failure.** **Source.** The success toast is in `finally`, so it runs after both success and error. Loading state is not reflected in the button. Move success feedback to the success branch and disable repeated exports while pending. [Export](../src/components/exportPurchases.tsx), line 52.

6. **Bulk-purchase errors are hidden and the panel closes anyway.** **Source.** Error state is set but not rendered; `finally` closes the drawer even after a failed request. Partial selections can disable submission without explaining the requirement. Keep the panel open on failure and show actionable messages beside the selection/footer. [Bulk purchasing](../src/components/purchaseItems.tsx), lines 167–188 and submission controls.

7. **Important actions are pointer-only or poorly named.** **Source + Observed.** Purchase cards are clickable containers without native button/link keyboard behavior. Budget editing uses a clickable SVG; the admin overflow trigger renders an SVG rather than a named button. The details dialog has no accessible name (`aria-labelledby` was null); reason fields in On Hold/Received appear as unnamed textboxes. Use native controls, a real drawer title, and associated field labels. [Purchase cards](../src/components/dispalayPurchase/purchaseCard.tsx), [budget](../src/components/budget/page.tsx), [admin user](../src/components/admin/user.tsx).

8. **Approved red text is too dark for its dark badge surface.** **Observed + Source.** The badge uses logo red `#c12323` for small text over a 14% tint on a dark card. That pair needs a lighter text token; preserve logo red in the accent/border/fill. Check normal, hovered, selected and focused states independently. [Status styles](../src/app/globals.css), `.status-badge` and `.status-approved`.

9. **Action feedback is inconsistent beyond approval.** **Source.** Approval has pending/error handling, but withdrawal has no visible failure path; several status/edit/expedite actions do not check successful responses before refreshing or closing. Reuse a consistent pending/success/failure pattern for every mutation. [Approvals](../src/components/dispalayPurchase/approverCard.tsx), [purchase actions](../src/components/dispalayPurchase/purchaseCard.tsx), [admin actions](../src/components/admin/user.tsx).

### P2 — form layout and visual consistency

10. **Field sizes vary substantially.** **Observed + Source.** New-request name was approximately 26px high with 12px text; new item name 28px; quantity, price and link about 20px. The edited-item form uses 44px controls and 16px text. Raw Base UI inputs bypass shared styling in new requests, budgets, administration and bulk purchasing; the shared input itself defaults to 28px. Introduce explicit form and compact variants, then use them consistently. [Input](../src/components/ui/input.tsx), [new request](../src/components/createPurchase/createPurchase.tsx), [new item](../src/components/createPurchase/itemCard.tsx).

11. **Mobile creation puts secondary information first.** **Observed.** The budget chart appears before the actual form, including a large empty chart area before a category is chosen. The dialog had roughly 1293px of content within 826px of visible height. “Best Practices / Purchasing Guidelines” is effectively empty. Put request information and items first; use a compact budget summary after category selection; replace placeholder guidance with useful text or remove it. [Create layout](../src/components/createPurchase/createPurchase.tsx), lines 297–399.

12. **Mobile purchase summaries omit useful information and hide the main action.** **Observed + Source.** Cost/category disappear under the desktop breakpoint. New Request requires opening the menu; Kraken mode and refresh are absent from the mobile controls. Keep cost visible, provide a compact category line, and expose the primary action directly. [Purchase list](../src/components/orders/page.tsx), [summary card](../src/components/dispalayPurchase/purchaseCard.tsx).

13. **Theme overrides compete with each other.** **Source.** Global CSS contains successive palettes, repeated status rules, repeated login/navigation rules and broad class-based `!important` overrides. Green-era colors coexist with red overrides. This makes component hover, background, border and text colors difficult to predict. Consolidate semantic tokens and component variants before applying further patches. [Global styles](../src/app/globals.css).

14. **Status filters dominate the hierarchy.** **Observed.** With all statuses selected, the toolbar is a row of bright, unrelated fills. The mobile filter dialog also uses a green Done button that differs from the main red action system. Proposal: neutral filter surfaces with a clear selected treatment; retain colored status labels and the requested red Approved identity. This is a design proposal, not an implemented restyle. [Filters](../src/components/orders/page.tsx), [theme](../src/app/globals.css).

15. **Budget information is ambiguous in edit mode.** **Observed + Source.** A sample showed “Remaining Budget / -136% Remains.” The bar value is purchase cost, while the label describes remaining budget; the calculation compares the purchase to the category ceiling without accounting for category spending. Exactly 10% also has no matching label branch. Show spent/committed/new-request amounts explicitly, a meaningful remaining amount, and “Over budget by …” when appropriate. [Purchase editor](../src/components/dispalayPurchase/purchaseCard.tsx), lines 312 and 695–713.

16. **Budget-management drawers need responsive standardization.** **Source / Risk.** Create/edit use `w-1/3`, square right corners, `modal={false}`, small inputs, and no consistent close/cancel footer. Their behavior differs from purchase editing and may be unusably narrow on phones. Adopt the same responsive drawer shell, explicit close action and form dimensions. Requires a manager-account visual pass. [Budget](../src/components/budget/page.tsx), lines 227–266 and 381–420.

17. **Menus and dialogs mix implementations.** **Source + Observed.** Category filtering is a custom absolute-positioned popover without a declared expanded state or the focus/Escape behavior supplied by the library primitives. Status dialogs have unlabeled fields and several malformed `hover::` classes; Received helper text uses dark zinc on a dark surface. Use Base UI compositions consistently and a shared action-dialog layout. [Category filter](../src/components/orders/page.tsx), [status dialogs](../src/components/dispalayPurchase/purchaseCard.tsx).

18. **Typography and spacing still drift outside the main editor.** **Source + Observed.** Open Sans is the base and login body font, but explicit monospace classes remain on notes, new-request fields and several form headings. Some headings are actual `h1` elements used for small labels. Define which elements intentionally retain JetBrains Mono; make field labels/help/body Open Sans and use semantic heading levels. [Global typography](../src/app/globals.css), [item notes](../src/components/dispalayPurchase/itemCard.tsx), [new request](../src/components/createPurchase/createPurchase.tsx).

19. **Money and category labels need consistent formatting.** **Observed.** Purchases show `$11778.00` while budgets use grouped amounts. Raw category identifiers such as `Offseason-UI Test Samples` wrap awkwardly in narrow summary columns. Use one currency formatter and render the category name with phase as secondary information. [Purchase card](../src/components/dispalayPurchase/purchaseCard.tsx), [budget](../src/components/budget/page.tsx).

20. **Creation and editing offer different supplier choices.** **Source.** The two lists differ, and edit mode lacks the equivalent custom-vendor entry flow. A request created with a custom supplier should remain straightforward to edit. Share the options and custom-value field. [Create form](../src/components/createPurchase/createPurchase.tsx), [edit form](../src/components/dispalayPurchase/purchaseCard.tsx).

21. **Empty and loading states are uneven.** **Observed + Source.** Purchase no-results is good; budget Season/Champs sections are empty containers without explanation. New requests begin with an empty items area. Initial user loading briefly shows fallback identity, and several fetch paths lack a useful error/retry display. Reuse one set of loading/empty/error patterns. [Application](../src/app/page.tsx), [budget](../src/components/budget/page.tsx), [create form](../src/components/createPurchase/createPurchase.tsx).

### P3 — polish and maintenance

22. **Kraken mode needs a high-value layout rule.** **Source / Risk.** The simplified motor meter correctly fills left-to-right and supplies an accessible text description, but creates one SVG per whole equivalent without a bound. Large purchases can grow rows substantially. Preserve the requested one-motor representation; consider a compact expandable motor strip for large values, with the total always visible. Review this choice before changing the visual. [Kraken meter](../src/components/dispalayPurchase/krakenMeter.tsx).

23. **Copy needs one editing pass.** **Observed + Source.** Examples include “Overide Status,” inconsistent title case, “Supplier” versus “Vendor,” and technical category IDs. Legacy code also includes “Team Adminstrator.” Standardize user-facing wording without requiring database identifier migrations. [Purchase actions](../src/components/dispalayPurchase/purchaseCard.tsx), [navigation](../src/components/ui/navbar.tsx).

24. **Navigation and duplicate screens increase inconsistency.** **Source.** Section selection is in application state while the URL stays `/`, so browser navigation cannot reliably represent the selected section. A second create-screen implementation remains. Confirm reachable paths and consolidate form/navigation implementations. [Application](../src/app/page.tsx), [alternate create screen](../src/components/create/page.tsx), [navigation](../src/components/ui/navbar.tsx).

25. **Login is explicitly a local-test experience.** **Observed + Source.** The only action is “Continue as test user,” with a temporary-code comment. Keep this clearly separated from production readiness; the production sign-in UI and its recovery states still require review when restored. [Login](../src/app/login/page.tsx).

## Proposed UI standard

- Keep the present dark/red identity. Use neutral backgrounds for most surfaces; reserve strong red fills for primary actions and deliberate selected states.
- Open Sans for body, controls, labels and help text; JetBrains Mono for branding and an agreed set of titles only.
- Proposed comfortable form controls: 44px high, 16px text, 12px horizontal padding, 8px radius. Compact controls can use a separate explicit variant; do not shrink inputs incidentally through inherited text classes.
- Use 8/12/16/24px spacing steps, consistent panel padding, and dividers between detail sections. Keep the tag column aligned without adding another box around each tag.
- Shared responsive drawer/dialog shells: named title, visible close control, contained scrolling, clear footer, error region and pending action state.
- Standardize money/date/category formatting and one component for status presentation across list, details and filters.
- Use Base UI for behavior and the project’s shared shadcn wrappers for appearance. Base UI is intentionally unstyled; it does not prescribe a single input size. [Base UI overview](https://base-ui.com/react/overview/about), [dialog composition](https://base-ui.com/react/components/dialog).
- Use 4.5:1 contrast for normal text and 3:1 for qualifying large text. A 44px control is a proposed comfort target, not the WCAG AA minimum: WCAG 2.2 target-size minimum is 24×24 CSS pixels, subject to its exceptions. [Text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).

## Implementation sequence

### Phase 1 — preserve work and make outcomes trustworthy

Address findings 1–9: one create draft, preserved notes, real save/cancel lifecycle, visible validation, accurate export/bulk outcomes, pending/error feedback, named keyboard-accessible actions, readable Approved text.

Acceptance: resize preserves all draft fields/items; cancelling restores saved values; failed saves retain drafts; notes survive unrelated edits; every action reports its actual outcome; keyboard users can open a purchase and identify the dialog.

### Phase 2 — unify the design system and forms

Consolidate theme tokens; introduce form-size and compact-size variants; migrate raw inputs; unify drawer/dialog shells, labels and error text. Apply the larger edit-form pattern to new requests, budget forms, admin dialogs and bulk purchase fields.

Acceptance: matching controls share height, padding, typeface, radius and focus treatment; no broad override is needed to rescue a single screen; ordinary labels/help use Open Sans.

### Phase 3 — fix responsive hierarchy and information

Put request fields before budget detail on mobile; keep costs and New Request accessible; simplify filter colors after agreement; make budget remaining/spent semantics accurate; format totals/categories consistently. Decide the large-value Kraken presentation.

Acceptance: 320/390/768/1024/1440px layouts have readable controls and no horizontal page overflow; long request/vendor/category names do not collide; dialog primary actions remain reachable; tag alignment remains consistent.

### Phase 4 — complete role-specific walkthrough and state review

Use an authorized manager/admin test account to visually inspect team access, role/name changes, budget create/edit, bulk purchasing, export and status override. Check loading, failure, empty, disabled, hovered and keyboard-focused states in a visible browser. Review browser back/refresh and all close/cancel routes.

Acceptance: finish the coverage gaps listed above; document screenshots for each viewport/role; exercise failure/success scenarios only with disposable data and permission for those writes. This audit did not submit changes to existing purchases.

## Decisions to settle before styling changes

1. Keep the existing charcoal/red identity — recommended.
2. Use quieter neutral status-filter buttons while retaining colored tags — proposed for review.
3. Keep Kraken motors one-to-one, but make very large displays expandable — proposed for review.
4. Confirm the intended JetBrains Mono exceptions beyond the brand before removing remaining explicit monospace classes.

## Vega implementation update

The approved direction is now **Vega**, replacing Mira. Shared primitives use official Vega definitions; the app theme and major screens have been rebuilt around those defaults. See [UI conventions and verification](./ui-design-system.md).

Implemented in this pass: shared responsive navigation; one new-request form instance; readable status badges; consistent field/button sizes; mobile cost/action visibility; form labels and visible validation; new/edit notes propagation; existing-purchase save/cancel handling; truthful export feedback; bulk-purchase error retention; accessible purchase-card triggers and named purchase drawers; consistent currency/category presentation; budget summaries/empty states; responsive category drawers; standardized management menus.

The original findings above describe the pre-migration audit, not the current appearance. Remaining items include manager-account visual coverage, production authentication, broader failure-path/keyboard review, URL navigation, and deciding whether very large Kraken displays should collapse.
