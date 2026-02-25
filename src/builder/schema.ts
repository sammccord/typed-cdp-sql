/**
 * Runtime CDP table schema definitions + CdpDatabase type.
 *
 * These `as const` objects mirror the type-only interfaces in ../schema.ts,
 * providing both runtime column-name lookups and compile-time type inference
 * through MapSqlType.
 */

import type { MapSqlType } from '../sql-types'

// ── Runtime schema objects ───────────────────────────────────────────────────

export const blocksSchema = {
  block_number: 'uint64',
  block_hash: 'Hex',
  parent_hash: 'Hex',
  timestamp: 'DateTime',
  miner: 'Hex',
  nonce: 'uint64',
  sha3_uncles: 'Hex',
  transactions_root: 'Hex',
  state_root: 'Hex',
  receipts_root: 'Hex',
  logs_bloom: 'Hex',
  gas_limit: 'uint64',
  gas_used: 'uint64',
  base_fee_per_gas: 'uint64',
  total_difficulty: 'String',
  size: 'uint64',
  extra_data: 'Hex',
  mix_hash: 'Hex',
  withdrawals_root: 'Hex',
  parent_beacon_block_root: 'Hex',
  blob_gas_used: 'uint64',
  excess_blob_gas: 'uint64',
  transaction_count: 'uint64',
  action: 'Int8',
} as const satisfies Record<string, string>

export const eventsSchema = {
  block_number: 'uint64',
  block_hash: 'Hex',
  timestamp: 'DateTime64(9)',
  transaction_hash: 'Hex',
  transaction_to: 'Hex',
  transaction_from: 'Hex',
  transaction_index: 'uint64',
  log_index: 'uint64',
  address: 'Hex',
  topics: 'Array(Hex)',
  event_name: 'String',
  event_signature: 'String',
  parameters: 'Map(String, Variant(Bool, Int256, String, uint256))',
  parameter_types: 'Map(String, String)',
  action: 'Int8',
} as const satisfies Record<string, string>

export const transactionsSchema = {
  block_number: 'uint64',
  block_hash: 'Hex',
  transaction_hash: 'Hex',
  transaction_index: 'uint64',
  from_address: 'Hex',
  to_address: 'Hex',
  value: 'String',
  gas: 'uint64',
  gas_price: 'uint64',
  input: 'Hex',
  nonce: 'uint64',
  type: 'uint64',
  max_fee_per_gas: 'uint64',
  max_priority_fee_per_gas: 'uint64',
  chain_id: 'uint64',
  v: 'Hex',
  r: 'Hex',
  s: 'Hex',
  is_system_tx: 'Bool',
  max_fee_per_blob_gas: 'String',
  blob_versioned_hashes: 'Array(Hex)',
  timestamp: 'DateTime64(9)',
  action: 'Int8',
} as const satisfies Record<string, string>

export const encodedLogsSchema = {
  block_number: 'uint64',
  block_hash: 'Hex',
  block_timestamp: 'DateTime64(9)',
  transaction_hash: 'Hex',
  transaction_to: 'Hex',
  transaction_from: 'Hex',
  log_index: 'uint32',
  address: 'Hex',
  topics: 'Array(Hex)',
  action: 'Int8',
} as const satisfies Record<string, string>

export const transfersSchema = {
  block_number: 'uint64',
  block_timestamp: 'DateTime64(9)',
  transaction_to: 'Hex',
  transaction_from: 'Hex',
  log_index: 'uint32',
  token_address: 'Hex',
  from_address: 'Hex',
  to_address: 'Hex',
  value: 'uint256',
  action: 'Int8',
} as const satisfies Record<string, string>

/** Runtime table name → schema object lookup */
export const cdpSchemas = {
  'base.blocks': blocksSchema,
  'base.events': eventsSchema,
  'base.transactions': transactionsSchema,
  'base.encoded_logs': encodedLogsSchema,
  'base.transfers': transfersSchema,
  'blocks': blocksSchema,
  'events': eventsSchema,
  'transactions': transactionsSchema,
  'encoded_logs': encodedLogsSchema,
  'transfers': transfersSchema,
} as const

// ── Type derivation ──────────────────────────────────────────────────────────

/** Map a raw schema object's SQL type string values to TS types */
export type MapSchema<S> = {
  [K in keyof S]: MapSqlType<Lowercase<S[K] & string>>
}

/** The CDP database type: table name → row type with TS types */
export type CdpDatabase = {
  [K in keyof typeof cdpSchemas]: MapSchema<(typeof cdpSchemas)[K]>
}

/** All valid CDP table names */
export type CdpTableName = keyof CdpDatabase
