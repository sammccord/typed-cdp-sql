import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('extra spaces between keywords', () => {
  type Result = TypedQuery<"SELECT   block_number   FROM   base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('leading and trailing whitespace', () => {
  type Result = TypedQuery<"  SELECT block_number FROM base.blocks  ">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('trailing semicolon', () => {
  type Result = TypedQuery<"SELECT block_number FROM base.blocks;">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('newlines in query', () => {
  type Result = TypedQuery<"SELECT\n  block_number,\n  block_hash\nFROM\n  base.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}`; block_hash: `0x${string}` }> }>>;
  expect(true).toBe(true);
});

test('tabs in query', () => {
  type Result = TypedQuery<"SELECT\tblock_number\tFROM\tbase.blocks">;
  type _check = Expect<Equal<Result, { result: Array<{ block_number: `${number}` }> }>>;
  expect(true).toBe(true);
});
