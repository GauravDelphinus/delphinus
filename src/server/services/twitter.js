var OAuth   = require('oauth').OAuth; //Twitter does NOT support OAuth2, Oauth1 requires a secret in additino to Key.
var request = require('request');
var crypto  = require('crypto');
var dynamicConfig = require("../config/dynamicConfig");

var Twitter = function () {

    var key = dynamicConfig.twitterClientId;
    var secret = dynamicConfig.twitterClientSecret;
    
    var oauth = new OAuth(
           "https://api.twitter.com/oauth/request_token",
           "https://api.twitter.com/oauth/access_token",
           key,
           secret,
           "1.0A",
           null,
           "HMAC-SHA1"
          );

    var postUpdate = function(message, userAccessToken, userAccessTokenSecret, done) {
    	oauth.post(
		  "https://api.twitter.com/1.1/statuses/update.json",
		  userAccessToken, userAccessTokenSecret,
		  {"status": message},
		  function(error, data) {
		    done(error, data);
		  }
		);
    }

    var logout = function(userAccessToken, userAccessTokenSecret, done) {
    	oauth.post(
		  "https://api.twitter.com/oauth2/invalidate_token",
		  userAccessToken, userAccessTokenSecret,
		  {"access_token": userAccessToken},
		  "application/json",
		  function(error, data) {
		  	console.log("response from Twitter: error = " + JSON.stringify(error) + ", data = " + JSON.stringify(data));
		    done(error, data);
		  }
		);
    }

    return {
        postUpdate: postUpdate,
        logout: logout
    }
}


module.exports = Twitter;