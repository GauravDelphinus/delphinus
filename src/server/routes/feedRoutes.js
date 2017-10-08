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
var logger = require("../logger");
var serverUtils = require("../serverUtils");
var error = require("../error");

var routes = function(db) {
	var feedRouter = express.Router();

	feedRouter.route("/") // ROUTER FOR /api/feeds

		.get(function(req, res){

			logger.debug("GET received on /api/feeds, query: " + JSON.stringify(req.query));

			var runQueryFunctions = [];
			var resultArrays = [];

			/******************************************************************
			
			FEEDS

			Feeds are shown on the home page, governed by the following rules:

			1) Feeds are a merge of results from the categories below
			2) Same Challenge or Entry is never repeated in the same feed

			Categories of Feeds:
			1) When User is Logged In
				a) Recent Activity by Users who logged in user is following
					- Challenges Posted Recently by users followed by logged-in user
					- Entries posted recently by users followed by logged-in user
					- Challenges commented recently by user followed by logged-in user
					- Entries commented recently by user followed by logged-in user
					- Challenges liked recently by user followed by logged-in user
					- Entries liked recently by user followed by logged-in user
				b) Recent Activity in Challenges and Entries that logged-in user has liked, commented on or posted in
					- Entries posted in a challenge that logged-in user has liked, commented or posted in
					- Someone likes a challenge that logged-in user liked, commented or posted in
					- Someone commented on a challenge that logged-in user liked, commented or posted in
					- Someone likes an Entry that logged-in user liked or commented in
					- Someone comments on an Entry that logged-in user liked or commented in
			2) When User is Not Logged In
				a) Recent Activity
					- Challenges posted recently
					- Entries posted recently
			3) Common (whether user is logged in or not)
				a) Popular Activity
					- Challenges or Entries with > 20 comments
					- Challenges or Entries with > 20 likes

			******************************************************************/

			/************ FEED IF USER IS LOGGED IN ****************/

			if (req.user) { 

				// RECENT ACTIVITY BY USERS WHO I'M FOLLOWING

				// Challenges Posted Recently by a user who I'm following (refined)
				runQueryFunctions.push(function(callback){

					var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(u:User) " +
						" MATCH (:User {id: '" + req.user.id + "'})-[:FOLLOWING]->(u) " +
						" WITH c, category, u " +
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
						" WITH c, category, u, COUNT(u2) AS like_count " +
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, category, u, like_count, COUNT(comment) AS comment_count " +
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
						" WITH c, category, u, like_count, comment_count, COUNT(entry) AS entry_count " +
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(c) " +
						" RETURN c, u, like_count, comment_count, entry_count, COUNT(like), category ORDER BY c.created DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][5] > 0, "recentlyPosted", null, null, null, null, result.data[i][6]);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Entries posted recently by a user who I'm following (refined)
				runQueryFunctions.push(function(callback){
					var cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(u:User) " +
						" MATCH (:User {id: '" + req.user.id + "'})-[:FOLLOWING]->(u) " +
						" WITH e, u " +
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
						" WITH e, u, COUNT(u2) AS like_count " +
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
						" WITH e, u, like_count, COUNT(comment) AS comment_count " +
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(e) " +
						" RETURN e, u, like_count, comment_count, COUNT(like) ORDER BY e.created DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][4] > 0, "recentlyPosted", null, null, null, null);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Challenges commented recently by a user who I'm following (refined)
				runQueryFunctions.push(function(callback){

					var cypherQuery = "" +
						" MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[:POSTED_BY]->(poster:User)" +
						" MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" MATCH (commenter:User)<-[:POSTED_BY]-(comment) " +
						" MATCH (:User {id: '" + req.user.id + "'})-[:FOLLOWING]->(commenter) " +
						" WITH c, category, poster, comment, comment.created as commentedTime, commenter " +
						" ORDER BY commentedTime DESC " + 
						" WITH c, category, poster, COLLECT(comment) AS comments, COLLECT(commenter) AS commenters " + 
						" OPTIONAL MATCH (liker:User)-[:LIKES]->(c) " + 
						" WITH c, category, poster, comments, commenters, COUNT(liker) as like_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " + 
						" WITH c, category, poster, comments, commenters, like_count, COUNT(entry) as entry_count " + 
						" OPTIONAL MATCH (c)<-[:POSTED_IN]-(comment:Comment) " +
						" WITH c, category, poster, comments, commenters, like_count, entry_count, COUNT(comment) AS comment_count " +
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, comment_count, entry_count, comments[0], commenters[0], COUNT(like), category ORDER BY comments[0].created DESC;";
					
					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {

							var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][5].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][7] > 0, "recentlyCommented", result.data[i][5], result.data[i][6], null, null, result.data[i][8]);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});
				
				// Entries commented recently by a user who I'm following (refined)
				runQueryFunctions.push(function(callback){

					var cypherQuery = "" +
						" MATCH (c:Entry)-[:POSTED_BY]->(poster:User)" +
						" MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" MATCH (commenter:User)<-[:POSTED_BY]-(comment) " +
						" MATCH (:User {id: '" + req.user.id + "'})-[:FOLLOWING]->(commenter) " +
						" WITH c, poster, comment, comment.created as commentedTime, commenter " +
						" ORDER BY commentedTime DESC " + 
						" WITH c, poster, collect(comment) AS comments, COLLECT(commenter) AS commenters " + 
						" OPTIONAL MATCH (liker:User)-[:LIKES]->(c) " + 
						" WITH c, poster, comments, commenters, COUNT(liker) as like_count " + 
						" OPTIONAL MATCH (c)<-[:POSTED_IN]-(comment:Comment) " +
						" WITH c, poster, comments, commenters, like_count, COUNT(comment) AS comment_count " +
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, comment_count, comments[0], commenters[0], COUNT(like) ORDER BY comments[0].created DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][4].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][6] > 0, "recentlyCommented", result.data[i][4], result.data[i][5], null, null);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Challenges Liked Recently by a user who I'm following (refined)
				runQueryFunctions.push(function(callback){
					
					var cypherQuery = "" +
						" MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[:POSTED_BY]->(poster:User)" +
						" MATCH (c)<-[like:LIKES]-(liker:User) " +
						" MATCH (:User {id: '" + req.user.id + "'})-[:FOLLOWING]->(liker) " +
						" WITH c, category, poster, like.created as created, liker " +
						" ORDER BY created DESC " + 
						" WITH c, category, poster, collect(created) AS liked, collect(liker) as likers " + 
						" OPTIONAL MATCH (c)<-[:LIKES]-(liker:User) " +
						" WITH c, category, poster, liked, likers, COUNT(liker) as like_count " +
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, category, poster, liked, likers, like_count, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " + 
						" WITH c, category, poster, liked, likers, like_count, comment_count, COUNT(entry) as entry_count " + 
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, comment_count, entry_count, liked[0], likers[0], COUNT(like), category ORDER BY liked[0] DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][5], result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][7] > 0, "recentlyLiked", null, null, result.data[i][5], result.data[i][6], result.data[i][8]);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Entries liked recently by a user who I'm following (refined)
				runQueryFunctions.push(function(callback){

					var cypherQuery = "" +
						" MATCH (c:Entry)-[:POSTED_BY]->(poster:User)" +
						" MATCH (c)<-[like:LIKES]-(liker:User) " +
						" MATCH (:User {id: '" + req.user.id + "'})-[:FOLLOWING]->(liker) " +
						" WITH c, poster, like.created as created, liker " +
						" ORDER BY created DESC " + 
						" WITH c, poster, collect(created) AS liked, collect(liker) as likers " + 
						" OPTIONAL MATCH (c)<-[:LIKES]-(liker:User) " +
						" WITH c, poster, liked, likers, COUNT(liker) as like_count " +
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, poster, liked, likers, like_count, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, comment_count, liked[0], likers[0], COUNT(like) ORDER BY liked[0] DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][4], result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][6] > 0, "recentlyLiked", null, null, result.data[i][4], result.data[i][5]);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// RECENT ACTIVITY IN CHALLENGES AND ENTRIES THAT I HAVE LIKED, COMMENTED OR POSTED IN OR I HAVE POSTED

				// Entries posted in a challenge that I've posted, liked, commented or posted in (refined)
				runQueryFunctions.push(function(callback){
					var cypherQuery = "" +
						" MATCH (u:User {id: '" + req.user.id + "'})<-[:POSTED_BY]-(c:Challenge) " +
						" WITH u, COLLECT(c) AS allChallenges " +
						" MATCH (u)-[:LIKES]->(c:Challenge) " +
						" WITH u, allChallenges + COLLECT(c) AS allChallenges " + 
						" MATCH (c:Challenge)<-[:POSTED_IN]-(comment:Comment)-[:POSTED_BY]->(u) " +
						" WITH u, allChallenges + COLLECT(c) AS allChallenges " + 
						" MATCH (c:Challenge)<-[:PART_OF]-(e:Entry)-[:POSTED_BY]->(u) " +
						" WITH allChallenges + COLLECT(c) AS allChallenges " +
						" UNWIND allChallenges as c " +
						" WITH DISTINCT c " +
						" MATCH (e:Entry)-[:PART_OF]->(c) " +
						" MATCH (e)-[:POSTED_BY]->(poster:User) " +
						" WHERE poster.id <> '" + req.user.id + "' " +
						" WITH e, poster " + 
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
						" WITH e, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
						" WITH e, poster, like_count, COUNT(comment) AS comment_count " + 
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(e) " +
						" RETURN e, poster, like_count, comment_count, COUNT(like) ORDER BY e.created DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][4] > 0, "recentlyPosted", null, null, null, null);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Someone likes a challenge that I've posted, liked, commented or posted in (refined)
				runQueryFunctions.push(function(callback){
					var cypherQuery = "" +
						" MATCH (u:User {id: '" + req.user.id + "'})<-[:POSTED_BY]-(c:Challenge) " +
						" WITH u, COLLECT(c) AS allChallenges " +
						" MATCH (u)-[:LIKES]->(c:Challenge) " +
						" WITH u, allChallenges + COLLECT(c) AS allChallenges " + 
						" MATCH (c:Challenge)<-[:POSTED_IN]-(comment:Comment)-[:POSTED_BY]->(u) " +
						" WITH u, allChallenges + COLLECT(c) AS allChallenges " + 
						" MATCH (c:Challenge)<-[:PART_OF]-(e:Entry)-[:POSTED_BY]->(u) " +
						" WITH u, allChallenges + COLLECT(c) AS allChallenges " +
						" UNWIND allChallenges as c " +
						" WITH DISTINCT c " +
						" MATCH (category:Category)<-[:POSTED_IN]-(c)-[:POSTED_BY]->(poster:User) " +
						" MATCH (c)<-[like:LIKES]-(liker:User) " + 
						" WHERE (liker.id <> '" + req.user.id + "') " +
						" WITH c, category, poster, like.created as created, liker " +
						" ORDER BY created DESC " + 
						" WITH c, category, poster, collect(created) AS liked, collect(liker) as likers " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, category, poster, liked, likers, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " + 
						" WITH c, category, poster, liked, likers, comment_count, COUNT(entry) as entry_count " + 
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, size(liked) as like_count, comment_count, entry_count, liked[0], likers[0], COUNT(like), category ORDER BY liked[0] DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][5], result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][7] > 0, "recentlyLiked", null, null, result.data[i][5], result.data[i][6], result.data[i][8]);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Someone commented on a challenge that I've posted, liked, commented or posted in (refined)
				runQueryFunctions.push(function(callback){
					var cypherQuery = "" +
						" MATCH (u:User {id: '" + req.user.id + "'})<-[:POSTED_BY]-(c:Challenge) " +
						" WITH u, COLLECT(c) AS allChallenges " +
						" MATCH (u)-[:LIKES]->(c:Challenge) " +
						" WITH u, allChallenges + COLLECT(c) AS allChallenges " + 
						" MATCH (c:Challenge)<-[:POSTED_IN]-(comment:Comment)-[:POSTED_BY]->(u) " +
						" WITH u, allChallenges + COLLECT(c) AS allChallenges " + 
						" MATCH (c:Challenge)<-[:PART_OF]-(e:Entry)-[:POSTED_BY]->(u) " +
						" WITH allChallenges + COLLECT(c) AS allChallenges " +
						" UNWIND allChallenges as c " +
						" WITH DISTINCT c " +
						" MATCH (category:Category)<-[:POSTED_IN]-(c)-[:POSTED_BY]->(poster:User) " +
						" MATCH (commenter:User)<-[:POSTED_BY]-(comment:Comment)-[:POSTED_IN]->(c) " + 
						" WHERE (commenter.id <> '" + req.user.id + "') " +
						" WITH c, category, poster, commenter, comment " +
						" ORDER BY comment.created DESC " +
						" WITH c, category, poster, COLLECT(commenter) AS commenters, COLLECT(comment) AS comments " + 
						" OPTIONAL MATCH (c)<-[:LIKES]-(liker:User) " +
						" WITH c, category, poster, commenters, comments, COUNT(liker) AS like_count " +
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " + 
						" WITH c, category, poster, like_count, commenters, comments, COUNT(entry) as entry_count " + 
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(c) " +
						" RETURN c, poster, like_count, size(comments) AS comment_count, entry_count, comments[0], commenters[0], COUNT(like), category ORDER BY comments[0].created DESC;";
					
					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][5].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][7] > 0, "recentlyCommented", result.data[i][5], result.data[i][6], null, null, result.data[i][8]);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Someone likes an Entry that I've posted, liked, or commented in (refined)
				runQueryFunctions.push(function(callback){
					var cypherQuery = "" +
						" MATCH (u:User {id: '" + req.user.id + "'})<-[:POSTED_BY]-(e:Entry) " +
						" WITH u, COLLECT(e) AS allEntries " +
						" MATCH (u)-[:LIKES]->(e:Entry) " +
						" WITH u, allEntries + COLLECT(e) AS allEntries " + 
						" MATCH (e:Entry)<-[:POSTED_IN]-(comment:Comment)-[:POSTED_BY]->(u) " +
						" WITH allEntries + COLLECT(e) AS allEntries " + 
						" UNWIND allEntries as e " +
						" WITH DISTINCT e " +
						" MATCH (e)-[:POSTED_BY]->(poster:User) " +
						" MATCH (e)<-[like:LIKES]-(liker:User) " + 
						" WHERE (liker.id <> '" + req.user.id + "') " +
						" WITH e, poster, like.created as created, liker " +
						" ORDER BY created DESC " + 
						" WITH e, poster, collect(created) AS liked, collect(liker) as likers " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
						" WITH e, poster, liked, likers, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(e) " +
						" RETURN e, poster, size(liked) as like_count, comment_count, liked[0], likers[0], COUNT(like) ORDER BY liked[0] DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][4], result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][6] > 0, "recentlyLiked", null, null, result.data[i][4], result.data[i][5]);
							
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Someone Comments on an Entry that I've posted, liked, or commented in (refined)
				runQueryFunctions.push(function(callback){
					var cypherQuery = "" +
						" MATCH (u:User {id: '" + req.user.id + "'})<-[:POSTED_BY]-(e:Entry) " +
						" WITH u, COLLECT(e) AS allEntries " +
						" MATCH (u)-[:LIKES]->(e:Entry) " +
						" WITH u, allEntries + COLLECT(e) AS allEntries " + 
						" MATCH (e:Entry)<-[:POSTED_IN]-(comment:Comment)-[:POSTED_BY]->(u) " +
						" WITH allEntries + COLLECT(e) AS allEntries " + 
						" UNWIND allEntries as e " +
						" WITH DISTINCT e " +
						" MATCH (e)-[:POSTED_BY]->(poster:User) " +
						" MATCH (e)<-[:POSTED_IN]-(comment:Comment)-[:POSTED_BY]->(commenter: User) " +
						" WHERE (commenter.id <> '" + req.user.id + "') " +
						" WITH e, poster, comment, commenter " +
						" ORDER BY comment.created DESC " +
						" WITH e, poster, COLLECT(comment) AS comments, COLLECT(commenter) AS commenters " +
						" OPTIONAL MATCH (e)<-[like:LIKES]-(liker:User) " +
						" WITH e, poster, comments, commenters, COUNT(like) AS like_count " +
						" OPTIONAL MATCH (me:User {id: '" + req.user.id + "'})-[like:LIKES]->(e) " +
						" RETURN e, poster, like_count, size(comments) AS comment_count, comments[0], commenters[0], COUNT(like) " +
						" ORDER BY comments[0].created DESC; ";
						
					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][4].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][6] > 0, "recentlyCommented", result.data[i][4], result.data[i][5], null, null);
							
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});


			/**************** DEFAULT FEED WHEN USER IS NOT LOGGED IN *****************/	
			} else { 
				// Challenges Posted Recently
				runQueryFunctions.push(function(callback){

					var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(poster:User) " +
						" WITH c, category, poster " +
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
						" WITH c, category, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
						" WITH c, category, poster, like_count, COUNT(comment) as comment_count " + 
						" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
						" RETURN c, poster, like_count, comment_count, COUNT(entry) AS entry_count, category ORDER BY c.created DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, false, "recentlyPosted", null, null, null, null, result.data[i][5]);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

				// Entries posted recently
				runQueryFunctions.push(function(callback){
					var cypherQuery = "MATCH (e:Entry)-[:POSTED_BY]->(poster:User) " +
						" WITH e, poster " + 
						" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
						" WITH e, poster, COUNT(u2) AS like_count " + 
						" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
						" WITH e, poster, like_count, COUNT(comment) AS comment_count " + 
						" RETURN e, poster, like_count, comment_count ORDER BY e.created DESC;";

					db.cypherQuery(cypherQuery, function(err, result) {
						if (err) {
							logger.dbError(err, cypherQuery);
							return callback(err, 0);
						}

						var output = [];
		    			for (var i = 0; i < result.data.length; i++) {
		    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, false, "recentlyPosted", null, null, null, null);
							output.push(data);
		    			}

		    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
		    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
		    			}
						resultArrays.push(output);
						return callback(null, 0);
					});
				});

			}

			/**************** COMMON ENTRIES (whether user is logged in or not) ****************/

			//POPULAR ENTRIES OR CHALLENGES
			//Challenge or entry with > 20 likes
			//Challenge or entry with > 20 comments

			var meId = (req.user) ? (req.user.id) : (0);

			// Challenges posted recently with > 20 likes
			runQueryFunctions.push(function(callback){

				var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(poster:User) " +
					" WITH c, category, poster " +
					" MATCH (u2:User)-[:LIKES]->(c) " + 
					" WITH c, category, poster, COUNT(u2) AS like_count " + 
					" WHERE like_count >= " + config.businessLogic.minLikesForPopularity + " " +
					" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
					" WITH c, category, poster, like_count, COUNT(comment) as comment_count " + 
					" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
					" WITH c, category, poster, like_count, comment_count, COUNT(entry) AS entry_count " +
					" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
					" RETURN c, poster, like_count, comment_count, entry_count, COUNT(like), category ORDER BY c.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						logger.dbError(err, cypherQuery);
						return callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][5] > 0, "highLikeCount", null, null, null, null, result.data[i][6]);
						output.push(data);
	    			}

	    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
	    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
	    			}
					resultArrays.push(output);
					return callback(null, 0);
				});
			});

			// Challenges posted recently with > 20 comments
			runQueryFunctions.push(function(callback){

				var cypherQuery = "MATCH (category:Category)<-[:POSTED_IN]-(c:Challenge)-[r:POSTED_BY]->(poster:User) " +
					" WITH c, category, poster " +
					" MATCH (comment:Comment)-[:POSTED_IN]->(c) " + 
					" WITH c, category, poster, COUNT(comment) as comment_count " +
					" WHERE comment_count >= " + config.businessLogic.minCommentsForPopularity + " " +
					" OPTIONAL MATCH (u2:User)-[:LIKES]->(c) " + 
					" WITH c, category, poster, comment_count, COUNT(u2) AS like_count " + 
					" OPTIONAL MATCH (entry:Entry)-[:PART_OF]->(c) " +
					" WITH c, category, poster, comment_count, like_count, COUNT(entry) AS entry_count " +
					" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(c) " +
					" RETURN c, poster, like_count, comment_count, entry_count, COUNT(like), category ORDER BY c.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						logger.dbError(err, cypherQuery);
						return callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var data = dataUtils.constructEntityData("challenge", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], result.data[i][4], 0, null, null, null, result.data[i][5] > 0, "highCommentCount", null, null, null, null, result.data[i][6]);
						output.push(data);
	    			}

	    			if (!serverUtils.validateData(output, serverUtils.prototypes.challenge)) {
	    				return callback(new error.DataValidationError(output, serverUtils.prototypes.challenge), 0);
	    			}
					resultArrays.push(output);
					return callback(null, 0);
				});
			});

			// Entries posted recently with > 20 likes
			runQueryFunctions.push(function(callback){

				var cypherQuery = "MATCH (e:Entry)-[r:POSTED_BY]->(poster:User) " +
					" WITH e, poster " +
					" MATCH (u2:User)-[:LIKES]->(e) " + 
					" WITH e, poster, COUNT(u2) AS like_count " + 
					" WHERE like_count >= " + config.businessLogic.minLikesForPopularity + " " +
					" OPTIONAL MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
					" WITH e, poster, like_count, COUNT(comment) as comment_count " + 
					" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(e) " +
					" RETURN e, poster, like_count, comment_count, COUNT(like) ORDER BY e.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						logger.dbError(err, cypherQuery);
						return callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][4] > 0, "highLikeCount", null, null, null, null);
						output.push(data);
	    			}

	    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
	    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
	    			}
					resultArrays.push(output);
					return callback(null, 0);
				});
			});

			// Entries posted recently with > 20 comments
			runQueryFunctions.push(function(callback){

				var cypherQuery = "MATCH (e:Entry)-[r:POSTED_BY]->(poster:User) " +
					" WITH e, poster " +
					" MATCH (comment:Comment)-[:POSTED_IN]->(e) " + 
					" WITH e, poster, COUNT(comment) AS comment_count " + 
					" WHERE comment_count >= " + config.businessLogic.minCommentsForPopularity + " " +
					" OPTIONAL MATCH (u2:User)-[:LIKES]->(e) " + 
					" WITH e, poster, comment_count, COUNT(u2) AS like_count " + 	
					" OPTIONAL MATCH (me:User {id: '" + meId + "'})-[like:LIKES]->(e) " +				
					" RETURN e, poster, like_count, comment_count, COUNT(like) ORDER BY e.created DESC;";

				db.cypherQuery(cypherQuery, function(err, result) {
					if (err) {
						logger.dbError(err, cypherQuery);
						return callback(err, 0);
					}

					var output = [];
	    			for (var i = 0; i < result.data.length; i++) {
	    				var data = dataUtils.constructEntityData("entry", result.data[i][0], result.data[i][1], result.data[i][0].created, result.data[i][2], result.data[i][3], null, 0, null, null, null, result.data[i][4] > 0, "highCommentCount", null, null, null, null);
						output.push(data);
	    			}

	    			if (!serverUtils.validateData(output, serverUtils.prototypes.entry)) {
	    				return callback(new error.DataValidationError(output, serverUtils.prototypes.entry), 0);
	    			}
					resultArrays.push(output);
					return callback(null, 0);
				});
			});

			async.series(runQueryFunctions, function(err, unusedList) {
				if (err) {
					logger.error("Error with one of the query functions: " + err);
					return res.sendStatus(500);
				}

				var mergedOutput = [];
				serverUtils.mergeFeeds(resultArrays, mergedOutput);
				return res.json(mergedOutput);
			});
		});

		return feedRouter;
};



module.exports = routes;
