import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Folder name is required"],
      trim: true,
      maxlength: [50, "Folder name cannot exceed 50 characters"],
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

folderSchema.index(
  {
    user: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const Folder = mongoose.model("Folder", folderSchema);

export default Folder;