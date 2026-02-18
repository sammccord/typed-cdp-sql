# typed-cdp-sql

Pure TypeScript compile-time type inference for [CDP Data API](https://docs.cdp.coinbase.com/data/sql-api/quickstart.md) SQL queries. Zero runtime code, zero bundle impact.

```typescript
import type { TypedQuery } from 'typed-cdp-sql';

const sql = 'SELECT block_number, transaction_hash FROM base.transactions WHERE block_number > 1000000 LIMIT 10' as const;

const res = await fetch('https://api.cdp.coinbase.com/platform/v2/data/query/run', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql }),
});

const data: TypedQuery<typeof sql> = await res.json();

data.result[0].block_number;
//                ^? `${number}`
data.result[0].transaction_hash;
//                ^? `0x${string}`
```

## Installation

```bash
bun add -d typed-cdp-sql
# or
npm install -D typed-cdp-sql
```

Requires TypeScript >= 5.

## Usage

`TypedQuery` takes any SQL string literal and infers the result row type:

```typescript
import type { TypedQuery } from 'typed-cdp-sql';

type Blocks = TypedQuery<"SELECT block_number, block_hash, gas_used FROM base.blocks">;
// { result: Array<{ block_number: `${number}`; block_hash: `0x${string}`; gas_used: `${number}` }> }
```

### SELECT *

Returns all columns with their inferred types:

```typescript
type AllBlocks = TypedQuery<"SELECT * FROM base.blocks">;
type Row = AllBlocks['result'][number];
// Row['block_number']  → `${number}`
// Row['miner']         → `0x${string}`
// Row['timestamp']     → string
// Row['action']        → number
```

### Column aliases

```typescript
type Aliased = TypedQuery<"SELECT block_number AS num, miner AS validator FROM base.blocks">;
// { result: Array<{ num: `${number}`; validator: `0x${string}` }> }
```

### Map indexing

Access decoded event parameters with bracket notation:

```typescript
type Transfers = TypedQuery<"SELECT parameters['from'] AS sender, parameters['to'] AS recipient, parameters['value'] AS amount FROM base.events WHERE event_signature = 'Transfer(address,address,uint256)'">;
// { result: Array<{
//   sender: boolean | `${number}` | string;
//   recipient: boolean | `${number}` | string;
//   amount: boolean | `${number}` | string;
// }> }
```

### JOINs

Two-table JOINs with table-qualified columns:

```typescript
type Joined = TypedQuery<"SELECT b.block_number, t.transaction_hash, t.from_address FROM base.blocks b JOIN base.transactions t ON b.block_number = t.block_number LIMIT 10">;
// { result: Array<{
//   block_number: `${number}`;
//   transaction_hash: `0x${string}`;
//   from_address: `0x${string}`;
// }> }
```

### Aggregates and CAST

```typescript
type Count = TypedQuery<"SELECT count(*) AS total FROM base.transactions">;
// { result: Array<{ total: `${number}` }> }

type Casted = TypedQuery<"SELECT CAST(value AS uint64) AS val FROM base.transfers">;
// { result: Array<{ val: `${number}` }> }
```

### Graceful fallback

Unparseable queries degrade to `Record<string, unknown>` — never a compile error:

```typescript
type Unknown = TypedQuery<"SELECT col FROM unknown_table">;
// { result: Array<Record<string, unknown>> }
```

## Type mapping

| CDP SQL Type | TypeScript Type | Notes |
|---|---|---|
| `uint64`, `uint256`, `Int256` | `` `${number}` `` | Stringified numbers from API |
| `String` | `string` | Plain text fields |
| `Hex` (addresses, hashes) | `` `0x${string}` `` | Compatible with viem/abitype |
| `DateTime`, `DateTime64` | `string` | ISO 8601 timestamps |
| `Bool` | `boolean` | |
| `Int8` | `number` | Small integers (e.g., `action`) |
| `uint32` | `number` | Small integers (e.g., `log_index`) |
| `Array(T)` | `MapSqlType<T>[]` | Recursive |
| `Map(K, V)` | `Record<string, MapSqlType<V>>` | |
| `Variant(Bool, Int256, String, uint256)` | `boolean \| \`${number}\` \| string` | Event parameter values |

## Supported tables

All tables are under the `base.*` namespace (unqualified names also work):

| Table | Key columns |
|---|---|
| `base.blocks` | block_number, block_hash, miner, timestamp, gas_used, ... |
| `base.events` | event_name, event_signature, parameters, address, topics, ... |
| `base.transactions` | transaction_hash, from_address, to_address, value, input, ... |
| `base.encoded_logs` | block_number, address, topics, transaction_hash, ... |
| `base.transfers` | token_address, from_address, to_address, value, ... |

## Supported SQL features

| Feature | Status |
|---|---|
| `SELECT col1, col2` | Supported |
| `SELECT *` | Supported |
| `SELECT col AS alias` | Supported |
| `SELECT DISTINCT` | Supported |
| `parameters['key']` (map indexing) | Supported |
| `CAST(expr AS type)` | Supported |
| `count(*)`, `sum()`, `avg()`, `min()`, `max()` | Supported |
| `JOIN` / `INNER JOIN` / `LEFT JOIN` | Supported (2-table) |
| Case-insensitive keywords | Supported |
| `WHERE`, `GROUP BY`, `ORDER BY`, `LIMIT` | Ignored (don't affect types) |
| CTEs, subqueries, UNION | Graceful fallback |

## Advanced: schema types

Individual table schema types are re-exported for advanced use:

```typescript
import type {
  TableSchemas,
  BlocksSchema,
  EventsSchema,
  TransactionsSchema,
  EncodedLogsSchema,
  TransfersSchema,
} from 'typed-cdp-sql';
```

## License

MIT
