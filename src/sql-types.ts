/**
 * Maps SQL type descriptors (string literals) to TypeScript types.
 */

import type { Trim } from './utils';

/** Map a SQL type string to its TypeScript equivalent */
export type MapSqlType<T extends string> =
  // Large integers → stringified numbers (API returns e.g. "40218122")
  T extends 'uint64' ? `${number}` :
  T extends 'uint256' ? `${number}` :
  T extends 'int256' ? `${number}` :
  // Hex-encoded strings (addresses, hashes, calldata)
  T extends 'hex' ? `0x${string}` :
  // String types
  T extends 'string' ? string :
  // Nullable
  T extends `nullable(${infer Inner})` ? MapSqlType<Trim<Inner>> | null :
  // DateTime
  T extends 'datetime' ? string :
  T extends `datetime64${string}` ? string :
  // Boolean
  T extends 'bool' ? boolean :
  // Small integers → number
  T extends 'int8' ? number :
  T extends 'uint32' ? number :
  T extends `enum8${string}` ? number :
  // Array
  T extends `array(${infer Inner})` ? Array<MapSqlType<Trim<Inner>>> :
  // Map
  T extends `map(${infer Rest})`
    ? ParseMapType<Trim<Rest>>
    : // Variant
    T extends `variant(${infer _})` ? boolean | `${number}` | string :
  unknown;

/**
 * Parse the inner portion of a Map type: "K, V" where V may itself contain commas
 * (e.g., "String, Variant(Bool, Int256, String, uint256)")
 * Strategy: K is always a simple type, so split at the first comma.
 */
type ParseMapType<S extends string> =
  S extends `${infer _K}, ${infer V}`
    ? Record<string, MapSqlType<Trim<V>>>
    : Record<string, unknown>;
