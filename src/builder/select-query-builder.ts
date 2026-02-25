/**
 * SelectQueryBuilder — fluent, immutable query builder for CDP SQL.
 *
 * Each method returns a new builder instance with updated AST and generic
 * type parameters. The output type O accumulates through .select() calls.
 */

import type { AstNode, SelectQueryNode, CteNode, JoinNode, OrderByItemNode, TableNode } from './ast'
import { ExpressionBuilder } from './expression-builder'
import {
  Expr,
  AliasedExpr,
  CompiledQuery,
  type Simplify,
  type AnyColumn,
  type MergedColumns,
  type SelectionResult,
  type SelectionsResult,
  type UnpackAliased,
  type Nullable,
  type ComparisonOperator,
  type ParseTableAlias,
  type SelectArg,
} from './types'
import type { CdpDatabase } from './schema'
import type { Abi } from './abi-types'
import { compileQuery } from './compiler'

/**
 * Core query builder. Generic parameters:
 * - DB: database schema (CdpDatabase + any CTE virtual tables)
 * - TB: union of table names currently in scope (FROM + JOINs)
 * - O: output row type (accumulated via .select() intersections)
 * - ABI: user-provided ABI for event parameter type inference
 * - Sig: narrowed event signature (from where('event_signature', '=', ...))
 */
export class SelectQueryBuilder<
  DB,
  TB extends keyof DB,
  O = {},
  ABI extends Abi = readonly [],
  Sig extends string = string,
