$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar();

	setupFeed();
});

function createCategorySidebar() {
	var list = [];
	$.getJSON("/api/categories/", function(result) {
		for (var i = 0; i < result.length; i++) {
			list.push({type: "link", name: result[i].name, link: "/challenges/?category=" + result[i].id});
		}

		updateSidebar("categoriesSidebar", "Categories", list);
	});
}

function setupFeed() {
	createAndAppendContentContainer($("#feed"), 0, "feed", [{type: "feed"}], [{type: "date", url: "/api/feeds"}]);
}