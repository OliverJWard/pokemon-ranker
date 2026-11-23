# Plan: publish and extend Field Ranker

State as of 2026-11-21: steps 1–3 and the README are committed locally on `main` (4 commits, 33 tests passing). **Nothing has been pushed**, and the repo `OliverJWard/pokemon-ranker` is still private.

## 1. Publish (needs your go-ahead)

- [ ] Decide whether you're comfortable with the data licence gap (see below).
- [ ] `git push origin main`
- [ ] `gh repo edit --visibility public --accept-visibility-change-consequences`
- [ ] Enable GitHub Pages: Settings → Pages → deploy from `main`, folder `/ (root)`.
      Or: `gh api -X POST repos/OliverJWard/pokemon-ranker/pages -f "source[branch]=main" -f "source[path]=/"`
- [ ] Wait for the build, then open `https://oliverjward.github.io/pokemon-ranker/`.
- [ ] Check on the live link: rankings load, a row expands, `?f=spe` shares a formula, and there are no console errors on a phone.
- [ ] Add the live link to the README.

### Data licence caveat
PokeAPI gives no licence for its data. Its LICENSE.md is BSD and covers the code only, and its docs have no attribution or redistribution terms for the data. Pokémon names are Nintendo trademarks. The README says all this. If you want to reduce the risk, options are:
- Leave as is, since base stats are facts and the fetch followed PokeAPI's fair-use policy.
- Ask the PokeAPI maintainers to state the data licence (open an issue on `PokeAPI/pokeapi`).
- Cross-check the numbers against another openly licensed source.

## 2. Follow-ups on the current build

- [ ] **Run the app on a real phone** after publishing. I only tested in headless Chrome, so touch behaviour, the iOS `<details>` summary and the keyboard are unchecked.
- [ ] **Check with a screen reader.** Row buttons, `aria-expanded` and the status regions are in place but untested with one.
- [ ] **Edge cases not yet covered:** very long formulas in the collapsed summary, and the sticky panel on short laptop screens (it now scrolls internally).
- [ ] **CI:** a GitHub Action running `node --test` on push (no dependencies needed).
- [ ] **Data freshness:** re-run `node scripts/build-data.mjs` only if PokeAPI corrects values. The retrieval date is in `data/gen3.json`.

## 3. Adding more games

The structure is ready. A game is an entry in `data/games.json` plus a rebuild (see README → "Adding another game"). Work remaining:

| Game(s) | Generation | Effort | Notes |
|---|---|---|---|
| Ruby / Sapphire / Emerald | 3 | Small | Species range `[1, 386]`; reuses `gen3.json` (rebuild widens it). Type colours already cover Gen III. |
| Gold / Silver / Crystal | 2 | Small | Adds Dark/Steel to the roster. Check Gen II `past_stats` look right. |
| Diamond / Pearl / Platinum, HGSS, B/W | 4–5 | Small | Same pipeline. |
| X/Y onward | 6+ | Small–medium | Fairy type exists. Decide how to handle forms (Alolan, Galarian, Mega). |
| Red / Blue / Yellow | 1 | **Medium** | One Special stat instead of SpA/SpD. Needs a per-generation stat list, new presets, and formula variables (`spc`). |

### Needed before a second game ships
- [ ] **Game picker in the UI** (currently `?game=<id>` only). A `<select>` in the header.
- [ ] **Per-game presets/combos.** `src/presets.mjs` assumes split Special stats.
- [ ] **Roster scope per game.** Regional dex vs national dex; `species: [first, last]` covers only contiguous ranges.
- [ ] **Forms.** Decide whether alternate forms are ranked, and if so how the data build names and IDs them.
- [ ] **Persistence:** remember the last game and formula in `localStorage`, alongside the URL parameters.

## 4. Nice-to-haves

- Compare two Pokémon side by side.
- Export the current ranking as CSV.
- Highlight a type or filter by type chips.
- A "my team" shortlist saved locally.
- Move-set and ability data (needs a source and licence check first).

## Reference

- Run: `python3 -m http.server 8000` → http://localhost:8000
- Test: `node --test` (Node 26 is installed at `~/.local/node`, symlinked into `~/.local/bin`)
- Rebuild data: `node scripts/build-data.mjs`
- Audit findings (resolved): 19 wrong stat/type entries, tie ranking, search ranks, `-2^2`, markup injection, keyboard access, contrast, mobile layout, unused fonts.
