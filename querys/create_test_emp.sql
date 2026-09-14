show databases;
-- create Sample DB and user
-- 1. 데이터베이스 생성 (utf8mb4 권장)
CREATE DATABASE sf_umon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Node.js 전용 유저 생성 (비밀번호 인증 방식 지정)
CREATE USER 'sfumonai'@'localhost' IDENTIFIED WITH mysql_native_password BY '1234';

-- (참고) 보안강화 SHA-256 사용시
-- CREATE USER 'sfumonai'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'StrongPassword123!';

-- 3. 권한 부여
GRANT ALL PRIVILEGES ON sf_umon_db.* TO 'sfumonai'@'localhost';

-- 4. 반영 및 종료
FLUSH PRIVILEGES;


use sf_umon_db;

-- create sample table, case) employees
-- 1. 기존 테이블 정리 (존재 시 재성성 방어)
DROP TABLE IF EXISTS employees;

-- 2. 테이블 스키마 정의 (DDL)
CREATE TABLE employees
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '사원 고유 식별자',
    emp_no     VARCHAR(20)    NOT NULL UNIQUE COMMENT '사번 (고유값)',
    name       VARCHAR(50)    NOT NULL COMMENT '사원 성명',
    email      VARCHAR(100)   NOT NULL UNIQUE COMMENT '회사 이메일 주소',
    department VARCHAR(50)    NOT NULL COMMENT '소속 부서 (DEV, SALES, OPS, HR, QA)',
    position   VARCHAR(50)    NOT NULL COMMENT '직급 (LEAD, SENIOR, JUNIOR, MANAGER)',
    status     VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' COMMENT '재직 상태 (ACTIVE, LEAVE, RESIGNED)',
    salary     DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT '연봉 (단위: KRW)',
    hire_date  DATE           NOT NULL COMMENT '입사 일자',
    created_at DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '레코드 생성 시각',
    updated_at DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '레코드 갱신 시각',

    -- [운영 인덱스 설계]
    -- 1) 대시보드 기간 필터 및 부서별 집계 조회를 위한 복합 인덱스
    INDEX idx_emp_hire_dept (hire_date, department),
    -- 2) 재직자 목록 필터링용 인덱스
    INDEX idx_emp_status (status)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci COMMENT ='임직원 마스터 테이블';

desc employees;

-- 3. 실무형 샘플 데이터 10건 적재 (DML)
INSERT INTO employees
    (emp_no, name, email, department, position, status, salary, hire_date)
VALUES ('EMP-2021-001', '김도기', 'doogie.kim@example.com', 'DEV', 'LEAD', 'ACTIVE', 95000000.00, '2021-03-15'),
       ('EMP-2021-002', '이서진', 'seojin.lee@example.com', 'DEV', 'SENIOR', 'ACTIVE', 82000000.00, '2021-07-01'),
       ('EMP-2022-003', '박민우', 'minwoo.park@example.com', 'OPS', 'SENIOR', 'ACTIVE', 78000000.00, '2022-02-10'),
       ('EMP-2022-004', '최수아', 'sua.choi@example.com', 'SALES', 'MANAGER', 'ACTIVE', 75000000.00, '2022-05-20'),
       ('EMP-2023-005', '정도현', 'dohyun.jung@example.com', 'DEV', 'JUNIOR', 'ACTIVE', 55000000.00, '2023-01-09'),
       ('EMP-2023-006', '한지민', 'jimin.han@example.com', 'HR', 'SENIOR', 'ACTIVE', 68000000.00, '2023-04-17'),
       ('EMP-2023-007', '윤시후', 'sihu.yoon@example.com', 'QA', 'JUNIOR', 'ACTIVE', 50000000.00, '2023-09-01'),
       ('EMP-2024-008', '강채원', 'chaewon.kang@example.com', 'SALES', 'JUNIOR', 'ACTIVE', 48000000.00, '2024-02-01'),
       ('EMP-2024-009', '송하준', 'hajun.song@example.com', 'OPS', 'JUNIOR', 'LEAVE', 52000000.00, '2024-06-15'),
       ('EMP-2024-010', '임유나', 'yuna.lim@example.com', 'DEV', 'JUNIOR', 'RESIGNED', 54000000.00, '2024-08-01');

-- 4. 적재 결과 검증 쿼리
SELECT id,
       emp_no,
       name,
       department,
       position,
       status,
       FORMAT(salary, 0) AS formatted_salary,
       hire_date
FROM employees
ORDER BY id ASC;