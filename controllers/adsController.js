import * as config from "../config/config.js";
import { nanoid } from "nanoid";
import slugify from "slugify";
import Ads from "../models/adsModel.js";
import Auth from "../models/authModel.js";
import { emailTemplate } from "../helpers/email.js";

/* Upload Image in AWS S3 */
export const uploadImage = (req, res) => {
  try {
    //console.log(req.body);
    const { image } = req.body;

    const base64Image = new Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const type = image.split(";")[0].split("/")[1];

    /* image params */
    const params = {
      Bucket: "apnaghar-bucket",
      Key: `${nanoid()}.${type}`,
      Body: base64Image,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };
    config.AWSS3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      } else {
        //console.log(data);
        res.send(data);
      }
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Upload Failed….try again" });
  }
};

/* Remove Image from "AWS S3 */
export const deleteImage = (req, res) => {
  try {
    const { Key, Bucket } = req.body;
    config.AWSS3.deleteObject({ Bucket, Key }, (err, data) => {
      if (err) {
        console.log(err);
        res.sendState(400);
      } else {
        res.send({ ok: true });
      }
    });
  } catch (err) {
    console.log(err);
  }
};

/* create new ad */
export const adsCreate = async (req, res) => {
  try {
    // console.log(req.body);
    const {
      photos, title, description,  price, address,
      area, bedrooms, washrooms, carPark,type
    } = req.body;
    if (!photos?.length) {
      return res.json({ error: "Photos are required" });
    }
    if (!price) {
      return res.json({ error: "Price are required" });
    }
    if (!type) {
      return res.json({ error: "Is property House or Plot or Land?" });
    }
    if (!address) {
      return res.json({ error: "Address is required" });
    }
    if (!title) {
     return res.json({ error: "Title is required" });
    }
    if (!description) {
     return res.json({ error: "Description is required" });
    }
    const geo = await config.GOOGLE_GEOCODER.geocode(address);
    //console.log("geo =>" , geo);
    const ads = await Ads({
       ...req.body,
       postedBy: req.user.id,
       location: {
          type: "Point",
          coordinates: [geo?.[0]?.longitude, geo?.[0]?.latitude],
       },
       googleMap: geo,
       slug: slugify(`${title}-${type}-${address}-${price}-${nanoid(7)}`)
    }).save();

    /* Make user role to >>> Seller */
     const userAuth = await Auth.findByIdAndUpdate(req.user.id, {
        $addToSet: { role: "Seller" },
     }, {new: true});

     userAuth.password = undefined;
     userAuth.resetCode = undefined;
     res.json({
        ads, 
        userAuth
     })
  } catch (err) {
    res.json({ error: "Something went wrong. Try Again" });
    console.log(err);
  }
};

/* Fetch All ads for seller */
export const ads = async (req, res) => {
  try {
        const adsForSell = await Ads.find({action: "Sell"}).select('-googleMap -location -photo.Key -photo.key -photo.ETag')
        .sort({ createdAt: -1 })
        .limit(10);

        const adsForRent = await Ads.find({action: "Rent"}).select('-googleMap -location -photo.Key -photo.key -photo.ETag')
        .sort({ createdAt: -1 })
        .limit(10);
        res.json({
          adsForSell, 
          adsForRent
        });
  } catch(err){
    console.error(err);
  }
}

/* Fetch Single ads by ad's slug */
export const singleAd =  async (req, res) => {
     try {
        const slug = req.params.slug;
        const ad = await Ads.findOne({slug: slug}).populate(
          "postedBy", "first_name last_name email username phone company photo.Location");

       /* related ad */
       const relatedAd = await Ads.find({
           _id: {$ne: ad._id},
           action: ad.action,
           type: ad.type,
           address: {
             $regex: ad.googleMap[0]?.city, // administrativeLevels?.level2long || "",
             $options: "i",
           },
       })
       .limit(3)
       .select("-photos.Key -photos.key -photos.ETag -photos.Bucket -googleMap");

      res.json({ad, relatedAd}) ;// data.ad (front-end)  
               //console.log(ad);                  

     } catch (err){
        console.error(err);
     }
}

/* Add ads to the WishList (like the add) */
export const addToWishlist = async (req, res) => {
       try {
           const user = await Auth.findByIdAndUpdate(
              req.user.id, 
              {
                $addToSet: {wishList: req.body.adId},
              },
              { new: true}
           );
           const {password, resetCode, ...rest} = user._doc;

           res.json(rest);
        
       } catch (error) {
          console.log(error);       
       }
}

