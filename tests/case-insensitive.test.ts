import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('uppercase keywords', () => {
  type Result = TypedQuery<"SELECT block_number FROM base.blocks WHERE block_number > 0 LIMIT 1">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('lowercase keywords', () => {
  type Result = TypedQuery<"select block_number from base.blocks where block_number > 0 limit 1">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('mixed case keywords', () => {
  type Result = TypedQuery<"Select block_number From base.blocks Limit 10">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT DISTINCT', () => {
  type Result = TypedQuery<"SELECT DISTINCT miner FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ miner: `0x${string}` }> }>>;
  expect(true).toBe(true);
});
