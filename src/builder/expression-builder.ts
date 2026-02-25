/**
 * ExpressionBuilder — utility for constructing typed expressions in select()
 * and where() callbacks.
 */

import type { AstNode } from './ast'
import { Expr, type MapValueType, type CastType, type AnyColumn, type MergedColumns } from './types'
import type { Abi, ResolveMapType } from './abi-types'

/**
 * Expression builder scoped to the current database and tables in scope.
 * ABI and Sig generics enable ABI-aware parameter type inference when
 * an event signature has been narrowed via where().
 */
export class ExpressionBuilder<
  DB,
  TB extends keyof DB,
  ABI extends Abi = readonly [],
  Sig extends string = string,
> {
  /** Reference a column by name */
  col<C extends AnyColumn<DB, TB>>(name: C): Expr<MergedColumns<DB, TB>[C]>
  /** Reference a table-qualified column */
  col<T extends TB & string, C extends keyof DB[T] & string>(table: T, col: C): Expr<DB[T][C]>
  col(...args: string[]): Expr<any> {
    if (args.length === 2) {
      return new Expr({ kind: 'Column', table: args[0]!, name: args[1]! })
    }
    return new Expr({ kind: 'Column', name: args[0]! })
  }

  /** Access a map column: `parameters['key']` — ABI-aware when event signature is narrowed */
  map<C extends AnyColumn<DB, TB>, K extends string>(
    column: C,
    key: K,
  ): Expr<ResolveMapType<MergedColumns<DB, TB>[C], ABI, Sig, K>> {
    return new Expr({
      kind: 'MapAccess',
      column: { kind: 'Column', name: column },
      key,
    })
  }

  /** Call a SQL function with explicit return type */
  fn<T = unknown>(name: string, args: (Expr<any> | string)[]): Expr<T> {
    return new Expr({
      kind: 'FunctionCall',
      name,
      args: args.map(toNode),
    })
  }

  /** COUNT aggregate — returns `${number}` */
  count(expr?: Expr<any> | string): Expr<`${number}`> {
    const arg = expr
      ? toNode(expr)
      : ({ kind: 'Star' } as const)
    return new Expr({
      kind: 'FunctionCall',
      name: 'count',
      args: [arg],
    })
  }

  /** SUM aggregate — returns `${number}` */
  sum(expr: Expr<any> | string): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'sum',
      args: [toNode(expr)],
    })
  }

  /** AVG aggregate — returns number */
  avg(expr: Expr<any> | string): Expr<number> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'avg',
      args: [toNode(expr)],
    })
  }

  /** MIN aggregate — preserves type */
  min<T>(expr: Expr<T>): Expr<T> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'min',
      args: [expr.node],
    })
  }

  /** MAX aggregate — preserves type */
  max<T>(expr: Expr<T>): Expr<T> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'max',
      args: [expr.node],
    })
  }

  /** argMax(val, ordering) — ClickHouse-specific, returns val type */
  argMax<T>(val: Expr<T>, ordering: Expr<any>): Expr<T> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'argMax',
      args: [val.node, ordering.node],
    })
  }

  /** argMin(val, ordering) — ClickHouse-specific, returns val type */
  argMin<T>(val: Expr<T>, ordering: Expr<any>): Expr<T> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'argMin',
      args: [val.node, ordering.node],
    })
  }

  /** COUNT(DISTINCT expr) — returns `${number}` */
  countDistinct(expr: Expr<any> | string): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'countDistinct',
      args: [toNode(expr)],
    })
  }

  /** any(expr) — returns an arbitrary value from the group */
  any<T>(expr: Expr<T>): Expr<T> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'any',
      args: [expr.node],
    })
  }

  /** groupArray(expr) — collects values into an array */
  groupArray<T>(expr: Expr<T>): Expr<T[]> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'groupArray',
      args: [expr.node],
    })
  }

  // ── Math functions ───────────────────────────────────────────────────────

  /** divide(a, b) — ClickHouse integer division */
  divide(left: Expr<any>, right: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'divide',
      args: [left.node, right.node],
    })
  }

  /** multiply(a, b) */
  multiply(left: Expr<any>, right: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'multiply',
      args: [left.node, right.node],
    })
  }

  /** plus(a, b) */
  plus(left: Expr<any>, right: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'plus',
      args: [left.node, right.node],
    })
  }

  /** minus(a, b) */
  minus(left: Expr<any>, right: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'minus',
      args: [left.node, right.node],
    })
  }

  /** modulo(a, b) */
  modulo(left: Expr<any>, right: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'modulo',
      args: [left.node, right.node],
    })
  }

  /** abs(expr) */
  abs(expr: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'abs',
      args: [expr.node],
    })
  }

  // ── String functions ─────────────────────────────────────────────────────

  /** lower(str) — convert to lowercase */
  lower(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'lower',
      args: [expr.node],
    })
  }

  /** upper(str) — convert to uppercase */
  upper(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'upper',
      args: [expr.node],
    })
  }

  /** concat(...args) — concatenate strings */
  concat(...args: Expr<any>[]): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'concat',
      args: args.map((a) => a.node),
    })
  }

  /** substring(str, offset, length?) — extract substring */
  substring(expr: Expr<any>, offset: Expr<any> | number, length?: Expr<any> | number): Expr<string> {
    const args = [expr.node, toNode(offset)]
    if (length !== undefined) args.push(toNode(length))
    return new Expr({
      kind: 'FunctionCall',
      name: 'substring',
      args,
    })
  }

  /** trim(str) — remove leading/trailing whitespace */
  trimStr(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'trim',
      args: [expr.node],
    })
  }

  /** length(str) — string length */
  strLength(expr: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'length',
      args: [expr.node],
    })
  }

  /** replaceAll(haystack, needle, replacement) — replace all occurrences */
  replaceAll(haystack: Expr<any>, needle: Expr<any> | string, replacement: Expr<any> | string): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'replaceAll',
      args: [haystack.node, toNode(needle), toNode(replacement)],
    })
  }

  /** splitByChar(separator, str) — split string by single character */
  splitByChar(separator: Expr<any> | string, str: Expr<any>): Expr<string[]> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'splitByChar',
      args: [toNode(separator), str.node],
    })
  }

  /** hex(expr) — convert to hexadecimal string */
  hex(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'hex',
      args: [expr.node],
    })
  }

  // ── Type conversion functions ────────────────────────────────────────────

  /** toUInt256(expr) */
  toUInt256(expr: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toUInt256',
      args: [expr.node],
    })
  }

  /** toUInt64(expr) */
  toUInt64(expr: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toUInt64',
      args: [expr.node],
    })
  }

  /** toInt256(expr) */
  toInt256(expr: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toInt256',
      args: [expr.node],
    })
  }

  /** toString(expr) */
  toStr(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toString',
      args: [expr.node],
    })
  }

  // ── Date/Time functions ──────────────────────────────────────────────────

  /** toStartOfHour(expr) */
  toStartOfHour(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toStartOfHour',
      args: [expr.node],
    })
  }

  /** toStartOfDay(expr) */
  toStartOfDay(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toStartOfDay',
      args: [expr.node],
    })
  }

  /** toStartOfMonth(expr) */
  toStartOfMonth(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toStartOfMonth',
      args: [expr.node],
    })
  }

  /** toDate(expr) */
  toDate(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toDate',
      args: [expr.node],
    })
  }

  /** toDateTime(expr) */
  toDateTime(expr: Expr<any>): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'toDateTime',
      args: [expr.node],
    })
  }

  /** now() — current timestamp */
  now(): Expr<string> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'now',
      args: [],
    })
  }

  /** dateDiff(unit, start, end) — difference between dates */
  dateDiff(unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year', start: Expr<any>, end: Expr<any>): Expr<`${number}`> {
    return new Expr({
      kind: 'FunctionCall',
      name: 'dateDiff',
      args: [{ kind: 'Value', value: unit }, start.node, end.node],
    })
  }

  /** CAST(expr AS type) — resolves return type via MapSqlType */
  cast<Target extends string>(
    expr: Expr<any>,
    targetType: Target,
  ): Expr<CastType<Target>> {
    return new Expr({
      kind: 'Cast',
      expr: expr.node,
      targetType,
      doubleColon: false,
    })
  }

  /** expr::type — double-colon cast syntax, resolves return type via MapSqlType */
  castAs<Target extends string>(
    expr: Expr<any>,
    targetType: Target,
  ): Expr<CastType<Target>> {
    return new Expr({
      kind: 'Cast',
      expr: expr.node,
      targetType,
      doubleColon: true,
    })
  }

  /** Literal value */
  val<T extends string | number | boolean | null>(value: T): Expr<T> {
    return new Expr({ kind: 'Value', value })
  }

  /** Raw SQL with explicit type — escape hatch for complex expressions */
  raw<T = unknown>(sql: string): Expr<T> {
    return new Expr({ kind: 'Raw', sql })
  }

  /** Array index access: expr[n] */
  index(expr: Expr<any>, n: number): Expr<unknown> {
    return new Expr({
      kind: 'ArrayIndex',
      array: expr.node,
      index: n,
    })
  }

  // ── Boolean combinators ──────────────────────────────────────────────────

  /** AND multiple conditions */
  and(...conditions: Expr<any>[]): Expr<boolean> {
    return new Expr({
      kind: 'And',
      conditions: conditions.map((c) => c.node),
    })
  }

  /** OR multiple conditions */
  or(...conditions: Expr<any>[]): Expr<boolean> {
    return new Expr({
      kind: 'Or',
      conditions: conditions.map((c) => c.node),
    })
  }

  /** NOT expr */
  not(expr: Expr<any>): Expr<boolean> {
    return new Expr({ kind: 'Not', expr: expr.node })
  }

  // ── Comparison helpers ───────────────────────────────────────────────────

  eq(left: Expr<any>, right: Expr<any> | string | number | boolean): Expr<boolean> {
    return new Expr({
      kind: 'BinaryOp',
      left: left.node,
      op: '=',
      right: toNode(right),
    })
  }

  neq(left: Expr<any>, right: Expr<any> | string | number | boolean): Expr<boolean> {
    return new Expr({
      kind: 'BinaryOp',
      left: left.node,
      op: '!=',
      right: toNode(right),
    })
  }

  gt(left: Expr<any>, right: Expr<any> | string | number | boolean): Expr<boolean> {
    return new Expr({
      kind: 'BinaryOp',
      left: left.node,
      op: '>',
      right: toNode(right),
    })
  }

  gte(left: Expr<any>, right: Expr<any> | string | number | boolean): Expr<boolean> {
    return new Expr({
      kind: 'BinaryOp',
      left: left.node,
      op: '>=',
      right: toNode(right),
    })
  }

  lt(left: Expr<any>, right: Expr<any> | string | number | boolean): Expr<boolean> {
    return new Expr({
      kind: 'BinaryOp',
      left: left.node,
      op: '<',
      right: toNode(right),
    })
  }

  lte(left: Expr<any>, right: Expr<any> | string | number | boolean): Expr<boolean> {
    return new Expr({
      kind: 'BinaryOp',
      left: left.node,
      op: '<=',
      right: toNode(right),
    })
  }

  isNull(expr: Expr<any>): Expr<boolean> {
    return new Expr({ kind: 'IsNull', expr: expr.node, negated: false })
  }

  isNotNull(expr: Expr<any>): Expr<boolean> {
    return new Expr({ kind: 'IsNull', expr: expr.node, negated: true })
  }

  between(expr: Expr<any>, low: Expr<any> | string | number, high: Expr<any> | string | number): Expr<boolean> {
    return new Expr({
      kind: 'Between',
      expr: expr.node,
      low: toNode(low),
      high: toNode(high),
    })
  }

  inList(expr: Expr<any>, values: (Expr<any> | string | number | boolean)[]): Expr<boolean> {
    return new Expr({
      kind: 'In',
      expr: expr.node,
      values: values.map(toNode),
      negated: false,
    })
  }

  notInList(expr: Expr<any>, values: (Expr<any> | string | number | boolean)[]): Expr<boolean> {
    return new Expr({
      kind: 'In',
      expr: expr.node,
      values: values.map(toNode),
      negated: true,
    })
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a string/number/boolean/Expr to an AST node */
function toNode(value: Expr<any> | string | number | boolean | null): AstNode {
  if (value instanceof Expr) return value.node
  if (typeof value === 'string') {
    // If it looks like a column reference (no spaces, no quotes), treat as column
    if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(value)) {
      const parts = value.split('.')
      if (parts.length === 2) {
        return { kind: 'Column', table: parts[0]!, name: parts[1]! }
      }
      return { kind: 'Column', name: value }
    }
    // Otherwise it's a string value (for things like '*')
    if (value === '*') {
      return { kind: 'Star' }
    }
    return { kind: 'Value', value }
  }
  return { kind: 'Value', value }
}
