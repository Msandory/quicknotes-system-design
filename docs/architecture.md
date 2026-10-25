# QuickNotes Architecture

## Requirements

**Functional**
- Users register and log in.
- Users create, read, update and delete their own notes.
- Users tag notes and filter notes by tag.
- Users list their notes with pagination.

**Non-functional**
- **Scale:** support 1 million users.
- **Availability:** 99.9% uptime, no single point of failure.
- **Latency:** list and create requests under 300 ms at the 95th percentile.
- **Durability:** a saved note is never lost (replication and backups).
- **Security:** HTTPS everywhere, hashed passwords, users can only access their own notes.

## Load estimate (1 million users)

Assumptions: 30% are active each day (300,000 DAU); each active user lists notes 20 times a day and creates 5 notes a day; 1 day is about 100,000 seconds; peak is 5x average; an average note with metadata is about 2 KB.

| Measure | Calculation | Average | Peak (5x) |
|---------|-------------|---------|-----------|
| Reads/s | 300,000 x 20 = 6,000,000/day / 100,000 | **60/s** | 300/s |
| Writes/s | 300,000 x 5 = 1,500,000/day / 100,000 | **15/s** | 75/s |
| Storage/year | 1,500,000 x 2 KB = 3 GB/day x 365 | **about 1.1 TB/year** | |

The system is **read-heavy** (about 4 reads per write), so we use a cache and read replica. Load is small enough that a few app servers are plenty; the design is more about reliability than raw capacity.

## Architecture diagram

```
                      +---------+
                      | Client  |  (browser / mobile)
                      +----+----+
                           |
                      +----v----+
                      |   DNS   |
                      +----+----+
                           |
              static files |            API calls
            +--------------+--------------+
            v                             v
       +---------+                 +--------------+
       |   CDN   |                 | Load Balancer|  (2 instances)
       +---------+                 +------+-------+
                                          |
                          +---------------+---------------+
                          v                               v
                    +-----------+                   +-----------+
                    | App Server|                   | App Server|   (2 or more)
                    +-----+-----+                   +-----+-----+
                          |                               |
         +----------------+-------------+-----------------+
         |                |             |
         v                v             v
    +---------+   +---------------+  +--------+
    |  Cache  |   | Primary DB    |  | Queue  |
    | (Redis) |   | (writes)      |  +---+----+
    +---------+   +-------+-------+      |
                          | replication  v
                          v          +--------+
                  +---------------+  | Worker |  (emails, search index,
                  | Read Replica  |  +--------+   cleanup, backups)
                  | (reads)       |
                  +---------------+
```

## What each component does

- **Client:** the browser or mobile app that users interact with and that calls our API.
- **DNS:** turns `quicknotes.example` into the address of our load balancer or CDN, and can route around a failed site.
- **CDN:** serves static files (HTML, CSS, JS) from locations near the user so pages load faster and our servers do less work.
- **Load balancer:** spreads requests across the app servers and stops sending traffic to any that fail health checks.
- **App servers:** run the API logic (auth, validation, notes) and are stateless, so we can add more when load grows.
- **Cache (Redis):** keeps recent note lists in memory so repeated reads do not hit the database.
- **Primary database:** stores all data and accepts every write, with strong consistency.
- **Read replica:** a live copy of the primary that handles read queries, and can be promoted if the primary fails.
- **Queue:** holds background jobs so the API can respond immediately instead of waiting for slow work.
- **Worker:** takes jobs from the queue and does the slow work (welcome emails, search indexing, clean-up) outside the request.

## Request flows

### GET /notes
1. The client sends `GET /notes?page=1` with its token; DNS resolves to the load balancer.
2. The load balancer forwards it to a healthy app server.
3. The app server validates the token and finds the user id.
4. It looks in the **cache** for `notes:{userId}:page1`.
5. **Cache hit:** return the cached JSON right away (200 OK).
6. **Cache miss:** query the **read replica**, store the result in the cache with a short expiry (e.g. 60 s), and return it (200 OK).

### POST /notes
1. The client sends `POST /notes` with JSON and its token.
2. The load balancer forwards it to an app server.
3. The app server validates the token and the input (title required, max 100 characters); invalid input returns 400.
4. It inserts the note into the **primary database**.
5. It deletes the user's cached note-list keys so the next read is fresh.
6. It puts a job on the **queue** (e.g. update the search index).
7. It returns `201 Created` with the new note and a `Location` header.
8. A **worker** later picks up the job and completes it; if it fails, the job is retried.

## Trade-offs

1. **Cache vs freshness.** The cache cuts database load and latency, but a cached list can be briefly out of date. We reduce this by deleting the user's cache keys on every write and using a short expiry. Eventual consistency of a few seconds is fine for notes.
2. **Read replica vs replication lag.** Replicas scale reads and give a failover copy, but replication is asynchronous, so a user may not see a note they just created if the read hits a lagging replica. We can read from the primary for a short time after a write.
3. **SQL vs scale.** One primary database is simple and consistent, but all writes go through one machine. At 75 writes/s peak that is fine; if we grow far beyond that, we would shard by user id.
4. **Queue vs simplicity.** The queue and worker make the API faster and more resilient, but add more parts to run and monitor, and work completes slightly later.

## Avoiding single points of failure

- **DNS:** use a managed DNS provider with multiple name servers.
- **Load balancer:** run two or more instances (active-active, or one with a floating IP failover).
- **App servers:** two or more, stateless, in different availability zones, so losing one does not stop the service.
- **Cache:** Redis with a replica and automatic failover; if the cache is down the app falls back to the database.
- **Database:** primary with a read replica that can be promoted automatically, plus daily backups and point-in-time recovery.
- **Queue and workers:** a replicated managed queue and several workers; jobs are retried and failed jobs go to a dead-letter queue.
- **Monitoring:** health checks and alerts on every layer.
