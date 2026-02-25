# typed-cdp-sql

Type-safe SQL query builder for the [CDP Data API](https://docs.cdp.coinbase.com/data/sql-api/quickstart.md). Build ClickHouse SQL queries with full IntelliSense for table/column names, and get compile-time result type inference from the builder chain.

```typescript
import { cdp, type InferResult } from 'typed-cdp-sql';

const query = cdp
  .selectFrom('base.events')
  .select(['address', 'event_name', 'block_number'])
  .where('event_signature', '=', 'Transfer(address,address,uint256)')
  .where('block_number', '>', 1000000)
  .limit(10)
  .compile();

query.sql;
// "SELECT address, event_name, block_number FROM base.events
//  WHERE event_signature = 'Transfer(address,address,uint256)' AND block_number > 1000000
//  LIMIT 10"

type Result = InferResult<typeof query>;
// { result: Array<{ address: `0x${string}`; event_name: string; block_number: `${number}` }> }
```

## Installation

```bash
bun add typed-cdp-sql
# or
npm install typed-cdp-sql
```

Requires TypeScript >= 5.

## Quick Start

Use the `cdp` singleton to start building queries:

```typescript
import { cdp, type InferRow } from 'typed-cdp-sql';

// Select specific columns
const q1 = cdp
  .selectFrom('base.blocks')
  .select(['block_number', 'block_hash', 'gas_used'])
  .compile();
// sql:  "SELECT block_number, block_hash, gas_used FROM base.blocks"
// InferRow: { block_number: `${number}`; block_hash: `0x${string}`; gas_used: `${number}` }

// Select all columns
const q2 = cdp
  .selectFrom('base.blocks')
  .selectAll()
  .compile();
// sql:  "SELECT * FROM base.blocks"
// InferRow: { block_number: `${number}`; block_hash: `0x${string}`; miner: `0x${string}`; timestamp: string; ... }

// Chained selects accumulate
const q3 = cdp
  .selectFrom('base.blocks')
  .select('block_number')
  .select('miner')
  .compile();
// sql:  "SELECT block_number, miner FROM base.blocks"
// InferRow: { block_number: `${number}`; miner: `0x${string}` }

// Column aliases
const q4 = cdp
  .selectFrom('base.blocks')
  .select('block_number as num')
  .compile();
// sql:  "SELECT block_number AS num FROM base.blocks"
// InferRow: { num: `${number}` }

// WHERE, ORDER BY, GROUP BY, LIMIT
const q5 = cdp
  .selectFrom('base.events')
  .select(['address', 'event_name'])
  .where('block_number', '>', 1000000)
  .orderBy('block_number', 'desc')
  .limit(100)
  .compile();
// sql:  "SELECT address, event_name FROM base.events WHERE block_number > 1000000 ORDER BY block_number DESC LIMIT 100"
// InferRow: { address: `0x${string}`; event_name: string }

// Multiple WHERE calls are ANDed
const q6 = cdp
  .selectFrom('base.events')
  .select('address')
  .where('event_signature', '=', 'Transfer(address,address,uint256)')
  .where('block_number', '>', 1000000)
  .compile();
// sql:  "SELECT address FROM base.events WHERE event_signature = 'Transfer(address,address,uint256)' AND block_number > 1000000"
// InferRow: { address: `0x${string}` }
```

## Expression Builder

For complex selections (map access, functions, casting, raw SQL), use a callback with the expression builder:

```typescript
import { cdp } from 'typed-cdp-sql';

const query = cdp
  .selectFrom('base.events')
  .select((eb) => [
    // Map access: parameters['key']
    eb.map('parameters', 'from').as('sender'),
    eb.map('parameters', 'value').as('amount'),

    // Aggregate functions
    eb.count().as('total'),
    eb.sum(eb.col('block_number')).as('block_sum'),

    // String functions
    eb.lower(eb.col('address')).as('lower_addr'),
    eb.upper(eb.col('event_name')).as('upper_name'),
    eb.replaceAll(eb.col('address'), eb.val('0x'), eb.val('')).as('clean'),

    // Date/time functions
    eb.toStartOfHour(eb.col('timestamp')).as('hour'),
    eb.toDate(eb.col('timestamp')).as('date'),

    // CAST and :: syntax
    eb.cast(eb.map('parameters', 'value'), 'UInt256').as('cast_value'),
    eb.castAs(eb.map('parameters', 'totalClaimed'), 'UInt256').as('double_colon'),

    // Type conversion + arithmetic
    eb.divide(
      eb.toUInt256(eb.col('block_number')),
      eb.val(1000),
    ).as('divided'),

    // Raw SQL escape hatch (for anything not covered)
    eb.raw<string>("formatDateTime(timestamp, '%Y-%m-%d')").as('formatted'),
  ])
  .compile();
// sql:  "SELECT parameters['from'] AS sender, parameters['value'] AS amount, count(*) AS total,
//        sum(block_number) AS block_sum, lower(address) AS lower_addr, upper(event_name) AS upper_name,
//        replaceAll(address, '0x', '') AS clean, toStartOfHour(timestamp) AS hour,
//        toDate(timestamp) AS date, CAST(parameters['value'] AS UInt256) AS cast_value,
//        parameters['totalClaimed']::UInt256 AS double_colon,
//        divide(toUInt256(block_number), 1000) AS divided,
//        formatDateTime(timestamp, '%Y-%m-%d') AS formatted
//        FROM base.events"
// InferRow: {
//   sender: string | boolean; amount: string | boolean;
//   total: `${number}`; block_sum: `${number}`;
//   lower_addr: string; upper_name: string; clean: string;
//   hour: string; date: string;
//   cast_value: `${number}`; double_colon: `${number}`;
//   divided: `${number}`; formatted: string;
// }
```

### WHERE with expressions

```typescript
const query = cdp
  .selectFrom('base.events')
  .select('address')
  // Simple comparison
  .where('block_number', '>', 1000)
  // Expression callback for complex conditions
  .where((eb) =>
    eb.or(
      eb.eq(eb.col('address'), '0x1234'),
      eb.eq(eb.col('address'), '0x5678'),
    ),
  )
  .compile();
// sql:  "SELECT address FROM base.events WHERE block_number > 1000 AND (address = '0x1234' OR address = '0x5678')"
// InferRow: { address: `0x${string}` }
```

### GROUP BY with expressions

```typescript
const query = cdp
  .selectFrom('base.events')
  .select((eb) => [
    eb.map('parameters', 'coin').as('coin'),
    eb.count().as('total'),
  ])
  .groupBy((eb) => eb.map('parameters', 'coin'))
  .compile();
// sql:  "SELECT parameters['coin'] AS coin, count(*) AS total FROM base.events GROUP BY parameters['coin']"
// InferRow: { coin: string | boolean; total: `${number}` }
```

## JOINs

```typescript
const query = cdp
  .selectFrom('base.blocks')
  .innerJoin(
    'base.transactions',
    'base.blocks.block_number', '=', 'base.transactions.block_number',
  )
  .select(['block_hash', 'transaction_hash', 'from_address'])
  .limit(10)
  .compile();
// sql:  "SELECT block_hash, transaction_hash, from_address FROM base.blocks
//        INNER JOIN base.transactions ON base.blocks.block_number = base.transactions.block_number LIMIT 10"
// InferRow: { block_hash: `0x${string}`; transaction_hash: `0x${string}`; from_address: `0x${string}` }

// With table aliases
const q2 = cdp
  .selectFrom('base.blocks')
  .innerJoin('base.transactions as t', 'base.blocks.block_number', '=', 't.block_number')
  .select(['block_hash', 't.transaction_hash'])
  .compile();
// sql:  "SELECT block_hash, t.transaction_hash FROM base.blocks
//        INNER JOIN base.transactions AS t ON base.blocks.block_number = t.block_number"
// InferRow: { block_hash: `0x${string}`; transaction_hash: `0x${string}` }
```

`innerJoin`, `leftJoin`, `rightJoin`, and `fullJoin` are supported.

## CTEs (WITH)

```typescript
const query = cdp
  .with('recent_blocks', (qb) =>
    qb.selectFrom('base.blocks')
      .select(['block_number', 'miner'])
      .orderBy('block_number', 'desc')
      .limit(100),
  )
  .selectFrom('recent_blocks')
  .select(['block_number', 'miner'])
  .compile();
// sql:  "WITH recent_blocks AS (SELECT block_number, miner FROM base.blocks ORDER BY block_number DESC LIMIT 100)
//        SELECT block_number, miner FROM recent_blocks"
// InferRow: { block_number: `${number}`; miner: `0x${string}` }
```

CTEs can reference previously defined CTEs:

```typescript
const query = cdp
  .with('step1', (qb) =>
    qb.selectFrom('base.blocks').select('block_number'),
  )
  .with('step2', (qb) =>
    qb.selectFrom('step1').select('block_number'),
  )
  .selectFrom('step2')
  .select('block_number')
  .compile();
// sql:  "WITH step1 AS (SELECT block_number FROM base.blocks), step2 AS (SELECT block_number FROM step1)
//        SELECT block_number FROM step2"
// InferRow: { block_number: `${number}` }
```

## ABI-Aware Parameter Inference

By default, `eb.map('parameters', key)` returns the broad variant type `string | boolean`. When you provide an ABI, parameter types are inferred from the event signature:

```typescript
import { makeCdpQueryCreator, type InferRow } from 'typed-cdp-sql';

// ABI must use `as const` for literal type inference
const erc20Abi = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
  },
] as const;

const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi });

const query = cdpWithAbi
  .selectFrom('base.events')
  .where('event_signature', '=', 'Transfer(address,address,uint256)')
  .select((eb) => [
    eb.map('parameters', 'from').as('sender'),
    eb.map('parameters', 'to').as('recipient'),
    eb.map('parameters', 'value').as('amount'),
  ])
  .compile();
// sql:  "SELECT parameters['from'] AS sender, parameters['to'] AS recipient, parameters['value'] AS amount
//        FROM base.events WHERE event_signature = 'Transfer(address,address,uint256)'"
// InferRow: { sender: `0x${string}`; recipient: `0x${string}`; amount: `${number}` }

type Row = InferRow<typeof query>;
// { sender: `0x${string}`; recipient: `0x${string}`; amount: `${number}` }
```

The ABI is purely type-level — no runtime overhead. The `where('event_signature', '=', sig)` call narrows the event context, and `map()` resolves parameter types accordingly. Without the `where` narrowing, types fall back to the variant union.

> **Note:** ABIs must be defined with `as const` in TypeScript (or imported from a `.ts` file with `as const` export). JSON imports widen string values to `string`, losing the literal types needed for inference. This matches the pattern used by viem and wagmi.

## Type Helpers

```typescript
import { cdp, type InferResult, type InferRow } from 'typed-cdp-sql';

const query = cdp.selectFrom('base.blocks').select(['block_number', 'miner']).compile();

// Full response shape
type Result = InferResult<typeof query>;
// { result: Array<{ block_number: `${number}`; miner: `0x${string}` }> }

// Single row type
type Row = InferRow<typeof query>;
// { block_number: `${number}`; miner: `0x${string}` }
```

## Supported Tables

All tables are under the `base.*` namespace (unqualified names also work):

| Table | Key columns |
|---|---|
| `base.blocks` | block_number, block_hash, miner, timestamp, gas_used, ... |
| `base.events` | event_name, event_signature, parameters, address, topics, ... |
| `base.transactions` | transaction_hash, from_address, to_address, value, input, ... |
| `base.encoded_logs` | block_number, address, topics, transaction_hash, ... |
| `base.transfers` | token_address, from_address, to_address, value, ... |

## Type Mapping

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

## Compile-Time Inference (TypedQuery)

For simple queries, you can also use the zero-runtime `TypedQuery` type to infer result types directly from SQL string literals:

```typescript
import type { TypedQuery } from 'typed-cdp-sql';

type Result = TypedQuery<"SELECT block_number, block_hash FROM base.blocks LIMIT 10">;
// { result: Array<{ block_number: `${number}`; block_hash: `0x${string}` }> }
```

This approach has no runtime code and works well for straightforward queries, but cannot handle complex features like CTEs, nested functions, or `::` casting syntax due to TypeScript string type inference limits. For those, use the builder API.

## License

MIT
