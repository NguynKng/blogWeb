var express = require('express');
var router = express.Router();
const connect = require("../models/db")

/* GET users listing. */
router.get('/', function(req, res, next) {
    connect.then(() => {
        console.log("Database connected successfully.")
    }).catch(() => {
        console.log("Database cannot be connected.")
    })
    res.send("Database connected successfully.")
});


module.exports = router;
