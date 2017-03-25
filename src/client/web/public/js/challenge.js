$(document).ready(function(){
	console.log("document.ready called, id is " + challengeId);
	$.getJSON('/api/challenges/' + challengeId, parseChallenge);

	  $("#postEntry").click(postEntry);
});

function parseChallenge(challenge) {
	$("#challengeImage").attr("src", challenge.image);
	$("#challengeTitle").text(challenge.title);
	$(document).prop("title", "Challenge: " + challenge.title);
	var date = new Date(parseInt(challenge.created));
	$("#challengeCreationDate").text(date.toString());
}

function postEntry() {
	window.open("/challenge/" + challengeId + "/newentry");
}