var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var dataUtils = require("../dataUtils");
var config = require('../config');

module.exports = function () {

    passport.use("local-signup", new LocalStrategy({
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback: true
        },
        function(req, email, password, done){
        	console.log("req.body.displayName is " + req.body.displayName);
            console.log("Local-signup callback, email: " + email + ", password: " + password);

            var query = {};
            query.localEmail = email;
            query.type = "extended"; // search emails not just in local, but other social accounts

            dataUtils.findUser(query, function(err, user) {
            	console.log("user is " + user + ", err = " + err);
                if (user) {
                    console.log("user already found, returning.  user is " + JSON.stringify(user));
                    //user already exists
                    return done(null, false, req.flash("signupMessage", "An account with that email address already exists.  Try signing in."));
                } else {
                    console.log("user not found, req.user is " + req.user);
                    if (req.user) { //user already signed in with other social accounts
                        if (req.user.google) {
                            query.googleID = req.user.google.id;
                        }

                        if (req.user.twitter) {
                            query.twitterID = req.user.twitter.id;
                        }

                        if (req.user.facebook) {
                            query.facebookID = req.user.facebook.id;
                        }
                    }

                    dataUtils.findUser(query, function (error, user) {
                        console.log("findUser returned user = " + user);
                        if (!user) {
                            if (req.user) {
                                user = req.user;
                            } else {
                                user = {};
                            }
                        }

                        user.local = {};
                        user.local.email = email;
                        user.local.password = password;
                        user.local.displayName = req.body.displayName;
                        user.displayName = req.body.displayName;
                        user.image = config.url.staticImages + config.name.defaultProfileImageName;
                        
                        console.log("calling saveUser with user = " + JSON.stringify(user));
                        dataUtils.saveUser(user, function(err, user) {
                            if (err) throw err;

                            done(null, user);
                        });
                    });
                }
            });
        })
    );

    passport.use("local-login", new LocalStrategy({
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback: true
        },
        function(req, email, password, done){

            console.log("Local-signup callback, email: " + email + ", password: " + password);

            var query = {};
            query.localEmail = email;

            dataUtils.findUser(query, function(err, user) {
                if (!user) {
                    console.log("user not found, returning.");
                    //user already exists
                    return done(null, false, req.flash("loginMessage", "An account with that email address does not exist.  Consider Signing-up."));
                } else {
                    console.log("user found, user is " + user);
                 	console.log("password = " + password + ", user.password = " + user.password);

                    if (password != user.local.password) {
                        return done(null, false, req.flash("loginMessage", "Oops!  Wrong password.  Try again."));
                    }
                    
                    if (req.user) { //user already signed in with other social accounts
                        if (req.user.google) {
                            query.googleID = req.user.google.id;
                        }

                        if (req.user.twitter) {
                            query.twitterID = req.user.twitter.id;
                        }

                        if (req.user.facebook) {
                            query.facebookID = req.user.facebook.id;
                        }
                    }

                    console.log("calling findUser with query = " + JSON.stringify(query));
                    dataUtils.findUser(query, function (error, user) {
                        console.log("findUser returned user = " + user);
                        if (!user) {
                            if (req.user) {
                                user = req.user;
                            } else {
                                user = {};
                            }
                        }

                        user.local = {};
                        user.local.email = email;
                        user.local.password = password;

                        if (!user.image) {
                        	user.image = config.url.staticImages + config.name.defaultProfileImageName;
                        }

                        console.log("calling saveUser with user = " + JSON.stringify(user));
                        dataUtils.saveUser(user, function(err) {
                            if (err) throw err;

                            done(null, user);
                        });
                    });
                }
            });
        })
    );
};