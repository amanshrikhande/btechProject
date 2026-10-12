import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "Collaborative developer on DevShare",
    },
    role: {
      type: String,
      enum: ["developer", "researcher", "admin"],
      default: "developer",
    },
  },
  { timestamps: true }
);

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
