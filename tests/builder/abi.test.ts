/**
 * ABI-aware parameter type inference tests.
 * Tests that map('parameters', key) resolves to correct types
 * when an ABI is provided and event_signature is narrowed.
 *
 * NOTE: ABIs must be defined with `as const` for type-level inference.
 * JSON imports widen string values to `string`, losing literal types.
 * This matches the viem/wagmi ecosystem pattern.
 */

import { test, expect } from 'bun:test'
import { cdp, makeCdpQueryCreator } from '../../src/builder'
import type { CdpEventSignature, SolidityTypeToCdp, InferRow } from '../../src/builder'
import type { Expect, Equal } from '../helpers'

// ── ABI defined with `as const` for literal type inference ───────────────

const erc20Abi = [
  {
    type: 'event',
    name: 'Transfer',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'Approval',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'spender', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

// ── CdpEventSignature type tests ─────────────────────────────────────────

test('CdpEventSignature produces correct Transfer signature', () => {
  type TransferEvent = (typeof erc20Abi)[0]
  type Sig = CdpEventSignature<TransferEvent>
  type _check = Expect<Equal<Sig, 'Transfer(address,address,uint256)'>>
  expect(true).toBe(true)
})

test('CdpEventSignature produces correct Approval signature', () => {
  type ApprovalEvent = (typeof erc20Abi)[1]
  type Sig = CdpEventSignature<ApprovalEvent>
  type _check = Expect<Equal<Sig, 'Approval(address,address,uint256)'>>
  expect(true).toBe(true)
})

// ── SolidityTypeToCdp type tests ─────────────────────────────────────────

test('SolidityTypeToCdp maps address to 0x-prefixed string', () => {
  type _check = Expect<Equal<SolidityTypeToCdp<'address'>, `0x${string}`>>
  expect(true).toBe(true)
})

test('SolidityTypeToCdp maps uint256 to ${number}', () => {
  type _check = Expect<Equal<SolidityTypeToCdp<'uint256'>, `${number}`>>
  expect(true).toBe(true)
})

test('SolidityTypeToCdp maps bool to boolean', () => {
  type _check = Expect<Equal<SolidityTypeToCdp<'bool'>, boolean>>
  expect(true).toBe(true)
})

test('SolidityTypeToCdp maps string to string', () => {
  type _check = Expect<Equal<SolidityTypeToCdp<'string'>, string>>
  expect(true).toBe(true)
})

test('SolidityTypeToCdp maps bytes32 to 0x-prefixed string', () => {
  type _check = Expect<Equal<SolidityTypeToCdp<'bytes32'>, `0x${string}`>>
  expect(true).toBe(true)
})

// ── ABI-aware query builder: parameter type resolution ───────────────────

test('map() with ABI + narrowed signature resolves address type', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .select((eb) => [
      eb.map('parameters', 'from').as('sender'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { sender: `0x${string}` }>>
  expect(true).toBe(true)
})

test('map() with ABI + narrowed signature resolves uint256 type', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .select((eb) => [
      eb.map('parameters', 'value').as('amount'),
      eb.map('parameters', 'from').as('from')
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { amount: `${number}`, from: `0x${string}` }>>
  expect(true).toBe(true)
})

test('map() with ABI resolves multiple Transfer params correctly', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .select((eb) => [
      eb.map('parameters', 'from').as('sender'),
      eb.map('parameters', 'to').as('recipient'),
      eb.map('parameters', 'value').as('amount'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, {
    sender: `0x${string}`
    recipient: `0x${string}`
    amount: `${number}`
  }>>
  expect(true).toBe(true)
})

test('map() with ABI resolves Approval event params', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'Approval(address,address,uint256)')
    .select((eb) => [
      eb.map('parameters', 'owner').as('owner'),
      eb.map('parameters', 'spender').as('spender'),
      eb.map('parameters', 'value').as('amount'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, {
    owner: `0x${string}`
    spender: `0x${string}`
    amount: `${number}`
  }>>
  expect(true).toBe(true)
})

// ── SQL generation still works with ABI ──────────────────────────────────

test('ABI-aware query generates correct SQL', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .select((eb) => [
      eb.map('parameters', 'from').as('sender'),
      eb.map('parameters', 'to').as('recipient'),
      eb.map('parameters', 'value').as('amount'),
    ])
    .select('address as token_address')
    .where('address', '=', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')
    .limit(10)
    .compile()

  expect(q.sql).toBe(
    "SELECT parameters['from'] AS sender, parameters['to'] AS recipient, parameters['value'] AS amount, " +
      "address AS token_address " +
      "FROM base.events " +
      "WHERE event_signature = 'Transfer(address,address,uint256)' " +
      "AND address = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' " +
      "LIMIT 10",
  )
})

// ── Fallback behavior ────────────────────────────────────────────────────

test('map() without ABI still returns variant type', () => {
  const q = cdp
    .selectFrom('base.events')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .select((eb) => [
      eb.map('parameters', 'from').as('sender'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { sender: boolean | `${number}` | string }>>
  expect(true).toBe(true)
})

test('map() with ABI but without event_signature narrowing returns variant', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .select((eb) => [
      eb.map('parameters', 'from').as('sender'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { sender: boolean | `${number}` | string }>>
  expect(true).toBe(true)
})

test('map() with ABI + unknown param key falls back to variant', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .select((eb) => [
      eb.map('parameters', 'unknownParam').as('mystery'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { mystery: boolean | `${number}` | string }>>
  expect(true).toBe(true)
})

test('map() with ABI + unmatched event_signature falls back to variant', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'SomeUnknownEvent(uint256)')
    .select((eb) => [
      eb.map('parameters', 'value').as('val'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { val: boolean | `${number}` | string }>>
  expect(true).toBe(true)
})

// ── Mixed columns + ABI-aware parameters ─────────────────────────────────

test('ABI params + regular columns in same query', () => {
  const cdpWithAbi = makeCdpQueryCreator({ abi: erc20Abi })
  const q = cdpWithAbi
    .selectFrom('base.events')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .select(['address', 'block_number'])
    .select((eb) => [
      eb.map('parameters', 'from').as('sender'),
      eb.map('parameters', 'value').as('amount'),
    ])
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, {
    address: `0x${string}`
    block_number: `${number}`
    sender: `0x${string}`
    amount: `${number}`
  }>>
  expect(true).toBe(true)
})

// ── Existing queries unchanged ───────────────────────────────────────────

test('existing cdp singleton query unchanged', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .where('block_number', '>', 100)
    .compile()
  type Result = InferRow<typeof q>
  type _check = Expect<Equal<Result, { address: `0x${string}` }>>
  expect(true).toBe(true)
})
