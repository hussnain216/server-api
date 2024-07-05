import * as config from "../config/config.js";
import jwt from "jsonwebtoken";
import { emailTemplate } from "../helpers/email.js";
import { hashPassword, comparePassword } from "../helpers/auth.js";
import Auth from "../models/authModel.js";
import Ads from "../models/adsModel.js";
import { nanoid } from "nanoid";
import validator from "email-validator";
import { userAndTokenResponse } from "../helpers/userAndTokenResponse.js";

export const test = (req, res) => {
  res.status(200).json({
    message: "This is our test route coming from controller",
  });
};

/* Pre-Signup User */
export const preSignup = async (req, res) => {
  /* create JWT with email & password then email as clickable link
    only when user clicks on that email link, sigup completes */
  try {
    const { email, password } = req.body;

    // validation - required
    if (!validator.validate(email)) {
      return res.json({ error: "Your valid email address is required" });
    }
    if (!password) {
      return res.json({ error: "Your Password is required" });
    }
    if (password && password.length < 5) {
      return res.json({ error: "Your Password should be at-least 5 characters long" });
    }
    // Email Taken Error
    const user = await Auth.findOne({ email });
    if (user) {
      return res.json({
          error:
            "This Email is already taken please chose different email address",
        });
    }

    const token = jwt.sign({ email, password }, config.JWT_SECRET, {
      expiresIn: "4h",
    });

    config.AWSSES.sendEmail(
      emailTemplate(
        email,
        `
      <h3>Pre Sign Up Verification Code</h3>
      <p> Please click the link below to activate your account. </p>
      <a style='color: orange; font-weight: bold' href="${config.CLIENT_URL}/auth/account-activate/${token}">Activate my Account!!</a>`,
        config.REPLY_TO,
        "Activation Acount Link"
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
  } catch (err) {
    console.log(err);
    res.status(401).json({
      error: "Something went wrong... Try again",
    });
  }
};

/* Signup User */
export const signup = async (req, res) => {
  try {
    //console.log(req.body);
    const { email, password } = jwt.verify(req.body.token, config.JWT_SECRET);

    // Email Taken Error
    const userExist = await Auth.findOne({ email });
    if (userExist) {
      return res.json({
          error:
            "This Email is already taken please chose different email address",
        });
    }

    const hashedPassword = await hashPassword(password);

    const user = await new Auth({
      username: nanoid(7),
      email,
      password: hashedPassword,
    }).save();

    userAndTokenResponse(req, res, user);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Something went wrong... Try again",
    });
  }
};

/* Login User */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    /* 1. Find user by email */
    const user = await Auth.findOne({ email });

    /* 2.user not found */
    if (!user) {
      return res.json({ error: "User not exists with this email address" });
    }

    /* 3. Compare the password */
    const matched = await comparePassword(password, user.password);
    if (!matched) {
      return res.json({ error: "Your Password is Wrong" });
    }
    
    /* 4. Create JWT Tokens */
    userAndTokenResponse(req, res, user);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Something went wrong... Try again",
    });
  }
};

/*  Forgot Password */
export const forgotPassword = async (req, res) => {
  try {
    /* 1. find user with provided email */
    const { email } = req.body;
    const user = await Auth.findOne({ email });
    if (!user) {
      res.json({
        error: `Could not find user with that email:${email}`,
      });
    } else {
      /* 2. Generate a random reset code and save it to the database */
      const resetCode = nanoid();
      user.resetCode = resetCode;
      user.save();
      /* 3. Generate a token based on reset code */
      const token = jwt.sign({ resetCode }, config.JWT_SECRET, {
        expiresIn: "1h",
      });
      /* 4. Send clickable link this token based on reset code to email address */
      config.AWSSES.sendEmail(
        emailTemplate(
          email,
          `
      <h3> Reset Password Link </h3> 
      <p> Please click the link below to Access your account. </p>
      <a href='${config.CLIENT_URL}/auth/access-account/${token}'> Access my account </a> 
      `,
          config.REPLY_TO,
          "Using this Reset link to Access your Account"
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
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Something went wrong... Try again",
    });
  }
};

/* Access Account after forgetting pasword */
export const accessAccount = async (req, res) => {
  try {
    /* 1. grab the token (resetCode) & verify with jwt */
    const { resetCode } = jwt.verify(req.body.resetCode, config.JWT_SECRET);
    /* 2. query database to find the user matching resetCode & udpate it */
    const user = await Auth.findOneAndUpdate({ resetCode }, { resetCode: "" });
    /* 3.generate the token & refresh token & send user */
    console.log(user);

    userAndTokenResponse(req, res, user);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Something went wrong... Try again",
    });
  }
};

