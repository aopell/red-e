CREATE TABLE IF NOT EXISTS event_availability (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    event BIGINT NOT NULL,
    "user" TEXT NOT NULL,
    availability_level TEXT NOT NULL REFERENCES enum_availability_level(level) ON UPDATE CASCADE,
    time_available TIMESTAMP,
    reminder_count INT NOT NULL DEFAULT 0,
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uniq_event_user UNIQUE(event, "user"),
    CONSTRAINT fk_event FOREIGN KEY (event) REFERENCES event(id)
);