var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const adminModel = require('../models/admin');
const blogModel = require('../models/blog');
const topicModel = require('../models/topic');
const imgModel = require('../models/image')
const mongoose = require('mongoose');
const fs = require('fs').promises;
const modules = require('../dao/dao')

/*-------------INDEX------------*/
router.get('/', function(req, res, next){
    return res.render("admin", { admin: req.session.admin })
})

/*-------------BLOGS------------*/
router.get("/blogs", async function(req, res, next){
    if(req.session.admin == null){
        return res.redirect("/admin/login")
    }
    const { q } = req.query;
    const blogs = await modules.getBlog(q);
    return res.render("blogs", {admin: req.session.admin, blogs: blogs})
})

/*-------------ADD-BLOG------------*/
router.get('/blogs/add', async function(req, res, next){
    if(req.session.admin == null){
        return res.redirect("/admin/login")
    }
    return res.render("addblog", {
        admin: req.session.admin, 
        msg: null,
        topics: await modules.getTopic()
    })
})

router.post("/blogs/add", modules.upload.array('images', 10), async function(req, res, next){
    try{
        const existingTitle = await blogModel.findOne({title: req.body.title})
        if(existingTitle){
            return res.render("addblog", {
                admin: req.session.admin, 
                msg: "Title is already exist! Please choose another.",
                topics: await modules.getTopic()
            })
        }else{
            if (req.files == undefined) {
                return res.render('addblog', {
                    msg: 'No file selected!',
                    topics: await modules.getTopic(),
                    admin: req.session.admin 
                });
            } else {
                try {
                    const files = req.files;
                    const imagePromises = files.map(file => {
                        const newImage = new imgModel({
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
                    return res.redirect("/admin/blogs")
                } catch (err) {
                    console.log(err)
                }
            }
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------EDIT-BLOG------------*/
router.get("/blogs/edit", async function(req, res, next){
    if(req.session.admin == null){
        return res.redirect("/admin/login")
    }
    const post_id = req.query.post_id
    return res.render("editblog", {
        admin: req.session.admin, 
        blog: await modules.getBlogbyID(post_id), 
        topics: await modules.getTopic(),
        msg: null
    })
})

router.post("/blogs/edit", modules.upload.array('images', 10), async function(req, res, next){
    const post_id = {
        _id: req.query.post_id
    }

    const { title, content, topic } = req.body;

    const newImages = req.files;

    try{
        const post = await blogModel.findById(post_id._id).populate('imageID');
        if (!post) {
            return res.status(404).send('Blog post not found');
        }
        const existingTitle = await blogModel.findOne({title: title})
        if(!existingTitle || title == post.title){
            if (newImages && newImages.length > 0) {

                // Upload new image
                const imagePromises = newImages.map(file => {
                    const newImage = new imgModel({
                        filename: file.filename,
                        path: `images/${file.filename}`
                    });
                    return newImage.save();
                });
                const savedImages = await Promise.all(imagePromises);
                const imageIds = savedImages.map(image => image._id);
                await blogModel.updateOne(
                    { _id: post_id },
                    { $push: { imageID: { $each: imageIds } } }
                );
            }

            //Replace new data blog
            post.title = title;
            post.body = content;
            post.topic = topic;

            // Save the updated post
            await post.save();
            return res.redirect("/admin/blogs")
        } else {
            return res.render("editblog", {
                admin: req.session.admin, 
                blog: await modules.getBlogbyID(post_id._id), 
                topics: await modules.getTopic(),
                msg: "Title is already exist! Please choose another."})
        }
    }catch(err){
        console.error('Error updating blog post with images:', err);
        return res.status(500).send('Internal server error');
    }
});

/*-------------SET-THUMBNAIL------------*/
router.post('/blogs/edit/:post_id/set-thumbnail', async (req, res) => {
    try {
        const { post_id } = req.params;
        const { _id, path } = req.body.thumbnail 
        const newpath = path.replace(/^\//, '');
        const blog = await blogModel.findById(post_id)

        if (blog.thumbnail === newpath)
            return res.json({ success: false, message: 'This image is already set as the thumbnail!' });

        await blogModel.findByIdAndUpdate(post_id, { thumbnail: newpath });
        return res.json({ success: true, message: 'Thumbnail updated successfully!' });
    } catch (err) {
        console.error("Error updating thumbnail:", err);
        return res.status(500).json({ success: false, message: 'Failed to update thumbnail!' });
    }
});

/*-------------DELETE-IMAGE------------*/
router.delete("/blogs/edit/:post_id/delete-image/:imgId", async function (req, res, next){
    const post_id = req.params.post_id
    const imageId = req.params.imgId
    try {
        // Find the image in the database
        const image = await imgModel.findById(imageId);

        if (!image) {
            return res.status(404).send('Image not found');
        } 

        const imagePath = image.path;

        // Delete the image file from the filesystem
        try{
            await fs.unlink(`public/${imagePath}`);
        } catch(err){
            console.error('Error deleting image file:', err);
        }
        await blogModel.updateOne(
            { _id: post_id },
            { $pull: { imageID: new mongoose.Types.ObjectId(imageId)}}
        )
        await imgModel.deleteOne({_id: imageId})
        console.log('Deleted image file:', imagePath);
        return res.status(200).send('Image deleted successfully');
    } catch (err) {
        console.error('Error deleting image:', err);
        return res.status(500).send('Internal server error');
    }
})

router.post('/blogs/upload-image', modules.upload.single('upload'), function (req, res) {
    try{
        if (!req.file) {
            return res.status(400).json({ uploaded: 0, error: { message: 'No file uploaded'}});
        }
        //console.log(req.file)
        let fileName = req.file.filename
        let url = `../../images/${fileName}`
        let msg = 'Upload image succesfully!'
        let funcNum = req.query.CKEditorFuncNum
        //console.log({url, msg, funcNum})

        //Respond with the URL of the uploaded image
        return res.status(200).send(`
            <script type="text/javascript"> 
                window.parent.CKEDITOR.tools.callFunction(${funcNum}, '${url}', '${msg}');
            </script>
        `)
    } catch(err){
        console.error('Error uploading image:', err);
        return res.status(500).send('Internal server error');
    }
});

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

        return res.json({
            "status": 200,
            "message": "Delete successfully",
            "data": {"post_id": postId}
        })
    }catch(err){
        console.log(err)
        return res.json({
            "status": 500,
            "message": "Delete not successfully",
        })
    }
})

/*-------------TOPICS------------*/
router.get("/topics", async function(req, res, next){
    if(req.session.admin == null){
        return res.redirect("/admin/login")
    }
    const { q } = req.query;
    if (q == ''){
        res.redirect('/admin/topics')
    }
    const topics = await modules.getTopic(q)
    return res.render("topics",{admin: req.session.admin, topics: topics})
})

/*-------------ADD-TOPIC------------*/
router.get('/topics/add', function(req, res, next){
    if(req.session.admin==null){
        return res.redirect("/admin/login")
    }
    
    return res.render("addtopic", {admin: req.session.admin, msg: null})
})

router.post("/topics/add", async function(req, res, next){
    try{
        const data = {
            name: req.body.name
        }
        const existingTopic = await topicModel.findOne({name: data.name})
        if(existingTopic){
            return res.render("addtopic", {admin: req.session.admin, msg: "Topic is already exist! Please choose another."})
        }else{
            const topicData = await topicModel.insertMany(data)
            return res.redirect("/admin/topics")
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------EDIT-TOPIC------------*/
router.get("/topics/edit", async function(req, res, next){
    if(req.session.admin == null){
        return res.redirect("/admin/login")
    }
    const topic_id = req.query.topic_id
    return res.render("edittopic", {admin: req.session.admin, topic: await modules.getTopicbyID(topic_id), msg: null})
})

router.post("/topics/edit", async function(req, res, next){
    try{
        const topic_id = {
            _id: req.query.topic_id
        }
        const curTopic = await modules.getTopicbyID(topic_id._id)
        const updateData = {
            $set: {
                name: req.body.name
            }
        }
        const existingTopic = await topicModel.findOne({name: req.body.name})
        if(existingTopic){
            if(req.body.name == curTopic.name){
                const updatedTopic = await topicModel.updateOne(topic_id, updateData)
                return res.redirect("/admin/topics")
            }
            return res.render("edittopic", {
                admin: req.session.admin, 
                topic: await modules.getTopicbyID(topic_id._id), 
                msg: "Topic name is already exist! Please choose another."
            })
        }else{
            const updatedTopic = await topicModel.updateOne(topic_id, updateData)
            return res.redirect("/admin/topics")
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
        return res.json({
            "status": 200,
            "message": "Delete successfully",
            "data": {"topic_id": topic_id}
        })
    }catch(err){
        console.log(err)
        return res.json({
            "status": 500,
            "message": "Delete not successfully",
        })
    }
})

/*-------------ADMIN-USERS------------*/
router.get("/users", async function(req, res, next){
    if(req.session.admin == null){
        return res.redirect("/admin/login")
    }

    const { q } = req.query;
    if (q == ''){
        res.redirect('/admin/users')
    }
    return res.render("users", {admin: req.session.admin, users: await modules.getUser(q)})
})

/*-------------EDIT-ADMIN------------*/
router.get("/users/edit", async function(req, res, next){
    if(req.session.admin == null){
        return res.redirect("/admin/login")
    }
    const user_id = req.query.user_id
    return res.render("edituser", {
        admin: req.session.admin, 
        user: await modules.getUserbyID(user_id),
        msg: null,
        roles: await modules.getRole()
    })
})

router.post("/users/edit", async function(req, res, next){
    try{
        const user_id = {
            _id: req.query.user_id
        }
        const curUser = await modules.getUserbyID(user_id._id)
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
                return res.redirect("/admin/users")
            }
            return res.render("edituser", {
                admin: req.session.admin, 
                user: await modules.getUserbyID(user_id._id),
                msg: "Username is already exist! Please choose another.",
                roles: await modules.getRole()
            })
        }
        else{
            const updatedUser = await adminModel.updateOne(user_id, updateData)
            return res.redirect("/admin/users")
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
        return res.json({
            "status": 200,
            "message": "Delete successfully",
            "data": {"user_id": user_id}
        })
    }catch(err){
        console.log(err)
        return res.json({
            "status": 500,
            "message": "Delete not successfully",
        })
    }
})

/*-------------LOGIN------------*/
router.get('/login', function(req, res, next){
    return res.render('adminlogin', {msg: null})
})

router.post('/login', async function(req, res, next){
    try{
        const admin = await adminModel.findOne({username: req.body.username})
        if(!admin){
            return res.render("adminlogin", {"msg": "Username not found! Please try again."})
        }else{
            const checkPassword = await bcrypt.compare(req.body.password, admin.password)
            if (checkPassword){
                req.session.admin = {username: admin.username, gmail: admin.email}
                return res.redirect("/admin")
            }else{
                return res.render("adminlogin", {msg: "Password is incorrect! Please try again." })
            }
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------SIGNUP------------*/
router.get("/signup", function(req, res, next){
    return res.render('adminsignup', {msg: null})
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
            return res.render("adminsignup", {msg: "Username is already exist!"})
        }else{
            if(modules.validateEmail(data.email)){
                if(existingEmail){
                    return res.render("adminsignup", {msg: "Email is already exist! Please try another."})
                }
                else{
                    if(data.password == data.password2){
                        const saltRounds = 10;
                        const hashedPassword = await bcrypt.hash(data.password, saltRounds)
                        data.password = hashedPassword
                        const userData = await adminModel.insertMany(data)
                        return res.redirect("/admin/login")
                    }else{
                        return res.render("adminsignup", {msg: "Passwords do not match! Please try again."})
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
                return res.render("adminsignup", {msg: "Invalid email format! Please try again."})
            }
        }
    }catch(err){
        console.log(err)
    }
})

/*-------------LOGOUT------------*/
router.get('/logout', function(req, res){
    req.session.admin = null;
    return res.redirect('/admin/login');
});

module.exports = router