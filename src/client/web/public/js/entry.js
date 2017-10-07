$(document).ready(function(){
  	createLoginHeader();

  	setupMainItem();

  	setupChallengeSidebar();

  	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});

  	setupTabs();

  	keepSidebarVisible();
});

function setupMainItem() {
	$.getJSON('/api/entries/' + entryId, function(data) {
		var mainElement = createMainElement(data, "main");
		$("#main").append(mainElement);
	}).fail(function() {
		window.location.replace("/error");
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup(entryId);
	$("#tabs").append(tabGroup);

	setupCommentsTab();

	setupTabRedirection(entryId);
}

function setupChallengeSidebar() {
	if (challengeId != 0) {
		$.getJSON('/api/challenges/' + challengeId, function(data) {
			var element = createThumbnailElement(data);
			$("#challenge").append(element);
		}).fail(function() {
			window.location.replace("/error");
		});
	}
	
}

function setupCommentsTab() {
	var tabDiv = appendNewTab(entryId, "comments", "Comments");
	createAndAppendContentContainer(tabDiv, entryId, "comments", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + entryId + "&sortBy=reverseDate"}]);
}
