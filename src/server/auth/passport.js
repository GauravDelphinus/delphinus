var passport = require('passport');
var session = require("express-session");

module.exports = function (app) {

	app.use(session({secret: 'anything'}));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser(function (user, done) {
        done(null, user)
    });

    passport.deserializeUser(function (user, done) {
        done(null, user);
    });
    
    require('./google')();
};