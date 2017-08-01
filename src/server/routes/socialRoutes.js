var express = require("express");
var dataUtils = require("../dataUtils");


var routes = function(db) {
	var socialRouter = express.Router();

	socialRouter.route("/")
	.post(function(req, res) {
		var message = req.body.message;
		var link = req.body.link;

		

		var jsonObj = {};
				// For Picture upload to Facebook
				//jsonObj.caption = data.caption;
				//jsonObj.url = "https://i.ytimg.com/vi/ObJgJizBFh8/maxresdefault.jpg";
				

		jsonObj.message = req.body.message;
		jsonObj.link = req.body.link;
		
		console.log("jsonObj is " + JSON.stringify(jsonObj));
		var postURL = "";

		if (req.query.target == "facebook") {
			jsonObj.access_token = req.user.facebook.token;
			postURL = "https://graph.facebook.com/v2.8/me/feed";

			var facebook = require('../services/facebook')('1286014801445639', '81732e3d807f86c9099589f632897dce');

			facebook.postUpdate(req.body.message, req.body.link, req.user.facebook.token, function(error, data) {
				if (error) {
	        		console.log("postUpdate - error: " + JSON.stringify(error));
	        	} else {
	        		console.log("postUpdate success!");
	        		res.sendStatus(200);
	        	}
			});
		} else if (req.query.target == "twitter") {
			jsonObj.access_token = req.user.twitter.token;
			postURL = "https://api.twitter.com/1.1/statuses/update.json";

			var twitter = require('../services/twitter')('7Y9T7UneSfQnZ3EvuhErbEpdP', 'n7lQJiOJFrTCpNzrsq1Vt6JI18hkEwfTB0r1iTRgozYi8w793f');
        
	        /*
	        twitter.getUserTimeline(req.user.twitter.token, req.user.twitter.tokenSecret, req.user.twitter.id, function(error, results) {
	        	if (error) {
	        		console.log("getUserTimeline - error: " + error);
	        	} else {
	        		var lastPost = results[0].text;
	        		console.log("getUserTimeline, success! lastPost = " + lastPost);
	        	}
	        	
				//res.json({});
	        });
	        */
	        
			
	        twitter.postUpdate(req.body.message, req.user.twitter.token, req.user.twitter.tokenSecret, function (error, data, response) {
	        	if (error) {
	        		console.log("postUpdate - error: " + JSON.stringify(error));
	        	} else {
	        		console.log("postUpdate success!");
	        		res.sendStatus(200);
	        	}
	        	
	        });
		}

		/*
		request.post(
		    postURL,
		    { json: jsonObj },
		    function (error, response, body) {
		    	console.log("post callback called");
		        if (!error && response.statusCode == 200) {
		            console.log(body)
					res.json(body);
		        } else {
		        	console.log("error is " + error + ", response is " + JSON.stringify(response) + ", body is " + JSON.stringify(body));
		        	res.sendStatus(500);
		        }
		    }
		);
		*/

		


        
		
		/*

		$.ajax({
			type: "POST",
			//url: "https://graph.facebook.com/v2.8/me/photos",
			url: "https://graph.facebook.com/v2.8/me/feed",
	      	dataType: "json", // return data type
	      	contentType: "application/json; charset=UTF-8",
	      	data: JSON.stringify(jsonObj)
	  	})
		.done(function(data, textStatus, jqXHR) {
	      	alert("success!  data is " + JSON.stringify(data));
	  	})
		.fail(function(jqXHR, textStatus, errorThrown) {
			alert("failure! error is " + errorThrown);
		});	
		*/


	});

	return socialRouter;
};

module.exports = routes;