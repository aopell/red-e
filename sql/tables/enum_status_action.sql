CREATE TABLE IF NOT EXISTS enum_status_action (
    status_action TEXT PRIMARY KEY
);

INSERT INTO enum_status_action (status_action) VALUES
    ('UNKNOWN'),
    ('UNAVAILABLE'),
    ('MAYBE'),
    ('AVAILABLE_LATER'),
    ('AVAILABLE'),
    ('ACTIVE'),
    ('DONE'),
    -- Below values are not valid "availability_level"
    ('AGREE'),
    ('LATE'),
    ('TIMESPAN'),
    ('CLOCK_HOUR');