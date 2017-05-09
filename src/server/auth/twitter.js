var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var dataUtils = require("../dataUtils");
var config = require('../config');

module.exports = function () {

    passport.use(new TwitterStrategy({
            consumerKey: '7Y9T7UneSfQnZ3EvuhErbEpdP',
            consumerSecret: 'n7lQJiOJFrTCpNzrsq1Vt6JI18hkEwfTB0r1iTRgozYi8w793f',
            callbackURL: 'http://localhost:8080/auth/twitter/callback',
            passReqToCallback: true
        },
        function(req, token, tokenSecret, profile, done){
            console.log("Twitter Profile is " + JSON.stringify(profile));
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

            dataUtils.findUser(query, function (error, user) {
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
                
                // set the user name and image, if not already set
                if (!user.displayName) {
                    user.displayName = user.twitter.displayName;
                }

                if (!user.image && user.twitter.images.length > 0) {
                    user.image = user.twitter.images[0];
                } else {
					user.image = config.path.defaultUserImageName;
				}

                console.log("calling saveUser, user = " + JSON.stringify(user));
                dataUtils.saveUser(user, function(err) {
                    if (err) throw err;

                    done(null, user);
                });
            });
        }
    ));
};