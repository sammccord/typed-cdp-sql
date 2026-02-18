import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('INNER JOIN with table-qualified columns', () => {
  type Result = TypedQuery<"SELECT b.block_number, t.transaction_hash FROM base.blocks b JOIN base.transactions t ON b.block_number = t.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; transaction_hash: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('explicit INNER JOIN keyword', () => {
  type Result = TypedQuery<"SELECT b.block_number, t.from_address FROM base.blocks b INNER JOIN base.transactions t ON b.block_number = t.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; from_address: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('LEFT JOIN', () => {
  type Result = TypedQuery<"SELECT b.block_number, t.transaction_hash FROM base.blocks b LEFT JOIN base.transactions t ON b.block_number = t.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; transaction_hash: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('JOIN blocks and events', () => {
  type Result = TypedQuery<"SELECT b.block_number, e.event_name, e.address FROM base.blocks b JOIN base.events e ON b.block_number = e.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{
    block_number: `${number}`;
    event_name: string;
    address: `0x${string}`;
  }> }>>;
  expect(true).toBe(true);
});

test('JOIN with shared column name (block_number exists in both tables)', () => {
  type Result = TypedQuery<"SELECT t.block_number, t.transaction_hash, e.event_name FROM base.transactions t JOIN base.events e ON t.block_number = e.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{
    block_number: `${number}`;
    transaction_hash: `0x${string}`;
    event_name: string;
  }> }>>;
  expect(true).toBe(true);
});

test('JOIN with column alias', () => {
  type Result = TypedQuery<"SELECT b.miner AS block_miner, t.from_address AS sender FROM base.blocks b JOIN base.transactions t ON b.block_number = t.block_number LIMIT 10">;
  type _check = Expect<Equal<Result, { result: Array<{ block_miner: `0x${string}`; sender: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('JOIN with unqualified table names', () => {
  type Result = TypedQuery<"SELECT b.block_number, t.transaction_hash FROM blocks b JOIN transactions t ON b.block_number = t.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; transaction_hash: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('JOIN with WHERE and LIMIT', () => {
  type Result = TypedQuery<"SELECT b.block_number, t.value FROM base.blocks b JOIN base.transactions t ON b.block_number = t.block_number WHERE t.value > '0' LIMIT 50">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; value: string }> }>>;
  expect(true).toBe(true);
});

test('JOIN transfers and events', () => {
  type Result = TypedQuery<"SELECT tr.token_address, tr.value, e.event_name FROM base.transfers tr JOIN base.events e ON tr.block_number = e.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{
    token_address: `0x${string}`;
    value: `${number}`;
    event_name: string;
  }> }>>;
  expect(true).toBe(true);
});

test('JOIN with map indexing on joined table', () => {
  type Result = TypedQuery<"SELECT b.block_number, e.parameters['from'] AS sender FROM base.blocks b JOIN base.events e ON b.block_number = e.block_number">;
  type _check = Expect<Equal<Result, { result: Array<{
    block_number: `${number}`;
    sender: boolean | `${number}` | string;
  }> }>>;
  expect(true).toBe(true);
});
