import mongoose from "mongoose";

import Note from "../models/Note.js";
import Folder from "../models/Folder.js";

export const getNotes = async (req, res) => {
  try {
    const filter = {
      user: req.userId,
    };

    if (req.query.folder === "uncategorized") {
      filter.folder = null;
    } else if (req.query.folder) {
      if (!mongoose.Types.ObjectId.isValid(req.query.folder)) {
        return res.status(400).json({
          message: "Invalid folder ID",
        });
      }

      filter.folder = req.query.folder;
    }

    const notes = await Note.find(filter)
      .populate("folder", "name")
      .sort({ updatedAt: -1 });

    res.json(notes);
  } catch (err) {
    console.error("Get notes error:", err);

    res.status(500).json({
      message: "Unable to load notes",
    });
  }
};

export const createNote = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const content = req.body.content?.trim();
    const folderId = req.body.folder || null;

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    if (folderId) {
      const folder = await Folder.findOne({
        _id: folderId,
        user: req.userId,
      });

      if (!folder) {
        return res.status(404).json({
          message: "Folder not found",
        });
      }
    }

    const note = await Note.create({
      title,
      content,
      folder: folderId,
      user: req.userId,
    });

    await note.populate("folder", "name");

    res.status(201).json(note);
  } catch (err) {
    console.error("Create note error:", err);

    res.status(500).json({
      message: "Unable to create note",
    });
  }
};

export const updateNote = async (req, res) => {
  try {
    const updates = {};

    if (req.body.title !== undefined) {
      const title = req.body.title.trim();

      if (!title) {
        return res.status(400).json({
          message: "Title cannot be empty",
        });
      }

      updates.title = title;
    }

    if (req.body.content !== undefined) {
      const content = req.body.content.trim();

      if (!content) {
        return res.status(400).json({
          message: "Content cannot be empty",
        });
      }

      updates.content = content;
    }

    if (req.body.folder !== undefined) {
      const folderId = req.body.folder || null;

      if (folderId) {
        const folder = await Folder.findOne({
          _id: folderId,
          user: req.userId,
        });

        if (!folder) {
          return res.status(404).json({
            message: "Folder not found",
          });
        }
      }

      updates.folder = folderId;
    }

    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).populate("folder", "name");

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    res.json(note);
  } catch (err) {
    console.error("Update note error:", err);

    res.status(500).json({
      message: "Unable to update note",
    });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    res.json({
      message: "Note deleted",
    });
  } catch (err) {
    console.error("Delete note error:", err);

    res.status(500).json({
      message: "Unable to delete note",
    });
  }
};