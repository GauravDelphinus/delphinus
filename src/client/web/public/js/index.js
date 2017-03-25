$(document).ready(function(){
	//console.log("document.ready called, id is " + challengeId);
	$.getJSON('/api/challenges/', extractChallenges);
	$.getJSON('/api/entries/', extractEntries);
});

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