/* Refresh Token  */
export const refreshToken = async (req, res) => {
  try {
    const { id } = jwt.verify(req.headers.refresh_token, config.JWT_SECRET);
    const user = await Auth.findById(id);
    userAndTokenResponse(req, res, user);
  } catch (err) {
    console.log(err);
    res.json({ error: "Refresh Token faield" });
  }
};

/* Fetch Currently logge in user */
export const loggedInUser = async (req, res) => {
  try {
    const user = await Auth.findById(req.user.id);
    user.password = undefined;
    user.resetCode = undefined;
    res.json( user );
  } catch (err) {
    console.log(err);
    res.json({ error: "Unauthorized User" });
  }
};

/* Public Profile  */
export const publicProfile = async (req, res) => {
  try {
    const user = await Auth.findOne({ username: req.params.username });
    user.password = undefined;
    user.resetCode = undefined;
    res.status(200).json({
      user: user,
    });
  } catch (err) {
    console.log(err);
    res
      .status(404)
      .json({ error: `This User ${req.params.username} not found` });
  }
};

/* Update User Password (logged user only)  */
export const changePassword = async (req, res) => {
  try {
    /* 1 Take User New password */
    const { password } = req.body;
    /* Password validations */
    if (!password) {
      return res.json({ error: "Password is required" });
    }
    if (password && password.length < 5) {
      return res.json({ error: "Password should be min 5 characters long" });
    }
    /* 3. Hashed password & find user by id & Update its password */
    const hashedPassword = await hashPassword(password);
    const user = await Auth.findByIdAndUpdate(req.user.id, {
      password: hashedPassword,
    });
    res
      .status(200)
      .json({ ok: true, message: "You Password have been changed" });
  } catch (err) {
    console.log(err);
    res.json({ erorr: "Unauthorized User" });
  }
};

/* Update User Porfile (logged user only)  */
export const updateProfile = async (req, res) => {
  try {

    const user = await Auth.findByIdAndUpdate(req.user.id, req.body, {new: true});
    user.password = undefined;
    user.resetCode = undefined;
    res.json(user);

  } catch (err) {
    console.log(err);
    if(err.codeName === "DuplicateKey"){
     return res.json({error: `Username or Email is already taken please chose different`})
    } else {
      return res.json({error:"Unauthorized"})
    }
  }
};

/* Show all the "Agents" who selling the properties */
export const agents = async (req, res) => {
    try {
         const agents = await Auth.find({role: 'Seller'}).select("-role -password -wishList -enquiredProperties -photo.key -photo.Key -photo.Bucket");
          res.json(agents);

    } catch (err) {
         console.log(err);
    }
}

/* Show agents total number of ads */
export const agentTotalAds = async (req, res) => {
  try {
    const agentId = req.params._id;
    const ads = await Ads.find({postedBy: agentId}).select("_id");
    res.json(ads);
  } catch (err) {
       console.log(err);
  }
}

/* Agent Public profile by using "Username" */
export const agent = async (req, res) => {
  try {
       const username =  req.params.username;
       const agent = await Auth.findOne({postedBy: username})
                               .select("-password -role -enquiredProperties -wishList -photo.key –photo.Key –photo.Bucket");
       const ads = await Ads.find({postedBy: agent._id})
                             .select("-photos.key –photos.Key –photos.ETag –photos.Bucket –location –googleMap");
       res.json({agent, ads});
  } catch (err) {
       console.log(err);
  }
}