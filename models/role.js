const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/blogWeb")

const roleSchema = new mongoose.Schema({
    name: String
})

const roleModel = new mongoose.model("roles", roleSchema)

module.exports = roleModel