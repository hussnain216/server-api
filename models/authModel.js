import { model, Schema, ObjectId } from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        trim: true,
        required: true,
        unique: true,
        lowercase: true,
    },
    first_name: {
        type: String,
        trim: true,
        default: "",
    },
    last_name: {
        type: String,
        trim: true,
        default: "",
    },
    email: {
        type: String,
        trim: true,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        maxLength: 100,
        minlength: 4
    },
    address: {type: String, default: ""},
    company: {type: String, default: ""},
    about: {type: String, default: ""},
    phone: {type: String, default: ""},
    photo: {},
    role: {
        type: [String],
        default: ["Buyer"],
        enum: ["Buyer", "Seller", "Admin"],
    },
    enquiredProperties: [
        {
            type: ObjectId,
            ref: "Ads"
        }
    ],
    wishList: [
        {
            type: ObjectId,
            ref: "Ads"
        }
    ],
    resetCode: {}
}, {timestamps: true});

const Auth = model("User", userSchema);
export default Auth;
