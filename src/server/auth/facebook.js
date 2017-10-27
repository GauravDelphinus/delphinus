var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var dataUtils = require("../dataUtils");
var config = require('../config');
var logger = require("../logger");
var dynamicConfig = require("../config/dynamicConfig");

module.exports = function () {

    passport.use(new FacebookStrategy({
            clientID: dynamicConfig.facebookClientId,
            clientSecret: dynamicConfig.facebookClientSecret,
            callbackURL: config.hostname + config.social.facebook.oauthCallback,
            profileFields: ['id', 'email', 'name'],
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
                user.facebook.displayName = profile.displayName;
                user.facebook.emails = [];
                for (var i = 0; i < profile.emails.length; i++) {
                    user.facebook.emails.push(profile.emails[i].value);
                }
                
                var facebook = require('../services/facebook')(dynamicConfig.facebookClientId, dynamicConfig.facebookClientSecret);
                facebook.getImage(user.facebook.token, function (imageUrl) {
                    user.facebook.image = imageUrl;

                    // set the user name and image, if not already set
                    if (!user.displayName) {
                        user.displayName = user.facebook.displayName;
                    }

                    // if user.image is not already set, set it to the one coming from Facebook
                    if (!user.image) {
	                   	if (user.facebook.image) {
	                        user.image = user.facebook.image;
	                    } else {
	                    	user.image = config.url.staticImages + config.name.defaultProfileImageName;
	                    }
	                }

                    // set last seen
                    user.lastSeen = (new Date()).getTime();

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