import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('CAST to uint64', () => {
  type Result = TypedQuery<"SELECT CAST(value AS uint64) AS val FROM base.transfers">;
  type _check = Expect<Equal<Result, { result: Array<{ val: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('CAST to String', () => {
  type Result = TypedQuery<"SELECT CAST(block_number AS String) AS block_str FROM base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ block_str: string }> }>>;
  expect(true).toBe(true);
});
