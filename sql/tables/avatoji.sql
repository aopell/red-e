CREATE TABLE IF NOT EXISTS avatoji (
    "user" TEXT PRIMARY KEY,
    emoji TEXT NOT NULL,
    premium BOOLEAN NOT NULL
);