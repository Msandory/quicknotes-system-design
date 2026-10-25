# QuickNotes API Design

Base URL: `https://api.quicknotes.example/v1`. All bodies are JSON. Authenticated endpoints need `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Description | Success status |
|--------|------|-------------|----------------|
| POST | `/auth/login` | Log in and receive a token | 200 OK |
| GET | `/notes` | List the current user's notes (supports `?page=1&limit=10&tag=work`) | 200 OK |
| POST | `/notes` | Create a note | 201 Created |
| GET | `/notes/{id}` | Get one note | 200 OK |
| PUT | `/notes/{id}` | Replace a note's title, body and tags | 200 OK |
| PATCH | `/notes/{id}` | Update part of a note | 200 OK |
| DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| GET | `/tags` | List the user's tags | 200 OK |
| POST | `/notes/{id}/tags` | Attach a tag to a note | 201 Created |
| DELETE | `/notes/{id}/tags/{tagId}` | Remove a tag from a note | 204 No Content |

## Create a note

`POST /notes`

Request:
```json
{
  "title": "Buy milk",
  "body": "2 litres, full cream",
  "tags": ["shopping"]
}
```

Response `201 Created` (with `Location: /v1/notes/101`):
```json
{
  "id": 101,
  "title": "Buy milk",
  "body": "2 litres, full cream",
  "tags": ["shopping"],
  "userId": 1,
  "createdAt": "2026-10-25T09:30:00Z",
  "updatedAt": "2026-10-25T09:30:00Z"
}
```

## List notes

`GET /notes?page=1&limit=2`

Response `200 OK`:
```json
{
  "data": [
    { "id": 101, "title": "Buy milk", "body": "2 litres, full cream",
      "tags": ["shopping"], "createdAt": "2026-10-25T09:30:00Z" },
    { "id": 100, "title": "Call Thandi", "body": "",
      "tags": [], "createdAt": "2026-10-24T16:05:00Z" }
  ],
  "page": 1,
  "limit": 2,
  "total": 57
}
```

## Error codes

| Status | When it happens |
|--------|-----------------|
| 400 Bad Request | Invalid input, e.g. missing title or title over 100 characters |
| 401 Unauthorized | Missing, invalid or expired token |
| 403 Forbidden | Valid token, but the note belongs to another user |
| 404 Not Found | The note or tag does not exist |
| 409 Conflict | Duplicate, e.g. tag already attached to the note |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Unexpected server failure |

Example error body (same shape for every error):
```json
{
  "error": {
    "code": 400,
    "message": "Validation failed",
    "details": [
      { "field": "title", "issue": "Title is required and must be 100 characters or fewer" }
    ]
  }
}
```
