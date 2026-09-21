--
-- snowflake: storage, raw data, 
-- Full RAW data
DESC TABLE snowflake.account_usage.storage_usage;

SELECT  usage_date
        , storage_bytes / power(1024,4)
        , stage_bytes / power(1024,4)
        , failsafe_bytes / power(1024,4)
        , (storage_bytes + stage_bytes + failsafe_bytes) / power(1024,4)
FROM snowflake.account_usage.storage_usage
WHERE usage_date >= date('2026-03-01')
ORDER BY    usage_date DESC
-- LIMIT 10

--
-- mysql storage raw data schema
-- sf_umon_db.sf_storage_usage definition

CREATE TABLE `sf_metering_daily_history` (
  `pkid` bigint unsigned NOT NULL AUTO_INCREMENT,
  `service_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usage_date` date NOT NULL,
  `credits_used_compute` decimal(38,10) NOT NULL DEFAULT '0.0000000000',
  `credits_used_cloud_services` decimal(38,10) NOT NULL DEFAULT '0.0000000000',
  `credits_used` decimal(38,10) NOT NULL DEFAULT '0.0000000000',
  `credits_adjustment_cloud_services` decimal(38,10) NOT NULL DEFAULT '0.0000000000',
  `credits_billed` decimal(38,10) NOT NULL DEFAULT '0.0000000000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `up_dt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pkid`),
  UNIQUE KEY `uq_metering_date_service` (`usage_date`,`service_type`),
  KEY `idx_metering_service_type` (`service_type`),
  KEY `idx_metering_up_dt` (`up_dt`)
) ENGINE=InnoDB AUTO_INCREMENT=1144 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
;
