var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var dataUtils = require("../dataUtils");
var config = require('../config');
var logger = require("../logger");
var dynamicConfig = require("../config/dynamicConfig");

module.exports = function () {

	//https://github.com/jaredhanson/passport-facebook for more documentation
    passport.use(new FacebookStrategy({
            clientID: dynamicConfig.facebookClientId,
            clientSecret: dynamicConfig.facebookClientSecret,
            callbackURL: dynamicConfig.hostname + config.social.facebook.oauthCallback,
            profileFields: ['id', 'email', 'photos', 'displayName'],
            passReqToCallback: true
        },
        function(req, accessToken, refreshToken, profile, done){
        	logger.debug("Facebook Profile: " + JSON.stringify(profile));

            var query = {};
            
            if (req.user) {
                if (req.user.id) {
                    query.userID = req.user.id;
                }

                if (req.user.twitter) {
                    query.twitterID = req.user.twitter.id;
                }

                if (req.user.google) {
                    query.googleID = req.user.google.id;
                }

                if (req.user.local) {
                    query.localEmail = req.user.local.email;
                }
            } else {
                query.facebookID = profile.id;
            }

            dataUtils.findUser(query, function (error, user) {
            	if (error) {
            		return done(error, 0);
            	}
             
                if (!user) {
                    if (req.user) {
                        user = req.user;
                    } else {
                        user = {};
                    }
                }

                user.facebook = {};
                user.facebook.id = profile.id;
                user.facebook.profileLink = "https://www.facebook.com/" + profile.id;
                user.facebook.token = accessToken;
                
                user.facebook.emails = [];
                for (var i = 0; i < profile.emails.length; i++) {
                    user.facebook.emails.push(profile.emails[i].value);
                }

				// PROFILE DISPLAY NAME -----------------
				user.facebook.displayName = profile.displayName;

				// set the user name
                user.displayName = user.facebook.displayName;
                
                // set last seen
                user.activity = {lastSeen : (new Date()).getTime()};

                // PROFILE IMAGE -------------
                user.facebook.images = [];
                for (var i = 0; i < profile.photos.length; i++) {
                    var imageStr = profile.photos[i].value;
                    user.facebook.images.push(imageStr);
                }

                //NOTE: While we can directly use the profile image as returned in profile.photos[] array, but the size
                //of these photos is very small.  So instead, we will use the Graph API to query the current profile picture
                //which returns a higher resolution picture.
                var facebook = require('../services/facebook')(dynamicConfig.facebookClientId, dynamicConfig.facebookClientSecret);
                facebook.getImage(user.facebook.token, function (error, imageUrl) {
                	if (error) {
                		user.image = config.url.staticImages + config.name.defaultProfileImageName; //default placeholder picture
                	}

                	user.image = imageUrl;

	                dataUtils.saveUser(user, function(err, user) {
	                    if (err) {
	                    	return done(err, null);
	                    }

	                    return done(null, user);
	                });

				});

            });
        }
    ));
};