var express = require("express");
var tmp = require("tmp");
var async = require("async");
var path = require("path");
var config = require("../config");
var shortid = require("shortid");
var dataUtils = require("../dataUtils");

var routes = function(db) {
	var feedRouter = express.Router();

	feedRouter.route("/") // ROUTER FOR /api/feeds

		.get(function(req, res){

			var runQueryFunctions = [];
			var resultArrays = [];

			// Challenges Posted Recently
			runQueryFunctions.push(function(callback){
				var cypherQuery = "MATCH (c:Challenge)-[r:POSTED_BY]->(u:User) OPTIONAL MATCH (u2:User)-[:LIKES]->(c) OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) RETURN c, u, COUNT(u2), COUNT(comment), COUNT(entry) ORDER BY c.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var c = result.data[i][0];
	    				var u = result.data[i][1];
	    				var numLikes = result.data[i][2];
	    				var numComments = result.data[i][3];
	    				var numEntries = result.data[i][4];

	    				var data = {};
	    				data.type = "challenge";
	    				data.id = c.id;
	    				data.image = config.url.challengeImages + c.image;
						data.postedDate = c.created;
						data.postedByUser = {};
						data.postedByUser.id = u.id;
						data.postedByUser.displayName = u.displayName;
						data.postedByUser.image = u.image;

						data.socialStatus = {};
						data.socialStatus.numLikes = numLikes;
						data.socialStatus.numShares = 25;
						data.socialStatus.numComments = numComments;
						data.socialStatus.numEntries = numEntries;
						data.caption = c.title;

						data.link = config.url.challenge + c.id;

						// the date to compare for the purpose of listing
						data.compareDate = data.postedDate;
						data.feedType = "recentlyPostedChallanges";

						output.push(data);

	    			}

					resultArrays.push(output);
					callback(null, 0);
				});
			});

			// Entries posted recently
			runQueryFunctions.push(function(callback){
				var cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User) OPTIONAL MATCH (u2:User)-[:LIKES]->(e) OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) RETURN e, u, COUNT(u2), COUNT(comment) ORDER BY e.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var e = result.data[i][0];
	    				var u = result.data[i][1];
	    				var numLikes = result.data[i][2];
	    				var numComments = result.data[i][3];

	    				var data = {};
	    				data.type = "entry";
	    				data.id = e.id;
	    				data.image = config.url.entryImages + e.id;
						data.postedDate = e.created;
						data.postedByUser = {};
						data.postedByUser.id = u.id;
						data.postedByUser.displayName = u.displayName;
						data.postedByUser.image = u.image;

						data.socialStatus = {};
						data.socialStatus.numLikes = numLikes;
						data.socialStatus.numShares = 23;
						data.socialStatus.numComments = numComments;

						data.caption = e.caption;

						data.link = config.url.entry + e.id;

						// the date to compare for the purpose of listing
						data.compareDate = data.postedDate;
						data.feedType = "recentlyPostedEntries";

						output.push(data);

	    			}

					resultArrays.push(output);
					callback(null, 0);
				});
			});

			// Challenges commented recently
			runQueryFunctions.push(function(callback){
				var cypherQuery = "MATCH (c:Challenge)-[r:POSTED_BY]->(u:User) MATCH (comment:Comment)-[:POSTED_IN]->(c) OPTIONAL MATCH (u2:User)-[:LIKES]->(c)  OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) RETURN c, u, COUNT(u2), COUNT(comment), COUNT(entry), comment ORDER BY comment.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var c = result.data[i][0];
	    				var u = result.data[i][1];
	    				var numLikes = result.data[i][2];
	    				var numComments = result.data[i][3];
	    				var numEntries = result.data[i][4];
	    				var comment = result.data[i][5];

	    				var data = {};
	    				data.type = "challenge";
	    				data.id = c.id;
	    				data.image = config.url.challengeImages + c.image;
						data.postedDate = c.created;
						data.postedByUser = {};
						data.postedByUser.id = u.id;
						data.postedByUser.displayName = u.displayName;
						data.postedByUser.image = u.image;

						data.socialStatus = {};
						data.socialStatus.numLikes = numLikes;
						data.socialStatus.numShares = 25;
						data.socialStatus.numComments = numComments;
						data.socialStatus.numEntries = numEntries;
						data.caption = c.title;

						data.link = config.url.challenge + c.id;

						// the date to compare for the purpose of listing
						data.compareDate = comment.created;
						data.feedType = "recentlyCommentedChallanges";

						output.push(data);

	    			}

					resultArrays.push(output);
					callback(null, 0);
				});
			});
			
			// Entries commented recently
			runQueryFunctions.push(function(callback){
				var cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User) MATCH (comment:Comment)-[:POSTED_IN]->(e) OPTIONAL MATCH (u2:User)-[:LIKES]->(e) RETURN e, u, COUNT(u2), COUNT(comment), comment ORDER BY comment.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var e = result.data[i][0];
	    				var u = result.data[i][1];
	    				var numLikes = result.data[i][2];
	    				var numComments = result.data[i][3];
	    				var comment = result.data[i][4];

	    				var data = {};
	    				data.type = "entry";
	    				data.id = e.id;
	    				data.image = config.url.entryImages + e.id;
						data.postedDate = e.created;
						data.postedByUser = {};
						data.postedByUser.id = u.id;
						data.postedByUser.displayName = u.displayName;
						data.postedByUser.image = u.image;

						data.socialStatus = {};
						data.socialStatus.numLikes = numLikes;
						data.socialStatus.numShares = 23;
						data.socialStatus.numComments = numComments;

						data.caption = e.caption;

						data.link = config.url.entry + e.id;

						// the date to compare for the purpose of listing
						data.compareDate = comment.created;
						data.feedType = "recentlyCommentedEntries";

						output.push(data);

	    			}

					resultArrays.push(output);
					callback(null, 0);
				});
			});

			// Challenges Liked Recently
			runQueryFunctions.push(function(callback){
				console.log("running challenges liked recently");
				var cypherQuery = "MATCH (c:Challenge)-[r:POSTED_BY]->(u:User) MATCH (u2:User)-[like:LIKES]->(c) OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) RETURN c, u, COUNT(u2), COUNT(comment), COUNT(entry), like ORDER BY like.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {	
						callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var c = result.data[i][0];
	    				var u = result.data[i][1];
	    				var numLikes = result.data[i][2];
	    				var numComments = result.data[i][3];
	    				var numEntries = result.data[i][4];
	    				var like = result.data[i][5];

	    				var data = {};
	    				data.type = "challenge";
	    				data.id = c.id;
	    				data.image = config.url.challengeImages + c.image;
						data.postedDate = c.created;
						data.postedByUser = {};
						data.postedByUser.id = u.id;
						data.postedByUser.displayName = u.displayName;
						data.postedByUser.image = u.image;

						data.socialStatus = {};
						data.socialStatus.numLikes = numLikes;
						data.socialStatus.numShares = 25;
						data.socialStatus.numComments = numComments;
						data.socialStatus.numEntries = numEntries;
						data.caption = c.title;

						data.link = config.url.challenge + c.id;

						// the date to compare for the purpose of listing
						data.compareDate = like.created;
						data.feedType = "recentlyLikedChallanges";

						output.push(data);

	    			}

					resultArrays.push(output);
					callback(null, 0);
				});
			});

			// Entries liked recently
			runQueryFunctions.push(function(callback){
				var cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User) MATCH (u2:User)-[like:LIKES]->(e) OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) RETURN e, u, COUNT(u2), COUNT(comment), like ORDER BY like.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var e = result.data[i][0];
	    				var u = result.data[i][1];
	    				var numLikes = result.data[i][2];
	    				var numComments = result.data[i][3];
	    				var like = result.data[i][4];

	    				var data = {};
	    				data.type = "entry";
	    				data.id = e.id;
	    				data.image = config.url.entryImages + e.id;
						data.postedDate = e.created;
						data.postedByUser = {};
						data.postedByUser.id = u.id;
						data.postedByUser.displayName = u.displayName;
						data.postedByUser.image = u.image;

						data.socialStatus = {};
						data.socialStatus.numLikes = numLikes;
						data.socialStatus.numShares = 23;
						data.socialStatus.numComments = numComments;

						data.caption = e.caption;

						data.link = config.url.entry + e.id;

						// the date to compare for the purpose of listing
						data.compareDate = like.created;
						data.feedType = "recentlyLikedEntries";

						output.push(data);

	    			}

					resultArrays.push(output);
					callback(null, 0);
				});
			});

			async.series(runQueryFunctions, function(err, unusedList) {
				var mergedOutput = [];
				mergeFeeds(resultArrays, mergedOutput);
				res.json(mergedOutput);
			});
		});

		return feedRouter;
}

