import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import { User } from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, config.jwtSecret);

      req.user = await User.findById(decoded.id).select("-passwordHash");
      if (!req.user) {
        return res.status(401).json({ error: "User no longer exists" });
      }

      next();
    } catch (error) {
      console.error("[Auth Middleware Error]", error.message);
      return res.status(401).json({ error: "Not authorized, token invalid or expired" });
    }
  } else {
    return res.status(401).json({ error: "Not authorized, no token provided" });
  }
};

export const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = await User.findById(decoded.id).select("-passwordHash");
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};
