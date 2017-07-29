var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var dataUtils = require("../dataUtils");
var config = require('../config');

module.exports = function () {

    passport.use(new FacebookStrategy({
            clientID: '1286014801445639',
            clientSecret: '81732e3d807f86c9099589f632897dce',
            callbackURL: 'http://localhost:8080/auth/facebook/callback',
            profileFields: ['id', 'email', 'name'],
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

                if (req.user.local) {
                    query.localEmail = req.user.local.email;
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

                user.facebook = {};
                user.facebook.id = profile.id;
                user.facebook.token = accessToken;
                user.facebook.displayName = profile.displayName;
                user.facebook.emails = [];
                for (var i = 0; i < profile.emails.length; i++) {
                    user.facebook.emails.push(profile.emails[i].value);
                }
                
                var facebook = require('../services/facebook')('1286014801445639', '81732e3d807f86c9099589f632897dce');
                facebook.getImage(user.facebook.token, function (imageUrl) {
                    //console.log("getImage returned, imageUrl = " + imageUrl);
                    user.facebook.image = imageUrl;

                    // set the user name and image, if not already set
                    if (!user.displayName) {
                        user.displayName = user.facebook.displayName;
                    }

                    if (!user.image && user.facebook.image) {
                        user.image = user.facebook.image;
                    } else {
                    	user.image = config.url.staticImages + config.name.defaultProfileImageName;
                    }

                    // set last seen
                    user.lastSeen = (new Date()).getTime();

                    dataUtils.saveUser(user, function(err, user) {
                        if (err) throw err;

                        done(null, user);
                    });   
                });  
            });
        }
    ));
};