$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar();

	createPopularChallengesSidebar();

	setupFeed();

	keepSidebarVisible();
});

function setupFeed() {
	createAndAppendContentContainer($("#feed"), 0, "feed", [{type: "feed"}], [{type: "date", url: "/api/feeds"}]);
}