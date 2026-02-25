/**
 * Runtime SQL compilation tests for the query builder.
 * Tests that .compile().sql produces correct ClickHouse SQL strings.
 */

import { test, expect } from 'bun:test'
import { cdp } from '../../src/builder'

// ── Basic SELECT ─────────────────────────────────────────────────────────────

test('select single column', () => {
  const q = cdp.selectFrom('base.blocks').select('block_number').compile()
  expect(q.sql).toBe('SELECT block_number FROM base.blocks')
})

test('select multiple columns', () => {
  const q = cdp.selectFrom('base.blocks').select(['block_number', 'block_hash']).compile()
  expect(q.sql).toBe('SELECT block_number, block_hash FROM base.blocks')
})

test('select *', () => {
  const q = cdp.selectFrom('base.blocks').selectAll().compile()
  expect(q.sql).toBe('SELECT * FROM base.blocks')
})

test('select distinct', () => {
  const q = cdp.selectFrom('base.events').select('address').distinct().compile()
  expect(q.sql).toBe('SELECT DISTINCT address FROM base.events')
})

test('select with alias string', () => {
  const q = cdp.selectFrom('base.blocks').select('block_number as num').compile()
  expect(q.sql).toBe('SELECT block_number AS num FROM base.blocks')
})

test('select additive (chained calls)', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .select('block_number')
    .select('block_hash')
    .compile()
  expect(q.sql).toBe('SELECT block_number, block_hash FROM base.blocks')
})

test('unqualified table name', () => {
  const q = cdp.selectFrom('events').select('address').compile()
  expect(q.sql).toBe('SELECT address FROM events')
})

// ── WHERE ────────────────────────────────────────────────────────────────────

test('where with string value', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .where('address', '=', '0x1234')
    .compile()
  expect(q.sql).toBe("SELECT address FROM base.events WHERE address = '0x1234'")
})

test('where with number value', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .select('block_number')
    .where('block_number', '>', 1000)
    .compile()
  expect(q.sql).toBe('SELECT block_number FROM base.blocks WHERE block_number > 1000')
})

test('multiple where (implicit AND)', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .where('event_signature', '=', 'Transfer(address,address,uint256)')
    .where('block_number', '>', 100)
    .compile()
  expect(q.sql).toBe(
    "SELECT address FROM base.events WHERE event_signature = 'Transfer(address,address,uint256)' AND block_number > 100",
  )
})

test('where with expression builder callback', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .where((eb) => eb.eq(eb.col('address'), '0x1234'))
    .compile()
  expect(q.sql).toBe("SELECT address FROM base.events WHERE address = '0x1234'")
})

// ── GROUP BY ─────────────────────────────────────────────────────────────────

test('group by single column', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .groupBy('address')
    .compile()
  expect(q.sql).toBe('SELECT address FROM base.events GROUP BY address')
})

test('group by multiple columns', () => {
  const q = cdp
    .selectFrom('base.events')
    .select(['address', 'event_name'])
    .groupBy(['address', 'event_name'])
    .compile()
  expect(q.sql).toBe('SELECT address, event_name FROM base.events GROUP BY address, event_name')
})

// ── ORDER BY ─────────────────────────────────────────────────────────────────

test('order by ascending', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .select('block_number')
    .orderBy('block_number', 'asc')
    .compile()
  expect(q.sql).toBe('SELECT block_number FROM base.blocks ORDER BY block_number ASC')
})

test('order by descending', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .select('block_number')
    .orderBy('block_number', 'desc')
    .compile()
  expect(q.sql).toBe('SELECT block_number FROM base.blocks ORDER BY block_number DESC')
})

// ── LIMIT ────────────────────────────────────────────────────────────────────

test('limit', () => {
  const q = cdp.selectFrom('base.blocks').select('block_number').limit(10).compile()
  expect(q.sql).toBe('SELECT block_number FROM base.blocks LIMIT 10')
})

// ── HAVING ───────────────────────────────────────────────────────────────────

test('having clause', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.col('address').as('addr'), eb.count().as('cnt')])
    .groupBy('address')
    .having('cnt', '>', 5)
    .compile()
  expect(q.sql).toBe(
    'SELECT address AS addr, count(*) AS cnt FROM base.events GROUP BY address HAVING cnt > 5',
  )
})

// ── JOINs ────────────────────────────────────────────────────────────────────

test('inner join', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .innerJoin('base.transactions', 'base.blocks.block_number', '=', 'base.transactions.block_number')
    .select(['block_number', 'transaction_hash'])
    .compile()
  expect(q.sql).toBe(
    'SELECT block_number, transaction_hash FROM base.blocks ' +
      'INNER JOIN base.transactions ON base.blocks.block_number = base.transactions.block_number',
  )
})

test('inner join with alias', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .innerJoin('base.transactions as t', 'base.blocks.block_number', '=', 't.block_number')
    .select(['block_number', 't.transaction_hash'])
    .compile()
  expect(q.sql).toBe(
    'SELECT block_number, t.transaction_hash FROM base.blocks ' +
      'INNER JOIN base.transactions AS t ON base.blocks.block_number = t.block_number',
  )
})

