# Field Ranker

Rank Pokémon by a score formula you write yourself (e.g. `max(atk, spa)*2 + spe*1.5 - min(def, spd)*0.5`), using the base stats and types from the game you pick. Currently: **FireRed / LeafGreen** (Generation 3 stats, Pokémon #1–151).

Features: live formula editing with presets, search by name or type, tied scores share a rank, per-Pokémon stat breakdown, keyboard accessible, works on phones. The formula is stored in the URL (`?f=...`), so you can share a ranking by copying the link.

**Live:** https://oliverjward.github.io/pokemon-ranker/

## Run

No install or build step. Serve the folder over HTTP (the app loads JSON, which browsers block from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Test

Requires Node.js 20+ (no dependencies):

```sh
node --test
```

## Data

| | |
|---|---|
| Source | [PokeAPI](https://pokeapi.co/) (`/pokemon` and `/pokemon-species`) |
| Retrieved | 2026-11-21 (see `source.retrieved` in `data/gen3.json`) |
| Licence | **Not stated for the data.** PokeAPI's code is BSD-licensed; its docs give no licence or attribution terms for the data itself, and no redistribution or commercial-use restriction. |
| Trademark | Pokémon and Pokémon character names are trademarks of Nintendo. This project is unofficial and not affiliated with Nintendo, Game Freak or PokeAPI. |

The values are game-version accurate: PokeAPI stores current stats and types plus `past_stats` / `past_types` history, and `scripts/build-data.mjs` resolves them for the target generation (e.g. Butterfree's Sp. Atk is 80 in Gen III, not today's 90). Nothing in `data/gen*.json` is hand-edited; regenerate with:

```sh
node scripts/build-data.mjs
```

The script fetches each species a handful at a time, as PokeAPI's fair-use policy asks.

## Adding another game

1. Add an entry to `data/games.json` (`id`, `name`, `generation`, `species: [first, last]`).
2. Run `node scripts/build-data.mjs`; games sharing a generation share one data file.
3. Open the app with `?game=<id>`.

Generation I is rejected for now because it has a single Special stat, which the stat model doesn't express yet. Presets in `src/presets.mjs` assume split Special stats.

## Layout

```
index.html, style.css   page and styles
src/formula.mjs         safe expression parser (no eval)
src/ranking.mjs         ranking, ties, search filter
src/resolve.mjs         per-generation stat/type resolution
src/color.mjs           contrast maths for badge text
src/app.js              DOM layer
scripts/build-data.mjs  data snapshot builder
data/                   games.json + generated gen<N>.json
test/                   node --test suites
```

## Dependencies

None at runtime. Development uses only Node.js built-ins (`node:test`, `fetch`).
