const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/blogWeb")

const blogSchema = new mongoose.Schema({
    title: String,
    body: String,
    topic: String,
    author: String,
    thumbnail: String,
    imageID: [{type: mongoose.Schema.Types.ObjectId, ref: "images"}]
})
const blogModel = new mongoose.model("blogs", blogSchema)



module.exports = blogModel