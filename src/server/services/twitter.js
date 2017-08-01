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
    
    /*
    var oauth = OAuth({
    consumer: {
        key: key,
        secret: secret
    },
    signature_method: 'HMAC-SHA1',
    hash_function: function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }

});

    var request_data = {
	url: 'https://api.twitter.com/1.1/statuses/update.json?include_entities=true',
    method: 'POST',
    data: {
        status: 'Hello Ladies + Gentlemen, a signed OAuth request!'
    }
};
	*/
    var getUserTimeline = function(userKey, userSecret, userId, done) {
    	oauth.get("https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=" + userId,
    		userKey,
    		userSecret,
    		function(error, results, res) {
    			if (error) {
    				done(error, null);
    			} else {
    				results = JSON.parse(results);
    				done(0, results);
    			}
    			
    		});
    }

    function getEchoAuth(url, userKey, userSecret) { 
  //helper to construct echo/oauth headers from URL
    
    	var orderedParams = oauth._prepareParameters(
		    userKey, //test user token
		    userSecret, //test user secret
		    "GET",
		    url
		    );
    	return oauth._buildAuthorizationHeaders(orderedParams);
  	}

    var postUpdate = function(message, userAccessToken, userAccessTokenSecret, done) {
    	console.log("postUpdate, userAccessToken = " + userAccessToken + ", userAccessTokenSecret = " + userAccessTokenSecret);
    	oauth.post(
		  "https://api.twitter.com/1.1/statuses/update.json",
		  userAccessToken, userAccessTokenSecret,
		  {"status": message},
		  function(error, data) {
		    if(error) console.log("error!!!!" + JSON.stringify(error));
		    else console.log("success!!!!, data = " + JSON.stringify(data));
		  }
		);

    	/*
    	var token = {
    key: userAccessToken,
    secret: userAccessTokenSecret
};
		request({
			url: request_data.url,
	method: request_data.method,
	form: request_data.data,
	headers: oauth.toHeader(oauth.authorize(request_data, token))
		}, function(error, response, body) {
			console.log("callback, error = " + error + ", response = " + JSON.stringify(response) + ", body = " + JSON.stringify(body));
			//process your data here
		});
		*/

    	/*
    	var params = {
		    status : message
		    //media : [("data:" + mimeType + ";base64,") + fs.readFileSync(path,'base64')]
		};
    	oauth.post("https://api.twitter.com/1.1/statuses/update.json",
           userAccessToken, userAccessTokenSecret, params, "application/json",
           function (error, data, response2) {
	           if(error){
	               console.log('Error: Something is wrong.\n'+JSON.stringify(error)+'\n');
	               done(error, null, null);
	           }else{
	               console.log('Twitter status updated.\n');
	               console.log(response2+'\n');
	               done(0, data, response2);
	           }
           });
           */
           /*
           request.post('https://api.twitter.com/1.1/statuses/update.json')
  .send({status: message}) 	//your json data
  .set(
    'x-auth-service-provider',
    'https://api.twitter.com/1.1/account/verify_credentials.json')
  .set(
    'x-verify-credentials-authorization',
    getEchoAuth("https://api.twitter.com/1.1/account/verify_credentials.json", userAccessToken, userAccessTokenSecret))
  .end(function(res){
  		console.log("response from request.post is " + JSON.stringify(res));

  });
  */
           

           /*
    	var authorization = oauth.authHeader(
		    'https://api.twitter.com/1.1/statuses/update.json',
		    userAccessToken, userAccessTokenSecret, 'POST');
		   
		var options = {                 
		  method: 'POST',             
		  uri: "https://api.twitter.com/1.1/statuses/update.json",
		  json: {status: message},                       
		  headers: {               
		    'Authorization': "Bearer " + userAccessToken          
		  }
		};                                         
		request(options, function(error, response, body) {  
		  // do stuff
		  console.log("callback for request, error = " + error + ", response = " + JSON.stringify(response) + ", body = " + JSON.stringify(body));
		});
		*/
    }
    return {
        postUpdate: postUpdate,
        getUserTimeline: getUserTimeline
    }

}


module.exports = Twitter;