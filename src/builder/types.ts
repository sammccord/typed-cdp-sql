/**
 * Shared type definitions for the CDP SQL query builder.
 */

import type { AstNode, AliasNode } from './ast'
import type { MapSqlType } from '../sql-types'

// ── Expr wrapper ─────────────────────────────────────────────────────────────

/** Runtime expression wrapper carrying an AST node and a phantom type */
export class Expr<T> {
  declare readonly $type: T
  readonly node: AstNode

  constructor(node: AstNode) {
    this.node = node
  }

  /** Alias this expression for use in select() callbacks */
  as<A extends string>(alias: A): AliasedExpr<T, A> {
    return new AliasedExpr<T, A>(
      { kind: 'Alias', expr: this.node, alias } as AliasNode,
      alias,
    )
  }
}

/** An expression that has been aliased via .as() */
export class AliasedExpr<T, A extends string> {
  declare readonly $type: T
  declare readonly $alias: A
  readonly node: AliasNode
  readonly alias: A

  constructor(node: AliasNode, alias: A) {
    this.node = node
    this.alias = alias
  }
}

// ── CompiledQuery ────────────────────────────────────────────────────────────

/** A compiled query with its SQL string and phantom result type */
export class CompiledQuery<O> {
  readonly sql: string
  declare readonly $infer: { result: Simplify<O>[] }

  constructor(sql: string) {
    this.sql = sql
  }
}

/** Extract the full response type from a compiled query: `InferResult<typeof q>` → `{ result: Row[] }` */
export type InferResult<Q extends CompiledQuery<any>> = Q['$infer']

/** Extract a single row type from a compiled query: `InferRow<typeof q>` */
export type InferRow<Q extends CompiledQuery<any>> = Q['$infer']['result'][number]

// ── Operators ────────────────────────────────────────────────────────────────

export type ComparisonOperator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '>'
  | '<='
  | '>='
  | 'LIKE'
  | 'like'
  | 'IN'
  | 'in'
  | 'NOT IN'
  | 'not in'
  | 'BETWEEN'
  | 'between'
  | 'IS'
  | 'is'
  | 'IS NOT'
  | 'is not'

// ── Select argument types ────────────────────────────────────────────────────

/**
 * Valid string arguments to select().
 * Accepts: 'col', 'col as alias', 'table.col', 'table.col as alias'
 */
export type SelectArg<DB, TB extends keyof DB> =
  | AnyColumn<DB, TB>
  | `${AnyColumn<DB, TB>} as ${string}`
  | `${TB & string}.${string}`
  | `${TB & string}.${string} as ${string}`
  | (string & {}) // allow arbitrary strings with lower priority

// ── Type utilities ───────────────────────────────────────────────────────────

/** Flatten complex intersection types for cleaner IDE display */
export type Simplify<T> = { [K in keyof T]: T[K] } & {}

/** Extract the value type of a Record/Map column */
export type MapValueType<T> = T extends Record<string, infer V> ? V : unknown

/** Make all properties of T nullable (for LEFT JOIN) */
export type Nullable<T> = { [K in keyof T]: T[K] | null }

/** Union of all column names across tables in scope */
export type AnyColumn<DB, TB extends keyof DB> = TB extends TB
  ? keyof DB[TB] & string
  : never

/** Merge column types from multiple tables in scope (for multi-table select) */
export type MergedColumns<DB, TB extends keyof DB> = {
  [K in AnyColumn<DB, TB>]: {
    [T in TB]: K extends keyof DB[T] ? DB[T][K] : never
  }[TB]
}

// ── Selection type inference ─────────────────────────────────────────────────

/** Distributive helper: extract { alias: type } from a single AliasedExpr */
type UnpackOne<E> = E extends AliasedExpr<infer V, infer A> ? { [K in A]: V } : never

/** Extract result type from an array of AliasedExpr */
export type UnpackAliased<T extends readonly AliasedExpr<any, any>[]> = Simplify<
  UnionToIntersection<UnpackOne<T[number]>>
>

/** Convert a union to an intersection */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never

/**
 * Resolve a simple column selection to its output type fragment.
 * Handles: 'col', 'col as alias', 'table.col', 'table.col as alias'
 */
export type SelectionResult<DB, TB extends keyof DB, S extends string> =
  // "col as alias"
  S extends `${infer Col} as ${infer Alias}`
    ? Col extends keyof MergedColumns<DB, TB>
      ? { [K in Alias]: MergedColumns<DB, TB>[Col] }
      : { [K in Alias]: unknown }
    // "table.col"
    : S extends `${infer T}.${infer Col}`
      ? T extends TB & string
        ? Col extends keyof DB[T] & string
          ? { [K in Col]: DB[T][Col] }
          : {}
        : {}
      // "col"
      : S extends keyof MergedColumns<DB, TB>
        ? { [K in S]: MergedColumns<DB, TB>[S] }
        : {}

/** Resolve an array of column selections */
export type SelectionsResult<DB, TB extends keyof DB, S extends readonly string[]> = Simplify<
  UnionToIntersection<
    S[number] extends infer E extends string ? SelectionResult<DB, TB, E> : never
  >
>

// ── Cast type resolution ─────────────────────────────────────────────────────

/** Resolve a cast target type string to its TS type via MapSqlType */
export type CastType<T extends string> = MapSqlType<Lowercase<T>>

// ── Table alias parsing ──────────────────────────────────────────────────────

/** Parse "base.events as e" → ['base.events', 'e'], or "base.events" → ['base.events', 'base.events'] */
export type ParseTableAlias<S extends string> =
  S extends `${infer Table} as ${infer Alias}`
    ? [Table, Alias]
    : [S, S]
