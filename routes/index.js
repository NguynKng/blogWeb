var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt')
const userModel = require("../models/users")

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});

router.get('/signup', function(req, res, next){
    res.render('signup')
})

router.get('/login', function(req, res, next){
    res.render('login')
})

router.post('/signup', async function(req, res, next){

    const data = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    }

    const existingUser = await userModel.findOne({username:data.username})

    if(existingUser){
        res.send("Username is already exist.")
    }else{
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds)
        data.password = hashedPassword
        bcrypt.compare(req.body.password2, data.password, async function(err, result){
            if(err){
                res.send("Error comparing password2")
                return
            }
            if(result){
                const userData = await userModel.insertMany(data)
                console.log(userData)
                return res.redirect('/login')
            }else{
                res.send('Passwords do not match! Authentication failed.')
            }
        })
    }
})

router.post('/login', async function(req, res, next){
    try{
        const check = await userModel.findOne({username: req.body.username})
        if(!check){
            res.send("Username not found.")
        }else{
            const checkPassword = await bcrypt.compare(req.body.password, check.password)
            if (checkPassword){
                return res.redirect("/")
            }else{
                res.send("Password is incorrect. Please try again.")
            }
        }
    }catch{
        res.send("Wrong detail.")
    }
})

module.exports = router;
