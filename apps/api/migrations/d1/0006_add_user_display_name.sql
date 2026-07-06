-- D1 migration: 0006_add_user_display_name.sql
-- Adds an optional display name to users (collected at registration).

ALTER TABLE users ADD COLUMN display_name TEXT;
