/**
 * typed-cdp-sql — TypeScript type inference and query builder for CDP Data API SQL.
 *
 * Compile-time type inference:
 * ```ts
 * import type { TypedQuery } from 'typed-cdp-sql';
 * type Result = TypedQuery<"SELECT block_number FROM base.blocks LIMIT 10">;
 * ```
 *
 * Runtime query builder:
 * ```ts
 * import { cdp } from 'typed-cdp-sql';
 * const q = cdp.selectFrom('base.events').select(['address']).compile();
 * ```
 */
export * from './src/index';
