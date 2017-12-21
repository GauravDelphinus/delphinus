var OAuth = require('oauth').OAuth2;
var request = require("request");
var config = require("../config");
var logger = require("../logger");

var Facebook = function (key, secret) {
    var oauth = new OAuth(
        key, secret, 'https://graph.facebook.com',
        null,
        'oauth2/token',
        null
    );

    var getImage = function(userKey, done) {
        oauth.get(
      'https://graph.facebook.com/v2.8/me/picture?redirect=false&type=large',
      userKey, //test user token
      function (e, results, res){
        if (e) {
        	return done(e);
        }
        results = JSON.parse(results)
        return done(null, results.data.url);      
      });    
    }

    var getFriends = function(userKey, done) {
        oauth.get(
      'https://graph.facebook.com/v2.8/me/friends?redirect=false',
      userKey, //test user token
      function (e, results, res){
        if (e) console.error('error: ' + e);  
        results = JSON.parse(results)
        done(results.summary);      
      });    
    }

    //Note: Facebook requires the 'link' to be a publicly accessible, fully formed URL.  Localhost:8080 or loopback
    //addresses and relative addresses will not work and the Facebook endpoint will reject the request
    var postUpdate = function(message, link, userKey, done) {
    	var jsonObj = {
    		message: message,
    		link: link,
    		access_token: userKey
    	};
    	request.post(
		    "https://graph.facebook.com/v2.8/me/feed",
		    { json: jsonObj },
		    function (error, response, body) {
		    	if (!body.hasOwnProperty("id")) { //https://developers.facebook.com/docs/graph-api/reference/v2.11/user/feed
		    		//missing 'id' in body means there was an error
		    		return done(response.statusCode, body);
		    	} 
		        return done(null, body);
		    }
		);
    }

    /*
    	Get permissions for current user from Facebook
    */
    var getPermissions = function(userKey, done) {
    	oauth.get(
      'https://graph.facebook.com/v2.8/me/permissions',
      userKey, //test user token
      function (e, results, res){
      	logger.debug("e: " + e + ", results = " + JSON.stringify(results));
        if (e) {
        	return done(e, null);
        }

        results = JSON.parse(results);
        return done(e, results.data);      
      });   
    }

    var logout = function(userKey, done) {
    	var jsonObj = {
    		uri: "https://graph.facebook.com/v2.8/me/permissions",
    		access_token: userKey
    	};

    	request.del(
    		"https://graph.facebook.com/v2.8/me/permissions",
    		{ json: jsonObj}, 
    		function(error, response, body) {
			    done(error, body);
    	});
    }

    return {
        getImage: getImage,
        getFriends: getFriends,
        postUpdate: postUpdate,
        logout: logout,
        getPermissions: getPermissions
    }

}


module.exports = Facebook;