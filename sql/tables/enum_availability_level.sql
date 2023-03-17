CREATE TABLE IF NOT EXISTS enum_availability_level (
    level TEXT PRIMARY KEY
);

INSERT INTO enum_availability_level (level) VALUES
    ('UNKNOWN'),
    ('UNAVAILABLE'),
    ('MAYBE'),
    ('AVAILABLE_LATER'),
    ('AVAILABLE'),
    ('ACTIVE'),
    ('DONE');