var ContentEntity = require("./contentEntity");

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
			postedByUser: this.postedBy,
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

module.exports = Challenge;