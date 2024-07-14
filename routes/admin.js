var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const adminModel = require('../models/admin');
const blogModel = require('../models/blog');
const topicModel = require('../models/topic');
const roleModel = require("../models/role")
const imgModel = require('../models/image')
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
}).array('images',10);

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

async function takeBlog(){
    try {
        const blogPostsWithImages = await blogModel.aggregate([
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
                                imgID: "$$image.imgID",
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
        return blogPostsWithImages;
    } catch (err) {
        console.error('Error fetching blog posts with images:', err);
    }
}

async function takeBlogbyID(id){
    try{
        return await blogModel.findOne({_id: id})
    }catch(err){
        console.error(err)
        return null
    }
}

async function takeUser(){
    try{
        return await adminModel.find()
    }catch(err){
        console.error(err)
        return null
    }
}

async function takeUserbyID(id){
    try{
        return await adminModel.findOne({_id: id})
    }catch(err){
        console.error(err)
        return null
    }
}

async function takeTopic(){
    try{
        return await topicModel.find()
    }catch(err){
        console.error(err)
        return null
    }
}

async function takeTopicbyID(id){
    try{
        return await topicModel.findOne({_id: id})
    }catch(err){
        console.error(err)
        return null
    }
}

async function takeRole(){
    try{
        return await roleModel.find()
    }catch(err){
        console.error(err)
        return null
    }
}

async function takeRolebyID(id){
    try{
        return await roleModel.findOne({_id: id})
    }catch(err){
        console.error(err)
        return null
    }
}

function validateEmail(email){
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/*-------------INDEX------------*/
router.get('/', function(req, res, next){
    res.render('admin', {admin: req.session.admin})
})

/*-------------BLOGS------------*/
router.get("/blogs", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    res.render("blogs", {admin: req.session.admin, blogs: await takeBlog()})
})

/*-------------ADD-BLOG------------*/
router.get('/blogs/add', async function(req, res, next){
    if(req.session.admin==null){
        res.redirect("/admin/login")
    }
    res.render("addblog", {
        admin: req.session.admin, 
        msg: null,
        topics: await takeTopic()
    })
})

router.post("/blogs/add", async function(req, res, next){
    try{
        const existingTitle = await blogModel.findOne({title: req.body.title})
        if(existingTitle){
            res.render("addblog", {
                admin: req.session.admin, 
                msg: "Title is already exist! Please choose another.",
                topics: await takeTopic()
            })
        }else{
            upload(req, res, async (err) => {
                if (err) {
                    res.render('addblog', {
                        msg: err,
                        topics: await takeTopic(),
                        admin: req.session.admin
                    });
                } else {
                    if (req.files == undefined) {
                        res.render('addblog', {
                            msg: 'No file selected!',
                            topics: await takeTopic(),
                            admin: req.session.admin 
                        });
                    } else {
                        try {
                            const files = req.files;
                            const imagePromises = files.map(file => {
                                const newImage = new imgModel({
                                    imgID: uuidv4(),
                                    filename: file.filename,
                                    path: `images/${file.filename}`
                                });
                                return newImage.save();
                            });
                            const savedImages = await Promise.all(imagePromises);
                            const imageIds = savedImages.map(image => image._id);
                            const newBlog = new blogModel({
                                title: req.body.title,
                                body: req.body.content,
                                topic: req.body.topic,
                                author: req.session.admin.username,
                                imageID: imageIds
                            })
                            const saveblog = await newBlog.save()
                            res.redirect("/admin/blogs")
                        } catch (err) {
                            console.log(err)
                        }
                    }
                }
            });
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------EDIT-BLOG------------*/
router.get("/blogs/edit", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    const post_id = req.query.post_id
    res.render("editblog", {
        admin: req.session.admin, 
        blog: await takeBlogbyID(post_id), 
        topics: await takeTopic(),
        msg: null
    })
})

router.post("/blogs/edit", async function(req, res, next){
    try{
        const post_id = {
            _id: req.query.post_id
        }
        const curBlog = await takeBlogbyID(post_id._id)
        const updateData = {
            $set: {
                title: req.body.title,
                body: req.body.content,
                topic: req.body.topic,
                image: req.body.image
            }
        }
        const existingTitle = await blogModel.findOne({title: req.body.title})
        if(existingTitle){
            if(req.body.title == curBlog.title){
                const updatedBlog = await blogModel.updateOne(post_id, updateData)
                res.redirect("/admin/blogs")
            }
            res.render("editblog", {
                admin: req.session.admin, 
                blog: await takeBlogbyID(post_id._id), 
                topics: await takeTopic(),
                msg: "Title is already exist! Please choose another."})
        }else{
            const updatedBlog = await blogModel.updateOne(post_id, updateData)
            res.redirect("/admin/blogs")
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------DELETE-BLOG------------*/
router.delete("/blogs/:id", async function(req, res, next){
    try{
        const postId = req.params.id
        const post = await blogModel.findById(postId);
        if (!post) {
            throw new Error('Blog post not found');
        }
        // Get image IDs associated with the post
        const imageIds = post.imageID.map(image => image._id);

        // Delete images from the folder (assuming you have their paths)
        for (const imageId of imageIds) {
            const image = await imgModel.findById(imageId)
            if (image) {
                const imagePath = image.path;
                // Use filesystem operations to delete the file
                await fs.unlink(`public/${imagePath}`);
                console.log('Deleted image file:', imagePath);
            }
            else{
                console.log("Delete not successfully")
            }
        };

        // Delete images from the 'images' collection
        await imgModel.deleteMany({ _id: { $in: imageIds } });

        // Delete the blog post document
        await blogModel.deleteOne({ _id: postId });

        //console.log('Successfully deleted post and associated images.');
        res.json({
            "status": 200,
            "message": "Delete successfully",
            "data": {"post_id": postId}
        })
    }catch(err){
        console.log(err)
        res.json({
            "status": 500,
            "message": "Delete not successfully",
        })
    }
})

/*-------------TOPICS------------*/
router.get("/topics", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    res.render("topics",{admin: req.session.admin, topics: await takeTopic()})
})

/*-------------ADD-TOPIC------------*/
router.get('/topics/add', function(req, res, next){
    if(req.session.admin==null){
        res.redirect("/admin/login")
    }
    res.render("addtopic", {admin: req.session.admin, msg: null})
})

router.post("/topics/add", async function(req, res, next){
    try{
        const data = {
            name: req.body.name
        }
        const existingTopic = await topicModel.findOne({name: data.name})
        if(existingTopic){
            res.render("addtopic", {admin: req.session.admin, msg: "Topic is already exist! Please choose another."})
        }else{
            const topicData = await topicModel.insertMany(data)
            res.redirect("/admin/topics")
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------EDIT-TOPIC------------*/

router.get("/topics/edit", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    const topic_id = req.query.topic_id
    res.render("edittopic", {admin: req.session.admin, topic: await takeTopicbyID(topic_id), msg: null})
})

router.post("/topics/edit", async function(req, res, next){
    try{
        const topic_id = {
            _id: req.query.topic_id
        }
        const curTopic = await takeTopicbyID(topic_id._id)
        const updateData = {
            $set: {
                name: req.body.name
            }
        }
        const existingTopic = await topicModel.findOne({name: req.body.name})
        if(existingTopic){
            if(req.body.name == curTopic.name){
                const updatedTopic = await topicModel.updateOne(topic_id, updateData)
                res.redirect("/admin/topics")
            }
            res.render("edittopic", {
                admin: req.session.admin, 
                topic: await takeTopicbyID(topic_id._id), 
                msg: "Topic name is already exist! Please choose another."
            })
        }else{
            const updatedTopic = await topicModel.updateOne(topic_id, updateData)
            res.redirect("/admin/topics")
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------DELETE-TOPIC------------*/
router.delete("/topics/:id", async function(req, res, next){
    try{
        const topic_id = req.params.id
        await topicModel.deleteOne({_id: topic_id})
        res.json({
            "status": 200,
            "message": "Delete successfully",
            "data": {"topic_id": topic_id}
        })
    }catch(err){
        console.log(err)
        res.json({
            "status": 500,
            "message": "Delete not successfully",
        })
    }
})

/*-------------ADMIN-USERS------------*/
router.get("/users", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    res.render("users", {admin: req.session.admin, users: await takeUser()})
})

/*-------------EDIT-ADMIN------------*/
router.get("/users/edit", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    const user_id = req.query.user_id
    res.render("edituser", {
        admin: req.session.admin, 
        user: await takeUserbyID(user_id),
        msg: null,
        roles: await takeRole()
    })
})

router.post("/users/edit", async function(req, res, next){
    try{
        const user_id = {
            _id: req.query.user_id
        }
        const curUser = await takeUserbyID(user_id._id)
        const updateData = {
            $set: {
                username: req.body.username,
                email: req.body.email,
                role: req.body.role
            }
        }
        const existingUser = await adminModel.findOne({username: req.body.username})
        if(existingUser){
            if(req.body.username == curUser.username){
                const updatedUser = await adminModel.updateOne(user_id, updateData)
                res.redirect("/admin/users")
            }
            res.render("edituser", {
                admin: req.session.admin, 
                user: await takeUserbyID(user_id._id),
                msg: "Username is already exist! Please choose another.",
                roles: await takeRole()
            })
        }
        else{
            const updatedUser = await adminModel.updateOne(user_id, updateData)
            res.redirect("/admin/users")
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------DELETE-ADMIN------------*/

router.delete("/users/:id", async function(req, res, next){
    try{
        const user_id = req.params.id
        await adminModel.deleteOne({_id: user_id})
        res.json({
            "status": 200,
            "message": "Delete successfully",
            "data": {"user_id": user_id}
        })
    }catch(err){
        console.log(err)
        res.json({
            "status": 500,
            "message": "Delete not successfully",
        })
    }
})

/*-------------LOGIN------------*/
router.get('/login', function(req, res, next){
    res.render('adminlogin', {msg: null})
})

router.post('/login', async function(req, res, next){
    try{
        const admin = await adminModel.findOne({username: req.body.username})
        if(!admin){
            res.render("adminlogin", {"msg": "Username not found! Please try again."})
        }else{
            const checkPassword = await bcrypt.compare(req.body.password, admin.password)
            if (checkPassword){
                req.session.admin = {username: admin.username}
                res.redirect("/admin")
            }else{
                res.render("adminlogin", {msg: "Password is incorrect! Please try again." })
            }
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------SIGNUP------------*/
router.get("/signup", function(req, res, next){
    res.render('adminsignup', {msg: null})
})

router.post("/signup", async function(req, res, next){
    try{
        const data = {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            password2: req.body.password2
        }
        const existingUser = await adminModel.findOne({username: data.username})
        const existingEmail = await adminModel.findOne({email: data.email})
        if(existingUser){
            res.render("adminsignup", {msg: "Username is already exist!"})
        }else{
            if(validateEmail(data.email)){
                if(existingEmail){
                    res.render("adminsignup", {msg: "Email is already exist! Please try another."})
                }
                else{
                    if(data.password == data.password2){
                        const saltRounds = 10;
                        const hashedPassword = await bcrypt.hash(data.password, saltRounds)
                        data.password = hashedPassword
                        const userData = await adminModel.insertMany(data)
                        res.redirect("/admin/login")
                    }else{
                        res.render("adminsignup", {msg: "Passwords do not match! Please try again."})
                    }
                    //------HashPassword------
                    // bcrypt.compare(data.password2, data.password, async function(err, result){
                    //     if(err){
                    //         res.render("adminsignup", {msg: "Something was wrong, please try again later"})
                    //     }
                    //     if(result){
                    //         const userData = await adminModel.insertMany(data)
                    //         res.redirect("/admin/login")
                    //     }else{
                    //         res.render("adminsignup", {msg: "Password do not match, please try again."})
                    //     }
                    // })
                }
            }else{
                res.render("adminsignup", {msg: "Invalid email format! Please try again."})
            }
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------LOGOUT------------*/
router.get('/logout', function(req, res){
    req.session.admin = null;
    res.redirect('/admin/login');
});

module.exports = router