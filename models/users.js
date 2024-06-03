const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/blogWeb")

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
})

const userModel = new mongoose.model("users", userSchema)

module.exports = userModel;