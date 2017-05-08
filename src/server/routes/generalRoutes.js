var express = require("express");
var dataUtils = require("../dataUtils");

var routes = function(db) {
	var generalRouter = express.Router();

      generalRouter.route("/postNewImage")
      .post(function(req, res) {
            //input type:
            /*
            {
                  imageData: <blob>,
                  imageType: "userProfile" | "challenge"
            }
            */

            
            
      });

	return userRouter;
};

module.exports = routes;