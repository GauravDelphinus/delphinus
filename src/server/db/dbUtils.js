const serverUtils = require("../serverUtils");
const dataUtils = require("../dataUtils");

/*
	Add a record of activity to the Challenge or Entry.  Activity could
	be a comment added, or a like.
*/
function saveActivity(activityInfo, done) {
	if (!serverUtils.validateData(activityInfo, activityPrototype)) {
		return done(new Error("Invalid activity info"));
	}

	var cypherQuery = "MATCH(e {id: '" + activityInfo.entityId + "'}) " +
		"SET " +
		"e.activity_type = '" + activityInfo.type + "', " +
		"e.activity_timestamp = '" + activityInfo.timestamp + "', " +
		"e.activity_user = '" + activityInfo.userId + "' ";

	if (activityInfo.type == "post") { //activity is the original post itself, so it has no additional info
		// in case of post, the user and timestamp are ignored and the original values are used in the entity
	} else if (activityInfo.type == "comment") { //recently commented
		cypherQuery +=
			", e.comment_id = '" + activityInfo.commentId + "' ";
	} else if (activityInfo.type == "like") { //recently liked
		// no additional info needed other than the person who liked, and the timestamp
	}

	cypherQuery += " RETURN e;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new Error(dbResultError(cypherQuery, 1, result.data.length)));
		}

		return done(null, {id: result.data[0].id});
	});
}


var activityPrototype = {
	"entityId" : "id",
	"type" : ["post", "comment", "like"],
	"timestamp" : "timestamp",
	"userId" : "id",
	"commentId" : "id"
}

module.exports = {
	saveActivity : saveActivity,
	activityPrototype : activityPrototype
};