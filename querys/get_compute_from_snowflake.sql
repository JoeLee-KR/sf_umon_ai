--
-- snowflake: compute, raw data, 
-- Full RAW data, all usage with SERVICE_TYPE
DESC TABLE snowflake.account_usage.metering_daily_history;

SELECT 
  USAGE_DATE, 
  service_type,
  credits_used_compute,
  credits_used_cloud_services,
  credits_used,
  credits_adjustment_cloud_services,
  credits_billed
FROM snowflake.account_usage.metering_daily_history
WHERE usage_date >= date('2026-09-01') 
    -- AND usage_date <= date('2026-04-30')
ORDER BY USAGE_DATE DESC, SERVICE_TYPE ASC

--

;
