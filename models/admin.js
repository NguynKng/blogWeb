const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/blogWeb")

const adminSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String
})

const adminModel = new mongoose.model("admins", adminSchema)

module.exports = adminModel