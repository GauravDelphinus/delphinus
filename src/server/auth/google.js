var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var dataUtils = require("../dataUtils");

module.exports = function () {

    passport.use(new GoogleStrategy({
        clientID: '834949392857-spbcn54g31c0cdd764s092m1hd6va9hf.apps.googleusercontent.com',
        clientSecret: '-FDBs0AqFgNR_zmdMbdlhVu2',
        callbackURL: 'http://localhost:8080/auth/google/callback'},
        function(req, accessToken, refreshToken, profile, done){

            console.log("Info from Google Profile: " + JSON.stringify(profile));
            var query = {
                googleID : profile.id
            };

            dataUtils.findUser(query, function (error, user) {
                if (user) {
                    done(null, user);
                } else {
                    var user = {};

                    user.email = profile.emails[0].value;

                    user.image = profile.photos[0].value;
                    var trailerLoc = user.image.indexOf("?");
                    if (trailerLoc != -1)
                    {
                        user.image = user.image.slice(0, trailerLoc);
                    }
                    
                    user.displayName = profile.displayName;

                    user.google = {};
                    user.google.id = profile.id;
                    user.google.token = accessToken;
                    
                    dataUtils.saveUser(user, function(err) {
                        if (err) throw err;

                        done(null, user);
                    });
                }
            });
        }
    ));
};