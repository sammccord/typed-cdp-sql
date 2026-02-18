/**
 * Resolve individual SELECT expressions against a table schema.
 * Determines the SQL type descriptor for each expression.
 * Input is already normalized (lowercased).
 */

import type { Trim } from './utils';
import type { MapSqlType } from './sql-types';

/**
 * Resolve an expression to its TypeScript type, given a table schema.
 * Schema maps column name → SQL type string (original casing).
 *
 * Pattern order matters: table-qualified expressions (e.g. "t.col") must be
 * checked before map indexing so that "e.parameters['from']" is first stripped
 * to "parameters['from']" via recursion, then matched as map indexing.
 */
export type ResolveExpression<Expr extends string, Schema> =
  // Simple column reference: "block_number"
  Expr extends keyof Schema
    ? MapSqlType<Lowercase<Schema[Expr] & string>>
    :

  // Table-qualified expression: "t.block_number" or "e.parameters['from']"
  // Strip the alias prefix and re-resolve the remainder.
  // Must come before map indexing to avoid capturing "e.parameters" as a column name.
  Expr extends `${string}.${infer Rest}`
    ? ResolveExpression<Rest, Schema>
    :

  // Map indexing with single quotes: parameters['from']
  Expr extends `${infer Col}['${string}']`
    ? Col extends keyof Schema
      ? MapSqlType<Lowercase<Schema[Col] & string>> extends Record<string, infer V>
        ? V
        : unknown
      : unknown
    :

  // Map indexing with double quotes: parameters["from"]
  Expr extends `${infer Col}["${string}"]`
    ? Col extends keyof Schema
      ? MapSqlType<Lowercase<Schema[Col] & string>> extends Record<string, infer V>
        ? V
        : unknown
      : unknown
    :

  // CAST expression: cast(expr as type)
  Expr extends `cast(${infer Inner})`
    ? Inner extends `${string} as ${infer TargetType}`
      ? MapSqlType<Trim<TargetType>>
      : unknown
    :

  // Aggregate functions with known return types
  Expr extends `count(${string})` ? `${number}` :
  Expr extends `sum(${string})` ? `${number}` :
  Expr extends `avg(${string})` ? number :
  Expr extends `min(${infer Inner})`
    ? ResolveExpression<Trim<Inner>, Schema>
    :
  Expr extends `max(${infer Inner})`
    ? ResolveExpression<Trim<Inner>, Schema>
    :

  // Fallback for unparseable expressions
  unknown;
