$(document).ready(function(){
	//console.log("document.ready called, id is " + challengeId);
	
	//$.getJSON('/api/entries/', extractEntries);

	$("#postChallenge").click(postChallenge);

	createLoginHeader();

	setupTabs();
});

function setupTabs() {
	var tabGroup = createNewTabGroup("mainTabGroup");
	$("body").append(tabGroup);

	setupChallengesTab();

	setupEntriesTab();
}

function setupChallengesTab() {
	var tabDiv = appendNewTab("mainTabGroup", "challenges", "Challenges");
	var h3 = $("<h3>").text("Challenges");
	tabDiv.append(h3);

	$.getJSON('/api/challenges/', function(result) {
		for (var i = 0; i < result.length; i++) {
			console.log("result " + i + " is " + JSON.stringify(result[i]));
			var c = result[i][0];
			var u = result[i][1];
			console.log("c = " + JSON.stringify(c));
			console.log("u = " + JSON.stringify(u));
			var data = {};
			data.image = c.image;
			data.postedDate = new Date(parseInt(c.created));
			data.postedByUser = {};
			data.postedByUser.id = u.id;
			data.postedByUser.displayName = u.displayName;
			data.postedByUser.image = u.image;

			data.socialStatus = {};
			data.socialStatus.numLikes = 121;
			data.socialStatus.numShares = 23;
			data.socialStatus.numComments = 45;

			data.link = "/challenge/" + c._id;

			var scrollableElement = createScrollableElement(data);
			tabDiv.append(scrollableElement);
		}
	});
}

function setupEntriesTab() {
	var tabDiv = appendNewTab("mainTabGroup", "entries", "Entries");
	var h3 = $("<h3>").text("Entries");
	tabDiv.append(h3);

	$.getJSON('/api/entries/', function(result) {
		for (var i = 0; i < result.length; i++) {
			console.log("result " + i + " is " + JSON.stringify(result[i]));
			var e = result[i][0];
			var u = result[i][1];
			console.log("e = " + JSON.stringify(e));
			console.log("u = " + JSON.stringify(u));
			var data = {};
			data.image = "/entries/images/" + e._id;
			data.postedDate = new Date(parseInt(e.created));
			data.postedByUser = {};
			data.postedByUser.id = u.id;
			data.postedByUser.displayName = u.displayName;
			data.postedByUser.image = u.image;
			data.link = "/entry/" + e._id;

			data.socialStatus = {};
			data.socialStatus.numLikes = 121;
			data.socialStatus.numShares = 23;
			data.socialStatus.numComments = 45;

			if (e.caption) {
				data.caption = e.caption;
			}

			var scrollableElement = createScrollableElement(data);
			tabDiv.append(scrollableElement);
		}
	});
}

function extractChallenges(challenges) {
	var numCols = 5; // max columns

	$("#challengesTable").empty();

	for (var i = 0; i < challenges.length; i++) {
		var col = i % numCols;
		//var row = i / numCols;

		var challenge = challenges[i];

		var td = $("<td>").append($("<img>").attr("src", "/challenges/images/" + challenge._id).attr("width", "100"));
		td.append($("<br>"));
		td.append($("<a>").attr("href", "/challenge/" + challenge._id).text(challenge.title));
		
		if (col == 0) {
			$("#challengesTable").append("<tr>").append(td);
		} else {
			$("#challengesTable").append(td);
		}

	}
}

function extractEntries(entries) {
	var numCols = 5; // max columns

	$("#entriesTable").empty();

	for (var i = 0; i < entries.length; i++) {
		var col = i % numCols;
		//var row = i / numCols;

		var entry = entries[i];

		var td = $("<td>").append($("<img>").attr("src", "/entries/images/" + entry._id).attr("width", "100"));
		td.append($("<br>"));
		td.append($("<a>").attr("href", "/entry/" + entry._id).text("Entry " + entry._id));
		
		if (col == 0) {
			$("#entriesTable").append("<tr>").append(td);
		} else {
			$("#entriesTable").append(td);
		}

	}
}

function postChallenge() {
	window.open("/newchallenge", "_self");
}