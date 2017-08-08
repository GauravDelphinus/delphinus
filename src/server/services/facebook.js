var OAuth = require('OAuth').OAuth2;
var request = require("request");
var config = require("../config");

var Facebook = function () {

    var key = config.social.facebook.clientID;
    var secret = config.social.facebook.clientSecret;

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
        if (e) console.error('error: ' + e);  
        results = JSON.parse(results)
        done(results.data.url);      
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
    	console.log("request.post to facebook, jsonObj = " + JSON.stringify(jsonObj));
    	request.post(
		    "https://graph.facebook.com/v2.8/me/feed",
		    { json: jsonObj },
		    function (error, response, body) {
		    	console.log("callback, error = " + error + ", response = " + JSON.stringify(response) + ", body = " + JSON.stringify(body));
		        done(error, body);
		    }
		);
    }
    return {
        getImage: getImage,
        getFriends: getFriends,
        postUpdate: postUpdate
    }

}


module.exports = Facebook;