$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});
	
	createPopularChallengesSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});

	setupMainItem();

	setupButtons();

	keepSidebarVisible();
});

function setupMainItem() {
	var appendCategory = "";
	if (categoryId != "all") {
		appendCategory = "&category=" + categoryId;
	}
	createAndAppendContentContainer($("#challenges"), 0, "challenges", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/challenges?sortBy=dateCreated" + appendCategory}, {type: "popularity", url: "/api/challenges?sortBy=popularity" + appendCategory}]);

}

function setupButtons() {
	$("#postChallenge").click(function() {
		window.open("/newchallenge", "_self");
	});
}