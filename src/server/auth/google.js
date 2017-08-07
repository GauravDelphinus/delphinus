var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var dataUtils = require("../dataUtils");
var config = require('../config');

module.exports = function () {

    passport.use(new GoogleStrategy({
            clientID: config.social.google.clientID,
            clientSecret: config.social.google.clientSecret,
            callbackURL: config.hostname + config.social.google.oauthCallback,
            passReqToCallback: true
        },
        function(req, accessToken, refreshToken, profile, done){

            //console.log("Info from Google Profile: " + JSON.stringify(profile));

            var query = {};

            if (req.user) {
                if (req.user.id) {
                    query.userID = req.user.id;
                }

                if (req.user.twitter) {
                    query.twitterID = req.user.twitter.id;
                }

                if (req.user.facebook) {
                    query.facebookID = req.user.facebook.id;
                }

                if (req.user.local) {
                    query.localEmail = req.user.local.email;
                }
            } else {
                query.googleID = profile.id;
            }

            dataUtils.findUser(query, function (error, user) {
                if (!user) {
                    if (req.user) {
                        user = req.user;
                    } else {
                        user = {};
                    }
                }

                user.google = {};
                user.google.id = profile.id;
                user.google.token = accessToken;
                user.google.emails = [];
                for (var i = 0; i < profile.emails.length; i++) {
                    user.google.emails.push(profile.emails[i].value);
                }
                user.google.images = [];
                for (var i = 0; i < profile.photos.length; i++) {
                    var imageStr = profile.photos[i].value;
                    var trailerLoc = imageStr.indexOf("?");
                    if (trailerLoc != -1)
                    {
                        imageStr = imageStr.slice(0, trailerLoc);
                    }
                    user.google.images.push(imageStr);
                }
                user.google.displayName = profile.displayName;

                // set the user name and image, if not already set
                if (!user.displayName) {
                    user.displayName = user.google.displayName;
                }

                // if user.image is not already set, set it to the one coming from Google
                if (!user.image) {
                	if (user.google.images.length > 0) {
	                    user.image = user.google.images[0];
	                } else {
						user.image = config.url.staticImages + config.name.defaultProfileImageName;
					}
				}

				// set last seen
				user.lastSeen = (new Date()).getTime();
                
                dataUtils.saveUser(user, function(err, user) {
                    if (err) throw err;

                    done(null, user);
                });
            });
        })
    );
};