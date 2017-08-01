var OAuth   = require('oauth').OAuth; //Twitter does NOT support OAuth2, Oauth1 requires a secret in additino to Key.
var request = require('request');
var crypto  = require('crypto');

var Twitter = function (twitterKey, twitterSecret) {

    var key = twitterKey;
    var secret = twitterSecret;
    
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

    return {
        postUpdate: postUpdate
    }
}


module.exports = Twitter;