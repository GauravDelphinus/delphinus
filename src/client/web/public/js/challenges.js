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
	if (categoryId != 0) {
		appendCategory = "?category=" + categoryId;
	}
	createAndAppendContentContainer($("#challenges"), 0, "challenges", [{type: "filmstrip"}, {type: "thumbnail"}], "/api/challenges" + appendCategory);

}

function setupButtons() {
	$("#postChallenge").click(function() {
		window.open("/newchallenge", "_self");
	});
}