test('left join', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .leftJoin('base.events', 'base.blocks.block_number', '=', 'base.events.block_number')
    .select(['block_number', 'address'])
    .compile()
  expect(q.sql).toBe(
    'SELECT block_number, address FROM base.blocks ' +
      'LEFT JOIN base.events ON base.blocks.block_number = base.events.block_number',
  )
})

// ── Expression Builder in SELECT ─────────────────────────────────────────────

test('expression builder: map access', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.map('parameters', 'from').as('sender')])
    .compile()
  expect(q.sql).toBe("SELECT parameters['from'] AS sender FROM base.events")
})

test('expression builder: count aggregate', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.count().as('total')])
    .compile()
  expect(q.sql).toBe('SELECT count(*) AS total FROM base.events')
})

test('expression builder: sum aggregate', () => {
  const q = cdp
    .selectFrom('base.transfers')
    .select((eb) => [eb.sum(eb.col('value')).as('total_value')])
    .compile()
  expect(q.sql).toBe('SELECT sum(value) AS total_value FROM base.transfers')
})

test('expression builder: cast', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.cast(eb.map('parameters', 'value'), 'UInt256').as('amount')])
    .compile()
  expect(q.sql).toBe("SELECT CAST(parameters['value'] AS UInt256) AS amount FROM base.events")
})

test('expression builder: double-colon cast', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.castAs(eb.map('parameters', 'totalClaimed'), 'UInt256').as('claimed'),
    ])
    .compile()
  expect(q.sql).toBe("SELECT parameters['totalClaimed']::UInt256 AS claimed FROM base.events")
})

test('expression builder: function call', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.lower(eb.col('address')).as('lower_addr'),
    ])
    .compile()
  expect(q.sql).toBe('SELECT lower(address) AS lower_addr FROM base.events')
})

test('expression builder: argMax', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.argMax(eb.map('parameters', 'totalClaimed'), eb.col('timestamp')).as('latest_claimed'),
    ])
    .compile()
  expect(q.sql).toBe(
    "SELECT argMax(parameters['totalClaimed'], timestamp) AS latest_claimed FROM base.events",
  )
})

test('expression builder: raw SQL', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.raw<string>("replaceAll(address, '0x', '')").as('clean_addr'),
    ])
    .compile()
  expect(q.sql).toBe("SELECT replaceAll(address, '0x', '') AS clean_addr FROM base.events")
})

test('expression builder: val literal', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.divide(eb.col('block_number'), eb.val(100)).as('divided'),
    ])
    .compile()
  expect(q.sql).toBe('SELECT divide(block_number, 100) AS divided FROM base.events')
})

// ── GROUP BY with expression builder ─────────────────────────────────────────

test('group by with expression builder', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [eb.map('parameters', 'coin').as('coin')])
    .groupBy((eb) => eb.map('parameters', 'coin'))
    .compile()
  expect(q.sql).toBe(
    "SELECT parameters['coin'] AS coin FROM base.events GROUP BY parameters['coin']",
  )
})

// ── CTE (WITH) ───────────────────────────────────────────────────────────────

test('simple CTE', () => {
  const q = cdp
    .with('recent', (qb) =>
      qb.selectFrom('base.blocks').select('block_number').limit(10),
    )
    .selectFrom('recent')
    .select('block_number')
    .compile()
  expect(q.sql).toBe(
    'WITH recent AS (SELECT block_number FROM base.blocks LIMIT 10) SELECT block_number FROM recent',
  )
})

test('CTE with expression builder', () => {
  const q = cdp
    .with('latest', (qb) =>
      qb
        .selectFrom('base.events')
        .select((eb) => [
          eb.map('parameters', 'recipient').as('recipient'),
          eb.argMax(
            eb.castAs(eb.map('parameters', 'totalClaimed'), 'UInt256'),
            eb.col('timestamp'),
          ).as('total_claimed'),
        ])
        .where('event_signature', '=', 'CreatorVestingClaimed(address,uint256,uint256,uint256,uint256)')
        .groupBy((eb) => eb.map('parameters', 'recipient')),
    )
    .selectFrom('latest')
    .select(['recipient', 'total_claimed'])
    .limit(10)
    .compile()
  expect(q.sql).toBe(
    "WITH latest AS (SELECT parameters['recipient'] AS recipient, " +
      "argMax(parameters['totalClaimed']::UInt256, timestamp) AS total_claimed " +
      "FROM base.events " +
      "WHERE event_signature = 'CreatorVestingClaimed(address,uint256,uint256,uint256,uint256)' " +
      "GROUP BY parameters['recipient']) " +
      'SELECT recipient, total_claimed FROM latest LIMIT 10',
  )
})

// ── WHERE with expression builder (OR, AND) ──────────────────────────────────

