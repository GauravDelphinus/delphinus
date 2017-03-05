module.exports = {

	/**
		Given an Entry ID, return the corresponding
		Challenge ID that this entry belongs to.
		Return -1 in case of error
	**/
	getChallengeForEntry : function(db, entryId) {

	},

		/**
		Given an Entry ID, fetch the details of the image
		that forms this entry.  This includes:
		- Original Image from the Challenge
		- List of steps to be performed on the image

		Returns an object of this form:
		{
			imagePath : "/path/to/original/image/from/server/root",
			steps : "steps to perform"
		}
	**/
	getImageDataForChallenge : function(db, challengeId, next) {
		var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + challengeId + " RETURN c.image;";

		console.log("cypherQuery is " + cypherQuery);
		db.cypherQuery(cypherQuery, function(err, result){
	    	if(err) throw err;

			var image = result.data[0];

	    	next(0, image);
		});

	},

	/**
		Given an Entry ID, fetch the details of the image
		that forms this entry.  This includes:
		- Original Image from the Challenge
		- List of steps to be performed on the image

		Returns an object of this form:
		{
			imagePath : "/path/to/original/image/from/server/root",
			steps : "steps to perform"
		}
	**/
	getImageDataForEntry : function(db, entryId, next) {
		var cypherQuery = "MATCH (e:Entry) WHERE id(e) = " + entryId + " RETURN e.steps;";

		db.cypherQuery(cypherQuery, function(err, result){
	    	if(err) throw err;

	    	console.log(result.data); // delivers an array of query results

	    	var steps = result.data[0];

	    	// Now fetch the corresponding Challenge entry, and extract the original image
	    	var fetchChallengeQuery = "MATCH (c:Challenge)<-[:PART_OF]-(e:Entry) WHERE id(e) = " + entryId + " RETURN c.image;"
	    	db.cypherQuery(fetchChallengeQuery, function(err, output){
	    		if (err) throw err;

	    		console.log(output.data);
	    		var image = output.data[0];

	    		console.log("Image is " + image + ", Steps is " + steps);

	    		next(0, { "imagePath" : image, "steps" : steps});
	    	});

		});

	}
}