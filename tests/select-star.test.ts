import { test, expect } from 'bun:test';
import type { TypedQuery } from '../src/index';
import type { Expect, Equal } from './helpers';

test('SELECT * FROM base.blocks', () => {
  type Result = TypedQuery<"SELECT * FROM base.blocks">;
  type Row = Result['result'][number];

  type _1 = Expect<Equal<Row['block_number'], `${number}`>>;
  type _2 = Expect<Equal<Row['block_hash'], `0x${string}`>>;
  type _3 = Expect<Equal<Row['timestamp'], string>>;
  type _4 = Expect<Equal<Row['miner'], `0x${string}`>>;
  type _5 = Expect<Equal<Row['gas_used'], `${number}`>>;
  type _6 = Expect<Equal<Row['action'], number>>;
  type _7 = Expect<Equal<Row['total_difficulty'], string>>;
  expect(true).toBe(true);
});

test('SELECT * FROM base.events', () => {
  type Result = TypedQuery<"SELECT * FROM base.events">;
  type Row = Result['result'][number];

  type _1 = Expect<Equal<Row['event_name'], string>>;
  type _2 = Expect<Equal<Row['topics'], `0x${string}`[]>>;
  type _3 = Expect<Equal<Row['address'], `0x${string}`>>;
  type _4 = Expect<Equal<Row['parameters'], Record<string, boolean | `${number}` | string>>>;
  type _5 = Expect<Equal<Row['parameter_types'], Record<string, string>>>;
  type _6 = Expect<Equal<Row['block_number'], `${number}`>>;
  expect(true).toBe(true);
});

test('SELECT * FROM base.transactions', () => {
  type Result = TypedQuery<"SELECT * FROM base.transactions">;
  type Row = Result['result'][number];

  type _1 = Expect<Equal<Row['transaction_hash'], `0x${string}`>>;
  type _2 = Expect<Equal<Row['from_address'], `0x${string}`>>;
  type _3 = Expect<Equal<Row['is_system_tx'], boolean>>;
  type _4 = Expect<Equal<Row['blob_versioned_hashes'], `0x${string}`[]>>;
  type _5 = Expect<Equal<Row['value'], string>>;
  type _6 = Expect<Equal<Row['gas'], `${number}`>>;
  expect(true).toBe(true);
});

test('SELECT * FROM base.encoded_logs', () => {
  type Result = TypedQuery<"SELECT * FROM base.encoded_logs">;
  type Row = Result['result'][number];

  type _1 = Expect<Equal<Row['block_number'], `${number}`>>;
  type _2 = Expect<Equal<Row['log_index'], number>>;
  type _3 = Expect<Equal<Row['topics'], `0x${string}`[]>>;
  type _4 = Expect<Equal<Row['address'], `0x${string}`>>;
  expect(true).toBe(true);
});

test('SELECT * FROM base.transfers', () => {
  type Result = TypedQuery<"SELECT * FROM base.transfers">;
  type Row = Result['result'][number];

  type _1 = Expect<Equal<Row['token_address'], `0x${string}`>>;
  type _2 = Expect<Equal<Row['value'], `${number}`>>;
  type _3 = Expect<Equal<Row['log_index'], number>>;
  type _4 = Expect<Equal<Row['from_address'], `0x${string}`>>;
  expect(true).toBe(true);
});
