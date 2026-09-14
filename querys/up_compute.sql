-- scripts/up_compute.sql

-- 1. 예외 발생 시 트랜잭션 롤백 및 안전 모드 설정
SET autocommit = 0;
START TRANSACTION;

-- 2. 적재용 세션 임시 테이블 생성 (연결 종료 시 자동 제거됨)
-- 메모리 엔진 기반으로 I/O 병목을 최소화하고 인덱스 없이 고속 적재 준비
DROP TEMPORARY TABLE IF EXISTS temp_metering_staging;
CREATE TEMPORARY TABLE temp_metering_staging LIKE sf_metering_daily_history;

-- 3. CSV 파일을 Staging 테이블로 벌크 로드
LOAD DATA LOCAL INFILE 'tmp_compute.csv'
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

-- 4. 본 테이블로 세트(Set) 기반 원자적 UPSERT 병합
-- uq_metering_date_service(usage_date, service_type) 유니크 인덱스를 통해 충돌 시 최신 값으로 업데이트
INSERT INTO sf_metering_daily_history (
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
ORDER BY usage_date ASC, service_type ASC -- Deadlock 예방을 위한 인덱스 순서 정렬
ON DUPLICATE KEY UPDATE
    credits_used_compute              = VALUES(credits_used_compute),
    credits_used_cloud_services       = VALUES(credits_used_cloud_services),
    credits_used                      = VALUES(credits_used),
    credits_adjustment_cloud_services = VALUES(credits_adjustment_cloud_services),
    credits_billed                    = VALUES(credits_billed);
    -- up_dt는 테이블 DDL의 ON UPDATE CURRENT_TIMESTAMP에 의해 자동 갱신됨

-- 5. 임시 테이블 정리 및 영구 반영
DROP TEMPORARY TABLE IF EXISTS temp_metering_staging;
COMMIT;
SET autocommit = 1;
