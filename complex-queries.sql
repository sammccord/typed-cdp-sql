// Complex ownership evaluation
WITH latest_per_recipient AS (
  SELECT
    parameters['recipient'] AS recipient,
    argMax(parameters['totalClaimed']::UInt256, block_timestamp) AS total_claimed,
    argMax(parameters['vestingEndTime'], block_timestamp) AS vesting_end_time,
    argMax(parameters['vestingStartTime'], block_timestamp) AS vesting_start_time
  FROM base.events
  WHERE
    event_signature = 'CreatorVestingClaimed(address,uint256,uint256,uint256,uint256)'
    AND block_timestamp > '2025-10-01'
  GROUP BY parameters['recipient']
)
SELECT
  recipient,
  total_claimed,
  vesting_start_time,
  vesting_end_time,
  divide(toUInt256(total_claimed), toUInt256(1000000000000000000)) as total_claimed_tokens
FROM latest_per_recipient
LIMIT 10;

// Nested log event data
SELECT
    parameters ['coin'] as coin,
    parameters ['currency'] as currency,
    sum(
        (
            replaceAll(
                splitByChar(' ', parameters ['marketRewards']::String) [1],
                '{',
                ''
            )
        )::UInt64
    ) as market_rewards
FROM base.events
WHERE
    event_signature = 'CoinMarketRewardsV4(address,address,address,address,address,address,address,(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256))'
    AND parameters ['payoutRecipient'] = lower('0x0bC5f409e4d9298B93E98920276128b89280d832')
GROUP BY coin, currency;

// Typed Parameters
SELECT
  parameters['from'] AS sender,
  parameters['to'] AS to,
  parameters['value'] AS amount,
  address AS token_address
FROM base.events
WHERE
  event_signature = 'Transfer(address,address,uint256)'
  AND address = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
LIMIT 10;
