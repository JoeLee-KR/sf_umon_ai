create table sf_umon_db.sf_monthly_billing
(
    id                 int auto_increment
        primary key,
    billing_month      varchar(7)                            not null,
    start_date         varchar(10)                           not null,
    end_date           varchar(10)                           not null,
    storage_tb_avg     double      default 0                 not null,
    storage_unit_price double      default 5.225             not null,
    storage_cost       double      default 0                 not null,
    com_sf_credits     double      default 0                 not null,
    com_sf_unit_price  double      default 2                 not null,
    com_sf_cost        double      default 0                 not null,
    com_ai_credits     double      default 0                 not null,
    com_ai_unit_price  double      default 2                 not null,
    com_ai_cost        double      default 0                 not null,
    ai_token_credits   double      default 0                 not null,
    ai_token_cost      double      default 0                 not null,
    total_cost         double      default 0                 not null,
    status             varchar(10) default 'ACTIVE'          not null,
    note               text                                  null,
    confirmed_at       datetime    default CURRENT_TIMESTAMP not null,
    created_at         datetime    default CURRENT_TIMESTAMP not null,
    updated_at         datetime    default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP
)
    charset = utf8mb4;

create index idx_billing_month
    on sf_umon_db.sf_monthly_billing (billing_month);

create index idx_status
    on sf_umon_db.sf_monthly_billing (status);

