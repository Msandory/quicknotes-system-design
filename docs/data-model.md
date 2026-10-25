# QuickNotes Data Model

## Entities

**users**

| Column | Type | Key / notes |
|--------|------|-------------|
| id | BIGINT | Primary key, auto-increment |
| email | VARCHAR(255) | Unique, not null |
| password_hash | VARCHAR(255) | Not null |
| created_at | TIMESTAMP | Not null, default now |

**notes**

| Column | Type | Key / notes |
|--------|------|-------------|
| id | BIGINT | Primary key, auto-increment |
| user_id | BIGINT | Foreign key to users(id), not null |
| title | VARCHAR(100) | Not null |
| body | TEXT | Optional |
| created_at | TIMESTAMP | Not null, default now |
| updated_at | TIMESTAMP | Not null, default now |

**tags**

| Column | Type | Key / notes |
|--------|------|-------------|
| id | BIGINT | Primary key, auto-increment |
| user_id | BIGINT | Foreign key to users(id), not null |
| name | VARCHAR(50) | Not null, unique per user |

**note_tags** (join table)

| Column | Type | Key / notes |
|--------|------|-------------|
| note_id | BIGINT | Foreign key to notes(id); part of primary key |
| tag_id | BIGINT | Foreign key to tags(id); part of primary key |

Primary key of `note_tags` is `(note_id, tag_id)`.

## Relationships

- **One-to-many:** one user has many notes (`notes.user_id` -> `users.id`), and one user has many tags (`tags.user_id` -> `users.id`). Each note and tag belongs to exactly one user.
- **Many-to-many:** a note can have many tags and a tag can be on many notes. This is stored in the join table `note_tags`, which holds one row per note/tag pair.

## CREATE TABLE statements (PostgreSQL)

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tags (
  id      BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    VARCHAR(50) NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);
```

## Example queries

```sql
-- 1. Latest 10 notes for a user (page 1)
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;

-- 2. JOIN: all notes with a given tag
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 1 AND t.name = 'shopping';

-- 3. Number of notes per tag for a user
SELECT t.name, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 1
GROUP BY t.name;

-- 4. Delete a note (only if it belongs to the user)
DELETE FROM notes WHERE id = 101 AND user_id = 1;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id);
```

**Reason:** the most common query is "list this user's newest notes". Without `idx_notes_user_created` the database would scan the whole notes table; with it, it jumps straight to the user's rows already sorted by date. The second index speeds up "notes with this tag" lookups (the primary key already covers lookups by note_id).

## SQL or NoSQL?

I chose **SQL (PostgreSQL)**. The data is clearly structured and relational (users, notes, tags, and a many-to-many link), and we need integrity rules (foreign keys, unique tags per user) and JOINs for tag queries. A relational database handles 1 million users comfortably with indexes and a read replica, and it gives strong consistency so a saved note is never lost. NoSQL would help if we needed very flexible documents or huge write scale, which QuickNotes does not need at this stage.
