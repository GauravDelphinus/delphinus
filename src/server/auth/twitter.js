var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var dataUtils = require("../dataUtils");

module.exports = function () {

    passport.use(new TwitterStrategy({
            consumerKey: '7Y9T7UneSfQnZ3EvuhErbEpdP',
            consumerSecret: 'n7lQJiOJFrTCpNzrsq1Vt6JI18hkEwfTB0r1iTRgozYi8w793f',
            callbackURL: 'http://localhost:8080/auth/twitter/callback',
            passReqToCallback: true
        },
        function(req, token, tokenSecret, profile, done){
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

                user.image = profile.photos[0].value;
                var trailerLoc = user.image.indexOf("?");
                if (trailerLoc != -1)
                {
                    user.image = user.image.slice(0, trailerLoc);
                }
                
                user.displayName = profile.displayName;

                user.twitter = {};
                user.twitter.id = profile.id;
                user.twitter.token = token;
                user.twitter.tokenSecret = tokenSecret;
                
                console.log("calling saveUser, user = " + JSON.stringify(user));
                dataUtils.saveUser(user, function(err) {
                    if (err) throw err;

                    done(null, user);
                });
            });
        }
    ));
};