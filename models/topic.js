const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/blogWeb")

const topicSchema = new mongoose.Schema({
    name: String
})

const topicModel = new mongoose.model("topics", topicSchema)

module.exports = topicModel