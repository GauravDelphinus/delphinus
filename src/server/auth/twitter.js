var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var dataUtils = require("../dataUtils");
var config = require('../config');
var dynamicConfig = require("../config/dynamicConfig");
var logger = require("../logger");
var dbUser = require("../db/dbUser");

module.exports = function () {

    passport.use(new TwitterStrategy({
            consumerKey: dynamicConfig.twitterClientId,
            consumerSecret: dynamicConfig.twitterClientSecret,
            callbackURL: dynamicConfig.hostname + config.social.twitter.oauthCallback,
            passReqToCallback: true
        },
        function(req, token, tokenSecret, profile, done){
            logger.debug("Twitter Profile is " + JSON.stringify(profile));
            var query = {};
            
            if (req.user) {
                if (req.user.id) {
                    query.userID = req.user.id;
                }

                if (req.user.google) {
                    query.googleID = req.user.google.id;
                }

                if (req.user.facebook) {
                    query.facebookID = req.user.facebook.id;
                }

                if (req.user.local) {
                    query.localEmail = req.user.local.email;
                }
            } else {
                query.twitterID = profile.id;
            }

            dbUser.findUser(query, function (error, user) {
            	if (error) {
            		return done(error, null);
            	}

                if (!user) {
                    if (req.user) {
                        user = req.user;
                    } else {
                        user = {};
                    }
                }

                //user.email = profile.emails[0].value; Twitter doesn't provide email information

                user.twitter = {};
                user.twitter.id = profile.id;
                user.twitter.username = profile.username; //twitter handle
                user.twitter.profileLink = "https://twitter.com/" + profile.username;
                user.twitter.token = token;
                user.twitter.tokenSecret = tokenSecret;
                user.twitter.displayName = profile.displayName;
                user.twitter.images = [];
                for (var i = 0; i < profile.photos.length; i++) {
                    var imageStr = profile.photos[i].value;
                    var trailerLoc = imageStr.indexOf("?");
                    if (trailerLoc != -1)
                    {
                        imageStr = imageStr.slice(0, trailerLoc);
                    }

                    //slice off "_normal" from the name of the image to get the original image
                    imageStr = imageStr.replace("_normal", "");
                    user.twitter.images.push(imageStr);
                }
                
                // set the user name and image
                user.displayName = user.twitter.displayName;

                // set user.image to the one coming from Twitter
                if (user.twitter.images.length > 0) {
                	user.image = user.twitter.images[0];
                } else if (!user.image) {
					user.image = config.url.staticImages + config.name.defaultProfileImageName;
				}

				// set last seen
                user.activity = {lastSeen : (new Date()).getTime()};

                //console.log("calling saveUser, user = " + JSON.stringify(user));
                dbUser.saveUser(user, function(err, user) {
                    if (err) {
                    	return done(err, null);
                    }

                    return done(null, user);
                });
            });
        }
    ));
};