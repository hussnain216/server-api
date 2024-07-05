import { model, Schema, ObjectId } from "mongoose";

const adsSchema = new Schema({

    title: {
        type: String,
        maxLength: 200,
    },
    description:{},
    price: {
        type: Number, 
        maxLength: 200
    },
    photos: [{}],
    address:{
        type: String, 
        maxLength: 200,
        required: true
    },
    area: String,
    bedrooms: Number,
    washrooms: Number,
    carPark: String,
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates:{
            type: [Number],
            default: [74.272842, 31.469692],
        },
    },
    slug: {
        type: String,
        lowercase: true,
        unique: true,
    },
    postedBy: { 
        type: ObjectId,
        ref: "User"
    },
    sold: {type: Boolean, default: false},
    googleMap: {},
    type: {
        type: String,
        default: "Others"
    },
    action: {
        type: String,
        default: "Sell"
    },
    views: {
        type: Number,
        default: 0,
    }
}, {timestamps: true});


const Ads = model("Ads", adsSchema);
export default Ads;