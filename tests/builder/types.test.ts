/**
 * Compile-time type inference tests for the query builder.
 * Tests that typeof query.$infer produces correct result types.
 */

import { test, expect } from 'bun:test'
import { cdp } from '../../src/builder'
import type { InferRow } from '../../src/builder'
import type { Expect, Equal } from '../helpers'

// ── Basic column type inference ──────────────────────────────────────────────

test('single column infers correct type', () => {
  const q = cdp.selectFrom('base.blocks').select('block_number').compile()
  type _check = Expect<Equal<InferRow<typeof q>, { block_number: `${number}` }>>
  expect(true).toBe(true)
})

test('multiple columns infer correct types', () => {
  const q = cdp.selectFrom('base.blocks').select(['block_number', 'block_hash']).compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<Result, { block_number: `${number}`; block_hash: `0x${string}` }>
  >
  expect(true).toBe(true)
})

test('string column type', () => {
  const q = cdp.selectFrom('base.events').select('event_name').compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { event_name: string }>>
  expect(true).toBe(true)
})

test('boolean column type', () => {
  const q = cdp.selectFrom('base.transactions').select('is_system_tx').compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { is_system_tx: boolean }>>
  expect(true).toBe(true)
})

test('array column type', () => {
  const q = cdp.selectFrom('base.events').select('topics').compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { topics: `0x${string}`[] }>>
  expect(true).toBe(true)
})

test('map column type', () => {
  const q = cdp.selectFrom('base.events').select('parameters').compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<Result, { parameters: Record<string, boolean | `${number}` | string> }>
  >
  expect(true).toBe(true)
})

// ── Additive select accumulation ─────────────────────────────────────────────

test('chained select calls accumulate types', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .select('block_number')
    .select('block_hash')
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<Result, { block_number: `${number}`; block_hash: `0x${string}` }>
  >
  expect(true).toBe(true)
})

// ── selectAll ────────────────────────────────────────────────────────────────

test('selectAll returns all columns with correct types', () => {
  const q = cdp.selectFrom('base.encoded_logs').selectAll().compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<
      Result,
      {
        block_number: `${number}`
        block_hash: `0x${string}`
        block_timestamp: string
        transaction_hash: `0x${string}`
        transaction_to: `0x${string}`
        transaction_from: `0x${string}`
        log_index: number
        address: `0x${string}`
        topics: `0x${string}`[]
        action: number
      }
    >
  >
  expect(true).toBe(true)
})

// ── Expression builder type inference ────────────────────────────────────────

test('map access infers variant type', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.map('parameters', 'from').as('sender')])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { sender: boolean | `${number}` | string }>>
  expect(true).toBe(true)
})

test('count infers ${number}', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.count().as('total')])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { total: `${number}` }>>
  expect(true).toBe(true)
})

test('sum infers ${number}', () => {
  const q = cdp
    .selectFrom('base.transfers')
    .select((eb) => [eb.sum(eb.col('value')).as('total')])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { total: `${number}` }>>
  expect(true).toBe(true)
})

test('cast infers target type', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.cast(eb.map('parameters', 'value'), 'uint256').as('amount'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { amount: `${number}` }>>
  expect(true).toBe(true)
})

test('castAs (double-colon) infers target type', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.castAs(eb.map('parameters', 'totalClaimed'), 'uint256').as('claimed'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { claimed: `${number}` }>>
  expect(true).toBe(true)
})

test('argMax preserves value type', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.argMax(eb.map('parameters', 'totalClaimed'), eb.col('timestamp')).as('latest'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<Result, { latest: boolean | `${number}` | string }>
  >
  expect(true).toBe(true)
})

test('raw with explicit type', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.raw<string>("lower(address)").as('lower_addr')])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { lower_addr: string }>>
  expect(true).toBe(true)
})

// ── Mixed select (columns + expressions) ─────────────────────────────────────

test('column select + expression select accumulate', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .select((eb) => [eb.count().as('total')])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<Result, { address: `0x${string}`; total: `${number}` }>
  >
  expect(true).toBe(true)
})

// ── CTE type injection ──────────────────────────────────────────────────────

test('CTE injects virtual table with correct types', () => {
  const q = cdp
    .with('recent', (qb) =>
      qb.selectFrom('base.blocks').select(['block_number', 'miner']),
    )
    .selectFrom('recent')
    .select(['block_number', 'miner'])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<Result, { block_number: `${number}`; miner: `0x${string}` }>
  >
  expect(true).toBe(true)
})

// ── JOIN type expansion ──────────────────────────────────────────────────────

test('inner join expands available columns', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .innerJoin('base.transactions', 'base.blocks.block_number', '=', 'base.transactions.block_number')
    .select(['block_hash', 'transaction_hash'])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<Result, { block_hash: `0x${string}`; transaction_hash: `0x${string}` }>
  >
  expect(true).toBe(true)
})

// ── WHERE does not change output type ────────────────────────────────────────

test('where does not affect output type', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .where('block_number', '>', 100)
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { address: `0x${string}` }>>
  expect(true).toBe(true)
})

// ── Unqualified table names ──────────────────────────────────────────────────

test('unqualified table name has same types', () => {
  const q = cdp.selectFrom('events').select('address').compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { address: `0x${string}` }>>
  expect(true).toBe(true)
})
