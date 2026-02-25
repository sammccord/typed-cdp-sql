/**
 * End-to-end tests for complex queries matching complex-queries.sql.
 * Tests both runtime SQL generation and compile-time type inference.
 */

import { test, expect } from 'bun:test'
import { cdp } from '../../src/builder'
import type { InferRow } from '../../src/builder'
import type { Expect, Equal } from '../helpers'

// ── Query 1: Complex ownership evaluation (CTE + argMax + :: cast) ───────────

test('complex ownership evaluation query', () => {
  const q = cdp
    .with('latest_per_recipient', (qb) =>
      qb
        .selectFrom('base.events')
        .select((eb) => [
          eb.map('parameters', 'recipient').as('recipient'),
          eb.argMax(
            eb.castAs(eb.map('parameters', 'totalClaimed'), 'UInt256'),
            eb.col('timestamp'),
          ).as('total_claimed'),
          eb.argMax(eb.map('parameters', 'vestingEndTime'), eb.col('timestamp')).as(
            'vesting_end_time',
          ),
          eb.argMax(eb.map('parameters', 'vestingStartTime'), eb.col('timestamp')).as(
            'vesting_start_time',
          ),
        ])
        .where(
          'event_signature',
          '=',
          'CreatorVestingClaimed(address,uint256,uint256,uint256,uint256)',
        )
        .where('timestamp', '>', '2025-10-01')
        .groupBy((eb) => eb.map('parameters', 'recipient')),
    )
    .selectFrom('latest_per_recipient')
    .select(['recipient', 'total_claimed', 'vesting_start_time', 'vesting_end_time'])
    .select((eb) => [
      eb
        .divide(
          eb.toUInt256(eb.col('total_claimed')),
          eb.toUInt256(eb.val('1000000000000000000')),
        )
        .as('total_claimed_tokens'),
    ])
    .limit(10)
    .compile()

  expect(q.sql).toBe(
    "WITH latest_per_recipient AS (" +
      "SELECT parameters['recipient'] AS recipient, " +
      "argMax(parameters['totalClaimed']::UInt256, timestamp) AS total_claimed, " +
      "argMax(parameters['vestingEndTime'], timestamp) AS vesting_end_time, " +
      "argMax(parameters['vestingStartTime'], timestamp) AS vesting_start_time " +
      "FROM base.events " +
      "WHERE event_signature = 'CreatorVestingClaimed(address,uint256,uint256,uint256,uint256)' AND timestamp > '2025-10-01' " +
      "GROUP BY parameters['recipient']" +
      ") " +
      "SELECT recipient, total_claimed, vesting_start_time, vesting_end_time, " +
      "divide(toUInt256(total_claimed), toUInt256('1000000000000000000')) AS total_claimed_tokens " +
      "FROM latest_per_recipient LIMIT 10",
  )

  // Type inference checks
  // Note: Simplify collapses `${number}` | string → string (subtype)
  type Result1 = InferRow<typeof q>
  type _check1 = Expect<
    Equal<
      Result1,
      {
        recipient: string | boolean
        total_claimed: `${number}`
        vesting_start_time: string | boolean
        vesting_end_time: string | boolean
        total_claimed_tokens: `${number}`
      }
    >
  >
})

// ── Query 2: Nested log event data (nested functions + GROUP BY expressions) ─

test('nested log event data query', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.map('parameters', 'coin').as('coin'),
      eb.map('parameters', 'currency').as('currency'),
      eb
        .sum(
          eb.cast(
            eb.replaceAll(
              eb.index(
                eb.splitByChar(eb.val(' '), eb.castAs(eb.map('parameters', 'marketRewards'), 'String')),
                1,
              ),
              eb.val('{'),
              eb.val(''),
            ),
            'UInt64',
          ),
        )
        .as('market_rewards'),
    ])
    .where(
      'event_signature',
      '=',
      'CoinMarketRewardsV4(address,address,address,address,address,address,address,(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))',
    )
    .where((eb) =>
      eb.eq(
        eb.map('parameters', 'payoutRecipient'),
        eb.lower(eb.val('0x0bC5f409e4d9298B93E98920276128b89280d832')),
      ),
    )
    .groupBy((eb) => [
      eb.map('parameters', 'coin'),
      eb.map('parameters', 'currency'),
    ])
    .compile()

  expect(q.sql).toBe(
    "SELECT parameters['coin'] AS coin, parameters['currency'] AS currency, " +
      "sum(CAST(replaceAll(splitByChar(' ', parameters['marketRewards']::String)[1], '{', '') AS UInt64)) AS market_rewards " +
      "FROM base.events " +
      "WHERE event_signature = 'CoinMarketRewardsV4(address,address,address,address,address,address,address,(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))' " +
      "AND parameters['payoutRecipient'] = lower('0x0bC5f409e4d9298B93E98920276128b89280d832') " +
      "GROUP BY parameters['coin'], parameters['currency']",
  )

  // Type inference checks
  type Result2 = InferRow<typeof q>
  type _check2 = Expect<
    Equal<
      Result2,
      {
        coin: string | boolean
        currency: string | boolean
        market_rewards: `${number}`
      }
    >
  >
})

// ── Query 3: Typed parameters (simple event extraction) ──────────────────────

test('typed parameters query', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.map('parameters', 'from').as('sender'),
      eb.map('parameters', 'to').as('to'),
      eb.map('parameters', 'value').as('amount'),
    ])
    .select('address as token_address')
    .where(
      'event_signature',
      '=',
      'Transfer(address,address,uint256)',
    )
    .where('address', '=', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913')
    .limit(10)
    .compile()

  expect(q.sql).toBe(
    "SELECT parameters['from'] AS sender, parameters['to'] AS to, parameters['value'] AS amount, " +
      "address AS token_address " +
      "FROM base.events " +
      "WHERE event_signature = 'Transfer(address,address,uint256)' " +
      "AND address = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' " +
      "LIMIT 10",
  )

  // Type inference checks
  type Result = InferRow<typeof q>
  type _check = Expect<
    Equal<
      Result,
      {
        sender: boolean | `${number}` | string
        to: boolean | `${number}` | string
        amount: boolean | `${number}` | string
        token_address: `0x${string}`
      }
    >
  >
})
