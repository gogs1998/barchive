-- D1 migration: 0008_email_nocase.sql
-- Make the users.email unique index case-insensitive so that `Foo@x.com` and
-- `foo@x.com` collide (M2). The app also lowercases emails on register/login/
-- reset, so this index is defence-in-depth against case-variant duplicates.
--
-- NOTE: not run as part of the offline test suite (the in-memory D1 fake builds
-- its schema directly). Apply against real D1 with `wrangler d1 migrations apply`.
--
-- SQLite cannot alter an existing index's collation in place, so drop and
-- recreate the unique index with COLLATE NOCASE. The column itself keeps its
-- stored casing; only uniqueness/lookups become case-insensitive.

DROP INDEX IF EXISTS ix_users_email;

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email
    ON users (email COLLATE NOCASE);
