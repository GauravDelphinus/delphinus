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
		console.log("got info for challenge, creating main element.  Data: " + JSON.stringify(data));
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
	createAndAppendContentContainer(tabDiv, challengeId, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries/?challengeId=" + challengeId}]);
}

function setupCommentsTab() {
	var tabDiv = appendNewTab(challengeId, "comments", "Comments");
	//note: setting the contentTag to "main" below as we want the comments to be associated with the main element
	createAndAppendContentContainer(tabDiv, challengeId, "main", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + challengeId + "&sortBy=reverseDate"}]);
}