> {
  readonly #node: SelectQueryNode

  constructor(node: SelectQueryNode) {
    this.#node = node
  }

  // ── SELECT ───────────────────────────────────────────────────────────────

  /** Select a single column by name, with optional alias or table qualifier */
  select<C extends SelectArg<DB, TB>>(
    column: C,
  ): SelectQueryBuilder<DB, TB, Simplify<O & SelectionResult<DB, TB, C>>, ABI, Sig>

  /** Select multiple columns by name */
  select<const C extends readonly SelectArg<DB, TB>[]>(
    columns: C,
  ): SelectQueryBuilder<DB, TB, Simplify<O & SelectionsResult<DB, TB, C>>, ABI, Sig>

  /** Select expressions via expression builder callback */
  select<const Selections extends readonly AliasedExpr<any, any>[]>(
    callback: (eb: ExpressionBuilder<DB, TB, ABI, Sig>) => [...Selections],
  ): SelectQueryBuilder<DB, TB, Simplify<O & UnpackAliased<Selections>>, ABI, Sig>

  /** Select a pre-built aliased expression */
  select<T, A extends string>(
    expr: AliasedExpr<T, A>,
  ): SelectQueryBuilder<DB, TB, Simplify<O & { [K in A]: T }>, ABI, Sig>

  select(
    arg:
      | string
      | readonly string[]
      | AliasedExpr<any, any>
      | ((eb: ExpressionBuilder<DB, TB, ABI, Sig>) => readonly AliasedExpr<any, any>[]),
  ): SelectQueryBuilder<DB, TB, any, ABI, Sig> {
    let newSelections: AstNode[]

    if (typeof arg === 'function') {
      const eb = new ExpressionBuilder<DB, TB, ABI, Sig>()
      const exprs = arg(eb)
      newSelections = exprs.map((e) => e.node)
    } else if (arg instanceof AliasedExpr) {
      newSelections = [arg.node]
    } else if (Array.isArray(arg)) {
      newSelections = (arg as string[]).map(parseColumnRef)
    } else {
      newSelections = [parseColumnRef(arg as string)]
    }

    return new SelectQueryBuilder({
      ...this.#node,
      selections: [...this.#node.selections, ...newSelections],
    })
  }

  /** Select all columns from the current table(s) */
  selectAll(): SelectQueryBuilder<DB, TB, MergedColumns<DB, TB>, ABI, Sig> {
    return new SelectQueryBuilder({
      ...this.#node,
      selections: [{ kind: 'Star' }],
    })
  }

  // ── DISTINCT ─────────────────────────────────────────────────────────────

  distinct(): SelectQueryBuilder<DB, TB, O, ABI, Sig> {
    return new SelectQueryBuilder({
      ...this.#node,
      distinct: true,
    })
  }

  // ── WHERE ────────────────────────────────────────────────────────────────

  /** WHERE event_signature = '...' — narrows the Sig type parameter for ABI inference */
  where<S extends string>(
    column: 'event_signature',
    op: '=',
    value: S,
  ): SelectQueryBuilder<DB, TB, O, ABI, S>

  /** Add a WHERE condition (column op value) — multiple calls are ANDed */
  where(
    column: AnyColumn<DB, TB> & string,
    op: ComparisonOperator,
    value: string | number | boolean | null,
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig>

  /** Add a WHERE condition via expression builder callback */
  where(
    callback: (eb: ExpressionBuilder<DB, TB, ABI, Sig>) => Expr<any>,
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig>

  where(
    arg: string | ((eb: ExpressionBuilder<DB, TB, ABI, Sig>) => Expr<any>),
    op?: ComparisonOperator,
    value?: string | number | boolean | null,
  ): SelectQueryBuilder<DB, TB, O, ABI, any> {
    let condition: AstNode

    if (typeof arg === 'function') {
      const eb = new ExpressionBuilder<DB, TB, ABI, Sig>()
      condition = arg(eb).node
    } else {
      condition = {
        kind: 'BinaryOp',
        left: parseColumnRef(arg),
        op: op!,
        right: { kind: 'Value', value: value! },
      }
    }

    return new SelectQueryBuilder({
      ...this.#node,
      where: [...this.#node.where, condition],
    })
  }

  // ── JOIN ─────────────────────────────────────────────────────────────────

  /** INNER JOIN another table */
  innerJoin<T2 extends keyof DB & string>(
    table: T2,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<DB, TB | T2, O, ABI, Sig>
  innerJoin<
    T2 extends keyof DB & string,
    A extends string,
  >(
    tableWithAlias: `${T2} as ${A}`,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<DB & { [K in A]: DB[T2] }, TB | A, O, ABI, Sig>
  innerJoin(
    table: string,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<any, any, any, ABI, Sig> {
    return this.#addJoin('INNER', table, leftCol, op, rightCol)
  }

  /** LEFT JOIN another table */
  leftJoin<T2 extends keyof DB & string>(
    table: T2,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<DB, TB | T2, O, ABI, Sig>
  leftJoin<
    T2 extends keyof DB & string,
    A extends string,
  >(
    tableWithAlias: `${T2} as ${A}`,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<DB & { [K in A]: Nullable<DB[T2]> }, TB | A, O, ABI, Sig>
  leftJoin(
    table: string,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<any, any, any, ABI, Sig> {
    return this.#addJoin('LEFT', table, leftCol, op, rightCol)
  }

  /** RIGHT JOIN another table */
  rightJoin<T2 extends keyof DB & string>(
    table: T2,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<DB, TB | T2, O, ABI, Sig> {
    return this.#addJoin('RIGHT', table, leftCol, op, rightCol) as any
  }

  /** FULL JOIN another table */
  fullJoin<T2 extends keyof DB & string>(
    table: T2,
    leftCol: string,
    op: ComparisonOperator,
    rightCol: string,
  ): SelectQueryBuilder<DB, TB | T2, O, ABI, Sig> {
    return this.#addJoin('FULL', table, leftCol, op, rightCol) as any
  }

  #addJoin(
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS',
    tableStr: string,
    leftCol: string,
    op: string,
    rightCol: string,
  ): SelectQueryBuilder<any, any, any, ABI, Sig> {
    const { name, alias } = parseTableRef(tableStr)
    const joinNode: JoinNode = {
      kind: 'Join',
      type,
      table: { kind: 'Table', name, alias: alias !== name ? alias : undefined },
      on: {
        kind: 'BinaryOp',
        left: parseColumnRef(leftCol),
        op,
        right: parseColumnRef(rightCol),
      },
    }
    return new SelectQueryBuilder({
      ...this.#node,
      joins: [...this.#node.joins, joinNode],
    })
  }

  // ── GROUP BY ─────────────────────────────────────────────────────────────

  /** Group by column name(s) */
  groupBy(
    column: AnyColumn<DB, TB> & string,
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig>
  groupBy(
    columns: (AnyColumn<DB, TB> & string)[],
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig>
  /** Group by expression(s) via callback */
  groupBy(
    callback: (eb: ExpressionBuilder<DB, TB, ABI, Sig>) => Expr<any> | Expr<any>[],
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig>
  groupBy(
    arg: string | string[] | ((eb: ExpressionBuilder<DB, TB, ABI, Sig>) => Expr<any> | Expr<any>[]),
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig> {
    let nodes: AstNode[]

    if (typeof arg === 'function') {
      const eb = new ExpressionBuilder<DB, TB, ABI, Sig>()
      const result = arg(eb)
      nodes = Array.isArray(result) ? result.map((e) => e.node) : [result.node]
    } else if (Array.isArray(arg)) {
      nodes = arg.map(parseColumnRef)
    } else {
      nodes = [parseColumnRef(arg)]
    }

    return new SelectQueryBuilder({
      ...this.#node,
      groupBy: [...this.#node.groupBy, ...nodes],
    })
  }

  // ── HAVING ───────────────────────────────────────────────────────────────

  having(
    column: string,
    op: ComparisonOperator,
    value: string | number | boolean | null,
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig>
  having(
    callback: (eb: ExpressionBuilder<DB, TB, ABI, Sig>) => Expr<any>,
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig>
  having(
    arg: string | ((eb: ExpressionBuilder<DB, TB, ABI, Sig>) => Expr<any>),
    op?: ComparisonOperator,
    value?: string | number | boolean | null,
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig> {
    let condition: AstNode

    if (typeof arg === 'function') {
      const eb = new ExpressionBuilder<DB, TB, ABI, Sig>()
      condition = arg(eb).node
    } else {
      condition = {
        kind: 'BinaryOp',
        left: parseColumnRef(arg),
        op: op!,
        right: { kind: 'Value', value: value! },
      }
    }

    return new SelectQueryBuilder({
      ...this.#node,
      having: [...this.#node.having, condition],
    })
  }

  // ── ORDER BY ─────────────────────────────────────────────────────────────

  orderBy(
    column: AnyColumn<DB, TB> & string,
    direction?: 'asc' | 'desc' | 'ASC' | 'DESC',
  ): SelectQueryBuilder<DB, TB, O, ABI, Sig> {
    const item: OrderByItemNode = {
      kind: 'OrderByItem',
      expr: parseColumnRef(column),
      direction: direction?.toUpperCase() as 'ASC' | 'DESC' | undefined,
    }
    return new SelectQueryBuilder({
      ...this.#node,
      orderBy: [...this.#node.orderBy, item],
    })
  }

  // ── LIMIT ────────────────────────────────────────────────────────────────

  limit(count: number): SelectQueryBuilder<DB, TB, O, ABI, Sig> {
    return new SelectQueryBuilder({
      ...this.#node,
      limit: count,
    })
  }

  // ── COMPILE ──────────────────────────────────────────────────────────────

  /** Compile the query to a SQL string with phantom result type */
  compile(): CompiledQuery<O> {
    return new CompiledQuery<O>(compileQuery(this.#node))
  }

  /** Access the underlying AST node (for CTE composition) */
  get $node(): SelectQueryNode {
    return this.#node
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create an empty SelectQueryNode for a given table */
export function createSelectNode(table: string): SelectQueryNode {
  const { name, alias } = parseTableRef(table)
  return {
    kind: 'SelectQuery',
    ctes: [],
    distinct: false,
    selections: [],
    from: { kind: 'Table', name, alias: alias !== name ? alias : undefined },
    joins: [],
    where: [],
    groupBy: [],
    having: [],
    orderBy: [],
  }
}

/** Parse "table as alias" or "table" into name/alias */
function parseTableRef(str: string): { name: string; alias: string } {
  const match = str.match(/^(.+?)\s+as\s+(.+)$/i)
  if (match) return { name: match[1]!.trim(), alias: match[2]!.trim() }
  return { name: str.trim(), alias: str.trim() }
}

/**
 * Parse a column reference string into an AST node.
 * Handles: "col", "table.col", "col as alias", "table.col as alias"
 */
function parseColumnRef(str: string): AstNode {
  // Check for "expr as alias"
  const aliasMatch = str.match(/^(.+?)\s+as\s+(.+)$/i)
  if (aliasMatch) {
    return {
      kind: 'Alias',
      expr: parseColumnRef(aliasMatch[1]!.trim()),
      alias: aliasMatch[2]!.trim(),
    }
  }

  // Check for "table.col"
  const dotIdx = str.indexOf('.')
  if (dotIdx > 0) {
    return {
      kind: 'Column',
      table: str.slice(0, dotIdx),
      name: str.slice(dotIdx + 1),
    }
  }

  return { kind: 'Column', name: str }
}
