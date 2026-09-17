create table sf_umon_db.sf_metering_daily_history
(
    pkid                              bigint unsigned auto_increment
        primary key,
    service_type                      varchar(64)                               not null,
    usage_date                        date                                      not null,
    credits_used_compute              decimal(38, 10) default 0.0000000000      not null,
    credits_used_cloud_services       decimal(38, 10) default 0.0000000000      not null,
    credits_used                      decimal(38, 10) default 0.0000000000      not null,
    credits_adjustment_cloud_services decimal(38, 10) default 0.0000000000      not null,
    credits_billed                    decimal(38, 10) default 0.0000000000      not null,
    created_at                        datetime        default CURRENT_TIMESTAMP not null,
    up_dt                             datetime        default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint uq_metering_date_service
        unique (usage_date, service_type)
);

create index idx_metering_service_type
    on sf_umon_db.sf_metering_daily_history (service_type);

create index idx_metering_up_dt
    on sf_umon_db.sf_metering_daily_history (up_dt);


