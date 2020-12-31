const serverUtils = require("../serverUtils");
const config = require("../config");
const mime = require("mime");
const logger = require("../logger");
const dbInit = require("./dbInit");

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

	this.runQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.records.length != 1) {
			return done(new Error(dbResultError(cypherQuery, 1, result.records.length)));
		}

		var record = result.records[0];
		var entity = dbUtils.recordGetField(record, "e");

		return done(null, {id: entity.id});
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

	this.runQuery(cypherQuery, function(err, result) {
		if (err) {
			logger.dbError(err, cypherQuery);
			return done(err, 0);
		}

		var newTimeStamp = 0;
		var output = [];
		for (var i = 0; i < result.records.length; i++) {
			var record = result.records[i];
			var data = {};

			var label = dbUtils.recordGetField(record, "labels(e)");
			var entity = dbUtils.recordGetField(record, "e");
			var poster = dbUtils.recordGetField(record, "poster");
			var category = dbUtils.recordGetField(record, "category");

			data = entityNodeToClientData(label, entity, poster, category);

			//update new time stamp to be sent back to client
			newTimeStamp = data.activity.timestamp;

			output.push(data);
		}

		return done(null, output, newTimeStamp);
	});
}

//convert the entry DB node to data in the format the client expects
function entityNodeToClientData(label, entity, poster, category, entrySourceLabel, entrySource) {
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

		if (entrySourceLabel && entrySource) {
			if (entrySourceLabel == "Challenge") {
				output.sourceType = "challengeId";
			} else if (entrySourceLabel == "Design") {
				output.sourceType = "designId";
			} else if (entrySourceLabel == "IndependentImage") {
				output.sourceType = "independentImageId";
			}
			output.sourceId = entrySource.id;
		}
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

function escapeSingleQuotes(str) {
	return str.replace(/'/g, "\\'");
}

function sanitizeStringForCypher(str) {
	var out = str.replace(/\\/g, "\\\\");
	out = out.replace(/'/g, "\\'");
	return out;
}

/*
	Get a field from the record returned by the cypherquery
	fieldname could be the name of the field, or even the index (Refer: https://neo4j.com/docs/api/javascript-driver/current/class/src/record.js~Record.html)
	In case the field is an object or node, it returns the properties object
	Otherwise, it returns the field value itself (e.g., a label)
*/
function recordGetField(record, fieldname) {
	var field = record.get(fieldname);
	if (typeof field === 'object' && field !== null && typeof field.properties === 'object' && field.properties !== null) {
			var properties = field.properties;
			return properties;
		} else {
			return field;
		}
}

function printRecord(record) {
	logger.debug("record.length: " + record.length);
	for (var i = 0; i < record.length; i++) {
		var field = record.get(i);
		if (typeof field === 'object' && field !== null && typeof field.properties === 'object' && field.properties !== null) {
			var properties = field.properties;
			logger.debug("Type is Node, properties: " + JSON.stringify(properties));
		} else {
			logger.debug("Type is not Node, value: " + field);
		}
		
	}
	logger.debug("record.keys: " + record.keys);
	for (const entry of record.entries()) {
		logger.debug("Entry: " + entry);
	}
	for (const value of record.values()) {
		logger.debug("Value: " + value);
	}
	record.forEach(function(value, key, rec) {
		logger.debug("value: " + value);
		logger.debug("key: " + key);
		logger.debug("record: " + JSON.stringify(rec));
	});
	logger.debug("full json: " + JSON.stringify(record));

}

function runQuery(cypherQuery, callback) {
	const dbInit = require("./dbInit");
	var dbdriver = dbInit.getDBdriver();
	var dbsession = dbdriver.session();

	//logger.debug("Running cypherQuery: " + cypherQuery); //temporary - remove later
	dbsession
		.run(cypherQuery)
		.then(result => {
			return callback(null, result);
		})
		
		.catch(error => {
			//throw new Error(error);
			//logger.dbError(error, cypherQuery);
			return callback(error);
		})
		
		.then(() => {
			dbsession.close();
		});
	
}

var activityPrototype = {
	"entityId" : "id",
	"type" : ["post", "comment", "like"],
	"timestamp" : "timestamp",
	"userId" : "id",
	"commentId" : "id"
}

var functions = {
	saveActivity : saveActivity,
	activityPrototype : activityPrototype,
	entityNodeToClientData: entityNodeToClientData,
	getPosts: getPosts,
	sanitizeStringForCypher: sanitizeStringForCypher,
	escapeSingleQuotes: escapeSingleQuotes,
	runQuery: runQuery,
	printRecord: printRecord,
	recordGetField: recordGetField
};

for(var key in functions) {
    module.exports[key] = functions[key];
}