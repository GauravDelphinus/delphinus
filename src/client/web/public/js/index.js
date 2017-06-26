$(document).ready(function(){
	$("#postChallenge").click(postChallenge);

	createLoginHeader();

	setupFeed();
});

function setupFeed() {

	createAndAppendContentContainer($("#feed"), "feed", [{type: "filmstrip"}], [{type: "date", url: "/api/feeds"}]);
	//setupChallenges();

	//setupEntries();

}

function setupChallenges() {
	createAndAppendContentContainer($("#feed"), "challenges", [{type: "filmstrip"}], [{type: "date", url: "/api/challenges?sortBy=date&count=6"}]);
}

function setupEntries() {
	createAndAppendContentContainer($("#feed"), "entries", [{type: "filmstrip"}], [{type: "date", url: "/api/entries?sortBy=date&count=6"}]);
}


function postChallenge() {
	window.open("/newchallenge", "_self");
}