/**
 * Assemble the final row type from parsed SELECT items and a resolved table schema.
 */

import type { MapSqlType } from './sql-types';
import type { ResolveExpression } from './parse-expressions';
import type { SelectItem } from './parse-select';

/** Flatten an intersection into a clean object type for IDE display */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Build a row type from a tuple of SelectItems resolved against a Schema.
 * Produces an intersection of { [alias]: ResolvedType } for each item.
 */
export type ResolveRow<
  Items extends readonly SelectItem[],
  Schema
> = Prettify<UnionToIntersection<ResolveRowUnion<Items, Schema>>>;

/** Convert the tuple of items into a union of single-key objects */
type ResolveRowUnion<Items extends readonly SelectItem[], Schema> =
  Items extends readonly [infer First extends SelectItem, ...infer Rest extends SelectItem[]]
    ? { [K in First['alias']]: ResolveExpression<First['expr'], Schema> } | ResolveRowUnion<Rest, Schema>
    : never;

/** Convert a union to an intersection: A | B → A & B */
type UnionToIntersection<U> =
  (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Full row type for SELECT * — maps every column in the schema through MapSqlType.
 */
export type FullRow<Schema> = Prettify<{
  [K in keyof Schema]: MapSqlType<Lowercase<Schema[K] & string>>;
}>;

/**
 * Merge two table schemas for JOIN queries.
 * Columns from both tables become available. For overlapping column names,
 * the type is the union of both (in practice, shared columns like block_number
 * have the same type in both tables).
 */
export type MergeSchemas<A, B> = {
  [K in keyof A | keyof B]:
    K extends keyof A
      ? K extends keyof B
        ? A[K] | B[K]
        : A[K]
      : K extends keyof B
        ? B[K]
        : never;
};
