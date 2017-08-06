$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar();

	createPopularUsersSidebar();

	setupMainItem();
});

function setupMainItem() {
	createAndAppendContentContainer($("#users"), 0, "users", [{type: "thumbnail"}], [{type: "date", url: "/api/users?sortBy=lastSeen"}, {type: "popularity", url: "/api/users?sortBy=popularity"}]);

}
