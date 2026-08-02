import { useEffect, useMemo, useState } from "react";
import jwtDecode from "jwt-decode";

import API from "./api/axios";
import "./App.css";

const DEMO_NOTES_KEY = "demo_notes";
const DEMO_FOLDERS_KEY = "demo_folders";

const ALL_NOTES = "all";
const UNCATEGORIZED = "uncategorized";

/* =========================================================
   DEFAULT DEMO DATA
========================================================= */

const createDefaultDemoFolders = () => [
  {
    _id: "demo-personal",
    name: "Personal",
  },
  {
    _id: "demo-work",
    name: "Work",
  },
  {
    _id: "demo-ideas",
    name: "Ideas",
  },
];

const createDefaultDemoNotes = () => {
  const now = new Date().toISOString();

  return [
    {
      _id: crypto.randomUUID(),
      title: "Welcome to Notes App 👋",
      content:
        "• Select a folder from the sidebar\n• Create your own folders\n• Add, edit, and delete notes\n• Reset the demo at any time",
      folder: {
        _id: "demo-personal",
        name: "Personal",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: crypto.randomUUID(),
      title: "Project Tasks",
      content:
        "• Finish the folder feature\n• Test note filtering\n• Improve the mobile layout",
      folder: {
        _id: "demo-work",
        name: "Work",
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: crypto.randomUUID(),
      title: "Application Ideas",
      content:
        "• Add pinned notes\n• Add search\n• Add note colors\n• Add dark mode",
      folder: {
        _id: "demo-ideas",
        name: "Ideas",
      },
      createdAt: now,
      updatedAt: now,
    },
  ];
};

/* =========================================================
   DEMO STORAGE HELPERS
========================================================= */

const saveDemoNotes = (notes) => {
  localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(notes));
};

const saveDemoFolders = (folders) => {
  localStorage.setItem(DEMO_FOLDERS_KEY, JSON.stringify(folders));
};

const loadDemoFolders = () => {
  try {
    const storedFolders = JSON.parse(
      localStorage.getItem(DEMO_FOLDERS_KEY)
    );

    if (Array.isArray(storedFolders) && storedFolders.length > 0) {
      return storedFolders;
    }

    const defaultFolders = createDefaultDemoFolders();
    saveDemoFolders(defaultFolders);

    return defaultFolders;
  } catch {
    const defaultFolders = createDefaultDemoFolders();
    saveDemoFolders(defaultFolders);

    return defaultFolders;
  }
};

const loadDemoNotes = () => {
  try {
    const storedNotes = JSON.parse(
      localStorage.getItem(DEMO_NOTES_KEY)
    );

    if (Array.isArray(storedNotes) && storedNotes.length > 0) {
      return storedNotes;
    }

    const defaultNotes = createDefaultDemoNotes();
    saveDemoNotes(defaultNotes);

    return defaultNotes;
  } catch {
    const defaultNotes = createDefaultDemoNotes();
    saveDemoNotes(defaultNotes);

    return defaultNotes;
  }
};

/* =========================================================
   FOLDER HELPERS
========================================================= */

const getFolderId = (note) => {
  if (!note.folder) {
    return null;
  }

  if (typeof note.folder === "string") {
    return note.folder;
  }

  return note.folder._id;
};

const getFolderName = (note) => {
  if (!note.folder) {
    return "Uncategorized";
  }

  if (typeof note.folder === "object") {
    return note.folder.name || "Folder";
  }

  return "Folder";
};

/* =========================================================
   APP
========================================================= */

function App() {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("token");

    if (!savedToken) {
      return "";
    }

    try {
      const decoded = jwtDecode(savedToken);

      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        localStorage.removeItem("token");
        return "";
      }

      return savedToken;
    } catch {
      localStorage.removeItem("token");
      return "";
    }
  });

  const [user, setUser] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);

  const [selectedFolderId, setSelectedFolderId] =
    useState(ALL_NOTES);

  const [addingNote, setAddingNote] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newNoteFolderId, setNewNoteFolderId] = useState("");

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFolderId, setEditFolderId] = useState("");

  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderForm, setShowFolderForm] = useState(false);

  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  /* =========================================================
     AUTH STATE
  ========================================================= */

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch {
      localStorage.removeItem("token");
      setToken("");
      setUser(null);
    }
  }, [token]);

  /* =========================================================
     LOAD NOTES AND FOLDERS
  ========================================================= */

  useEffect(() => {
    if (isDemo) {
      setFolders(loadDemoFolders());
      setNotes(loadDemoNotes());
      return;
    }

    if (!token) {
      setFolders([]);
      setNotes([]);
      return;
    }

    const loadAppData = async () => {
      setLoading(true);

      try {
        const [foldersResponse, notesResponse] = await Promise.all([
          API.get("/folders"),
          API.get("/notes"),
        ]);

        setFolders(foldersResponse.data);
        setNotes(notesResponse.data);
      } catch (err) {
        handleApiError(err, "Unable to load your notes");
      } finally {
        setLoading(false);
      }
    };

    loadAppData();
  }, [token, isDemo]);

  /* =========================================================
     FILTERED NOTES
  ========================================================= */

  const filteredNotes = useMemo(() => {
    if (selectedFolderId === ALL_NOTES) {
      return notes;
    }

    if (selectedFolderId === UNCATEGORIZED) {
      return notes.filter((note) => !getFolderId(note));
    }

    return notes.filter(
      (note) => getFolderId(note) === selectedFolderId
    );
  }, [notes, selectedFolderId]);

  const selectedFolderName = useMemo(() => {
    if (selectedFolderId === ALL_NOTES) {
      return "All Notes";
    }

    if (selectedFolderId === UNCATEGORIZED) {
      return "Uncategorized";
    }

    const folder = folders.find(
      (item) => item._id === selectedFolderId
    );

    return folder?.name || "Notes";
  }, [folders, selectedFolderId]);

  /* =========================================================
     API ERROR HANDLER
  ========================================================= */

  const handleApiError = (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      setToken("");
      setUser(null);

      alert("Your session expired. Please log in again.");
      return;
    }

    alert(err.response?.data?.message || fallbackMessage);
  };

  /* =========================================================
     AUTH ACTIONS
  ========================================================= */

  const handleLogin = async (e) => {
    e.preventDefault();

    const email = e.currentTarget.email.value.trim();
    const password = e.currentTarget.password.value;

    setAuthLoading(true);

    try {
      const response = await API.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      setToken(response.data.token);
      setIsRegistering(false);
    } catch (err) {
      handleApiError(err, "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const email = e.currentTarget.email.value.trim();
    const password = e.currentTarget.password.value;

    setAuthLoading(true);

    try {
      const response = await API.post("/auth/register", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      setToken(response.data.token);
      setIsRegistering(false);
    } catch (err) {
      handleApiError(err, "Registration failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");

    setToken("");
    setUser(null);
    setNotes([]);
    setFolders([]);
    setSelectedFolderId(ALL_NOTES);
  };

  const handleExitDemo = () => {
    setIsDemo(false);
    setNotes([]);
    setFolders([]);
    setSelectedFolderId(ALL_NOTES);
    cancelEditing();
    cancelAddingNote();
  };

  /* =========================================================
     DEMO RESET
  ========================================================= */

  const handleResetDemo = () => {
    const shouldReset = window.confirm(
      "Reset demo folders and notes to the default examples?"
    );

    if (!shouldReset) {
      return;
    }

    const defaultFolders = createDefaultDemoFolders();
    const defaultNotes = createDefaultDemoNotes();

    saveDemoFolders(defaultFolders);
    saveDemoNotes(defaultNotes);

    setFolders(defaultFolders);
    setNotes(defaultNotes);
    setSelectedFolderId(ALL_NOTES);

    cancelEditing();
    cancelAddingNote();
    cancelFolderEditing();

    setShowFolderForm(false);
    setNewFolderName("");
  };

  /* =========================================================
     FOLDER ACTIONS
  ========================================================= */

  const handleCreateFolder = async (e) => {
    e.preventDefault();

    const name = newFolderName.trim();

    if (!name) {
      return;
    }

    if (isDemo) {
      const duplicateFolder = folders.some(
        (folder) =>
          folder.name.toLowerCase() === name.toLowerCase()
      );

      if (duplicateFolder) {
        alert("A folder with this name already exists.");
        return;
      }

      const newFolder = {
        _id: crypto.randomUUID(),
        name,
      };

      const updatedFolders = [...folders, newFolder].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setFolders(updatedFolders);
      saveDemoFolders(updatedFolders);

      setNewFolderName("");
      setShowFolderForm(false);
      setSelectedFolderId(newFolder._id);

      return;
    }

    try {
      const response = await API.post("/folders", {
        name,
      });

      const updatedFolders = [...folders, response.data].sort(
        (a, b) => a.name.localeCompare(b.name)
      );

      setFolders(updatedFolders);
      setSelectedFolderId(response.data._id);
      setNewFolderName("");
      setShowFolderForm(false);
    } catch (err) {
      handleApiError(err, "Unable to create folder");
    }
  };

  const startFolderEditing = (folder) => {
    setEditingFolderId(folder._id);
    setEditingFolderName(folder.name);
  };

  const cancelFolderEditing = () => {
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const handleRenameFolder = async (folderId) => {
    const name = editingFolderName.trim();

    if (!name) {
      return;
    }

    if (isDemo) {
      const duplicateFolder = folders.some(
        (folder) =>
          folder._id !== folderId &&
          folder.name.toLowerCase() === name.toLowerCase()
      );

      if (duplicateFolder) {
        alert("A folder with this name already exists.");
        return;
      }

      const updatedFolders = folders
        .map((folder) =>
          folder._id === folderId
            ? {
                ...folder,
                name,
              }
            : folder
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      const updatedNotes = notes.map((note) => {
        if (getFolderId(note) !== folderId) {
          return note;
        }

        return {
          ...note,
          folder: {
            _id: folderId,
            name,
          },
        };
      });

      setFolders(updatedFolders);
      setNotes(updatedNotes);

      saveDemoFolders(updatedFolders);
      saveDemoNotes(updatedNotes);

      cancelFolderEditing();
      return;
    }

    try {
      const response = await API.put(`/folders/${folderId}`, {
        name,
      });

      setFolders((currentFolders) =>
        currentFolders
          .map((folder) =>
            folder._id === folderId ? response.data : folder
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setNotes((currentNotes) =>
        currentNotes.map((note) => {
          if (getFolderId(note) !== folderId) {
            return note;
          }

          return {
            ...note,
            folder: {
              _id: response.data._id,
              name: response.data.name,
            },
          };
        })
      );

      cancelFolderEditing();
    } catch (err) {
      handleApiError(err, "Unable to rename folder");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = folders.find(
      (item) => item._id === folderId
    );

    const shouldDelete = window.confirm(
      `Delete the "${
        folder?.name || "selected"
      }" folder? Its notes will move to Uncategorized.`
    );

    if (!shouldDelete) {
      return;
    }

    if (isDemo) {
      const updatedFolders = folders.filter(
        (item) => item._id !== folderId
      );

      const updatedNotes = notes.map((note) =>
        getFolderId(note) === folderId
          ? {
              ...note,
              folder: null,
              updatedAt: new Date().toISOString(),
            }
          : note
      );

      setFolders(updatedFolders);
      setNotes(updatedNotes);

      saveDemoFolders(updatedFolders);
      saveDemoNotes(updatedNotes);

      if (selectedFolderId === folderId) {
        setSelectedFolderId(UNCATEGORIZED);
      }

      cancelFolderEditing();
      return;
    }

    try {
      await API.delete(`/folders/${folderId}`);

      setFolders((currentFolders) =>
        currentFolders.filter(
          (folderItem) => folderItem._id !== folderId
        )
      );

      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          getFolderId(note) === folderId
            ? {
                ...note,
                folder: null,
              }
            : note
        )
      );

      if (selectedFolderId === folderId) {
        setSelectedFolderId(UNCATEGORIZED);
      }

      cancelFolderEditing();
    } catch (err) {
      handleApiError(err, "Unable to delete folder");
    }
  };

  /* =========================================================
     NOTE FORM HELPERS
  ========================================================= */

  const openAddNoteForm = () => {
    setAddingNote(true);

    if (
      selectedFolderId !== ALL_NOTES &&
      selectedFolderId !== UNCATEGORIZED
    ) {
      setNewNoteFolderId(selectedFolderId);
    } else {
      setNewNoteFolderId("");
    }
  };

  const cancelAddingNote = () => {
    setAddingNote(false);
    setTitle("");
    setContent("");
    setNewNoteFolderId("");
  };

  const handleContentChange = (setter) => (e) => {
    let value = e.target.value;

    if (!value) {
      setter("");
      return;
    }

    if (!value.startsWith("• ")) {
      value = `• ${value}`;
    }

    value = value.replace(/\n(?!• )/g, "\n• ");

    setter(value);
  };

  /* =========================================================
     CREATE NOTE
  ========================================================= */

  const handleAddNote = async () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      alert("Please enter a title and note content.");
      return;
    }

    const folderId = newNoteFolderId || null;

    if (isDemo) {
      const selectedFolder = folders.find(
        (folder) => folder._id === folderId
      );

      const now = new Date().toISOString();

      const newNote = {
        _id: crypto.randomUUID(),
        title: cleanTitle,
        content: cleanContent,
        folder: selectedFolder
          ? {
              _id: selectedFolder._id,
              name: selectedFolder.name,
            }
          : null,
        createdAt: now,
        updatedAt: now,
      };

      const updatedNotes = [newNote, ...notes];

      setNotes(updatedNotes);
      saveDemoNotes(updatedNotes);
      cancelAddingNote();

      return;
    }

    try {
      const response = await API.post("/notes", {
        title: cleanTitle,
        content: cleanContent,
        folder: folderId,
      });

      setNotes((currentNotes) => [
        response.data,
        ...currentNotes,
      ]);

      cancelAddingNote();
    } catch (err) {
      handleApiError(err, "Unable to create note");
    }
  };

  /* =========================================================
     EDIT NOTE
  ========================================================= */

  const startEditing = (note) => {
    setEditingNoteId(note._id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditFolderId(getFolderId(note) || "");
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditTitle("");
    setEditContent("");
    setEditFolderId("");
  };

  const saveEdit = async (noteId) => {
    const cleanTitle = editTitle.trim();
    const cleanContent = editContent.trim();
    const folderId = editFolderId || null;

    if (!cleanTitle || !cleanContent) {
      alert("Please enter a title and note content.");
      return;
    }

    if (isDemo) {
      const selectedFolder = folders.find(
        (folder) => folder._id === folderId
      );

      const updatedNotes = notes.map((note) =>
        note._id === noteId
          ? {
              ...note,
              title: cleanTitle,
              content: cleanContent,
              folder: selectedFolder
                ? {
                    _id: selectedFolder._id,
                    name: selectedFolder.name,
                  }
                : null,
              updatedAt: new Date().toISOString(),
            }
          : note
      );

      setNotes(updatedNotes);
      saveDemoNotes(updatedNotes);
      cancelEditing();

      return;
    }

    try {
      const response = await API.put(`/notes/${noteId}`, {
        title: cleanTitle,
        content: cleanContent,
        folder: folderId,
      });

      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note._id === noteId ? response.data : note
        )
      );

      cancelEditing();
    } catch (err) {
      handleApiError(err, "Unable to update note");
    }
  };

  /* =========================================================
     DELETE NOTE
  ========================================================= */

  const handleDeleteNote = async (noteId) => {
    const shouldDelete = window.confirm("Delete this note?");

    if (!shouldDelete) {
      return;
    }

    if (isDemo) {
      const updatedNotes = notes.filter(
        (note) => note._id !== noteId
      );

      setNotes(updatedNotes);
      saveDemoNotes(updatedNotes);

      return;
    }

    try {
      await API.delete(`/notes/${noteId}`);

      setNotes((currentNotes) =>
        currentNotes.filter((note) => note._id !== noteId)
      );
    } catch (err) {
      handleApiError(err, "Unable to delete note");
    }
  };

  /* =========================================================
     NOTE COUNTS
  ========================================================= */

  const getFolderNoteCount = (folderId) => {
    return notes.filter(
      (note) => getFolderId(note) === folderId
    ).length;
  };

  const uncategorizedCount = notes.filter(
    (note) => !getFolderId(note)
  ).length;

  /* =========================================================
     AUTH SCREEN
  ========================================================= */

  if (!user && !isDemo) {
    return (
      <main className="auth-page">
        <section className="auth">
          <h1 className="auth-brand">Notes App</h1>

          <h2>{isRegistering ? "Register" : "Login"}</h2>

          <form
            onSubmit={
              isRegistering ? handleRegister : handleLogin
            }
          >
            <input
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              autoComplete={
                isRegistering
                  ? "new-password"
                  : "current-password"
              }
              minLength={6}
              required
            />

            <button type="submit" disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : isRegistering
                  ? "Register"
                  : "Login"}
            </button>
          </form>

          <button
            type="button"
            className="demo-button"
            onClick={() => setIsDemo(true)}
          >
            Try Demo
          </button>

          <p>
            {isRegistering
              ? "Already have an account? "
              : "Don't have an account? "}

            <button
              type="button"
              className="auth-toggle-button"
              onClick={() =>
                setIsRegistering(
                  (currentValue) => !currentValue
                )
              }
            >
              {isRegistering ? "Login" : "Register"}
            </button>
          </p>
        </section>
      </main>
    );
  }

  /* =========================================================
     APPLICATION UI
  ========================================================= */

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Folders</h2>

          <button
            type="button"
            className="new-folder-button"
            onClick={() =>
              setShowFolderForm(
                (currentValue) => !currentValue
              )
            }
          >
            +
          </button>
        </div>

        {showFolderForm && (
          <form
            className="folder-form"
            onSubmit={handleCreateFolder}
          >
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) =>
                setNewFolderName(e.target.value)
              }
              maxLength={50}
              autoFocus
            />

            <div className="folder-form-actions">
              <button type="submit">Add</button>

              <button
                type="button"
                onClick={() => {
                  setShowFolderForm(false);
                  setNewFolderName("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <nav className="folder-list">
          <button
            type="button"
            className={
              selectedFolderId === ALL_NOTES
                ? "folder-item active"
                : "folder-item"
            }
            onClick={() => setSelectedFolderId(ALL_NOTES)}
          >
            <span>🗒️ All Notes</span>
            <span className="folder-count">
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            className={
              selectedFolderId === UNCATEGORIZED
                ? "folder-item active"
                : "folder-item"
            }
            onClick={() =>
              setSelectedFolderId(UNCATEGORIZED)
            }
          >
            <span>📄 Uncategorized</span>
            <span className="folder-count">
              {uncategorizedCount}
            </span>
          </button>

          <div className="folder-divider" />

          {folders.map((folder) => (
            <div className="folder-row" key={folder._id}>
              {editingFolderId === folder._id ? (
                <div className="folder-edit-form">
                  <input
                    type="text"
                    value={editingFolderName}
                    onChange={(e) =>
                      setEditingFolderName(e.target.value)
                    }
                    maxLength={50}
                    autoFocus
                  />

                  <button
                    type="button"
                    onClick={() =>
                      handleRenameFolder(folder._id)
                    }
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={cancelFolderEditing}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={
                      selectedFolderId === folder._id
                        ? "folder-item active"
                        : "folder-item"
                    }
                    onClick={() =>
                      setSelectedFolderId(folder._id)
                    }
                  >
                    <span>📁 {folder.name}</span>

                    <span className="folder-count">
                      {getFolderNoteCount(folder._id)}
                    </span>
                  </button>

                  <div className="folder-actions">
                    <button
                      type="button"
                      aria-label={`Rename ${folder.name}`}
                      onClick={() =>
                        startFolderEditing(folder)
                      }
                    >
                      ✏️
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete ${folder.name}`}
                      onClick={() =>
                        handleDeleteFolder(folder._id)
                      }
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="app-header">
          <div>
            <h1>
              {selectedFolderName}

              {isDemo && (
                <span className="demo-label">Demo</span>
              )}
            </h1>

            <p className="note-count">
              {filteredNotes.length}{" "}
              {filteredNotes.length === 1
                ? "note"
                : "notes"}
            </p>
          </div>

          <div className="header-actions">
            {isDemo && (
              <>
                <button
                  type="button"
                  onClick={handleResetDemo}
                >
                  Reset Demo
                </button>

                <button
                  type="button"
                  onClick={handleExitDemo}
                >
                  Exit Demo
                </button>
              </>
            )}

            {user && (
              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
              >
                ⏻
              </button>
            )}
          </div>
        </header>

        {!addingNote ? (
          <button
            type="button"
            className="add-note-button"
            onClick={openAddNoteForm}
          >
            + Add Note
          </button>
        ) : (
          <section className="note-form add-note-form">
            <input
              className="note-input"
              type="text"
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />

            <select
              className="folder-select"
              value={newNoteFolderId}
              onChange={(e) =>
                setNewNoteFolderId(e.target.value)
              }
            >
              <option value="">Uncategorized</option>

              {folders.map((folder) => (
                <option
                  key={folder._id}
                  value={folder._id}
                >
                  {folder.name}
                </option>
              ))}
            </select>

            <textarea
              className="note-textarea"
              placeholder="Write your note"
              value={content}
              onChange={handleContentChange(setContent)}
            />

            <div className="actions">
              <button
                type="button"
                onClick={handleAddNote}
              >
                Add
              </button>

              <button
                type="button"
                onClick={cancelAddingNote}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <p className="status-message">Loading notes...</p>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <h2>No notes here yet</h2>
            <p>
              Create a note in this folder to get started.
            </p>
          </div>
        ) : (
          <div className="notes">
            {filteredNotes.map((note) => (
              <article className="note" key={note._id}>
                {editingNoteId === note._id ? (
                  <div className="note-form edit-note-form">
                    <input
                      className="note-input"
                      value={editTitle}
                      onChange={(e) =>
                        setEditTitle(e.target.value)
                      }
                      maxLength={150}
                    />

                    <select
                      className="folder-select"
                      value={editFolderId}
                      onChange={(e) =>
                        setEditFolderId(e.target.value)
                      }
                    >
                      <option value="">
                        Uncategorized
                      </option>

                      {folders.map((folder) => (
                        <option
                          key={folder._id}
                          value={folder._id}
                        >
                          {folder.name}
                        </option>
                      ))}
                    </select>

                    <textarea
                      className="note-textarea"
                      value={editContent}
                      onChange={handleContentChange(
                        setEditContent
                      )}
                    />

                    <div className="actions">
                      <button
                        type="button"
                        onClick={() => saveEdit(note._id)}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="note-heading">
                      <h3>{note.title}</h3>

                      <span className="note-folder-badge">
                        {getFolderName(note)}
                      </span>
                    </div>

                    <ul>
                      {note.content
                        .split("\n")
                        .filter((line) => line.trim())
                        .map((line, index) => (
                          <li
                            key={`${note._id}-${index}`}
                          >
                            {line.replace(/^•\s?/, "")}
                          </li>
                        ))}
                    </ul>

                    <div className="timestamp">
                      Last updated:{" "}
                      {new Date(
                        note.updatedAt || note.createdAt
                      ).toLocaleString()}
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        onClick={() => startEditing(note)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteNote(note._id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;