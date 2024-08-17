var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken")
const modules = require('../dao/dao')

/* GET home page. */
router.get('/', async function(req, res, next) {
    try {
        const { q } = req.query;
        let topic = "Khuyến mại Tên miền, Hosting, VPS/Server"
        
        if(q || q == ""){
            topic = `Kết quả tìm kiếm: ${q}`
        }
        
        const blogs = await modules.getBlog(q)
        const new_blogs = blogs.slice(0,5)
        const good_blogs = blogs.slice(0,5)
        return res.render('index', {
            blogs: blogs, 
            new_blogs: new_blogs,
            good_blogs: good_blogs,
            topic: topic
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Internal server error');
    }
});

/* GET about page. */
router.get('/:topic', async function(req, res, next) {
    try{
        let topic = req.params.topic.toLowerCase();
        const { q } = req.query

        // Redirect to admin page if topic is 'admin'
        if (topic === "admin"){
            return res.render("admin", {admin: req.session.admin})
        }

        // Redirect to homepage with query if 'q' is present
        if (q || q === ""){
            return res.redirect(`/?q=${encodeURIComponent(q)}`);
        }

        topic = topic.replace(/-/g, ' ')

        // Fetch blog posts based on the topic
        const blogs = await modules.getBlog(null, topic)
        const new_blogs = blogs.slice(0, 5)
        const good_blogs = blogs.slice(0, 5)

        // Fetch topic name from database
        const topic_results = await modules.getTopic(topic)
        const topic_name = topic_results[0]?.name

        return res.render("index", {
            blogs: blogs,
            new_blogs: new_blogs,
            good_blogs: good_blogs,
            topic: topic_name
        })
    } catch(err){
        console.error(err);
        return res.status(500).send('Internal server error');
    }
});

router.get("/:topic/posts/:post_id", async function(req, res, next) {
    try{
        const { q } = req.query
        if (q || q === ""){
            return res.redirect(`/?q=${encodeURIComponent(q)}`);
        }
        const { post_id, topic } = req.params
        const post = await modules.getBlogbyID(post_id)
        const posts = await modules.getBlog()
        const new_blogs = posts.slice(0, 5)
        const good_blogs = posts.slice(0, 5)
        console.log(post._id)
        return res.render('detail_post', {
            post: post,
            new_blogs: new_blogs,
            good_blogs: good_blogs,
            title: post.title
        })
    } catch(err){
        console.error(err);
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;
