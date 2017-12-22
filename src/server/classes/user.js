const SocialInfo = require("./socialInfo").SocialInfo;

class User {
	constructor (id, displayName, image) {
		this.id = id;
		this.displayName = displayName;
		this.image = image;
	}
}

class UserSocialInfo extends SocialInfo {
	constructor (numFollowers, numFollowing) {
		this.numFollowers = numFollowers;
		this.numFollowing = numFollowing;

		this.popularity = this.numFollowers + this.numFollowing;
	}
}

module.exports = {
	User : User,
	UserSocialInfo : UserSocialInfo
};