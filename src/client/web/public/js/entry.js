$(document).ready(function(){
  	createLoginHeader();

  	setupMainItem();

  	setupTabs();
});

function setupMainItem() {
	$.getJSON('/api/entries/' + entryId, function(data) {
		var mainElement = createMainElement(data);
		$("#main").append(mainElement);

		$("#mainTitle").text(data.caption);
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup("mainTabGroup");
	$("body").append(tabGroup);

	setupChallengeTab();

	setupCommentsTab();
}

function setupChallengeTab() {
	var tabDiv = appendNewTab("mainTabGroup", "challenges", "Challenge");
	//createAndAppendContentContainer(tabDiv, "challenges", [{type: "filmstrip"}], [{type: "date", url: "/api/challenges/" + challengeId}]);

	$.getJSON('/api/challenges/' + challengeId, function(data) {
		var mainElement = createMainElement(data);
		tabDiv.append(mainElement);
	});
}

function setupCommentsTab() {

}