/* Remove ads from the WishList (un-like the add) */
export const removeFromWishlist = async (req, res) => {
  try {
      const user = await Auth.findByIdAndUpdate(
         req.user.id, 
         {
           $pull: {wishList: req.params.adId},
         },
         { new: true}
      );
      const {password, resetCode, ...rest} = user._doc;

      res.json(rest);
   
  } catch (error) {
     console.log(error);       
  }
}


/* Contact the Seller to send him email inquiry about property */
export const contactSeller = async (req, res) => {
       try {
        const {first_name, last_name, email, phone, message, adId} = req.body;
        const ad = await Ads.findById(adId).populate("postedBy", "email");
        
        const user = await Auth.findByIdAndUpdate(req.user.id,{
          $addToSet: {enquiredProperties: adId},
        });

        if(!user){
          res.json({ "error": "Could not find user with that email" })
        } else {
           /* send email */
           config.AWSSES.sendEmail(
            emailTemplate(
              ad.postedBy.email,
              `
          <h3> You have received a new Customer enquiry </h3> 
          <h4> Customer Information </h4>
          <p> Name: ${first_name} ${last_name} </p>
          <p> Email: ${email}  </p>
          <p> Phone: ${phone} </p>
          <p> Message: ${message}  </p>
          <a href='${config.CLIENT_URL}/ad/${ad.slug}'> 
             ${ad.type} in ${ad.address} for ${ad.action} ${ad.price}
          </a> 
          `,
              email,
              "New enquiry received"
            ),
            (err, data) => {
              if (err) {
                console.log(err);
                res.status(500).json({ ok: false });
              } else {
                console.log(data);
                res.status(200).json({ ok: true });
              }
            }
          );
        }
       // console.log(req.body);
       } catch (err) {
          console.log(err);  
       }
}

/* get all the ads show in the users (seller Dashboard) */
export const userAds = async (req, res) => {
     try {

       const perPage = 3;
       const page = req.params.page ? req.params.page  : 1;

       const total = await Ads.find({ postedBy: req.user.id });

       const ads = await Ads.find({ postedBy: req.user.id })
       .populate("postedBy", "first_name last_name email username phone company")
       .skip((page -1) * perPage)
       .limit(perPage)
       .sort({ createdAt: -1});

       res.json({ ads, total: total.length });
      
     }  catch (err) {
      console.log(err);  
   }
} 

/* Update the single ad by ad id => Put Request */
export const updateAd = async (req, res) => {
      try {
        const {photos, title, price, description, type, address} = req.body;
        const ad = await Ads.findById(req.params._id);
        const owner = req.user.id == ad?.postedBy;
        if(!owner) {
           return res.json({ error: "Permission denied" });
        } else {
           // validations 
           if(!photos.length) {
              return res.json({error: "Photos are required"});
           }
           if(!price) {
            return res.json({error: "Price are required"});
           }
           if(!type) {
            return res.json({error: "Is Property House or Plot?"});
           }
           if(!address) {
            return res.json({error: "Address are required"});
           }
           if(!title) {
            return res.json({error: "Title are required"});
           }
           if(!description) {
            return res.json({error: "Description are required"});
           }

           const geo = await config.GOOGLE_GEOCODER.geocode(address);
 
           await ad.updateOne({
              ...req.body,
              slug: ad.slug,
              location: {
                 type: "Point",
                 coordinates: [geo?.[0]?.longitude, geo?.[0]?.latitude],
              },
           });   
           res.json({ok: true});       
        }
      } catch (error) {
        console.log(error);  
      }
}

/* Enquired about properties of logged in user */
export const enquiredProperties = async (req, res) => {
  try {
    const user = await Auth.findById(req.user.id);
    const ads = await Ads.find({_id: user.enquiredProperties})
                         .sort({ createdAt: -1});
    res.json(ads);
  } catch (error) {
    console.log(error);     
  }
}

/* Display all properties which user liked (wishlist) */
export const wishlist = async (req, res) => {
  try {
    const user = await Auth.findById(req.user.id);
    const ads = await Ads.find({_id: user.wishList})
                         .sort({ createdAt: -1});
    res.json(ads);
  } catch (error) {
    console.log(error);     
  }
}

/* Delete the ad by using ad id */
export const deleteAd = async (req, res) => {
   try {

      const ad = await Ads.findById(req.params._id);
      const owner = req.user.id == ad?.postedBy;

      if(!owner){
         return res.json({error: "Permission denied"});
      } else {
        await Ads.findByIdAndDelete(ad._id);
        res.json({ok: true});
      }
   }  catch (error) {
    console.log(error);     
  }
}