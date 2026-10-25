"use strict";

const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const form = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");
const list = document.getElementById("notes-list");

let notes = [];       // notes currently shown (newest created first)
let busy = false;     // true while any request is running

function setStatus(message, type) {
  statusEl.textContent = message;     // textContent only, never innerHTML
  statusEl.className = type || "";
}

function setBusy(value) {
  busy = value;
  loadBtn.disabled = value;
  submitBtn.disabled = value;
  list.querySelectorAll("button.delete").forEach((b) => (b.disabled = value));
}

// Reusable request helper: calls fetch, checks response.ok, throws on errors.
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json().catch(() => ({})); // DELETE may return {}
  return { data, status: response.status };
}

// ---- GET ----
async function getNotes() {
  const { data } = await request(`${API_URL}?_limit=10`);
  return data;
}

// ---- POST ----
async function createNote(title, body) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ title, body, userId: 1 }),
  });
}

// ---- DELETE ----
// JSONPlaceholder is a fake API: it never stores notes we create, so a note
async function deleteNote(note) {
  if (note.local) return { status: 200 };
  return request(`${API_URL}/${note.id}`, { method: "DELETE" });
}

// ---- Rendering (empty state included) ----
function render() {
  list.replaceChildren();
  if (notes.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No notes to show yet.";
    list.appendChild(li);
    return;
  }
  for (const note of notes) {
    const li = document.createElement("li");

    const h = document.createElement("h3");
    h.className = "note-title";
    h.textContent = note.title;

    const p = document.createElement("p");
    p.className = "note-body";
    p.textContent = note.body || "";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete";
    del.textContent = "Delete";
    del.disabled = busy;
    del.addEventListener("click", () => handleDelete(note));

    li.append(h, p, del);
    list.appendChild(li);
  }
}

// ---- Handlers ----
async function handleLoad() {
  setBusy(true);
  setStatus("Loading notes...", "info");
  try {
    notes = await getNotes();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (err) {
    notes = [];
    setStatus("Sorry, we could not load your notes. Please try again.", "error");
    console.error(err);
  } finally {
    setBusy(false);
    render();
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) return setStatus("A title is required.", "error");
  if (title.length > 100) {
    return setStatus("The title must be 100 characters or fewer.", "error");
  }

  setBusy(true);
  setStatus("Saving note...", "info");
  try {
    const { data, status } = await createNote(title, body);
    notes.unshift({ ...data, title, body, local: true });
    form.reset();
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
  } catch (err) {
    setStatus("Sorry, we could not save your note. Please try again.", "error");
    console.error(err);
  } finally {
    setBusy(false);
    render();
  }
}

async function handleDelete(note) {
  setBusy(true);
  setStatus("Deleting note...", "info");
  try {
    await deleteNote(note);
    notes = notes.filter((n) => n !== note);
    setStatus("Note deleted.", "success");
  } catch (err) {
    setStatus("Sorry, we could not delete that note. Please try again.", "error");
    console.error(err);
  } finally {
    setBusy(false);
    render();
  }
}

loadBtn.addEventListener("click", handleLoad);
form.addEventListener("submit", handleSubmit);
render(); // show the empty state on first load
