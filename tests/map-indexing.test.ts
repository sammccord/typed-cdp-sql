import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('SELECT map indexing with alias', () => {
  type Result = TypedQuery<"SELECT parameters['from'] AS sender FROM base.events">;
  type _check = Expect<Equal<Result, { result: Array<{ sender: boolean | `${number}` | string }> }>>;
  expect(true).toBe(true);
});

test('SELECT multiple map indexing expressions', () => {
  type Result = TypedQuery<"SELECT parameters['from'] AS sender, parameters['to'] AS receiver, parameters['value'] AS amount FROM base.events">;
  type _check = Expect<Equal<Result, { result: Array<{
    sender: boolean | `${number}` | string;
    receiver: boolean | `${number}` | string;
    amount: boolean | `${number}` | string;
  }> }>>;
  expect(true).toBe(true);
});

test('SELECT parameter_types map indexing', () => {
  type Result = TypedQuery<"SELECT parameter_types['from'] AS from_type FROM base.events">;
  type _check = Expect<Equal<Result, { result: Array<{ from_type: string }> }>>;
  expect(true).toBe(true);
});

test('real-world USDC transfer query', () => {
  type Result = TypedQuery<"SELECT parameters['from'] AS sender, parameters['to'] AS recipient, parameters['value'] AS amount FROM base.events WHERE event_signature = 'Transfer(address,address,uint256)' LIMIT 10">;
  type _check = Expect<Equal<Result, { result: Array<{
    sender: boolean | `${number}` | string;
    recipient: boolean | `${number}` | string;
    amount: boolean | `${number}` | string;
  }> }>>;
  expect(true).toBe(true);
});
