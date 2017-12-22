require("../error");
var serverUtils = require("../serverUtils");
var dataUtils = require("../dataUtils");
var dbUtils = require("./dbUtils");

/*
	Create a new Entry node in the db.
	Prototype: entryPrototype
*/
function createEntry(entryInfo, done) {
	if (!serverUtils.validateData(entryInfo, entryPrototype)) {
		return done(new Error("Invalid entry info"));
	}

	var cypherQuery = " MATCH (u:User {id: '" + entryInfo.userId + "'}) CREATE (e:Entry {" +
					"id: '" + entryInfo.id + "', " + 
					"caption: '" + dataUtils.sanitizeStringForCypher(entryInfo.title) + "', " + 
					"created : '" + entryInfo.created + "'" + 
					"})-[r:POSTED_BY]->(u) ";

	if (entryInfo.source == "challengeId") { //link to challenge
		cypherQuery = "MATCH (c:Challenge {id: '" + entryInfo.sourceId + "'}) " +
					cypherQuery +
					", (c)<-[:PART_OF]-(e) RETURN e;";
	} else if (entryInfo.source == "designId") {// link to design
		cypherQuery = "MATCH (d:Design {id: '" + entryInfo.sourceId + "'}) " +
					cypherQuery +
					", (d)<-[:BASED_ON]-(e) RETURN e;";
	} else { //independent entry
		cypherQuery += " RETURN e;";
	}

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new Error(dbResultError(cypherQuery, 1, result.data.length)));
		}

		//now, save the activity in the entity
        var activityInfo = {
        	entityId: result.data[0].id,
        	type: "post",
        	timestamp: entryInfo.created,
        	userId: entryInfo.userId
        }
        dbUtils.saveActivity(activityInfo, function(err, result) {
        	if (err) {
        		return done(err);
        	}

			return done(null, {id: result.id});
		});
	});
}



var entryPrototype = {
	"id" : "id",
	"created" : "timestamp",
	"title" : "string",
	"userId" : "id", //id of user who is posting this challenge
	"source" : ["challengeId", "designId"], //independent images not yet supported (add when they are)
	"sourceId" : "string"
}

module.exports = {
	createEntry: createEntry
};