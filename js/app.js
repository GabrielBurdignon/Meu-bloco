/**
 * Bloco de notas simples (localStorage)
 * - Cria/edita/apaga notas
 * - Autosave
 * - Busca
 */

const STORAGE_KEY = "meu_bloco_v1";

const els = {
  notesList: document.getElementById("notesList"),
  btnNew: document.getElementById("btnNew"),
  btnRename: document.getElementById("btnRename"),
  btnDelete: document.getElementById("btnDelete"),
  search: document.getElementById("search"),
  title: document.getElementById("title"),
  content: document.getElementById("content"),
  status: document.getElementById("status"),
  meta: document.getElementById("meta"),
};

let state = {
  notes: [],
  activeId: null,
  search: "",
  saveTimer: null,
};

function uid() {
  // ID simples e suficiente
  return "n_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function nowISO() {
  return new Date().toISOString();
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.notes)) state.notes = parsed.notes;
    if (typeof parsed.activeId === "string") state.activeId = parsed.activeId;
  } catch (e) {
    console.warn("Falha ao carregar:", e);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    notes: state.notes,
    activeId: state.activeId
  }));
}

function setStatus(text) {
  els.status.textContent = text;
}

function setMeta() {
  const count = (els.content.value || "").length;
  els.meta.textContent = `${count} caracteres`;
}

function getActiveNote() {
  return state.notes.find(n => n.id === state.activeId) || null;
}

function sortNotes() {
  // mais recentes primeiro
  state.notes.sort((a,b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function createNote() {
  const id = uid();
  const note = {
    id,
    title: "Sem título",
    content: "",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  state.notes.unshift(note);
  state.activeId = id;
  persist();
  render();
  focusEditor();
}

function deleteActive() {
  const note = getActiveNote();
  if (!note) return;

  const ok = confirm(`Apagar a nota "${note.title}"?`);
  if (!ok) return;

  state.notes = state.notes.filter(n => n.id !== note.id);
  state.activeId = state.notes[0]?.id ?? null;
  persist();
  render();
}

function renameActive() {
  const note = getActiveNote();
  if (!note) return;

  const newTitle = prompt("Novo título:", note.title);
  if (newTitle === null) return;

  const trimmed = newTitle.trim();
  note.title = trimmed.length ? trimmed : "Sem título";
  note.updatedAt = nowISO();
  persist();
  render();
}

function setActive(id) {
  state.activeId = id;
  persist();
  render();
}

function renderList() {
  const term = state.search.trim().toLowerCase();

  const filtered = state.notes.filter(n => {
    if (!term) return true;
    const hay = `${n.title}\n${n.content}`.toLowerCase();
    return hay.includes(term);
  });

  els.notesList.innerHTML = "";

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.className = "note";
    li.style.opacity = "0.7";
    li.textContent = "Nenhuma nota encontrada.";
    els.notesList.appendChild(li);
    return;
  }

  for (const note of filtered) {
    const li = document.createElement("li");
    li.className = "note" + (note.id === state.activeId ? " active" : "");
    li.addEventListener("click", () => setActive(note.id));

    const title = document.createElement("div");
    title.className = "note-title";
    title.textContent = note.title || "Sem título";

    const snippet = document.createElement("div");
    snippet.className = "note-snippet";
    snippet.textContent = (note.content || "").replace(/\s+/g, " ").trim().slice(0, 80) || "—";

    const meta = document.createElement("div");
    meta.className = "note-meta";
    const updated = note.updatedAt ? new Date(note.updatedAt) : null;
    meta.textContent = updated ? `Atualizada: ${updated.toLocaleString()}` : "";

    li.appendChild(title);
    li.appendChild(snippet);
    li.appendChild(meta);

    els.notesList.appendChild(li);
  }
}

function renderEditor() {
  const note = getActiveNote();

  const disabled = !note;

  els.title.disabled = disabled;
  els.content.disabled = disabled;
  els.btnRename.disabled = disabled;
  els.btnDelete.disabled = disabled;

  if (!note) {
    els.title.value = "";
    els.content.value = "";
    setStatus("Crie uma nota para começar");
    setMeta();
    return;
  }

  els.title.value = note.title || "Sem título";
  els.content.value = note.content || "";
  setStatus("Pronto");
  setMeta();
}

function render() {
  sortNotes();
  renderList();
  renderEditor();
}

function scheduleSave() {
  // debounce simples
  clearTimeout(state.saveTimer);
  setStatus("Digitando…");
  state.saveTimer = setTimeout(() => {
    saveActiveFromUI();
  }, 250);
}

function saveActiveFromUI() {
  const note = getActiveNote();
  if (!note) return;

  note.title = (els.title.value || "").trim() || "Sem título";
  note.content = els.content.value || "";
  note.updatedAt = nowISO();

  persist();
  renderList(); // não re-renderiza o editor pra não “pular” cursor
  setStatus("Salvo");
  setMeta();
}

function focusEditor() {
  setTimeout(() => els.content.focus(), 0);
}

// Eventos
els.btnNew.addEventListener("click", createNote);
els.btnDelete.addEventListener("click", deleteActive);
els.btnRename.addEventListener("click", renameActive);

els.search.addEventListener("input", (e) => {
  state.search = e.target.value || "";
  renderList();
});

els.title.addEventListener("input", scheduleSave);
els.content.addEventListener("input", scheduleSave);

// Atalhos
document.addEventListener("keydown", (e) => {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveActiveFromUI();
  }
  if (mod && e.key.toLowerCase() === "n") {
    e.preventDefault();
    createNote();
  }
  if (mod && e.key.toLowerCase() === "f") {
    // focar busca do lado esquerdo
    e.preventDefault();
    els.search.focus();
  }
});

// Boot
load();
if (!state.notes.length) {
  // cria uma nota inicial
  state.notes = [{
    id: uid(),
    title: "Bem-vindo",
    content: "Escreva aqui suas anotações.\n\nDicas:\n- Ctrl+N cria uma nota\n- Ctrl+S salva\n- Ctrl+F foca a busca",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }];
  state.activeId = state.notes[0].id;
  persist();
}

render();
