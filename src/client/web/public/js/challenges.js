$(document).ready(function(){
	createLoginHeader();

	setupMainItem();

	setupButtons();
});

function setupMainItem() {
	createAndAppendContentContainer($("#challenges"), "challenges", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/challenges?sortBy=date"}, {type: "popularity", url: "/api/challenges?sortBy=popularity"}]);

}

function setupButtons() {
	$("#postChallenge").click(function() {
		window.open("/newchallenge", "_self");
	});
}