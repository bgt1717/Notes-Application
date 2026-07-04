import { useState, useEffect } from "react";
import jwtDecode from "jwt-decode";
import "./App.css";

const API = import.meta.env.VITE_API_URL;
const DEMO_KEY = "demo_notes";

/* ---------------- DEFAULT DEMO NOTES ---------------- */
const createDefaultDemoNotes = () => [
  {
    _id: crypto.randomUUID(),
    title: "Welcome to Notes App 👋",
    content:
      "• This is a demo note\n• You can edit me\n• You can delete me\n• Or create your own notes",
    updatedAt: new Date().toISOString(),
  },
  {
    _id: crypto.randomUUID(),
    title: "Features Included 🚀",
    content:
      "• JWT Authentication\n• Create, Edit, Delete Notes\n• Responsive Grid Layout\n• Demo Mode (LocalStorage)\n• Auto Bullet Formatting",
    updatedAt: new Date().toISOString(),
  },
];

/* ---------------- DEMO HELPERS ---------------- */
const loadDemoNotes = () => {
  try {
    const existing = JSON.parse(localStorage.getItem(DEMO_KEY));
    if (!existing || existing.length === 0) {
      const defaults = createDefaultDemoNotes();
      localStorage.setItem(DEMO_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return existing;
  } catch {
    const defaults = createDefaultDemoNotes();
    localStorage.setItem(DEMO_KEY, JSON.stringify(defaults));
    return defaults;
  }
};

const saveDemoNotes = (notes) => {
  localStorage.setItem(DEMO_KEY, JSON.stringify(notes));
};

/* ---------------- APP ---------------- */
function App() {
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem("token");
    if (!saved) return "";
    try {
      const decoded = jwtDecode(saved);
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        localStorage.removeItem("token");
        return "";
      }
      return saved;
    } catch {
      localStorage.removeItem("token");
      return "";
    }
  });

  const [user, setUser] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [isRegistering, setIsRegistering] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch {
      setUser(null);
    }
  }, [token]);

  /* ---------------- LOAD NOTES ---------------- */
  useEffect(() => {
    if (isDemo) {
      setNotes(loadDemoNotes());
      return;
    }
    if (!token) return;

    fetch(`${API}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .catch(console.error);
  }, [token, isDemo]);

  /* ---------------- RESET DEMO ---------------- */
  const handleResetDemo = () => {
    if (!window.confirm("Reset demo notes to default examples?")) return;
    const defaults = createDefaultDemoNotes();
    localStorage.setItem(DEMO_KEY, JSON.stringify(defaults));
    setNotes(defaults);
  };

  /* ---------------- BULLET HANDLER ---------------- */
const handleContentChange = (setter) => (e) => {
  let value = e.target.value;

  // split into lines
  let lines = value.split("\n");

  // remove bullets, then reapply cleanly
  lines = lines.map(line => {
    const cleaned = line.replace(/^•\s?/, "");
    return cleaned.trim() === "" ? "" : "• " + cleaned;
  });

  setter(lines.join("\n"));
};

  /* ---------------- ADD NOTE ---------------- */
  const handleAddNote = async () => {
    if (!title || !content) return;

    if (isDemo) {
      const newNote = {
        _id: crypto.randomUUID(),
        title,
        content,
        updatedAt: new Date().toISOString(),
      };
      const updated = [...notes, newNote];
      setNotes(updated);
      saveDemoNotes(updated);
      setTitle("");
      setContent("");
      setAddingNote(false);
      return;
    }

    const res = await fetch(`${API}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content }),
    });
    const newNote = await res.json();
    setNotes([...notes, newNote]);
    setTitle("");
    setContent("");
    setAddingNote(false);
  };

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note?")) return;

    if (isDemo) {
      const updated = notes.filter((n) => n._id !== id);
      setNotes(updated);
      saveDemoNotes(updated);
      return;
    }

    await fetch(`${API}/notes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotes(notes.filter((n) => n._id !== id));
  };

  /* ---------------- EDIT ---------------- */
  const startEditing = (note) => {
    setEditingNoteId(note._id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };
  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditTitle("");
    setEditContent("");
  };
  const saveEdit = async (id) => {
    if (isDemo) {
      const updated = notes.map((n) =>
        n._id === id
          ? { ...n, title: editTitle, content: editContent, updatedAt: new Date().toISOString() }
          : n
      );
      setNotes(updated);
      saveDemoNotes(updated);
      cancelEditing();
      return;
    }

    const res = await fetch(`${API}/notes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    const updatedNote = await res.json();
    setNotes(notes.map((n) => (n._id === id ? updatedNote : n)));
    cancelEditing();
  };

  /* ---------------- AUTH ACTIONS ---------------- */
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setIsRegistering(false);
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      alert("Login error: " + err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
        setIsRegistering(false);
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      alert("Registration error: " + err.message);
    }
  };

  /* ---------------- AUTH SCREEN ---------------- */
  if (!user && !isDemo) {
    return (
      <div className="auth">
        <h2>{isRegistering ? "Register" : "Login"}</h2>

        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">{isRegistering ? "Register" : "Login"}</button>
        </form>

        <button
          onClick={() => setIsDemo(true)}
          style={{
            background: "transparent",
            border: "2px dashed #4caf50",
            color: "#4caf50",
            padding: "10px",
            marginTop: "10px",
          }}
        >
          Try Demo
        </button>

        <p style={{ marginTop: "15px" }}>
          {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            style={{
              background: "none",
              border: "none",
              color: "#2196f3",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isRegistering ? "Login" : "Register"}
          </button>
        </p>
      </div>
    );
  }

  /* ---------------- APP UI ---------------- */
  return (
    <div className="app-container">
      <header>
        <h1>Notes App {isDemo && "(Demo)"}</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          {isDemo && (
            <>
              <button onClick={handleResetDemo}>Reset Demo</button>
              <button onClick={() => setIsDemo(false)}>Exit Demo</button>
            </>
          )}
          {user && <button onClick={handleLogout}>⏻</button>}
        </div>
      </header>

      {!addingNote ? (
        <button className="add-note-button" onClick={() => setAddingNote(true)}>
          + Add Note
        </button>
      ) : (
        <div className="note-form">
          <input
            className="note-input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="note-textarea"
            placeholder="Content"
            value={content}
            onChange={handleContentChange(setContent)}
          />
          <div className="actions">
            <button onClick={handleAddNote}>Add</button>
            <button onClick={() => setAddingNote(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="notes">
        {notes.map((note) => (
          <div className="note" key={note._id}>
            {editingNoteId === note._id ? (
              <div className="note-form">
                <input
                  className="note-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  className="note-textarea"
                  value={editContent}
                  onChange={handleContentChange(setEditContent)}
                />
                <div className="actions">
                  <button onClick={() => saveEdit(note._id)}>Save</button>
                  <button onClick={cancelEditing}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3>{note.title}</h3>
                <ul>
                  {note.content.split("\n").map((l, i) => (
                    <li key={i}>{l.replace(/^• /, "")}</li>
                  ))}
                </ul>
                <div className="timestamp">
                  Last updated: {new Date(note.updatedAt).toLocaleString()}
                </div>
                <div className="actions">
                  <button onClick={() => startEditing(note)}>✏️</button>
                  <button onClick={() => handleDelete(note._id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;