const dataUtils = require("../dataUtils");
const logger = require("../logger");
const config = require("../config");
const mime = require("mime");

function createMainFeedForLoggedInUser(userId, done) {

	var cypherQuery = "MATCH (me:User{id: '" + userId + "'}) " +
		" MATCH (e) WHERE e:Entry OR e:Challenge " +
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
		" MATCH (e)-[:POSTED_BY]->(poster:User) " +
		" WHERE e.activity_user <> '" + userId + "' " +
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

			if (result.data[i][0] == "Entry")
			{
				data.type = "entry";
			} else if (result.data[i][0] == "Challenge") {
				data.type = "challenge";
			}

			var entity = result.data[i][1];
			var poster = result.data[i][3];
			var category = result.data[i][2];

			data.id = entity.id;

			data.postedDate = entity.created;
			data.postedByUser = {};
			data.postedByUser.id = poster.id;
			data.postedByUser.displayName = poster.displayName;
			data.postedByUser.image = poster.image;
			data.postedByUser.lastSeen = poster.last_seen;

			if (data.type == "challenge") {
				data.image = config.url.challengeImages + entity.id + "." + mime.extension(entity.image_type);
				data.caption = entity.title;
				data.link = config.url.challenge + entity.id;
				data.categoryName = category.name;
				data.categoryID = category.id;
			} else if (data.type == "entry") {
				data.image = config.url.entryImages + entity.id + "." + mime.extension(entity.image_type);
				data.caption = entity.caption;
				data.link = config.url.entry + entity.id;
			}
			
			data.imageType = entity.image_type;

			data.activity = {};
			data.activity.type = entity.activity_type;
			data.activity.timestamp = entity.activity_timestamp;
			data.activity.userId = entity.activity_user;
			if (entity.activity_type == "comment") {
				data.activity.commentId = entity.activity_commentid;
			}

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