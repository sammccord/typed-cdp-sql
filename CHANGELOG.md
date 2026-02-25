# typed-cdp-sql

## 0.2.0

### Minor Changes

- aca4a60: Initial release of typed-cdp-sql — pure TypeScript compile-time type inference for CDP Data API SQL queries.

  Features:

  - `TypedQuery<SQL>` generic that infers result row types from SQL string literals
  - Supports SELECT, SELECT \*, aliases, JOINs, map indexing, CAST, aggregates
  - `0x${string}` types for EVM addresses and hashes (viem/abitype compatible)
  - `${number}` types for stringified large integers (uint64, uint256, int256)
  - Graceful fallback for unsupported SQL features
  - All 5 CDP tables: blocks, events, transactions, encoded_logs, transfers
  - Zero runtime code, zero bundle impact

- 3038c2e: add builder api
