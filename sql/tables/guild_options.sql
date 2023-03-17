CREATE TABLE IF NOT EXISTS guild_options (
    guild TEXT PRIMARY KEY,
    invited TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    inviter TEXT,
    timezone TEXT,
    late_messages TEXT[],
    late_message_times INTEGER[],
    availability_role TEXT,
    voice_channels TEXT[],
    authorized_user_role TEXT
);