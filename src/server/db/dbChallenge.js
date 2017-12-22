require("../error");
var serverUtils = require("../serverUtils");
var dataUtils = require("../dataUtils");

/*
	Create a new Challenge node in the db.
	Prototype: dbUtils.prototype.challenge
*/
function createChallenge(challengeInfo, done) {
	if (!serverUtils.validateData(challengeInfo, challengePrototype)) {
		return done(new Error("Invalid challenge info"));
	}

	var cypherQuery = "MATCH(u:User {id: '" + challengeInfo.postedByUser + "'}) MATCH (category:Category {id: '" + challengeInfo.category + "'}) " +
		"CREATE (n:Challenge {" +
		"id: '" + challengeInfo.id + "'," +
		"image_type : '" + challengeInfo.imageType + "'," + 
		"created : '" + challengeInfo.created + "'," + 
		"title : '" + dataUtils.sanitizeStringForCypher(challengeInfo.title) + "'" +
		"})-[r:POSTED_BY]->(u), (n)-[:POSTED_IN]->(category) RETURN n;";

	dataUtils.getDB().cypherQuery(cypherQuery, function(err, result){
		if(err) {
			return done(err);
		} else if (result.data.length != 1) {
			return done(new Error(dbResultError(cypherQuery, 1, result.data.length)));
		}

		return done(null, {id: result.data[0].id});
	});
}



var challengePrototype = {
	"id" : "id",
	"imageType" : "imageType",
	"created" : "timestamp",
	"title" : "string",
	"postedByUser" : "id", //id of user who is posting this challenge
	"category" : "category" //id of category this challenge belongs to
}

module.exports = {
	createChallenge: createChallenge
};