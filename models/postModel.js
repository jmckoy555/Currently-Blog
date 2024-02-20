const {Schema, model} = require("mongoose")

const postSchema = new Schema({
    title : {type: String, required: true},
    category : {type: String, enum: ["News", "Business", "Education", "Entertainment", "Sports", "Art", "Opinion", "Uncategorized"], 
    message:"{VALUE is not supported."},
    desc : {type: String, required: true},
    thumbnail : {type: String, required: true},
    creator : {type: Schema.Types.ObjectId, ref:"User"},
},{timestamps: true})

module.exports = model("Post", postSchema)