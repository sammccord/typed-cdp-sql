/**
 * typed-cdp-sql — Pure TypeScript type-level SQL inference for the CDP Data API.
 *
 * @example
 * ```ts
 * import type { TypedQuery } from 'typed-cdp-sql';
 *
 * type Result = TypedQuery<"SELECT block_number, block_hash FROM base.blocks LIMIT 10">;
 * // { result: Array<{ block_number: `${number}`; block_hash: `0x${string}` }> }
 * ```
 */

import type { Normalize } from './normalize';
import type { ExtractTableName, ExtractJoinedTableName, HasJoin } from './parse-from';
import type { TableSchemas } from './schema';
import type { ExtractSelectList, IsSelectStar, ParseSelectItems, SelectItem } from './parse-select';
import type { ResolveRow, FullRow, MergeSchemas } from './resolve';

/**
 * Infer the result type of a CDP Data API SQL query at compile time.
 *
 * - Supports SELECT with specific columns, *, aliases, map indexing, CAST, and aggregates.
 * - Unparseable queries gracefully degrade to `{ result: Array<Record<string, unknown>> }`.
 * - Case-insensitive SQL keywords.
 */
export type TypedQuery<SQL extends string> = {
  result: Array<InferRow<Normalize<SQL>>>;
};

/** Internal: full inference pipeline on a normalized (lowercased, trimmed) SQL string */
type InferRow<S extends string> =
  // Guard against never (no FROM clause found)
  [ExtractTableName<S>] extends [never]
    ? Record<string, unknown>
    // Check table name is a known CDP table
    : ExtractTableName<S> extends infer TableName extends keyof TableSchemas
      ? ResolveSchema<S, TableName> extends infer Schema
        // Extract SELECT list
        ? [ExtractSelectList<S>] extends [never]
          ? Record<string, unknown>
          : ExtractSelectList<S> extends infer SelectList extends string
            // Check for SELECT *
            ? IsSelectStar<SelectList> extends true
              ? FullRow<Schema>
              // Parse individual select items
              : ParseSelectItems<SelectList> extends infer Items extends readonly SelectItem[]
                // Resolve each item against schema
                ? ResolveRow<Items, Schema>
                : Record<string, unknown>
            : Record<string, unknown>
        : Record<string, unknown>
      // Unknown table — fallback
      : Record<string, unknown>;

/**
 * Resolve the effective schema for a query.
 * For simple queries, returns the single table's schema.
 * For JOINs, merges the schemas of both tables.
 */
type ResolveSchema<S extends string, TableName extends keyof TableSchemas> =
  HasJoin<S> extends true
    ? ExtractJoinedTableName<S> extends infer JoinedName extends keyof TableSchemas
      ? MergeSchemas<TableSchemas[TableName], TableSchemas[JoinedName]>
      : TableSchemas[TableName]
    : TableSchemas[TableName];

// Re-export schema types for advanced consumers
export type { TableSchemas, BlocksSchema, EventsSchema, TransactionsSchema, EncodedLogsSchema, TransfersSchema } from './schema';
