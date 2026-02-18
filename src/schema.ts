/**
 * CDP Data API table schemas.
 * Each interface maps column names to their SQL type descriptors (as string literals).
 * 'Hex' denotes 0x-prefixed hex strings (addresses, hashes, calldata, signatures).
 */

export interface BlocksSchema {
  block_number: 'uint64';
  block_hash: 'Hex';
  parent_hash: 'Hex';
  timestamp: 'DateTime';
  miner: 'Hex';
  nonce: 'uint64';
  sha3_uncles: 'Hex';
  transactions_root: 'Hex';
  state_root: 'Hex';
  receipts_root: 'Hex';
  logs_bloom: 'Hex';
  gas_limit: 'uint64';
  gas_used: 'uint64';
  base_fee_per_gas: 'uint64';
  total_difficulty: 'String';
  size: 'uint64';
  extra_data: 'Hex';
  mix_hash: 'Hex';
  withdrawals_root: 'Hex';
  parent_beacon_block_root: 'Hex';
  blob_gas_used: 'uint64';
  excess_blob_gas: 'uint64';
  transaction_count: 'uint64';
  action: 'Int8';
}

export interface EventsSchema {
  block_number: 'uint64';
  block_hash: 'Hex';
  timestamp: 'DateTime64(9)';
  transaction_hash: 'Hex';
  transaction_to: 'Hex';
  transaction_from: 'Hex';
  transaction_index: 'uint64';
  log_index: 'uint64';
  address: 'Hex';
  topics: 'Array(Hex)';
  event_name: 'String';
  event_signature: 'String';
  parameters: 'Map(String, Variant(Bool, Int256, String, uint256))';
  parameter_types: 'Map(String, String)';
  action: 'Int8';
}

export interface TransactionsSchema {
  block_number: 'uint64';
  block_hash: 'Hex';
  transaction_hash: 'Hex';
  transaction_index: 'uint64';
  from_address: 'Hex';
  to_address: 'Hex';
  value: 'String';
  gas: 'uint64';
  gas_price: 'uint64';
  input: 'Hex';
  nonce: 'uint64';
  type: 'uint64';
  max_fee_per_gas: 'uint64';
  max_priority_fee_per_gas: 'uint64';
  chain_id: 'uint64';
  v: 'Hex';
  r: 'Hex';
  s: 'Hex';
  is_system_tx: 'Bool';
  max_fee_per_blob_gas: 'String';
  blob_versioned_hashes: 'Array(Hex)';
  timestamp: 'DateTime64(9)';
  action: 'Int8';
}

export interface EncodedLogsSchema {
  block_number: 'uint64';
  block_hash: 'Hex';
  block_timestamp: 'DateTime64(9)';
  transaction_hash: 'Hex';
  transaction_to: 'Hex';
  transaction_from: 'Hex';
  log_index: 'uint32';
  address: 'Hex';
  topics: 'Array(Hex)';
  action: 'Int8';
}

export interface TransfersSchema {
  block_number: 'uint64';
  block_timestamp: 'DateTime64(9)';
  transaction_to: 'Hex';
  transaction_from: 'Hex';
  log_index: 'uint32';
  token_address: 'Hex';
  from_address: 'Hex';
  to_address: 'Hex';
  value: 'uint256';
  action: 'Int8';
}

/** Master lookup: table name → schema type */
export interface TableSchemas {
  'base.blocks': BlocksSchema;
  'base.events': EventsSchema;
  'base.transactions': TransactionsSchema;
  'base.encoded_logs': EncodedLogsSchema;
  'base.transfers': TransfersSchema;
  'blocks': BlocksSchema;
  'events': EventsSchema;
  'transactions': TransactionsSchema;
  'encoded_logs': EncodedLogsSchema;
  'transfers': TransfersSchema;
}
