# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts: a small browser client that proves the front end can talk to a REST API (using the JSONPlaceholder practice API), and the design documents the backend team will build from.

## How to run the API client

1. Clone the repository:
   ```
   git clone https://github.com/<your-username>/quicknotes-system-design.git
   cd quicknotes-system-design
   ```
2. Open `index.html` in a browser (or serve the folder with `python -m http.server` and visit `http://localhost:8000`).
3. Click **Load notes** to fetch 10 notes (GET), fill in the form to add a note (POST), and use **Delete** on a note to remove it (DELETE).

Note: JSONPlaceholder fakes writes. It returns a response for new notes but does not save them, so notes created in the page are only deleted locally (explained in a comment in `api.js`).

## Features

- GET, POST and DELETE with a reusable `request()` helper using `fetch`
- Loading, success, error and empty states shown in the page
- Title validation (required, max 100 characters)
- Buttons disabled while requests run
- User text inserted with `textContent` only

## Design documents

- [API design](docs/api-design.md): REST endpoints, JSON examples and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes and SQL vs NoSQL
- [Architecture](docs/architecture.md): requirements, load estimates, diagram, request flows and trade-offs

## What I learned

1. A reusable `request()` function that checks `response.ok` keeps error handling in one place, because `fetch` does not throw on 404 or 500 by itself.
2. Good API design uses nouns in paths, the right HTTP methods and accurate status codes (201 for create, 204 for delete, 400/401/403/404 for client errors).
3. Back-of-the-envelope estimates show whether a system is read-heavy or write-heavy, which decides where to add caches and replicas.
4. Removing single points of failure means every layer (DNS, load balancer, app servers, cache, database) needs a second copy.
5. Fake APIs like JSONPlaceholder do not store data, so the client has to be designed to handle that sensibly.
