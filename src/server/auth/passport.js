var passport = require('passport');
var session = require("express-session");
var flash = require("connect-flash");

module.exports = function (app) {

	app.use(session({secret: 'crackalackin',
        resave: true,
        saveUninitialized: true,
        cookie : { 
            secure : false, 
            maxAge : (4 * 60 * 60 * 1000) 
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(flash());

    passport.serializeUser(function (user, done) {
        done(null, user)
    });

    passport.deserializeUser(function (user, done) {
        done(null, user);
    });
    
    require("./google")();
    require("./twitter")();
    require("./facebook")();
    require("./local")();
};