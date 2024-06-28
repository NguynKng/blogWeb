const jwt = request("jsonwebtoken");
exports.cookieJwtAuth = function(req, res, next){
    const token = req.cookies.token;
    try{
        const user = jwt.verify(token, process.env.MY_SECRET);
        req.user = user;
        next();
    } catch(err){
        res.clearCookie("token");
        return res.redirect("/");
    }
}