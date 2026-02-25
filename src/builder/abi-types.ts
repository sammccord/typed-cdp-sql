/**
 * ABI-aware type utilities for CDP SQL parameter inference.
 *
 * When a user provides an ABI and narrows the event signature via
 * where('event_signature', '=', sig), map('parameters', key)
 * resolves to the correct Solidity-to-CDP type instead of the
 * generic variant union.
 */

// ── Minimal ABI types (compatible with abitype) ──────────────────────────

/** ABI parameter (function/event input or output) */
export interface AbiParameter {
  readonly type: string
  readonly name?: string | undefined
  readonly components?: readonly AbiParameter[] | undefined
  readonly internalType?: string | undefined
}

/** ABI event parameter — extends AbiParameter with indexed flag */
export interface AbiEventParameter extends AbiParameter {
  readonly indexed?: boolean | undefined
}

/** ABI event item */
export interface AbiEvent {
  readonly type: 'event'
  readonly name: string
  readonly inputs: readonly AbiEventParameter[]
  readonly anonymous?: boolean | undefined
}

/** ABI item (only event matters for us; others are passthrough) */
export type AbiItem =
  | AbiEvent
  | { readonly type: 'function'; readonly [key: string]: unknown }
  | { readonly type: 'constructor'; readonly [key: string]: unknown }
  | { readonly type: 'fallback'; readonly [key: string]: unknown }
  | { readonly type: 'receive'; readonly [key: string]: unknown }
  | { readonly type: 'error'; readonly [key: string]: unknown }

/** An ABI is a readonly array of ABI items (or any[] for loose JSON imports) */
export type Abi = readonly AbiItem[] | readonly any[]

// ── CDP Event Signature ──────────────────────────────────────────────────

/**
 * Generate CDP-format event signature from an ABI event.
 * e.g. Transfer ABI → 'Transfer(address,address,uint256)'
 *
 * CDP signatures use ONLY types (no names, no "indexed"), comma-separated.
 * Tuples are formatted as (type1,type2,...).
 */
export type CdpEventSignature<E extends AbiEvent> =
  `${E['name']}(${JoinParamTypes<E['inputs']>})`

type FormatParamType<P extends AbiParameter> =
  P extends { readonly type: `tuple${infer Arr}`; readonly components: infer C extends readonly AbiParameter[] }
    ? `(${JoinParamTypes<C>})${Arr}`
    : P['type']

type JoinParamTypes<
  Params extends readonly AbiParameter[],
  Result extends string = '',
> = Params extends readonly [
  infer Head extends AbiParameter,
  ...infer Tail extends readonly AbiParameter[],
]
  ? Result extends ''
    ? JoinParamTypes<Tail, FormatParamType<Head>>
    : JoinParamTypes<Tail, `${Result},${FormatParamType<Head>}`>
  : Result

// ── Solidity Type → CDP Response Type ────────────────────────────────────

/**
 * Map a Solidity type string to its CDP API response type.
 *
 * CDP returns numbers as stringified decimals (`"12345"`), NOT bigint.
 * This intentionally differs from abitype's AbiTypeToPrimitiveType.
 */
export type SolidityTypeToCdp<T extends string> =
  T extends 'address'
    ? `0x${string}`
    : T extends 'bool'
      ? boolean
      : T extends `uint${string}`
        ? `${number}`
        : T extends `int${string}`
          ? `${number}`
          : T extends 'string'
            ? string
            : T extends `bytes${string}`
              ? `0x${string}`
              : string // fallback

// ── Event Lookup by Signature ────────────────────────────────────────────

/** Extract all event items from an ABI */
type ExtractEvents<A extends Abi> = Extract<A[number], { readonly type: 'event' }>

/**
 * Match a CDP signature string against ABI events.
 * Uses distributive conditional — distributes over the union of events,
 * returning the one whose computed signature matches Sig.
 */
export type FindEventBySignature<A extends Abi, Sig extends string> =
  ExtractEvents<A> extends infer E
    ? E extends AbiEvent
      ? CdpEventSignature<E> extends Sig
        ? E
        : never
      : never
    : never

// ── Parameter Type Resolution ────────────────────────────────────────────

/** Find a parameter by name in an event's inputs */
type FindParamByName<
  Params extends readonly AbiEventParameter[],
  Key extends string,
> = Params extends readonly [
  infer Head extends AbiEventParameter,
  ...infer Tail extends readonly AbiEventParameter[],
]
  ? Head['name'] extends Key
    ? Head
    : FindParamByName<Tail, Key>
  : never

/**
 * Resolve the CDP type for a named parameter in an ABI-matched event.
 * Falls back to variant if the event or key isn't found.
 */
export type EventParamType<
  A extends Abi,
  Sig extends string,
  Key extends string,
> = [FindEventBySignature<A, Sig>] extends [never]
  ? boolean | `${number}` | string // event not found → variant
  : FindEventBySignature<A, Sig> extends infer E extends AbiEvent
    ? [FindParamByName<E['inputs'], Key>] extends [never]
      ? boolean | `${number}` | string // key not found → variant
      : FindParamByName<E['inputs'], Key> extends infer P extends AbiEventParameter
        ? SolidityTypeToCdp<P['type']>
        : boolean | `${number}` | string
    : boolean | `${number}` | string

// ── All Signatures (for autocomplete) ────────────────────────────────────

/** Union of all CDP-format event signatures from an ABI */
export type AllCdpEventSignatures<A extends Abi> =
  ExtractEvents<A> extends infer E extends AbiEvent
    ? CdpEventSignature<E>
    : never

// ── Conditional Resolver ─────────────────────────────────────────────────

/**
 * Conditional resolver used by ExpressionBuilder.map().
 *
 * If Sig is narrowed (not just `string`) and ABI is non-empty,
 * resolve via ABI lookup. Otherwise fall back to the base type's
 * variant union.
 */
export type ResolveMapType<
  BaseType,
  A extends Abi,
  Sig extends string,
  Key extends string,
> = string extends Sig
  ? BaseType extends Record<string, infer V>
    ? V
    : unknown // variant fallback (Sig not narrowed)
  : A extends readonly []
    ? BaseType extends Record<string, infer V>
      ? V
      : unknown // no ABI → variant fallback
    : EventParamType<A, Sig, Key>
