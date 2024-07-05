import express from "express";
const adsRoute = express.Router();

import * as ads from "../controllers/adsController.js";
import { requiredLoggedIn } from "../middlewares/authMiddleware.js"

// @route   GET api/ads
/* upload image */
adsRoute.post("/upload-image", requiredLoggedIn, ads.uploadImage);

/* delete image */
adsRoute.post("/delete-image", requiredLoggedIn, ads.deleteImage);

/* create ads */
adsRoute.post("/ads-create", requiredLoggedIn, ads.adsCreate);

/* fetch all ads on Seller Home page */
adsRoute.get("/ads", ads.ads);

/* fetch single ad by ads "slug" */
adsRoute.get("/ad/:slug", ads.singleAd);

/* add add to wishlist (Like ad) */
adsRoute.post("/wishlist", requiredLoggedIn, ads.addToWishlist);

/* remove add from wishlist (unLike ad) */
adsRoute.delete("/wishlist/:adId", requiredLoggedIn, ads.removeFromWishlist);

/* send email to contact seller */
adsRoute.post("/contact-seller", requiredLoggedIn, ads.contactSeller);

/* fetch all ads created by seller */
adsRoute.get("/user-ads/:page", requiredLoggedIn, ads.userAds);

/* Update the ad details by using ad id */
adsRoute.put("/ad/:_id", requiredLoggedIn, ads.updateAd);

/* Delete the ad by using ad id */
adsRoute.delete("/ad/:_id", requiredLoggedIn, ads.deleteAd);

/* Enqiury about the properties */
adsRoute.get("/enquired-properties", requiredLoggedIn, ads.enquiredProperties);

/* Show all liked properties in wishlist */
adsRoute.get("/wishlist", requiredLoggedIn, ads.wishlist);





export default adsRoute;