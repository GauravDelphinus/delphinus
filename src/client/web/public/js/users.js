$(document).ready(function(){
	createLoginHeader();

	/* FUTURE
	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});
	*/

	createPopularUsersSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});

	setupMainItem();

	keepSidebarVisible();
});

function setupMainItem() {
	createAndAppendContentContainer($("#users"), 0, "users", [{type: "thumbnail"}], "/api/users");
}
