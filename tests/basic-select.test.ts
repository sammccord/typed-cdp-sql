import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('SELECT single column', () => {
  type Result = TypedQuery<"SELECT block_number FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT two columns', () => {
  type Result = TypedQuery<"SELECT block_number, block_hash FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; block_hash: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT multiple columns', () => {
  type Result = TypedQuery<"SELECT block_number, block_hash, gas_used, miner FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{
    block_number: `${number}`;
    block_hash: `0x${string}`;
    gas_used: `${number}`;
    miner: `0x${string}`;
  }> }>>;
  expect(true).toBe(true);
});

test('SELECT with WHERE clause', () => {
  type Result = TypedQuery<"SELECT block_number, miner FROM base.blocks WHERE block_number > 1000">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; miner: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT with LIMIT', () => {
  type Result = TypedQuery<"SELECT transaction_hash FROM base.transactions LIMIT 10">;
  type _check = Expect<Equal<Result, { result: Array<{ transaction_hash: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT with WHERE and LIMIT', () => {
  type Result = TypedQuery<"SELECT from_address, to_address FROM base.transactions WHERE gas > 21000 LIMIT 5">;
  type _check = Expect<Equal<Result, { result: Array<{ from_address: `0x${string}`; to_address: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT boolean column', () => {
  type Result = TypedQuery<"SELECT is_system_tx FROM base.transactions">;
  type _check = Expect<Equal<Result, { result: Array<{ is_system_tx: boolean }> }>>;
  expect(true).toBe(true);
});

test('SELECT array column', () => {
  type Result = TypedQuery<"SELECT topics FROM base.events">;
  type _check = Expect<Equal<Result, { result: Array<{ topics: `0x${string}`[] }> }>>;
  expect(true).toBe(true);
});

test('SELECT from unqualified table name', () => {
  type Result = TypedQuery<"SELECT block_number FROM blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});
