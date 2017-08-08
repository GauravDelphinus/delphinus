$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar();

	createPopularChallengesSidebar();

	setupMainItem();

	setupTabs();
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(data) {
		//console.log("result is " + JSON.stringify(data));
		var mainElement = createMainElement(data);
		$("#main").append(mainElement);

		$("#mainTitle").text(data.caption);
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
	createAndAppendContentContainer(tabDiv, challengeId, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=date"}, {type: "popularity", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=popularity"}]);
}

function setupCommentsTab() {
	var tabDiv = appendNewTab("mainTabGroup", "comments", "Comments");
	createAndAppendContentContainer(tabDiv, challengeId, "comments", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + challengeId + "&sortBy=reverseDate"}]);
}
