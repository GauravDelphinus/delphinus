$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});

	setupCaptionSidebar();

	setupMainItem();

	setupTabs();

	keepSidebarVisible();

	$("#createCaption").click(function(e) {
		showAlert("Sample message", 3);
	});
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(data) {
		var mainElement = createMainElement(data, "main");
		$("#main").append(mainElement);
	}).fail(function() {
		window.location.replace("/error");
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup(challengeId);
	$("#tabs").append(tabGroup);

	setupEntriesTab();

	setupCommentsTab();

	setupTabRedirection(challengeId);
}

function setupCaptionSidebar() {
	createChallengeCaptionSidebar(challengeId, function(sidebar) {
		if (sidebar) {
			$("#rightTopSidebar").append(sidebar);
		}
	});
}

function setupEntriesTab() {
	var tabDiv = appendNewTab(challengeId, "entries", "Entries");
	createAndAppendContentContainer(tabDiv, challengeId, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=dateCreated"}, {type: "popularity", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=popularity"}]);
}

function setupCommentsTab() {
	var tabDiv = appendNewTab(challengeId, "comments", "Comments");
	createAndAppendContentContainer(tabDiv, challengeId, "comments", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + challengeId + "&sortBy=reverseDate"}]);
}
