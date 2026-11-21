// DOM layer. All scoring, parsing and ranking logic lives in the pure modules.
import { compileForRoster } from "./formula.mjs";
import { rankRoster, filterRanked, barFraction } from "./ranking.mjs";
import { PRESETS, DEFAULT_FORMULA, FUNCTION_SNIPPETS, COMBOS } from "./presets.mjs";

const TYPE_COLORS = {
  Normal: "#A8A77A", Fire: "#EE8130", Water: "#6390F0", Electric: "#F7D02C",
  Grass: "#7AC74C", Ice: "#96D9D6", Fighting: "#C22E28", Poison: "#A33EA1",
  Ground: "#E2BF65", Flying: "#A98FF3", Psychic: "#F95587", Bug: "#A6B91A",
  Rock: "#B6A136", Ghost: "#735797", Dragon: "#6F35FC", Steel: "#B7B7CE",
  Dark: "#705746", Fairy: "#D685AD",
};

const $ = (id) => document.getElementById(id);

// Builds elements without innerHTML so names and search text can never inject markup.
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "style") Object.assign(el.style, v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v);
  }
  el.append(...children.flat().filter((c) => c != null));
  return el;
}

const state = {
  roster: [],
  statKeys: [],
  statLabels: [],
  scoreFn: null,
  sortDir: "desc",
  search: "",
  openId: null,
};

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
  return res.json();
}

async function loadGame() {
  const { games } = await loadJson("data/games.json");
  const wanted = new URLSearchParams(location.search).get("game");
  const game = games.find((g) => g.id === wanted) ?? games[0];
  const data = await loadJson(`data/gen${game.generation}.json`);
  const [from, to] = game.species;
  return { game, data, roster: data.pokemon.filter((p) => p.id >= from && p.id <= to) };
}

// ---------- Formula panel ----------
function applyFormula() {
  const status = $("formulaStatus");
  try {
    state.scoreFn = compileForRoster($("formulaInput").value, state.statKeys, state.roster);
    status.textContent = "Valid — ranking live";
    status.className = "formula-status ok";
  } catch (err) {
    // Keep ranking with the last valid formula; the status line explains why.
    status.textContent = "Not applied: " + err.message;
    status.className = "formula-status err";
  }
  render();
}

function setFormula(src) {
  $("formulaInput").value = src;
  applyFormula();
}

function insertAtCursor(text, cursorOffset = text.length) {
  const input = $("formulaInput");
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  input.focus();
  input.setSelectionRange(start + cursorOffset, start + cursorOffset);
  applyFormula();
}

function chip(label, onClick, className = "chip") {
  return h("button", { className, type: "button", textContent: label, onclick: onClick });
}

function buildPanel() {
  $("statChips").append(...[...state.statKeys, "bst"].map((v) => chip(v, () => insertAtCursor(v))));
  $("fnChips").append(...FUNCTION_SNIPPETS.map((f) => chip(f.label, () => insertAtCursor(f.text, f.cursor))));
  $("comboChips").append(...COMBOS.map((c) => chip(c.label, () => insertAtCursor(c.text), "chip combo")));
  $("presetGrid").append(
    ...PRESETS.map((p) => h("button", { className: "preset", type: "button", textContent: p.label, onclick: () => setFormula(p.formula) })),
  );
  $("clearBtn").addEventListener("click", () => setFormula(""));
  $("resetBtn").addEventListener("click", () => setFormula(DEFAULT_FORMULA));
  $("formulaInput").addEventListener("input", applyFormula);
  $("searchBox").addEventListener("input", (e) => { state.search = e.target.value; render(); });
  $("sortDir").addEventListener("change", (e) => { state.sortDir = e.target.value; render(); });
  $("list").addEventListener("click", (e) => {
    const row = e.target.closest(".row");
    if (!row) return;
    const id = Number(row.dataset.id);
    state.openId = state.openId === id ? null : id;
    render();
  });
}

// ---------- Results ----------
function typeBadge(t) {
  return h("span", { className: "type-badge", textContent: t, style: { background: TYPE_COLORS[t] ?? "#888" } });
}

function rowFor(entry, index, min, max) {
  const { p, score, rank } = entry;
  const rankClass = rank <= 3 ? `r${rank}` : "";
  const open = state.openId === p.id;
  const row = h("div", { className: `row${index === 0 ? " top1" : ""}${open ? " open" : ""}`, dataset: { id: p.id } },
    h("div", { className: `rank ${rankClass}`, textContent: rank }),
    h("div", { className: "name-cell" },
      h("div", { className: "name-line" },
        h("span", { className: "pname", textContent: p.name }),
        h("span", { className: "pnum", textContent: `#${String(p.id).padStart(3, "0")}` })),
      h("div", { className: "types" }, p.types.map(typeBadge))),
    h("div", { className: "bar-cell bar-track" },
      h("div", { className: "bar-fill", style: { width: `${barFraction(score, min, max) * 100}%` } })),
    h("div", { className: "score-cell", textContent: score.toFixed(1) }));
  const breakdown = h("div", { className: "breakdown" },
    h("div", { className: "stat-grid" },
      state.statKeys.map((k, i) => h("div", { className: "stat-chip" },
        h("div", { className: "v", textContent: p.stats[k] }),
        h("div", { className: "k", textContent: state.statLabels[i] })))));
  return [row, breakdown];
}

function render() {
  const ranked = rankRoster(state.roster, state.scoreFn, state.sortDir);
  const scores = ranked.map((e) => e.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const shown = filterRanked(ranked, state.search);

  $("shownCount").textContent = shown.length;
  const list = $("list");
  if (shown.length === 0) {
    list.replaceChildren(h("div", { className: "empty", textContent: `No Pokémon match “${state.search.trim()}”.` }));
    return;
  }
  list.replaceChildren(...shown.flatMap((e, i) => rowFor(e, i, min, max)));
}

// ---------- Boot ----------
async function main() {
  const { game, data, roster } = await loadGame();
  state.roster = roster;
  state.statKeys = data.stats.map((s) => s.key);
  state.statLabels = data.stats.map((s) => s.label);
  $("subtitle").textContent = `${game.name} · Generation ${game.generation} stats · scored by base stats`;
  $("totalCount").textContent = roster.length;
  $("formulaInput").value = DEFAULT_FORMULA;
  buildPanel();
  applyFormula();
}

main().catch((err) => {
  console.error(err);
  $("list").replaceChildren(h("div", { className: "empty", role: "alert", textContent: `Failed to load data: ${err.message}. Serve the folder over HTTP (python3 -m http.server) rather than opening the file directly.` }));
});
