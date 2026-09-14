-- 메모리 기반 Staging 테이블을 거쳐 순수 ON DUPLICATE KEY UPDATE를 실행하는 구조 처리
-- 1. 트랜잭션 시작
START TRANSACTION;

-- 2. 적재용 세션 임시 테이블 생성 (세션 종료 시 자동 삭제됨)
CREATE TEMPORARY TABLE temp_metering_staging LIKE snowflake_metering_daily_history;

-- 3. CSV를 Staging 테이블로 초고속 적재 (인덱스 부하 없음)
-- e.g. LOAD DATA LOCAL INFILE '/절대경로/sample_metering_daily_history.csv'
LOAD DATA LOCAL 
INFILE '/Users/doogie/codes/sf_umon_ai/querys/sf_samples/tmp_compute_30.csv'
INTO TABLE temp_metering_staging
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' 
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(
    service_type, 
    usage_date, 
    credits_used_compute, 
    credits_used_cloud_services, 
    credits_used, 
    credits_adjustment_cloud_services, 
    credits_billed
);

-- 4. 본 테이블로 세트(Set) 기반 UPSERT 병합 실행
INSERT INTO snowflake_metering_daily_history (
    service_type,
    usage_date,
    credits_used_compute,
    credits_used_cloud_services,
    credits_used,
    credits_adjustment_cloud_services,
    credits_billed
)
SELECT 
    service_type,
    usage_date,
    credits_used_compute,
    credits_used_cloud_services,
    credits_used,
    credits_adjustment_cloud_services,
    credits_billed
FROM temp_metering_staging
ON DUPLICATE KEY UPDATE
    credits_used_compute              = VALUES(credits_used_compute),
    credits_used_cloud_services       = VALUES(credits_used_cloud_services),
    credits_used                      = VALUES(credits_used),
    credits_adjustment_cloud_services = VALUES(credits_adjustment_cloud_services),
    credits_billed                    = VALUES(credits_billed);
    -- up_dt는 테이블 속성에 의해 자동 갱신됨

-- 5. 임시 테이블 정리 및 커밋
DROP TEMPORARY TABLE IF EXISTS temp_metering_staging;
COMMIT;
