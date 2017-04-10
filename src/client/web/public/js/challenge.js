$(document).ready(function(){
	console.log("document.ready called, id is " + challengeId);
	$.getJSON('/api/challenges/' + challengeId, parseChallenge);
	$.getJSON('/api/entries/?challengeId=' + challengeId, extractEntries);

	$("#postEntry").click(postEntry);
	$("#goToHomePage").click(function() {
		window.open("/", "_self");
	});
});

function parseChallenge(challenge) {
	$("#challengeImage").attr("src", challenge.image);
	$("#challengeTitle").text(challenge.title);
	$(document).prop("title", "Challenge: " + challenge.title);
	var date = new Date(parseInt(challenge.created));
	$("#challengeCreationDate").text(date.toString());
}

function postEntry() {
	window.open("/challenge/" + challengeId + "/newentry", "_self");
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