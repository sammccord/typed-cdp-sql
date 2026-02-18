/**
 * Parse the FROM clause to extract the table name and resolve it to a schema.
 * Input is already normalized (lowercased, whitespace-collapsed).
 */

import type { Trim } from './utils';
import type { TableSchemas } from './schema';

/**
 * Extract the table name from a normalized SQL string.
 * Finds text after "from " and before the next SQL keyword or end of string.
 */
export type ExtractTableName<S extends string> =
  S extends `${string} from ${infer Rest}`
    ? StripAfterKeyword<Trim<Rest>>
    : never;

/** Strip everything from the first SQL keyword onward, leaving just the table name/alias */
type StripAfterKeyword<S extends string> =
  S extends `${infer T} where ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} group ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} order ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} limit ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} having ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} union ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} join ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} inner ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} left ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} right ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} full ${string}` ? StripAlias<Trim<T>> :
  S extends `${infer T} cross ${string}` ? StripAlias<Trim<T>> :
  StripAlias<Trim<S>>;

/** Strip a table alias: "base.blocks b" → "base.blocks" */
type StripAlias<S extends string> =
  S extends `${infer Table} ${string}` ? Table : S;

/** Resolve a table name to its schema type */
export type ResolveTable<Name extends string> =
  Name extends keyof TableSchemas
    ? TableSchemas[Name]
    : Record<string, unknown>;

/**
 * Extract the joined table name from a JOIN clause.
 * Finds text after "[type] join " and before " on " or the next keyword.
 * All JOIN variants (inner, left, right, full, cross) end with " join ".
 */
export type ExtractJoinedTableName<S extends string> =
  S extends `${string} join ${infer Rest}`
    ? Rest extends `${infer Table} on ${string}`
      ? StripAlias<Trim<Table>>
      : StripAfterKeyword<Trim<Rest>>
    : never;

/** Detect whether a normalized SQL string contains a JOIN */
export type HasJoin<S extends string> =
  S extends `${string} join ${string}` ? true : false;
