var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var dataUtils = require("../dataUtils");

module.exports = function () {

    passport.use(new FacebookStrategy({
            clientID: '1286014801445639',
            clientSecret: '81732e3d807f86c9099589f632897dce',
            callbackURL: 'http://localhost:8080/auth/facebook/callback',
            passReqToCallback: true
        },
        function(req, accessToken, refreshToken, profile, done){

            //console.log("Info from Facebook Profile: " + JSON.stringify(profile));

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
            } else {
                query.facebookID = profile.id;
            }

            dataUtils.findUser(query, function (error, user) {
             
                if (!user) {
                    if (req.user) {
                        user = req.user;
                    } else {
                        user = {};
                    }
                }

                //user.email = profile.emails[0].value; // Seems facebook doesn't provide email either
                //user.image = profile.photos[0].value; // Facebook doesn't provide profile image
                
                user.displayName = profile.displayName;

                user.facebook = {};
                user.facebook.id = profile.id;
                user.facebook.token = accessToken;
                
                var facebook = require('../services/facebook')('1286014801445639', '81732e3d807f86c9099589f632897dce');
                facebook.getImage(user.facebook.token, function (imageUrl) {
                    console.log("getImage returned, imageUrl = " + imageUrl);
                    user.image = imageUrl;
                    dataUtils.saveUser(user, function(err) {
                        if (err) throw err;

                        done(null, user);
                    });   
                });

                 
            });
        }
    ));
};