$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});
	
	createPopularEntriesSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});

	setupMainItem();

	setupButtons();

	keepSidebarVisible();
});

function setupMainItem() {
	createAndAppendContentContainer($("#entries"), 0, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries?sortBy=dateCreated"}, {type: "popularity", url: "/api/entries?sortBy=popularity"}]);

}

function setupButtons() {
	$("#postEntry").click(function() {
		window.open("/newentry", "_self");
	});
}