const adminModel = require('../models/admin');
const blogModel = require('../models/blog');
const topicModel = require('../models/topic');
const roleModel = require("../models/role")
const imgModel = require('../models/image')
const mongoose = require('mongoose');
const multer = require('multer')
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const storage = multer.diskStorage({
    destination: './public/images',
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB limit
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    }
})

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
  }

async function getBlog(postName, topic){
    try {
        const pipeline = [
            {
                $lookup: {
                    from: 'images', // The collection to join with
                    localField: 'imageID', // Field from the BlogPost collection
                    foreignField: '_id', // Field from the Image collection
                    as: 'images' // The name of the new array field to add to the BlogPost documents
                }
            },
            {
                $addFields: {
                    images: {
                        $map: {
                            input: "$images",
                            as: "image",
                            in: {
                                _id: "$$image._id",
                                filename: "$$image.filename",
                                path: "$$image.path",
                                uploadedAt: "$$image.uploadedAt",
                                __v: "$$image.__v"
                            }
                        }
                    }
                }
            }
        ];

        // If postName is provided, add a $match stage to the pipeline
        if (postName) {
            pipeline.unshift({
                $match: {
                    title: {
                        $regex: postName.toLowerCase(), // Match any title that contains the postName
                        $options: 'i' // Case-insensitive
                    }
                }
            });
        }

        if (topic) {
            pipeline.unshift({
                $match: {
                    topic: {
                        $regex: topic.toLowerCase(), // Match any topic that contains the provided topic
                        $options: 'i' // Case-insensitive
                    }
                }
            });
        }

        // Execute the aggregation pipeline
        const blogPostsWithImages = await blogModel.aggregate(pipeline);

        return blogPostsWithImages;
    } catch (err) {
        console.error('Error fetching blog posts with images:', err);
        return null;
    }
}

async function getBlogbyID(postId) {
    try {
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            throw new Error('Invalid blog post ID');
        }

        const blogPostWithImages = await blogModel.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(postId) } // Filter by specific blog post ID
            },
            {
                $lookup: {
                    from: 'images', // The collection to join with
                    localField: 'imageID', // Field from the BlogPost collection
                    foreignField: '_id', // Field from the Image collection
                    as: 'images' // The name of the new array field to add to the BlogPost documents
                }
            },
            {
                $addFields: {
                    images: {
                        $map: {
                            input: "$images",
                            as: "image",
                            in: {
                                _id: "$$image._id",
                                filename: "$$image.filename",
                                path: "$$image.path",
                                uploadedAt: "$$image.uploadedAt",
                                __v: "$$image.__v"
                            }
                        }
                    }
                }
            }
        ]);

        return blogPostWithImages[0]; // Return the single blog post object
    } catch (err) {
        console.error('Error fetching blog post with images:', err);
        throw err;
    }
}

async function getUser(username){
    try{
        const pipeline = [];

        // If username is provided, add a match stage to the pipeline
        if (username) {
            pipeline.push({
                $match: {
                    username: {
                        $regex: username.toLowerCase(), // Match any title that contains the postName
                        $options: 'i' // Case-insensitive
                    }
                }
            });
        }

        // If pipeline is empty, return all users
        if (pipeline.length === 0) {
            return await adminModel.find(); // Adjust this if you want to use aggregation
        }

        const users = await adminModel.aggregate(pipeline);

        return users

        // Execute the aggregation pipeline
    }catch(err){
        console.error(err)
    }
}

async function getUserbyID(id){
    try{
        return await adminModel.findOne({_id: id})
    }catch(err){
        console.error(err)
        return null
    }
}

async function getTopic(name){
    try{
        const pipeline = [];

        // If username is provided, add a match stage to the pipeline
        if (name) {
            pipeline.push({
                $match: {
                    name: {
                        $regex: name.toLowerCase(), // Match any title that contains the postName
                        $options: 'i' // Case-insensitive
                    }
                }
            });
        }
        pipeline.push({
            $sort: {
                name: 1 // Sort by the specified field and order
            }
        });
        // If pipeline is empty, return all users
        if (pipeline.length === 0) {
            return await topicModel.find(); // Adjust this if you want to use aggregation
        }

        const topics = await topicModel.aggregate(pipeline);
        return topics
    }catch(err){
        console.error(err)
        return null
    }
}

async function getTopicbyID(id){
    try{
        return await topicModel.findOne({_id: id})
    }catch(err){
        console.error(err)
        return null
    }
}

async function getRole(){
    try{
        return await roleModel.find()
    }catch(err){
        console.error(err)
        return null
    }
}

function validateEmail(email){
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

module.exports = {
    getBlog,
    getBlogbyID,
    getUser,
    getUserbyID,
    getTopic,
    getTopicbyID,
    getRole,
    validateEmail,
    upload,
    checkFileType
}