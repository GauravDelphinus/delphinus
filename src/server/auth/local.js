var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var config = require('../config');
var dbUser = require("../db/dbUser");

module.exports = function () {

    passport.use("local-signup", new LocalStrategy({
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback: true
        },
        function(req, email, password, done){
            var query = {};
            query.localEmail = email;
            query.type = "extended"; // search emails not just in local, but other social accounts

            dbUser.findUser(query, function(err, user) {
            	if (err) {
            		return done(err, null);
            	}

                if (user) {
                    //user already exists
                    return done(null, false, req.flash("signupMessage", "An account with that email address already exists.  Try signing in."));
                } else {
                    //console.log("user not found, req.user is " + req.user);
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

                        user.local = {};
                        user.local.email = email;
                        user.local.password = password;
                        user.local.displayName = req.body.displayName;
                        user.displayName = req.body.displayName;
                        user.image = config.url.staticImages + config.name.defaultProfileImageName;

                        // set last seen
                    	user.activity = {lastSeen : (new Date()).getTime()};
                        
                        dbUser.saveUser(user, function(err, user) {
                            if (err) {
                            	return done(err, null);
                            }

                            return done(null, user);
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
            var query = {};
            query.localEmail = email;

            dbUser.findUser(query, function(err, user) {
            	if (err) {
            		return done(err, null);
            	}

                if (!user) {
                    //user already exists
                    return done(null, false, req.flash("loginMessage", "An account with that email address does not exist.  Consider Signing-up."));
                } else {

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

                        user.local = {};
                        user.local.email = email;
                        user.local.password = password;

                        if (!user.image) {
                        	user.image = config.url.staticImages + config.name.defaultProfileImageName;
                        }

                        // set last seen
                    	user.activity = {lastSeen : (new Date()).getTime()};

                        dbUser.saveUser(user, function(err) {
                            if (err) {
                            	return done(err, null);
                            }

                            return done(null, user);
                        });
                    });
                }
            });
        })
    );
};