/**
 * Formula engine for the deterministic workflow builder.
 * Supports data-pill references ({{node.field}}), workflow properties,
 * error pills, and a function library with runtime evaluation.
 */

export type FormulaContext = Record<string, unknown>;

export type FormulaFunction = {
  name: string;
  category: "text" | "math" | "date" | "logic" | "list" | "type";
  signature: string;
  description: string;
  example: string;
  minArgs: number;
  maxArgs: number;
  fn: (...args: unknown[]) => unknown;
};

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  return Boolean(v);
}

export const FORMULA_FUNCTIONS: FormulaFunction[] = [
  {
    name: "CONCAT",
    category: "text",
    signature: "CONCAT(a, b, ...)",
    description: "Join text values into a single string.",
    example: 'CONCAT({{trigger.first_name}}, " ", {{trigger.last_name}})',
    minArgs: 1,
    maxArgs: 20,
    fn: (...args) => args.map(asString).join(""),
  },
  {
    name: "UPPER",
    category: "text",
    signature: "UPPER(text)",
    description: "Convert text to uppercase.",
    example: "UPPER({{trigger.status}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => asString(a).toUpperCase(),
  },
  {
    name: "LOWER",
    category: "text",
    signature: "LOWER(text)",
    description: "Convert text to lowercase.",
    example: "LOWER({{trigger.email}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => asString(a).toLowerCase(),
  },
  {
    name: "TRIM",
    category: "text",
    signature: "TRIM(text)",
    description: "Remove leading and trailing whitespace.",
    example: "TRIM({{trigger.note}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => asString(a).trim(),
  },
  {
    name: "LEFT",
    category: "text",
    signature: "LEFT(text, n)",
    description: "Return the first n characters.",
    example: "LEFT({{trigger.phone}}, 3)",
    minArgs: 2,
    maxArgs: 2,
    fn: (a, n) => asString(a).slice(0, asNumber(n)),
  },
  {
    name: "RIGHT",
    category: "text",
    signature: "RIGHT(text, n)",
    description: "Return the last n characters.",
    example: "RIGHT({{trigger.phone}}, 4)",
    minArgs: 2,
    maxArgs: 2,
    fn: (a, n) => asString(a).slice(-asNumber(n)),
  },
  {
    name: "REPLACE",
    category: "text",
    signature: "REPLACE(text, find, replace)",
    description: "Replace all occurrences of find with replace.",
    example: 'REPLACE({{trigger.phone}}, "-", "")',
    minArgs: 3,
    maxArgs: 3,
    fn: (a, find, replace) => asString(a).split(asString(find)).join(asString(replace)),
  },
  {
    name: "LEN",
    category: "text",
    signature: "LEN(text)",
    description: "Return the length of a string.",
    example: "LEN({{trigger.body}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => asString(a).length,
  },
  {
    name: "IF",
    category: "logic",
    signature: "IF(condition, then, else)",
    description: "Return then if condition is truthy, otherwise else.",
    example: 'IF({{error.message}}, "failed", "ok")',
    minArgs: 2,
    maxArgs: 3,
    fn: (cond, thenVal, elseVal) => (asBool(cond) ? thenVal : (elseVal ?? "")),
  },
  {
    name: "AND",
    category: "logic",
    signature: "AND(a, b, ...)",
    description: "Return true if all arguments are truthy.",
    example: "AND({{step.success}}, {{step.valid}})",
    minArgs: 2,
    maxArgs: 20,
    fn: (...args) => args.every(asBool),
  },
  {
    name: "OR",
    category: "logic",
    signature: "OR(a, b, ...)",
    description: "Return true if any argument is truthy.",
    example: 'OR({{trigger.priority}} === "high", {{trigger.priority}} === "emergency")',
    minArgs: 2,
    maxArgs: 20,
    fn: (...args) => args.some(asBool),
  },
  {
    name: "NOT",
    category: "logic",
    signature: "NOT(value)",
    description: "Return the boolean opposite.",
    example: "NOT({{step.success}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => !asBool(a),
  },
  {
    name: "COALESCE",
    category: "logic",
    signature: "COALESCE(a, b, ...)",
    description: "Return the first non-null, non-empty value.",
    example: "COALESCE({{trigger.email}}, {{trigger.phone}}, \"unknown\")",
    minArgs: 1,
    maxArgs: 20,
    fn: (...args) => {
      for (const a of args) {
        if (a != null && asString(a) !== "") return a;
      }
      return null;
    },
  },
  {
    name: "ADD",
    category: "math",
    signature: "ADD(a, b, ...)",
    description: "Add numbers.",
    example: "ADD({{trigger.rent}}, 50)",
    minArgs: 2,
    maxArgs: 20,
    fn: (...args) => args.reduce<number>((s, a) => s + asNumber(a), 0),
  },
  {
    name: "SUBTRACT",
    category: "math",
    signature: "SUBTRACT(a, b)",
    description: "Subtract b from a.",
    example: "SUBTRACT({{market.rent}}, {{trigger.rent}})",
    minArgs: 2,
    maxArgs: 2,
    fn: (a, b) => asNumber(a) - asNumber(b),
  },
  {
    name: "MULTIPLY",
    category: "math",
    signature: "MULTIPLY(a, b, ...)",
    description: "Multiply numbers.",
    example: "MULTIPLY({{trigger.rent}}, 1.03)",
    minArgs: 2,
    maxArgs: 20,
    fn: (...args) => args.reduce<number>((s, a) => s * asNumber(a), 1),
  },
  {
    name: "DIVIDE",
    category: "math",
    signature: "DIVIDE(a, b)",
    description: "Divide a by b.",
    example: "DIVIDE({{trigger.balance}}, 12)",
    minArgs: 2,
    maxArgs: 2,
    fn: (a, b) => {
      const denom = asNumber(b);
      return denom === 0 ? null : asNumber(a) / denom;
    },
  },
  {
    name: "ROUND",
    category: "math",
    signature: "ROUND(number, digits)",
    description: "Round a number to the given digit count.",
    example: "ROUND({{trigger.rent}}, 2)",
    minArgs: 1,
    maxArgs: 2,
    fn: (a, digits = 0) => {
      const d = asNumber(digits);
      const f = 10 ** d;
      return Math.round(asNumber(a) * f) / f;
    },
  },
  {
    name: "ABS",
    category: "math",
    signature: "ABS(number)",
    description: "Absolute value.",
    example: "ABS({{trigger.balance}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => Math.abs(asNumber(a)),
  },
  {
    name: "NOW",
    category: "date",
    signature: "NOW()",
    description: "Current date/time as ISO string.",
    example: "NOW()",
    minArgs: 0,
    maxArgs: 0,
    fn: () => new Date().toISOString(),
  },
  {
    name: "TODAY",
    category: "date",
    signature: "TODAY()",
    description: "Current date as YYYY-MM-DD.",
    example: "TODAY()",
    minArgs: 0,
    maxArgs: 0,
    fn: () => new Date().toISOString().slice(0, 10),
  },
  {
    name: "FORMAT_DATE",
    category: "date",
    signature: "FORMAT_DATE(date, format)",
    description: 'Format a date. Formats: "short", "long", "iso".',
    example: 'FORMAT_DATE({{trigger.created_at}}, "short")',
    minArgs: 1,
    maxArgs: 2,
    fn: (a, format = "short") => {
      const d = new Date(asString(a));
      if (Number.isNaN(d.getTime())) return asString(a);
      const f = asString(format);
      if (f === "iso") return d.toISOString();
      if (f === "long") return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      return d.toLocaleDateString("en-US");
    },
  },
  {
    name: "ADD_DAYS",
    category: "date",
    signature: "ADD_DAYS(date, days)",
    description: "Add days to a date.",
    example: "ADD_DAYS(TODAY(), 30)",
    minArgs: 2,
    maxArgs: 2,
    fn: (a, days) => {
      const d = new Date(asString(a));
      if (Number.isNaN(d.getTime())) return null;
      d.setDate(d.getDate() + asNumber(days));
      return d.toISOString().slice(0, 10);
    },
  },
  {
    name: "COUNT",
    category: "list",
    signature: "COUNT(list)",
    description: "Count items in an array.",
    example: "COUNT({{leases.items}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => (Array.isArray(a) ? a.length : 0),
  },
  {
    name: "FIRST",
    category: "list",
    signature: "FIRST(list)",
    description: "Return the first item in an array.",
    example: "FIRST({{leases.items}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => (Array.isArray(a) && a.length > 0 ? a[0] : null),
  },
  {
    name: "LAST",
    category: "list",
    signature: "LAST(list)",
    description: "Return the last item in an array.",
    example: "LAST({{leases.items}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => (Array.isArray(a) && a.length > 0 ? a[a.length - 1] : null),
  },
  {
    name: "TO_NUMBER",
    category: "type",
    signature: "TO_NUMBER(value)",
    description: "Cast a value to a number.",
    example: "TO_NUMBER({{trigger.rent}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => asNumber(a),
  },
  {
    name: "TO_TEXT",
    category: "type",
    signature: "TO_TEXT(value)",
    description: "Cast a value to text.",
    example: "TO_TEXT({{trigger.unit_id}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => asString(a),
  },
  {
    name: "IS_BLANK",
    category: "type",
    signature: "IS_BLANK(value)",
    description: "Return true if value is null or empty.",
    example: "IS_BLANK({{trigger.email}})",
    minArgs: 1,
    maxArgs: 1,
    fn: (a) => a == null || asString(a).trim() === "",
  },
];

