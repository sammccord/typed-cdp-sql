import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('real-world: query USDC transfers from events', () => {
  type Result = TypedQuery<"SELECT parameters['from'] AS sender, parameters['to'] AS to, parameters['value'] AS amount FROM base.events WHERE event_signature = 'Transfer(address,address,uint256)'">;
  type Row = Result['result'][number];
  type _1 = Expect<Equal<Row['sender'], boolean | `${number}` | string>>;
  type _2 = Expect<Equal<Row['to'], boolean | `${number}` | string>>;
  type _3 = Expect<Equal<Row['amount'], boolean | `${number}` | string>>;
  expect(true).toBe(true);
});

test('real-world: latest blocks with gas info', () => {
  type Result = TypedQuery<"SELECT block_number, gas_used, gas_limit, base_fee_per_gas FROM base.blocks ORDER BY block_number DESC LIMIT 100">;
  type _check = Expect<Equal<Result, { result: Array<{
    block_number: `${number}`;
    gas_used: `${number}`;
    gas_limit: `${number}`;
    base_fee_per_gas: `${number}`;
  }> }>>;
  expect(true).toBe(true);
});

test('real-world: token transfers with addresses', () => {
  type Result = TypedQuery<"SELECT token_address, from_address, to_address, value FROM base.transfers WHERE token_address = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' LIMIT 50">;
  type _check = Expect<Equal<Result, { result: Array<{
    token_address: `0x${string}`;
    from_address: `0x${string}`;
    to_address: `0x${string}`;
    value: `${number}`;
  }> }>>;
  expect(true).toBe(true);
});

test('real-world: count aggregate', () => {
  type Result = TypedQuery<"SELECT count(*) AS total FROM base.transactions WHERE from_address = '0x1234'">;
  type _check = Expect<Equal<Result, { result: Array<{ total: `${number}` }> }>>;
  expect(true).toBe(true);
});

test('SELECT with GROUP BY and ORDER BY', () => {
  type Result = TypedQuery<"SELECT miner, count(*) AS block_count FROM base.blocks GROUP BY miner ORDER BY block_count DESC LIMIT 10">;
  type _check = Expect<Equal<Result, { result: Array<{
    miner: `0x${string}`;
    block_count: `${number}`;
  }> }>>;
  expect(true).toBe(true);
});

test('multiline real-world query', () => {
  type Result = TypedQuery<`
    SELECT
      block_number,
      transaction_hash,
      from_address,
      to_address,
      value
    FROM base.transactions
    WHERE to_address = '0xdead'
    ORDER BY block_number DESC
    LIMIT 25
  `>;
  type _check = Expect<Equal<Result, { result: Array<{
    block_number: `${number}`;
    transaction_hash: `0x${string}`;
    from_address: `0x${string}`;
    to_address: `0x${string}`;
    value: string;
  }> }>>;
  expect(true).toBe(true);
});
