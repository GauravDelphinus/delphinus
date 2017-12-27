$(document).ready(function(){
	createLoginHeader();
	
	createPopularChallengesSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});
	
	setupFeed();

	keepSidebarVisible();
});

function setupFeed() {
	createAndAppendContentContainer($("#feed"), 0, "feed", [{type: "feed"}], "/api/feeds");
}