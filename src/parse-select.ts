/**
 * Parse the SELECT clause into structured column items.
 * Input is already normalized (lowercased, whitespace-collapsed).
 */

import type { Trim, SplitByComma } from './utils';

/** A parsed select item: the raw expression and its output alias */
export type SelectItem = { expr: string; alias: string };

/**
 * Extract the raw SELECT list string (everything between SELECT and FROM).
 * Handles SELECT DISTINCT.
 */
export type ExtractSelectList<S extends string> =
  S extends `select distinct ${infer Cols} from ${string}` ? Trim<Cols> :
  S extends `select ${infer Cols} from ${string}` ? Trim<Cols> :
  never;

/** Check if the select list is just "*" */
export type IsSelectStar<S extends string> = Trim<S> extends '*' ? true : false;

/** Parse a comma-separated select list into a tuple of SelectItems */
export type ParseSelectItems<S extends string> =
  SplitByComma<S> extends infer Items extends readonly string[]
    ? ParseItemTuple<Items>
    : never;

/** Map a tuple of raw strings to SelectItem tuples */
type ParseItemTuple<T extends readonly string[]> =
  T extends readonly [infer First extends string, ...infer Rest extends string[]]
    ? [ParseSingleItem<First>, ...ParseItemTuple<Rest>]
    : [];

/**
 * Parse a single select item string into { expr, alias }.
 * Handles: "expr as alias" (finds the LAST "as" to avoid matching inside CAST), "expr"
 */
export type ParseSingleItem<S extends string> =
  Trim<S> extends `${infer Expr} as ${infer Alias}`
    ? // Check if Alias still contains " as " — if so, we matched too early (e.g. inside CAST)
      Alias extends `${string} as ${string}`
      ? FindLastAs<Trim<Expr>, Alias>
      : { expr: Trim<Expr>; alias: Trim<Alias> }
    : // No alias — infer from expression
      { expr: Trim<S>; alias: InferDefaultAlias<Trim<S>> };

/**
 * Recursively consume " as " from the left, building up the expression prefix,
 * until the remaining part no longer contains " as ". The final segment is the alias.
 * This finds the LAST " as " in the string.
 */
type FindLastAs<Prefix extends string, Rest extends string> =
  Rest extends `${infer A} as ${infer B}`
    ? B extends `${string} as ${string}`
      ? FindLastAs<`${Prefix} as ${A}`, B>
      : { expr: Trim<`${Prefix} as ${A}`>; alias: Trim<B> }
    : { expr: Trim<`${Prefix} as ${Rest}`>; alias: InferDefaultAlias<Trim<`${Prefix} as ${Rest}`>> };

/**
 * Infer the default output name from an expression.
 * "block_number" → "block_number"
 * "t.block_number" → "block_number" (strip table qualifier)
 * "parameters['from']" → "parameters['from']" (kept as-is)
 * "count(*)" → "count(*)" (kept as-is)
 */
type InferDefaultAlias<S extends string> =
  // Has brackets or parens — not a qualified column, keep as-is
  S extends `${string}[${string}` ? S :
  S extends `${string}(${string}` ? S :
  // Table-qualified: strip prefix
  S extends `${string}.${infer Col}` ? Col :
  S;
