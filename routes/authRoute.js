import express from "express";
const authRoute = express.Router();

import * as auth from "../controllers/authController.js";
import { requiredLoggedIn } from "../middlewares/authMiddleware.js"

authRoute.get("/", requiredLoggedIn, auth.test);
authRoute.post("/pre-signup", auth.preSignup);
authRoute.post("/signup", auth.signup);
authRoute.post("/login", auth.login);
authRoute.post("/forgot-password", auth.forgotPassword);
authRoute.post("/access-account", auth.accessAccount);
authRoute.get("/refresh-token", auth.refreshToken);
authRoute.get("/loggedIn-user", requiredLoggedIn, auth.loggedInUser);
authRoute.get("/profile/:username", auth.publicProfile);
authRoute.put("/change-password", requiredLoggedIn, auth.changePassword);
authRoute.put("/update-profile", requiredLoggedIn, auth.updateProfile);
authRoute.get("/agents", auth.agents);
authRoute.get("/agent/:username", auth.agent);
authRoute.get("/agent-total-ads", auth.agentTotalAds);

export default authRoute;