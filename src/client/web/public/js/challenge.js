$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});

	setupCaptionSidebar();

	setupMainItem();

	setupTabs();

	keepSidebarVisible();
});

function setupMainItem() {
	//set up the main item
	var mainElement = createMainElement(challenge, "main");
	$("#main").empty().append(mainElement);
}

function setupTabs() {
	var tabGroup = createNewTabGroup(challenge.id);
	$("#tabs").append(tabGroup);

	setupEntriesTab();

	setupCommentsTab();

	setupTabRedirection(challenge.id);
}

function setupCaptionSidebar() {
	createChallengeCaptionSidebar(challenge.id, function(sidebar) {
		if (sidebar) {
			$("#rightTopSidebar").append(sidebar);
		}
	});
}

function setupEntriesTab() {
	var tabDiv = appendNewTab(challenge.id, "entries", "Entries");
	createAndAppendContentContainer(tabDiv, challenge.id, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], "/api/entries/?challengeId=" + challenge.id);
}

function setupCommentsTab() {
	var tabDiv = appendNewTab(challenge.id, "comments", "Comments");
	//note: setting the contentTag to "main" below as we want the comments to be associated with the main element
	createAndAppendCommentsContainer(tabDiv, challenge.id, "main", "/api/comments?entityId=" + challenge.id);
}
