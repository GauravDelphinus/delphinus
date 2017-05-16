$(document).ready(function(){
	createLoginHeader();

	setupMainItem();

	setupButtons();
});

function setupMainItem() {
	createAndAppendContentContainer($("#entries"), "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries?sortBy=date"}, {type: "popularity", url: "/api/entries?sortBy=popularity"}]);

}

function setupButtons() {
	$("#postEntry").click(function() {
		window.open("/newentry", "_self");
	});
}