var ContentEntity = require("./contentEntity").ContentEntity;
var ContentEntitySocialInfo = require("./contentEntity").ContentEntitySocialInfo;

var dbChallenge = require("../db/dbChallenge");

class Challenge extends ContentEntity {
	constructor(id, imageType, created, caption, postedBy, category) {
		super(id, imageType, created, caption, postedBy);

		this.category = category;
	}

	save(done) {
		var challengeInfo = {
			id: this.id,
			imageType: this.imageType,
			created: this.created,
			title: this.caption,
			userId: this.postedBy,
			category: this.category
		};

		dbChallenge.createChallenge(challengeInfo, function(err, result) {
			if(err) {
				return done(err);
			}

			return done(null, result);
		});
	}
}

class ChallengeSocialInfo extends ContentEntitySocialInfo {
	constructor (numLikes, numShares, numComments, numEntries) {
		super(numLikes, numShares, numComments);

		this.numEntries = numEntries;
		this.popularity = this.numLikes + this.numShares + this.numComments + this.numEntries;
	}
}

module.exports = {
	Challenge : Challenge,
	ChallengeSocialInfo : ChallengeSocialInfo
};