import Folder from "../models/Folder.js";
import Note from "../models/Note.js";

export const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({
      user: req.userId,
    }).sort({ name: 1 });

    res.json(folders);
  } catch (err) {
    console.error("Get folders error:", err);

    res.status(500).json({
      message: "Unable to load folders",
    });
  }
};

export const createFolder = async (req, res) => {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({
        message: "Folder name is required",
      });
    }

    const existingFolder = await Folder.findOne({
      user: req.userId,
      name,
    });

    if (existingFolder) {
      return res.status(400).json({
        message: "You already have a folder with this name",
      });
    }

    const folder = await Folder.create({
      name,
      user: req.userId,
    });

    res.status(201).json(folder);
  } catch (err) {
    console.error("Create folder error:", err);

    res.status(500).json({
      message: "Unable to create folder",
    });
  }
};

export const updateFolder = async (req, res) => {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({
        message: "Folder name is required",
      });
    }

    const duplicateFolder = await Folder.findOne({
      _id: { $ne: req.params.id },
      user: req.userId,
      name,
    });

    if (duplicateFolder) {
      return res.status(400).json({
        message: "You already have a folder with this name",
      });
    }

    const folder = await Folder.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.userId,
      },
      { name },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!folder) {
      return res.status(404).json({
        message: "Folder not found",
      });
    }

    res.json(folder);
  } catch (err) {
    console.error("Update folder error:", err);

    res.status(500).json({
      message: "Unable to update folder",
    });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!folder) {
      return res.status(404).json({
        message: "Folder not found",
      });
    }

    await Note.updateMany(
      {
        user: req.userId,
        folder: folder._id,
      },
      {
        $set: { folder: null },
      }
    );

    res.json({
      message: "Folder deleted",
    });
  } catch (err) {
    console.error("Delete folder error:", err);

    res.status(500).json({
      message: "Unable to delete folder",
    });
  }
};