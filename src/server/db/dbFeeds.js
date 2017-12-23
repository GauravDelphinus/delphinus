const dataUtils = require("../dataUtils");
const logger = require("../logger");
const config = require("../config");
const mime = require("mime");

function createMainFeedForLoggedInUser(userId, done) {

	var cypherQuery = "MATCH (me:User{id: '" + userId + "'}) " +
		" OPTIONAL MATCH (e)-[:POSTED_BY]->(me) " +
		" WITH me, COLLECT(e) AS all_entities " +
		" OPTIONAL MATCH (me)-[:LIKES]->(e) " +
		" WITH me, all_entities + COLLECT(e) AS all_entities " +
		" OPTIONAL MATCH (e)<-[:POSTED_IN]-(comment:Comment)-[:POSTED_BY]->(me) " +
		" WITH me, all_entities + COLLECT(e) AS all_entities " +
		" OPTIONAL MATCH (c:Challenge)<-[:PART_OF]-(entry:Entry)-[:POSTED_BY]->(me) " +
		" WITH me, all_entities + COLLECT(c) AS all_entities " +
		" OPTIONAL MATCH (e) WHERE (me)-[:FOLLOWING]->(:User{id: e.activity_user}) " + 
		" WITH me, all_entities + COLLECT(e) AS all_entities " +
		" UNWIND all_entities AS e " +
		" WITH DISTINCT e " +
		" OPTIONAL MATCH (category:Category)<-[:POSTED_IN]-(e) " +
		" WITH e, category " +
		" OPTIONAL MATCH (e)-[:POSTED_BY]->(poster:User) " +
		" WITH e, category, poster " +
		" RETURN labels(e), e, category, poster " +
		" ORDER BY e.activity_timestamp DESC;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return done(err, 0);
		}

		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			logger.debug("Result from query, " + i + ": " + JSON.stringify(result.data[i]));
			if (result.data[i][0] == "Entry")
			{
				data.entityType = "entry";
			} else if (result.data[i][0] == "Challenge") {
				data.entityType = "challenge";
			}

			var entity = result.data[i][1];
			var poster = result.data[i][3];
			var category = result.data[i][2];

			data.id = entity.id;
			data.compareDate = entity.activity_timestamp;

			data.postedDate = entity.created;
			data.postedByUser = {};
			data.postedByUser.id = poster.id;
			data.postedByUser.displayName = poster.displayName;
			data.postedByUser.image = poster.image;
			data.postedByUser.lastSeen = poster.last_seen;

			if (data.entityType == "challenge") {
				data.image = config.url.challengeImages + entity.id + "." + mime.extension(entity.image_type);
				data.caption = entity.title;
				data.link = config.url.challenge + entity.id;
				data.categoryName = category.name;
				data.categoryID = category.id;
			} else if (data.entityType == "entry") {
				data.image = config.url.entryImages + entity.id + "." + mime.extension(entity.image_type);
				data.caption = entity.caption;
				data.link = config.url.entry + entity.id;
			}
			
			data.imageType = entity.image_type;
			data.activity = {};

			var activityType;
			if (entity.activity_type == "post") {
				data.activity.type = "recentlyPosted";

			} else if (entity.activity_type == "like") {
				data.activity.type = "recentlyLiked";
			} else if (entity.activity_type == "comment") {
				data.activity.type = "recentlyCommented";
			}
			data.activity.timestamp = entity.activity_timestamp;
			data.activity.userId = entity.activity_user;

			output.push(data);
		}

		return done(null, output);
	});

}

function createMainFeedForAnonymousUser(done) {
	return done(null, {});
}

module.exports = {
	createMainFeedForLoggedInUser : createMainFeedForLoggedInUser,
	createMainFeedForAnonymousUser : createMainFeedForAnonymousUser
};