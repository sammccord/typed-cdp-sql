import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('invalid SQL falls back gracefully', () => {
  type Result = TypedQuery<"some nonsense">;
  type _check = Expect<Equal<Result, { result: Array<Record<string, unknown>> }>>;
  expect(true).toBe(true);
});

test('empty string falls back', () => {
  type Result = TypedQuery<"">;
  type _check = Expect<Equal<Result, { result: Array<Record<string, unknown>> }>>;
  expect(true).toBe(true);
});

test('unknown table falls back', () => {
  type Result = TypedQuery<"SELECT col FROM unknown_table">;
  type _check = Expect<Equal<Result, { result: Array<Record<string, unknown>> }>>;
  expect(true).toBe(true);
});

test('SELECT without FROM falls back', () => {
  type Result = TypedQuery<"SELECT 1">;
  type _check = Expect<Equal<Result, { result: Array<Record<string, unknown>> }>>;
  expect(true).toBe(true);
});
