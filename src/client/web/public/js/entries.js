$(document).ready(function(){
	createLoginHeader();
	
	createPopularEntriesSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});

	setupMainItem();

	setupButtons();

	keepSidebarVisible();
});

function setupMainItem() {
	createAndAppendContentContainer($("#entries"), 0, "entries", [{type: "filmstrip"}, {type: "thumbnail"}], [{type: "date", url: "/api/entries"}]);

}

function setupButtons() {
	$("#postEntry").click(function() {
		window.open("/newentry", "_self");
	});
}