import jwt from "jsonwebtoken";
import {JWT_SECRET}  from "../config/config.js";

export const requiredLoggedIn = (req, res, next) => {
    try {
      const decoded = jwt.verify(req.headers.authorization, JWT_SECRET );
      req.user = decoded; // req.user.id
      console.log(decoded);
      next();
    } catch (err) {
         console.log(err);
         res.json({ error: "Invalid or expired token"})
    }
}