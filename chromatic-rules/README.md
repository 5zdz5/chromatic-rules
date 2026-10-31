# Chromatic Rules / 色域法则

A rule-composition game rendered inside the DeepSeek Harness Web UI.

## Play

Open **色域法则 / Chromatic Rules** from the sidebar panel list.

Each cell has one of five colors or is empty. Compose rules of the form:

> When a **[subject]** cell has at least **N** **[neighbor color]** cells inside **radius R**, it **vanishes** or **spreads**.

- Radius 1 checks the 8 surrounding cells; radius 2 checks 24; radius 3 checks 48.
- All enabled rules resolve against the same snapshot.
- Vanish wins over spread for the same cell.
- When two spread rules claim the same empty cell, the earlier rule wins. Reorder rules to set priority.
- Spread fills every empty cell inside the radius, not only orthogonally adjacent cells.

The campaign has four levels plus a free-paint sandbox. Progress and best generation counts are stored locally in the browser.

## Levels

1. **初焰 / First Flame** — clear ruby with a chain reaction.
2. **蔓延 / Overgrowth** — grow jade to 72 inside a violet wall.
3. **双前线 / Two Fronts** — clear ruby and violet on two fronts while preserving jade.
4. **临界 / Critical Mass** — clear ruby and grow azure and jade to 45 each.
5. **沙盒 / Sandbox** — paint cells and experiment freely.

## Implementation

- `index.js` is the no-op Host half.
- `client.js` contains the pure simulation engine and the React UI. It registers a sidebar panel icon and the matching `main` panel.
- `locale/en.json` and `locale/zh.json` supply plugin display metadata; in-app text is registered through the Client locale service.
- All UI classes use the `cr-` prefix and theme tokens (`--dsw-alias-*`).
