# Implementation Decisions

Date: 2026-09-10

## Theme

- Use a single React theme context so every route shares the same light/dark state.
- Persist the user's choice in `localStorage` under `jaldrishti-theme`.
- Respect the operating system preference only when no saved choice exists.
- Apply the theme with a `data-theme` attribute on the document root so CSS variables control the existing UI without duplicating page markup.
- Keep risk colors readable in both themes and add a visible, labelled toggle in the existing header.

## Responsive Layout

- Keep the desktop sidebar, and use an off-canvas sidebar drawer below 768px so mobile navigation stays familiar without consuming the page header.
- Add a menu button, backdrop dismissal, route-selection close behavior, and body scroll locking while the drawer is open.
- Let the main content shrink with `min-width: 0` and reduce mobile padding to preserve usable width.
- Stack forecast and evacuation columns on phones.
- Make the village table horizontally scrollable instead of clipping columns.
- Make the live map drawer viewport-relative on phones so it does not permanently consume the map area.
- Allow alert controls and dashboard grids to wrap naturally at narrow widths.

## Validation

- Run `npm run lint` and `npm run build` from `frontend`.
- Start Vite and inspect the application at desktop and phone-sized viewports, checking for horizontal overflow and that the theme toggle persists after reload.
