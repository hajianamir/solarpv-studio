CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS simulation_timeseries (
    time_bucket TIMESTAMPTZ NOT NULL,
    simulation_run_id UUID NOT NULL,
    poa_irradiance_w_m2 REAL NOT NULL,
    ac_power_kw REAL NOT NULL,
    dc_power_kw REAL NOT NULL
);

SELECT create_hypertable('simulation_timeseries', 'time_bucket', if_not_exists => TRUE);
