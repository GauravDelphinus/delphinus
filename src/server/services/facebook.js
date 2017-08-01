var OAuth = require('OAuth').OAuth2;
var request = require('request');

var Facebook = function (facebookKey, facebookSecret) {

    var key = facebookKey;
    var secret = facebookSecret;

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
          //console.log('hi');
        if (e) console.error('error: ' + e);  
          //console.log(res);
        results = JSON.parse(results)
        done(results.data.url);      
      });    
    }
    var getFriends = function(userKey, done) {
        oauth.get(
      'https://graph.facebook.com/v2.8/me/friends?redirect=false',
      userKey, //test user token
      function (e, results, res){
          //console.log('hi');
        if (e) console.error('error: ' + e);  
          //console.log(res);
        results = JSON.parse(results)
        console.log(results.data);
        done(results.summary);      
      });    
    }
    var postUpdate = function(message, link, userKey, done) {
    	//Note: Facebook requires the 'link' to be a publicly accessible, fully formed URL.  Localhost:8080 or loopback
    	//addresses and relative addresses will not work and the Facebook endpoint will reject the request
    	var jsonObj = {
    		message: message,
    		link: "http://www.google.com", //link,
    		access_token: userKey
    	};
    	request.post(
		    "https://graph.facebook.com/v2.8/me/feed",
		    { json: jsonObj },
		    function (error, response, body) {
		    	console.log("post callback called");
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