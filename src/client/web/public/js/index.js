$(document).ready(function(){
	createLoginHeader();

	setupFeed();
});

function setupFeed() {
	createAndAppendContentContainer($("#feed"), 0, "feed", [{type: "feed"}], [{type: "date", url: "/api/feeds"}]);
}