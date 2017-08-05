$(document).ready(function(){
	createLoginHeader();

	setupMainItem();

	setupButtons();
});

function setupMainItem() {
	var appendCategory = "";
	if (query && query.category) {
		appendCategory = "&category=" + query.category;
	}
	createAndAppendContentContainer($("#challenges"), 0, "challenges", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/challenges?sortBy=dateCreated" + appendCategory}, {type: "popularity", url: "/api/challenges?sortBy=popularity" + appendCategory}]);

}

function setupButtons() {
	$("#postChallenge").click(function() {
		window.open("/newchallenge", "_self");
	});
}