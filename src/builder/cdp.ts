/**
 * CdpQueryCreator — entry point for building CDP SQL queries.
 *
 * Provides selectFrom() for starting queries and with() for defining CTEs.
 * Accepts an optional ABI generic for event parameter type inference.
 */

import type { CteNode } from './ast'
import type { CdpDatabase, CdpTableName } from './schema'
import { SelectQueryBuilder, createSelectNode } from './select-query-builder'
import type { Simplify } from './types'
import type { Abi } from './abi-types'

/**
 * Query creator that tracks accumulated CTEs and expands the database
 * type as virtual tables are added via with().
 *
 * The ABI generic enables event parameter type inference when used with
 * createCdpQueryCreator({ abi: myAbi }).
 */
export class CdpQueryCreator<DB = CdpDatabase, ABI extends Abi = readonly []> {
  readonly #ctes: readonly CteNode[]

  constructor(ctes: readonly CteNode[] = []) {
    this.#ctes = ctes
  }

  /** Start a SELECT query from a CDP table or CTE */
  selectFrom<T extends keyof DB & string>(
    table: T,
  ): SelectQueryBuilder<DB, T, {}, ABI> {
    const node = createSelectNode(table)
    return new SelectQueryBuilder<DB, T, {}, ABI>({
      ...node,
      ctes: [...this.#ctes],
    })
  }

  /** Start a SELECT query from a table with an alias */
  selectFromAliased<
    T extends keyof DB & string,
    A extends string,
  >(
    table: T,
    alias: A,
  ): SelectQueryBuilder<DB & { [K in A]: DB[T] }, A, {}, ABI> {
    const node = createSelectNode(`${table} as ${alias}`)
    return new SelectQueryBuilder<DB & { [K in A]: DB[T] }, A, {}, ABI>({
      ...node,
      ctes: [...this.#ctes],
    })
  }

  /**
   * Define a CTE (Common Table Expression).
   *
   * The CTE's output type is extracted from the builder and injected as
   * a virtual table into the database type, making it available for
   * subsequent selectFrom() or with() calls.
   */
  with<N extends string, O>(
    name: N,
    callback: (qb: CdpQueryCreator<DB, ABI>) => SelectQueryBuilder<DB, any, O, ABI, any>,
  ): CdpQueryCreator<DB & { [K in N]: Simplify<O> }, ABI> {
    const innerQb = new CdpQueryCreator<DB, ABI>([])
    const builder = callback(innerQb)
    const cteNode: CteNode = {
      kind: 'Cte',
      name,
      query: {
        ...builder.$node,
        ctes: [], // CTEs are hoisted to the outer query
      },
    }
    return new CdpQueryCreator<DB & { [K in N]: Simplify<O> }, ABI>([
      ...this.#ctes,
      cteNode,
    ])
  }
}

/** Pre-configured CDP query creator singleton (no ABI) */
export const cdp: CdpQueryCreator<CdpDatabase> = new CdpQueryCreator()

/**
 * Create a CDP query creator with ABI-aware event parameter type inference.
 *
 * @example
 * ```ts
 * import erc20Abi from './erc20.abi.json'
 * const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
 *
 * const q = cdpWithAbi.selectFrom('base.events')
 *   .where('event_signature', '=', 'Transfer(address,address,uint256)')
 *   .select((eb) => [
 *     eb.map('parameters', 'from').as('sender'),  // `0x${string}` (address)
 *     eb.map('parameters', 'value').as('amount'),  // `${number}` (uint256)
 *   ])
 * ```
 */
export function makeCdpQueryCreator<const A extends Abi>(
  _options: { abi: A },
): CdpQueryCreator<CdpDatabase, A> {
  return new CdpQueryCreator<CdpDatabase, A>()
}
