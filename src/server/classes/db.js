const ChallengeSocialInfo = require("./challenge").ChallengeSocialInfo;

class DB {
	constructor (db) {
		this.db = db;
	}

	lookupChallenge(challengeId, meId, done) {
		var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge {id: '" + challengeId + "'})-[r:POSTED_BY]->(poster:User) " +
			" WITH c, category, poster " +
			" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
			" WITH c, category, poster, COUNT(u2) AS like_count " + 
			" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
			" WITH c, category, poster, like_count, COUNT(comment) as comment_count " + 
			" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
			" WITH c, category, poster, like_count, comment_count, COUNT(entry) AS entry_count " +
			" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
			" RETURN c, poster, like_count, comment_count, entry_count, COUNT(like), category;";
		this.db.cypherQuery(cypherQuery, function(err, result){y
    			if(err) {
    				logger.dbError(err, cypherQuery);
    				return res.sendStatus(500);
    			} else if (result.data.length != 1) {
    				logger.dbResultError(cypherQuery, 1, result.data.length);
    				return res.sendStatus(404); //invalid request
    			}

    			var c = result.data[0][0];
    			Challenge challenge = new Challenge(c.id, c.image_type, c.created, c.title, result.data[0][1].id, result.data[0][6].id);
    			ChallengeSocialInfo socialInfo = new ChallengeSocialInfo(result.data[0][2], 0, result.data[0][3], result.data[0][4]);
    			//Activity activity = 


    			var output = dataUtils.constructEntityData("challenge", result.data[0][0], result.data[0][1], result.data[0][0].created, result.data[0][2], result.data[0][3], result.data[0][4], 0, null, null, null, result.data[0][5] > 0, "none", null, null, null, null, result.data[0][6]);
    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
    				return res.sendStatus(500);
    			}

    			return res.json(output);
			});
		
	}
}