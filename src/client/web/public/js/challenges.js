$(document).ready(function(){
	createLoginHeader();

	setupMainItem();

	setupButtons();
});

function setupMainItem() {
	createAndAppendContentContainer($("#challenges"), 0, "challenges", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/challenges?sortBy=dateCreated"}, {type: "popularity", url: "/api/challenges?sortBy=popularity"}]);

}

function setupButtons() {
	$("#postChallenge").click(function() {
		window.open("/newchallenge", "_self");
	});
}