function checkIndexRemaining(index) {
	return (index != -1);
}

function objectLessThan(data1, data2) {
	if (data2 == null) {
		return true;
	}

	if (data1.compareDate > data2.compareDate) {
		return true;
	}

	return false;
}

function findAndIncrementSmallest(indices, feedsArray) {
	var smallest = null;
	var smallestIndex = -1;

	for (var i = 0 ; i < indices.length; i++) {
		var index = indices[i];
		var feed = feedsArray[i];

		//console.log("in for loop, i = " + i + ", index = " + index + ", feed[index]  = " + feed[index]);
		if (index != -1) {
			//console.log("calling objectLessThan with feed[index].created = " + feed[index].postedDate + ", ")
			if (objectLessThan(feed[index], smallest)) {
				smallest = feed[index];
				smallestIndex = i;
			}
		}
		
	}

	indices[smallestIndex]++;
	if (indices[smallestIndex] == feedsArray[smallestIndex].length) {
		indices[smallestIndex] = -1;
	}

	console.log("returning smallest as " + smallest.id + ", created = " + smallest.compareDate);
	return smallest;
}

function mergeFeeds(feedsArray, mergedFeed) {
	var indices = [];
	for (var i = 0; i < feedsArray.length; i++) {
		indices.push(0);
		console.log("feedsArray " + i + ":");
		var feed = feedsArray[i];
		for (var j = 0; j < feed.length; j++) {
			console.log("j = " + j + ", id = " + feed[j].id + ", created = " + feed[j].compareDate);
		}
	}

	while (true) {
		var found = indices.find(checkIndexRemaining)
		console.log("found is " + found);
		if (found == undefined) {
			break;
		}
		var smallestDataObject = findAndIncrementSmallest(indices, feedsArray);
		mergedFeed.push(smallestDataObject);
	}

	/*
	for (var i = 0; i < feedsArray.length; i++) {
		var 
		var feed = feedsArray[i];

		for (var j = 0; j < feed.length; j++) {
			mergedFeed.push(feed[j]);
		}
	}
	*/
}

module.exports = routes;
