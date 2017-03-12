module.exports = {

	/**
		Given an Entry ID, return the corresponding
		Challenge ID that this entry belongs to.
		Return -1 in case of error
	**/
	getChallengeForEntry : function(db, entryId) {

	},

		/**
		Given an Challenge ID, fetch the details of the image
		that was posted for that challenge.  This includes:
		- Name of the image (random name stored under /data/challenges/images/<name>)
		- Image Type (as originally posted - eg. jpeg, gif, png, etc.)

		Calls the function in the last argument with 3 parameters - err, imageName and imageType.
	**/
	getImageDataForChallenge : function(db, challengeId, next) {
		var cypherQuery = "MATCH (c:Challenge) WHERE id(c) = " + challengeId + " RETURN c.imageType, c.image;";

		console.log("cypherQuery is " + cypherQuery);
		db.cypherQuery(cypherQuery, function(err, result){
	    	if(err) throw err;

	    	var row = result.data[0].toString();
	    	console.log("row is " + row);
	    	var dataArray = row.split(",");
	    	var imageType = dataArray[0];
	    	var image = dataArray[1];

	    	next(0, image, imageType);
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