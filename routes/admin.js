var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const adminModel = require('../models/admin');
const blogModel = require('../models/blog');

async function takeBlog(){
    try{
        return await blogModel.find()
    }catch(err){
        console.error(err)
        return null
    }
}

function validateEmail(email){
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

async function takeBlogbyID(id){
    try{
        return await blogModel.findOne({_id: id})
    }catch(err){
        console.error(err)
        return null
    }
}

router.get('/', function(req, res, next){
    res.render('admin', {admin: req.session.admin})
})

router.get("/blogs", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    res.render("blogs", {admin: req.session.admin, blogs: await takeBlog()})
})

router.get("/topics", async function(req, res, next){
    res.render("topics")
})

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
                console.log(validateEmail(data.email))
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

router.get('/logout', function(req, res){
    req.session.admin = null;
    res.redirect('/admin/login');
});

router.get('/blogs/add', function(req, res, next){
    if(req.session.admin==null){
        res.redirect("/admin/login")
    }
    res.render("addblog", {admin: req.session.admin, msg: null})
})

router.post("/blogs/add", async function(req, res, next){
    try{
        const data = {
            title: req.body.title,
            body: req.body.content,
            topic: req.body.topic,
            author: req.session.admin.username,
            image: req.body.image
        }
        const existingTitle = await blogModel.findOne({title: data.title})
        if(existingTitle){
            res.render("addblog", {admin: req.session.admin, msg: "Title is already exist! Please choose another."})
        }else{
            const blogData = await blogModel.insertMany(data)
            res.redirect("/admin/blogs")
        }
    }catch(err){
        console.log(err)
    }
})

router.get("/blogs/edit", async function(req, res, next){
    if(req.session.admin == null){
        res.redirect("/admin/login")
    }
    const post_id = req.query.post_id
    res.render("editblog", {admin: req.session.admin, blog: await takeBlogbyID(post_id), msg: null})
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
            res.render("editblog", {admin: req.session.admin, blog: await takeBlogbyID(post_id._id), msg: "Title is already exist! Please choose another."})
        }else{
            const updatedBlog = await blogModel.updateOne(post_id, updateData)
            res.redirect("/admin/blogs")
        }
    }catch(err){
        console.log(err)
    }
})

module.exports = router