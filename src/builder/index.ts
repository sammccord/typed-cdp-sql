/**
 * typed-cdp-sql query builder — runtime SQL construction with type inference.
 *
 * @example
 * ```ts
 * import { cdp } from 'typed-cdp-sql/builder'
 *
 * const query = cdp
 *   .selectFrom('base.events')
 *   .select(['address', 'event_name'])
 *   .where('address', '=', '0x...')
 *   .limit(10)
 *   .compile()
 *
 * query.sql // "SELECT address, event_name FROM base.events WHERE address = '0x...' LIMIT 10"
 * // typeof query.$infer.result = Array<{ address: `0x${string}`, event_name: string }>
 * ```
 */

export { cdp, CdpQueryCreator, makeCdpQueryCreator } from './cdp'
export { SelectQueryBuilder } from './select-query-builder'
export { ExpressionBuilder } from './expression-builder'
export { Expr, AliasedExpr, CompiledQuery } from './types'
export type {
  InferResult,
  InferRow,
  ComparisonOperator,
  Simplify,
  MapValueType,
  CastType,
  AnyColumn,
  MergedColumns,
  SelectionResult,
  SelectionsResult,
  UnpackAliased,
  Nullable,
  ParseTableAlias,
} from './types'
export type { CdpDatabase, CdpTableName, MapSchema } from './schema'
export type { AstNode, SelectQueryNode } from './ast'
export type {
  Abi,
  AbiEvent,
  AbiEventParameter,
  AbiItem,
  CdpEventSignature,
  SolidityTypeToCdp,
  FindEventBySignature,
  EventParamType,
  AllCdpEventSignatures,
  ResolveMapType,
} from './abi-types'
