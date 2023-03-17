CREATE TABLE IF NOT EXISTS custom_status_action (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    guild TEXT,
    status_action TEXT REFERENCES enum_status_action(status_action) ON UPDATE CASCADE,
    name TEXT,
    color INT,
    emoji TEXT,
    value INT,
    CONSTRAINT uniq_guild_status_value UNIQUE(guild, status_action, value)
);