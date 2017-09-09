$(document).ready(function(){
  	createLoginHeader();

  	setupMainItem();

  	setupChallengeSidebar();

  	createCategorySidebar();

  	setupTabs();

  	keepSidebarVisible();
});

function setupMainItem() {
	$.getJSON('/api/entries/' + entryId, function(data) {
		var mainElement = createMainElement(data, true);
		$("#main").append(mainElement);
	}).fail(function() {
		window.location.replace("/error");
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup("mainTabGroup");
	$("#tabs").append(tabGroup);

	setupCommentsTab();

	setupTabRedirection();
}

function setupChallengeSidebar() {
	$.getJSON('/api/challenges/' + challengeId, function(data) {
		var element = createThumbnailElement(data);
		$("#challenge").append(element);
	}).fail(function() {
		window.location.replace("/error");
	});
}

function setupCommentsTab() {
	var tabDiv = appendNewTab("mainTabGroup", "comments", "Comments");
	createAndAppendContentContainer(tabDiv, entryId, "comments", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + entryId + "&sortBy=reverseDate"}]);
}
