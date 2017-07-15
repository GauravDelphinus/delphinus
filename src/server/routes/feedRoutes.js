/*
Working Queries:

Match challenges that have been liked by at least one user, find the number of likes, comments, entries, and sort by the time of like

MATCH (c:Challenge)<-[like:LIKES]-(u:User) 
WITH c, like 
MATCH (u2)-[:LIKES]->(c) 
WITH c, like, COUNT(u2) as u2_count 
OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) 
WITH c, like, u2_count, COUNT(comment) as comment_count 
OPTIONAL MATCH (e:Entry)-[:POSTED_IN]->(c) 
RETURN c, like.created,u2_count, comment_count, COUNT(e) 
ORDER BY like.created DESC;

Also return the user:

MATCH (c:Challenge)<-[like:LIKES]-(u:User) 
WITH c, like, u 
MATCH (u2)-[:LIKES]->(c) 
WITH c, like, u, COUNT(u2) as u2_count 
OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) 
WITH c, like, u, u2_count, COUNT(comment) as comment_count 
OPTIONAL MATCH (e:Entry)-[:POSTED_IN]->(c) 
RETURN c, like.created,u2_count, comment_count, COUNT(e), u 
ORDER BY like.created DESC
*/

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
				//var cypherQuery = "MATCH (c:Challenge)-[r:POSTED_BY]->(u:User) MATCH (comment:Comment)-[:POSTED_IN]->(c) OPTIONAL MATCH (u2:User)-[:LIKES]->(c)  OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) RETURN c, u, COUNT(u2), COUNT(comment), COUNT(entry), comment ORDER BY comment.created DESC;";
				var cypherQuery = "" +
					" MATCH (c:Challenge)-[:POSTED_BY]->(poster:User)" +
					" MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
					" MATCH (commenter:User)<-[:POSTED_BY]-(comment) " + 
					" WITH c, poster, comment, comment.created as commentedTime, commenter " +
					" ORDER BY commentedTime DESC " + 
					" WITH c, poster, collect(comment) AS comments, commenter " + 
					" OPTIONAL MATCH (liker:User)-[:LIKES]->(c) " + 
					" WITH c, poster, comments, commenter, COUNT(liker) as like_count " + 
					" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " + 
					" WITH c, poster, comments, commenter, like_count, COUNT(entry) as entry_count " + 
					" RETURN c, poster, like_count, size(comments) as comment_count, entry_count, comments[0], commenter ORDER BY comments[0].created DESC;";
				console.log("running cypherQuery: " + cypherQuery);
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
	    				var commenter = result.data[i][6];

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
						data.feedType = "recentlyCommented";
						data.activity = {};
						data.activity.comment = comment;
						data.activity.comment.postedDate = comment.created;
						data.activity.comment.postedByUser = commenter;
						data.activity.comment.socialStatus = {numLikes: 0};

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
				//var cypherQuery = "MATCH (c:Challenge)-[r:POSTED_BY]->(u:User) MATCH (u2:User)-[like:LIKES]->(c) OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) RETURN c, u, COUNT(u2), COUNT(comment), COUNT(entry), like, collect(u2)[..1] AS likedUser ORDER BY like.created DESC;";
				var cypherQuery = "" +
					" MATCH (c:Challenge)-[:POSTED_BY]->(poster:User)" +
					" MATCH (c)<-[like:LIKES]-(liker:User) " + 
					" WITH c, poster, like.created as created, liker " +
					" ORDER BY created DESC " + 
					" WITH c, poster, collect(created) AS liked, collect(liker) as likers " + 
					" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
					" WITH c, poster, liked, likers, COUNT(comment) as comment_count " + 
					" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " + 
					" WITH c, poster, liked, likers, comment_count, COUNT(entry) as entry_count " + 
					" RETURN c, poster, size(liked) as like_count, comment_count, entry_count, liked[0], likers[0] ORDER BY liked[0] DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {	
						callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				console.log("***********");
	    				console.log("result.data[i] for i = " + i + " is : " + JSON.stringify(result.data[i]));
	    					    				console.log("***********");

	    				var c = result.data[i][0];
	    				var u = result.data[i][1];
	    				var numLikes = result.data[i][2];
	    				var numComments = result.data[i][3];
	    				var numEntries = result.data[i][4];
	    				var likedTime = result.data[i][5];
	    				var likedUser = result.data[i][6];

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
						data.compareDate = likedTime;
						data.feedType = "recentlyLiked";
						data.activity = {};
						data.activity.user = likedUser;
						console.log("user is " + JSON.stringify(likedUser));

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
						data.feedType = "recentlyLiked";

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

function alreadyExists(element) {
	console.log("alreadyExists: element.id = " + element.id + ", this.id = " + this.id);	
	return (element.id == this.id);
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

	//console.log("returning smallest as " + smallest.id + ", created = " + smallest.compareDate);
	return smallest;
}

function mergeFeeds(feedsArray, mergedFeed) {
	var indices = [];
	for (var i = 0; i < feedsArray.length; i++) {
		indices.push(-1);
		console.log("feedsArray " + i + ":");
		var feed = feedsArray[i];
		if (feed.length > 0) {
			indices[i] = 0;
		}
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
		if (smallestDataObject != null && (mergedFeed.findIndex(alreadyExists, smallestDataObject) == -1)) {
			mergedFeed.push(smallestDataObject);
		}
		
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