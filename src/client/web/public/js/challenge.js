$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar();

	setupMainItem();

	setupTabs();

	keepSidebarVisible();
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(data) {
		var mainElement = createMainElement(data);
		$("#main").append(mainElement);
	}).fail(function() {
		window.location.replace("/error");
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup("mainTabGroup");
	$("#tabs").append(tabGroup);

	setupEntriesTab();

	setupCommentsTab();

	setupTabRedirection();
}

function setupEntriesTab() {
	var tabDiv = appendNewTab("mainTabGroup", "entries", "Entries");
	createAndAppendContentContainer(tabDiv, challengeId, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=dateCreated"}, {type: "popularity", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=popularity"}]);
}

function setupCommentsTab() {
	var tabDiv = appendNewTab("mainTabGroup", "comments", "Comments");
	createAndAppendContentContainer(tabDiv, challengeId, "comments", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + challengeId + "&sortBy=reverseDate"}]);
}