test('where with OR expression', () => {
  const q = cdp
    .selectFrom('base.events')
    .select('address')
    .where((eb) =>
      eb.or(
        eb.eq(eb.col('address'), '0x1234'),
        eb.eq(eb.col('address'), '0x5678'),
      ),
    )
    .compile()
  expect(q.sql).toBe(
    "SELECT address FROM base.events WHERE (address = '0x1234' OR address = '0x5678')",
  )
})

// ── Combined clauses ─────────────────────────────────────────────────────────

test('full query with all clauses', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.col('address').as('addr'),
      eb.count().as('cnt'),
    ])
    .where('block_number', '>', 1000)
    .groupBy('address')
    .orderBy('address', 'asc')
    .limit(100)
    .compile()
  expect(q.sql).toBe(
    'SELECT address AS addr, count(*) AS cnt FROM base.events ' +
      'WHERE block_number > 1000 ' +
      'GROUP BY address ' +
      'ORDER BY address ASC ' +
      'LIMIT 100',
  )
})

// ── First-class ClickHouse functions ─────────────────────────────────────

test('string functions: upper, concat, substring', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.upper(eb.col('event_name')).as('upper_name'),
      eb.concat(eb.col('event_name'), eb.val(' - '), eb.col('address')).as('combined'),
      eb.substring(eb.col('event_name'), eb.val(1), eb.val(5)).as('prefix'),
    ])
    .compile()
  expect(q.sql).toBe(
    "SELECT upper(event_name) AS upper_name, concat(event_name, ' - ', address) AS combined, " +
      'substring(event_name, 1, 5) AS prefix ' +
      'FROM base.events',
  )
})

test('string functions: replaceAll, splitByChar, hex', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.replaceAll(eb.col('address'), eb.val('0x'), eb.val('')).as('clean'),
      eb.hex(eb.col('address')).as('hexed'),
    ])
    .compile()
  expect(q.sql).toBe(
    "SELECT replaceAll(address, '0x', '') AS clean, hex(address) AS hexed FROM base.events",
  )
})

test('math functions: multiply, plus, minus, modulo, abs', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .select((eb) => [
      eb.multiply(eb.col('gas_used'), eb.val(2)).as('doubled'),
      eb.plus(eb.col('gas_used'), eb.val(100)).as('added'),
      eb.minus(eb.col('gas_limit'), eb.col('gas_used')).as('remaining'),
      eb.modulo(eb.col('block_number'), eb.val(10)).as('mod'),
      eb.abs(eb.col('gas_used')).as('absolute'),
    ])
    .compile()
  expect(q.sql).toBe(
    'SELECT multiply(gas_used, 2) AS doubled, plus(gas_used, 100) AS added, ' +
      'minus(gas_limit, gas_used) AS remaining, modulo(block_number, 10) AS mod, ' +
      'abs(gas_used) AS absolute ' +
      'FROM base.blocks',
  )
})

test('type conversion: toUInt256, toUInt64, toString', () => {
  const q = cdp
    .selectFrom('base.transfers')
    .select((eb) => [
      eb.toUInt256(eb.col('value')).as('big_val'),
      eb.toUInt64(eb.col('block_number')).as('num'),
      eb.toStr(eb.col('block_number')).as('str_num'),
    ])
    .compile()
  expect(q.sql).toBe(
    'SELECT toUInt256(value) AS big_val, toUInt64(block_number) AS num, ' +
      'toString(block_number) AS str_num ' +
      'FROM base.transfers',
  )
})

test('date/time functions: toStartOfHour, toDate, now, dateDiff', () => {
  const q = cdp
    .selectFrom('base.blocks')
    .select((eb) => [
      eb.toStartOfHour(eb.col('timestamp')).as('hour'),
      eb.toDate(eb.col('timestamp')).as('date'),
      eb.now().as('current_time'),
      eb.dateDiff('day', eb.col('timestamp'), eb.now()).as('days_ago'),
    ])
    .compile()
  expect(q.sql).toBe(
    "SELECT toStartOfHour(timestamp) AS hour, toDate(timestamp) AS date, " +
      "now() AS current_time, dateDiff('day', timestamp, now()) AS days_ago " +
      'FROM base.blocks',
  )
})

test('aggregate functions: argMin, countDistinct, any, groupArray', () => {
  const q = cdp
    .selectFrom('base.events')
    .select((eb) => [
      eb.argMin(eb.col('address'), eb.col('block_number')).as('first_addr'),
      eb.countDistinct(eb.col('address')).as('unique_addrs'),
      eb.any(eb.col('event_name')).as('some_event'),
      eb.groupArray(eb.col('address')).as('all_addrs'),
    ])
    .compile()
  expect(q.sql).toBe(
    'SELECT argMin(address, block_number) AS first_addr, count(DISTINCT address) AS unique_addrs, ' +
      'any(event_name) AS some_event, groupArray(address) AS all_addrs ' +
      'FROM base.events',
  )
})