const FUNC_BY_NAME = new Map(FORMULA_FUNCTIONS.map((f) => [f.name.toUpperCase(), f]));

export const WORKFLOW_PROPERTY_FIELDS = [
  { name: "id", type: "string" as const, sample: "wf-abc123", description: "Unique workflow ID" },
  { name: "name", type: "string" as const, sample: "Renewal thank-you email", description: "Workflow display name" },
  { name: "description", type: "string" as const, sample: "Sends thank-you when lease is renewed", description: "Workflow description" },
];

export const ERROR_PROPERTY_FIELDS = [
  { name: "message", type: "string" as const, sample: "Connection timeout after 30000ms", description: "Human-readable error message" },
  { name: "code", type: "string" as const, sample: "TIMEOUT", description: "Machine-readable error code" },
  { name: "step_id", type: "string" as const, sample: "action-2", description: "ID of the step that failed" },
  { name: "step_label", type: "string" as const, sample: "Send Email", description: "Label of the step that failed" },
  { name: "timestamp", type: "string" as const, sample: "2026-07-14T15:00:00Z", description: "When the error occurred" },
  { name: "retry_count", type: "number" as const, sample: "2", description: "Number of retries attempted" },
];

/** Resolve a dotted path like "trigger.email" or "workflow.name" from context. */
export function resolvePath(ctx: FormulaContext, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Replace {{path}} pills with resolved values (stringified if embedded in text). */
export function resolvePills(template: string, ctx: FormulaContext): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path: string) => {
    const val = resolvePath(ctx, path.trim());
    if (val == null) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "pill"; value: string }
  | { kind: "op"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (expr.slice(i, i + 2) === "{{") {
      const end = expr.indexOf("}}", i + 2);
      if (end === -1) throw new Error("Unclosed data pill {{");
      tokens.push({ kind: "pill", value: expr.slice(i + 2, end).trim() });
      i = end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let s = "";
      while (j < expr.length && expr[j] !== quote) {
        if (expr[j] === "\\" && j + 1 < expr.length) { s += expr[j + 1]; j += 2; continue; }
        s += expr[j]; j++;
      }
      if (j >= expr.length) throw new Error("Unclosed string literal");
      tokens.push({ kind: "string", value: s });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      tokens.push({ kind: "number", value: Number(expr.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) j++;
      tokens.push({ kind: "ident", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === "(") { tokens.push({ kind: "lparen" }); i++; continue; }
    if (ch === ")") { tokens.push({ kind: "rparen" }); i++; continue; }
    if (ch === ",") { tokens.push({ kind: "comma" }); i++; continue; }
    if ("+-*/%<>=!".includes(ch)) {
      let op = ch;
      if (ch === "=" && expr[i + 1] === "=") {
        op = expr[i + 2] === "=" ? "===" : "==";
        i += op.length;
      } else if (ch === "!" && expr[i + 1] === "=") {
        op = expr[i + 2] === "=" ? "!==" : "!=";
        i += op.length;
      } else if ((ch === "<" || ch === ">") && expr[i + 1] === "=") {
        op += "=";
        i += 2;
      } else {
        i++;
      }
      if (op === "=") op = "==";
      tokens.push({ kind: "op", value: op });
      continue;
    }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[], private ctx: FormulaContext) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private next(): Token {
    const t = this.tokens[this.pos++];
    if (!t) throw new Error("Unexpected end of expression");
    return t;
  }
  private expect(kind: Token["kind"], value?: string): Token {
    const t = this.next();
    if (t.kind !== kind || (value !== undefined && (t as { value?: string }).value !== value)) {
      throw new Error(`Expected ${kind}${value ? ` ${value}` : ""}`);
    }
    return t;
  }

  parse(): unknown {
    const v = this.parseOr();
    if (this.pos < this.tokens.length) throw new Error("Unexpected tokens after expression");
    return v;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.peek()?.kind === "ident" && (this.peek() as { value: string }).value.toUpperCase() === "OR") {
      this.next();
      const right = this.parseAnd();
      left = asBool(left) || asBool(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseComparison();
    while (this.peek()?.kind === "ident" && (this.peek() as { value: string }).value.toUpperCase() === "AND") {
      this.next();
      const right = this.parseComparison();
      left = asBool(left) && asBool(right);
    }
    return left;
  }

  private parseComparison(): unknown {
    let left = this.parseAdd();
    const op = this.peek();
    if (op?.kind === "op" && ["==", "===", "!=", "!==", "<=", ">=", "<", ">"].includes(op.value)) {
      this.next();
      const right = this.parseAdd();
      switch (op.value) {
        case "==":
        case "===": return left == right; // eslint-disable-line eqeqeq
        case "!=":
        case "!==": return left != right; // eslint-disable-line eqeqeq
        case "<": return asNumber(left) < asNumber(right);
        case ">": return asNumber(left) > asNumber(right);
        case "<=": return asNumber(left) <= asNumber(right);
        case ">=": return asNumber(left) >= asNumber(right);
      }
    }
    return left;
  }

  private parseAdd(): unknown {
    let left = this.parseMul();
    while (this.peek()?.kind === "op" && ["+", "-"].includes((this.peek() as { value: string }).value)) {
      const op = (this.next() as { value: string }).value;
      const right = this.parseMul();
      if (op === "+") {
        if (typeof left === "string" || typeof right === "string") left = asString(left) + asString(right);
        else left = asNumber(left) + asNumber(right);
      } else {
        left = asNumber(left) - asNumber(right);
      }
    }
    return left;
  }

  private parseMul(): unknown {
    let left = this.parseUnary();
    while (this.peek()?.kind === "op" && ["*", "/", "%"].includes((this.peek() as { value: string }).value)) {
      const op = (this.next() as { value: string }).value;
      const right = this.parseUnary();
      if (op === "*") left = asNumber(left) * asNumber(right);
      else if (op === "/") left = asNumber(right) === 0 ? null : asNumber(left) / asNumber(right);
      else left = asNumber(left) % asNumber(right);
    }
    return left;
  }

  private parseUnary(): unknown {
    if (this.peek()?.kind === "op" && (this.peek() as { value: string }).value === "-") {
      this.next();
      return -asNumber(this.parseUnary());
    }
    if (this.peek()?.kind === "ident" && (this.peek() as { value: string }).value.toUpperCase() === "NOT") {
      this.next();
      return !asBool(this.parseUnary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of expression");

    if (t.kind === "number") { this.next(); return t.value; }
    if (t.kind === "string") { this.next(); return t.value; }
    if (t.kind === "pill") { this.next(); return resolvePath(this.ctx, t.value); }

    if (t.kind === "ident") {
      const name = t.value;
      this.next();
      if (name.toUpperCase() === "TRUE") return true;
      if (name.toUpperCase() === "FALSE") return false;
      if (name.toUpperCase() === "NULL") return null;

      if (this.peek()?.kind === "lparen") {
        this.next();
        const args: unknown[] = [];
        if (this.peek()?.kind !== "rparen") {
          args.push(this.parseOr());
          while (this.peek()?.kind === "comma") {
            this.next();
            args.push(this.parseOr());
          }
        }
        this.expect("rparen");
        const fn = FUNC_BY_NAME.get(name.toUpperCase());
        if (!fn) throw new Error(`Unknown function: ${name}`);
        if (args.length < fn.minArgs || args.length > fn.maxArgs) {
          throw new Error(`${fn.name} expects ${fn.minArgs}${fn.maxArgs !== fn.minArgs ? `–${fn.maxArgs}` : ""} args, got ${args.length}`);
        }
        return fn.fn(...args);
      }
      // bare identifier — treat as context path if present
      return resolvePath(this.ctx, name);
    }

    if (t.kind === "lparen") {
      this.next();
      const v = this.parseOr();
      this.expect("rparen");
      return v;
    }

    throw new Error(`Unexpected token: ${t.kind}`);
  }
}

export type EvaluateResult = {
  ok: boolean;
  value?: unknown;
  error?: string;
};

/**
 * Evaluate a formula or template string against a context.
 * - If the expression looks like a formula (contains a function call or operators),
 *   it is parsed and evaluated.
 * - Otherwise, data pills are resolved as template substitution.
 */
export function evaluateFormula(expression: string, ctx: FormulaContext): EvaluateResult {
  const expr = expression.trim();
  if (!expr) return { ok: true, value: "" };

  // Pure pill shortcut
  const purePill = expr.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (purePill) {
    return { ok: true, value: resolvePath(ctx, purePill[1].trim()) ?? "" };
  }

  const looksLikeFormula =
    /[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(expr) ||
    /[+\-*/%<>=!]/.test(expr.replace(/\{\{[^}]+\}\}/g, "").replace(/"[^"]*"|'[^']*'/g, ""));

  if (!looksLikeFormula) {
    return { ok: true, value: resolvePills(expr, ctx) };
  }

  try {
    // Resolve nested pills inside strings first by leaving them as tokens;
    // Parser handles {{path}} tokens natively.
    const tokens = tokenize(expr);
    const parser = new Parser(tokens, ctx);
    return { ok: true, value: parser.parse() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Build a formula context from workflow metadata + step outputs + optional error. */
export function buildFormulaContext(opts: {
  workflowId: string;
  workflowName: string;
  workflowDescription?: string;
  stepOutputs?: Record<string, Record<string, unknown>>;
  triggerPayload?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    step_id?: string;
    step_label?: string;
    timestamp?: string;
    retry_count?: number;
  };
}): FormulaContext {
  const ctx: FormulaContext = {
    workflow: {
      id: opts.workflowId,
      name: opts.workflowName,
      description: opts.workflowDescription ?? "",
    },
  };
  if (opts.triggerPayload) {
    ctx.trigger = opts.triggerPayload;
  }
  if (opts.stepOutputs) {
    for (const [id, out] of Object.entries(opts.stepOutputs)) {
      ctx[id] = out;
    }
  }
  if (opts.error) {
    ctx.error = {
      message: opts.error.message,
      code: opts.error.code ?? "ERROR",
      step_id: opts.error.step_id ?? "",
      step_label: opts.error.step_label ?? "",
      timestamp: opts.error.timestamp ?? new Date().toISOString(),
      retry_count: opts.error.retry_count ?? 0,
    };
  }
  return ctx;
}
