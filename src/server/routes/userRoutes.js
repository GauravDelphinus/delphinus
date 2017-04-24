var express = require("express");

var routes = function(db) {
	var userRouter = express.Router();

	userRouter.route("/")

        .get(function(req, res) {
            console.log("/user/ req.user is " + JSON.stringify(req.user));
            res.render("user", {user: {name: req.user.displayName,
                                    image: req.user.image}});
        });

	return userRouter;
};

module.exports = routes;