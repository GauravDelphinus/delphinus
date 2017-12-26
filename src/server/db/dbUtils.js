const serverUtils = require("../serverUtils");
const dataUtils = require("../dataUtils");
const config = require("../config");
const mime = require("mime");

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
		"e.activity_timestamp = " + activityInfo.timestamp + ", " +
		"e.activity_user = '" + activityInfo.userId + "' ";

	if (activityInfo.type == "post") { //activity is the original post itself, so it has no additional info
		// in case of post, the user and timestamp are ignored and the original values are used in the entity
	} else if (activityInfo.type == "comment") { //recently commented
		cypherQuery +=
			", e.activity_commentid = '" + activityInfo.commentId + "' ";
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

/*
	Fetch all posts (challenges and entries) from the DB matching the provided criteria.

	Note that info is returned in chunks of size config.businessLogic.chunkSize
*/
function getPosts(postedBy, lastFetchedTimestamp, done) {

	var cypherQuery = "";

	var timestampClause;

	if (lastFetchedTimestamp == 0) {
		timestampClause = "";
	} else {
		timestampClause = " AND (e.activity_timestamp < " + lastFetchedTimestamp + ") " ;
	} 

	if (postedBy) {
		cypherQuery += " MATCH (e)-[:POSTED_BY]->(poster:User {id: '" + postedBy + "'}) ";
	} else {
		cypherQuery += " MATCH (e)-[:POSTED_BY]->(poster:User) ";
	}

	cypherQuery +=
		" WHERE (e:Entry OR e:Challenge) " + timestampClause + 
		" WITH e, poster " +
		" OPTIONAL MATCH (e)-[:POSTED_IN]->(category:Category) " +
		" WITH e, poster, category " +
		" RETURN labels(e), e, poster, category " +
		" ORDER BY e.activity_timestamp DESC LIMIT " + config.businessLogic.infiniteScrollChunkSize + ";";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return done(err, 0);
		}

		var newTimeStamp = 0;
		var output = [];
		for (var i = 0; i < result.data.length; i++) {
			var data = {};

			var label = result.data[i][0];
			var entity = result.data[i][1];
			var poster = result.data[i][2];
			var category = result.data[i][3];

			data = entityNodeToClientData(label, entity, poster, category);

			//update new time stamp to be sent back to client
			newTimeStamp = data.activity.timestamp;

			output.push(data);
		}

		return done(null, output, newTimeStamp);
	});
}

//convert the entry DB node to data in the format the client expects
function entityNodeToClientData(label, entity, poster, category) {
	var output = {
		id : entity.id,
		postedDate : entity.created,
		postedByUser : {
			id : poster.id,
			displayName : poster.display_name,
			image : poster.image
		},
		
		imageType: entity.image_type,
		
		
		activity : {
			type : entity.activity_type,
			timestamp : entity.activity_timestamp,
			userId : entity.activity_user
		}
	};

	if (label == "Entry") {
		output.type = "entry";
		output.image = config.url.entryImages + entity.id + "." + mime.extension(entity.image_type);
		output.link = config.url.entry + entity.id;
		output.caption = entity.caption;
	} else if (label == "Challenge") {
		output.type = "challenge";
		output.image = config.url.challengeImages + entity.id + "." + mime.extension(entity.image_type);
		output.link = config.url.challenge + entity.id;
		output.caption = entity.title;
	}

	if (category) {
		output.categoryName = category.name;
		output.categoryID = category.id;
	}

	if (entity.activity_type == "comment") {
		output.activity.commentId = entity.activity_commentid;
	}

	return output;
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
	activityPrototype : activityPrototype,
	entityNodeToClientData: entityNodeToClientData,
	getPosts: getPosts
};