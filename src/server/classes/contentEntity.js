var Entity = require("./entity").Entity;
var SocialInfo = require("./socialInfo").SocialInfo;

class ContentEntity extends Entity {
	constructor(id, imageType, created, caption, postedBy) {
		super(id);

		this.imageType = imageType;
		this.created = created;
		this.caption = caption;
		this.postedBy = postedBy;
	}
}

class ContentEntitySocialInfo extends SocialInfo {
	constructor (numLikes, numShares, numComments) {
		this.numLikes = numLikes;
		this.numShares = numShares;
		this.numComments = numComments;

		this.popularity = this.numLikes + this.numShares + this.numComments;
	}
}

module.exports = {
	ContentEntity : ContentEntity,
	ContentEntitySocialInfo : ContentEntitySocialInfo
};