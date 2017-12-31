
const dynamicConfig = require("./config/dynamicConfig");
const dbChallenge = require("./db/dbChallenge");
const dbEntry = require("./db/dbEntry");
const dbUser = require("./db/dbUser");
const config = require("./config");
const mime = require("mime");

/*
	Get Metadata associated with the given challenge, along with the
	challenge data itself.  Mostly needed to provide SEO information to 
	pages that are rendered, and to save on extra client/server calls by
	providing the basic info to the page during rendering time itself.
	
	Also, refer metadata.ejs and how its include in the various views (.ejs files)
*/
function getChallengeMetadata(challengeId, done) {
	dbChallenge.getChallenge(challengeId, function(err, challenge) {
		if (err) {
			return done(err);
		}

		//got the core challenge info, now construct the meta data
		var metadata = {
			fbAppId: dynamicConfig.facebookClientId,
			publisherName : config.branding.siteName,
			imageURL : dynamicConfig.hostname + config.url.challengeImages + challenge.id + "." + mime.extension(challenge.imageType),
			pageTitle : "Challenge: " + challenge.caption + " | " + config.branding.siteName,
			pageURL : dynamicConfig.hostname + config.url.challenge + challenge.id,
			pageDescription : "Posted by " + challenge.postedByUser.displayName + ".  Up for the challenge?  Check out the challenge and post your entry now, it's free and takes just a few minutes!  Also, check out the awesome entries posted by others :)",
			imageType : challenge.imageType,
			authorName : challenge.postedByUser.displayName
		};

		var output = {
			challenge: challenge,
			metadata: metadata
		};

		return done(null, output);
	});
}

/*
	Get Metadata associated with the given entry, along with the
	entry data itself.  Mostly needed to provide SEO information to 
	pages that are rendered, and to save on extra client/server calls by
	providing the basic info to the page during rendering time itself.
	
	Also, refer metadata.ejs and how its include in the various views (.ejs files)
*/
function getEntryMetadata(entryId, done) {
	dbEntry.getEntry(entryId, function(err, entry) {
		if (err) {
			return done(err);
		}

		//got the core challenge info, now construct the meta data
		var metadata = {
			fbAppId: dynamicConfig.facebookClientId,
			publisherName : config.branding.siteName,
			imageURL : dynamicConfig.hostname + config.url.entryImages + entry.id  + "." + mime.extension(entry.imageType),
			pageTitle : "Caption Entry: " + entry.caption + " | " + config.branding.siteName,
			pageURL : dynamicConfig.hostname + config.url.entry + entry.id,
			pageDescription : "Posted by " + entry.postedByUser.displayName + ".  Like this entry?  Check out more such entries, and challenge yourself to post one of your own!  It takes just a few minutes, and it's free :)",
			imageType : entry.imageType,
			authorName : entry.postedByUser.displayName
		};

		var output = {
			entry: entry,
			metadata: metadata
		};

		return done(null, output);
	});
}

/*
	Get Metadata associated with the given user, along with the
	user data itself.  Mostly needed to provide SEO information to 
	pages that are rendered, and to save on extra client/server calls by
	providing the basic info to the page during rendering time itself.
	
	Also, refer metadata.ejs and how its include in the various views (.ejs files)
*/
function getUserMetadata(userId, done) {
	dbUser.getUser(userId, function(err, user) {
		if (err) {
			return done(err);
		}

		//got the core challenge info, now construct the meta data
		var metadata = {
			fbAppId: dynamicConfig.facebookClientId,
			publisherName : config.branding.siteName,
			imageURL : dynamicConfig.hostname + user.image,
			pageTitle : "User: " + user.displayName + " | " + config.branding.siteName,
			pageURL : dynamicConfig.hostname + config.url.user + user.id,
			pageDescription : "Captionify User Profile for " + user.displayName,
			imageType : mime.lookup(user.image),
			authorName : config.branding.siteName
		};

		var output = {
			userInfo: user,
			metadata: metadata
		};

		return done(null, output);
	});
}

function getGenericMetadata(page) {
	var data = {
		fbAppId: dynamicConfig.facebookClientId,
		publisherName : config.branding.siteName,
		imageURL: dynamicConfig.hostname + config.url.brandImages + config.branding.shareImage.imageName, //general branding image
		imageType : config.branding.shareImage.imageType,
		imageWidth : config.branding.shareImage.imageWidth,
		imageHeight : config.branding.shareImage.imageHeight,
		authorName : config.branding.siteName
	};

	if (page == "entries") {
		data.pageTitle = "Browse Entries" + " | " + config.branding.siteName;
		data.pageURL = dynamicConfig.hostname + config.url.entries;
		data.pageDescription = "Check out all the awesome entries posted at Captionify.com, and challenge yourself to post your own!";
	} else if (page == "users") {
		data.pageTitle = "Users | " + config.branding.siteName;
		data.pageURL = dynamicConfig.hostname + config.url.users;
		data.pageDescription = "Users";
	} else if (page == "home") { //home page or other generic pages
		data.pageURL = dynamicConfig.hostname;
		data.pageTitle = config.branding.siteName + " | " + config.branding.siteTitle;
		data.pageDescription = config.branding.siteDescription;
	}

	return data;
}

module.exports = {
	getChallengeMetadata: getChallengeMetadata,
	getEntryMetadata: getEntryMetadata,
	getUserMetadata: getUserMetadata,
	getGenericMetadata: getGenericMetadata
}