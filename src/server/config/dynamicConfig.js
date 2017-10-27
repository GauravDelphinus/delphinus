require("dotenv").config();

module.exports = {
	facebookClientId: process.env.FACEBOOK_CLIENT_ID,
	facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET,
	twitterClientId: process.env.TWITTER_CLIENT_ID,
	twitterClientSecret: process.env.TWITTER_CLIENT_SECRET,
	googleClientId: process.env.GOOGLE_CLIENT_ID,
	googleClientSecret: process.env.GOOGLE_CLIENT_SECRET
};