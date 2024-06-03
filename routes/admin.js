var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const adminModel = require('../models/admin');

router.get("/", function(req, res, next){
    res.render('adminhome')
})

router.get('/login', function(req, res, next){
    res.render('adminlogin')
})

router.post('/login', async function(req, res, next){
    try{
        const check = await adminModel.findOne({username: req.body.username})
        if(!check){
            res.send("Username not found.")
        }else{
            const checkPassword = await bcrypt.compare(req.body.password, check.password)
            if (checkPassword){
                res.redirect("/admin")
            }else{
                res.send("Password is incorrect. Please try again.")
            }
        }
    }catch{
        res.send("Wrong detail.")
    }
})

router.get('/signup', function(req, res, next){
    res.render('adminsignup')
})

router.post('/signup', async function(req, res, next){

    const data = {
        username: req.body.username,
        password:  req.body.password
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds)
    data.password = hashedPassword;

    const adminData = await adminModel.insertMany(data)
    console.log(adminData)
    return res.redirect('/admin/login')
})

module.exports = router