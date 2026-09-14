-- up_storage_30.sql

-- 1. 상용 트랜잭션 갭락(Gap Lock) 방지 및 안전 모드 설정
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET autocommit = 0;
START TRANSACTION;

-- 2. 고속 적재용 세션 임시 테이블 생성 (실제 테이블 구조 LIKE 복제: pkid 컬럼 포함)
DROP TEMPORARY TABLE IF EXISTS temp_storage_staging;
CREATE TEMPORARY TABLE temp_storage_staging LIKE sf_storage_usage;

-- 3. CSV 파일 임시 테이블로 벌크 로드 (tmp_storage_30.csv)
LOAD DATA LOCAL INFILE 'tmp_storage.csv'
INTO TABLE temp_storage_staging
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(
    usage_date,
    storage_bytes,
    stage_bytes,
    failsafe_bytes
);

-- 4. 본 테이블로 세트(Set) 기반 원자적 UPSERT 병합
-- uq_storage_usage_date (usage_date) 충돌 시 최신 바이트 수치로 갱신
INSERT INTO sf_storage_usage (
    usage_date,
    storage_bytes,
    stage_bytes,
    failsafe_bytes
)
SELECT
    usage_date,
    storage_bytes,
    stage_bytes,
    failsafe_bytes
FROM temp_storage_staging
ORDER BY usage_date ASC -- 인덱스 순서 정렬로 데드락(Deadlock) 방지
ON DUPLICATE KEY UPDATE
    storage_bytes = VALUES(storage_bytes),
    stage_bytes   = VALUES(stage_bytes),
    failsafe_bytes   = VALUES(failsafe_bytes);
    -- up_dt는 DEFAULT_GENERATED on update CURRENT_TIMESTAMP에 의해 자동 갱신됨

-- 5. 임시 테이블 정리 및 영구 커밋
DROP TEMPORARY TABLE IF EXISTS temp_storage_staging;
COMMIT;
SET autocommit = 1;
