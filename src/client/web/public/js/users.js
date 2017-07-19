$(document).ready(function(){
	createLoginHeader();

	setupMainItem();
});

function setupMainItem() {
	createAndAppendContentContainer($("#users"), "users", [{type: "thumbnail"}], [{type: "date", url: "/api/users?sortBy=lastSeen"}, {type: "popularity", url: "/api/users?sortBy=popularity"}]);

}
