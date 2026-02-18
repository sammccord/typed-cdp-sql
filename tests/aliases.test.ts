import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('SELECT with AS alias', () => {
  type Result = TypedQuery<"SELECT block_number AS num FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ num: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT multiple columns with aliases', () => {
  type Result = TypedQuery<"SELECT block_number AS num, block_hash AS hash FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ num: `${number}`; hash: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT mix of aliased and non-aliased columns', () => {
  type Result = TypedQuery<"SELECT block_number AS num, miner FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ num: `${number}`; miner: `0x${string}` }> }>>;
  expect(true).toBe(true);
});
