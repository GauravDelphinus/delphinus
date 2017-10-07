$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});
	
	createPopularChallengesSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});
	
	setupFeed();

	keepSidebarVisible();
});

function setupFeed() {
	createAndAppendContentContainer($("#feed"), 0, "feed", [{type: "feed"}], [{type: "date", url: "/api/feeds"}]);
}