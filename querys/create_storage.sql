create table sf_umon_db.sf_storage_usage
(
    pkid           bigint unsigned auto_increment
        primary key,
    usage_date     date                                  not null,
    storage_bytes  decimal(38) default 0                 not null,
    stage_bytes    decimal(38) default 0                 not null,
    failsafe_bytes decimal(38) default 0                 not null,
    created_at     datetime    default CURRENT_TIMESTAMP not null,
    up_dt          datetime    default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint uq_storage_usage_date
        unique (usage_date)
);

create index idx_storage_usage_up_dt
    on sf_umon_db.sf_storage_usage (up_dt);
