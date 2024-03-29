require("dotenv").config();

module.exports = {
	nodeHostname: process.env.HOSTNAME,
	nodeEnv: process.env.NODE_ENV,
	dbHostname: process.env.NEO4J_HOSTNAME,
	dbUsername: process.env.NEO4J_USERNAME,
	dbPassword: process.env.NEO4J_PASSWORD,
	imageServiceHostname: process.env.IMAGE_SERVICE_HOSTNAME,
	facebookClientId: process.env.FACEBOOK_CLIENT_ID,
	facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET,
	twitterClientId: process.env.TWITTER_CLIENT_ID,
	twitterClientSecret: process.env.TWITTER_CLIENT_SECRET,
	googleClientId: process.env.GOOGLE_CLIENT_ID,
	googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
	contentGeneratorPublicKeyFile: process.env.CONTENT_GENERATOR_PUBLIC_KEY_FILE
};