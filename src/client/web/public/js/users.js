$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});

	createPopularUsersSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});

	setupMainItem();

	keepSidebarVisible();
});

function setupMainItem() {
	createAndAppendContentContainer($("#users"), 0, "users", [{type: "thumbnail"}], [{type: "date", url: "/api/users?sortBy=lastSeen"}, {type: "popularity", url: "/api/users?sortBy=popularity"}]);

}
