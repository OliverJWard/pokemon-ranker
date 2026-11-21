// Safe expression engine for score formulas (no eval / Function).
// Grammar: + - * / ^, unary minus, parentheses, numbers, stat variables,
// and min()/max()/abs(). `^` binds tighter than unary minus, so -2^2 is -4.

export const FUNCTIONS = { min: { arity: [1, Infinity] }, max: { arity: [1, Infinity] }, abs: { arity: [1, 1] } };

export function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+(\.\d+)?|\.\d+)/.exec(src.slice(i));
    if (num) {
      tokens.push({ type: "num", value: parseFloat(num[0]) });
      i += num[0].length;
      // "1.2.3" or "2x" would otherwise be read as two adjacent tokens.
      if (/[\w.]/.test(src[i] ?? "")) throw new Error(`Malformed number near "${src.slice(i - num[0].length, i + 1)}"`);
      continue;
    }
    const ident = /^[a-zA-Z_]\w*/.exec(src.slice(i));
    if (ident) {
      tokens.push({ type: "ident", value: ident[0].toLowerCase() });
      i += ident[0].length;
      continue;
    }
    if ("+-*/^(),".includes(c)) { tokens.push({ type: c }); i++; continue; }
    throw new Error(`Unexpected character "${c}"`);
  }
  return tokens;
}

export function parse(tokens, variables) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const isType = (type) => peek()?.type === type;
  const expect = (type, message) => {
    if (!isType(type)) throw new Error(message);
    next();
  };

  function parseAdd() {
    let node = parseMul();
    while (isType("+") || isType("-")) node = { type: "bin", op: next().type, left: node, right: parseMul() };
    return node;
  }
  function parseMul() {
    let node = parseUnary();
    while (isType("*") || isType("/")) node = { type: "bin", op: next().type, left: node, right: parseUnary() };
    return node;
  }
  function parseUnary() {
    if (isType("-")) { next(); return { type: "neg", value: parseUnary() }; }
    return parsePow();
  }
  function parsePow() {
    const base = parsePrimary();
    if (!isType("^")) return base;
    next();
    // Right-associative; the exponent may itself be negative (2^-1).
    return { type: "bin", op: "^", left: base, right: parseUnary() };
  }
  function parseCall(name) {
    const fn = FUNCTIONS[name];
    if (!fn) throw new Error(`Unknown function "${name}()"`);
    next(); // "("
    const args = [];
    if (!isType(")")) {
      args.push(parseAdd());
      while (isType(",")) { next(); args.push(parseAdd()); }
    }
    expect(")", 'Missing closing ")" after function call');
    const [lo, hi] = fn.arity;
    if (args.length < lo || args.length > hi) {
      throw new Error(`${name}() takes ${lo === hi ? lo : `at least ${lo}`} argument${hi === 1 ? "" : "s"}`);
    }
    return { type: "call", name, args };
  }
  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error("Unexpected end of formula");
    if (t.type === "num") { next(); return { type: "num", value: t.value }; }
    if (t.type === "(") {
      next();
      const node = parseAdd();
      expect(")", 'Missing closing ")"');
      return node;
    }
    if (t.type === "ident") {
      next();
      if (isType("(")) return parseCall(t.value);
      if (!variables.includes(t.value)) throw new Error(`Unknown variable "${t.value}"`);
      return { type: "var", name: t.value };
    }
    throw new Error(`Unexpected "${t.type}"`);
  }

  const ast = parseAdd();
  if (pos !== tokens.length) throw new Error("Unexpected trailing input");
  return ast;
}

export function evaluate(node, ctx) {
  switch (node.type) {
    case "num": return node.value;
    case "var": return ctx[node.name];
    case "neg": return -evaluate(node.value, ctx);
    case "bin": {
      const l = evaluate(node.left, ctx);
      const r = evaluate(node.right, ctx);
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
        case "^": return Math.pow(l, r);
      }
      break;
    }
    case "call": {
      const vals = node.args.map((a) => evaluate(a, ctx));
      if (node.name === "min") return Math.min(...vals);
      if (node.name === "max") return Math.max(...vals);
      return Math.abs(vals[0]);
    }
  }
  throw new Error("Cannot evaluate expression");
}

// statKeys: e.g. ["hp","atk",...]. `bst` (sum of all stats) is always available.
export function compileFormula(src, statKeys) {
  const ast = parse(tokenize(src), [...statKeys, "bst"]);
  return (stats) => {
    const ctx = { ...stats, bst: statKeys.reduce((sum, k) => sum + stats[k], 0) };
    const v = evaluate(ast, ctx);
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Formula produced a non-numeric result");
    return v;
  };
}

// Compiles and dry-runs against the roster, so a formula that divides by zero
// for one species is rejected up front rather than breaking the render.
export function compileForRoster(src, statKeys, roster) {
  const fn = compileFormula(src, statKeys);
  for (const p of roster) fn(p.stats);
  return fn;
}
