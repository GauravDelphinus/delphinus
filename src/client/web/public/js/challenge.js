$(document).ready(function(){
	createLoginHeader();

	setupMainItem();

	setupTabs();
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(data) {
		console.log("result is " + JSON.stringify(data));
		var mainElement = createMainElement(data);
		$("#main").append(mainElement);

		$("#mainTitle").text(data.caption);
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup("mainTabGroup");
	$("body").append(tabGroup);

	setupMyEntriesTab();

	setupEntriesTab();

	setupCommentsTab();
}

function setupMyEntriesTab() {
	var tabDiv = appendNewTab("mainTabGroup", "myentries", "My Entries");
	var h3 = $("<h3>").text("Add a new Entry");
	tabDiv.append(h3);

	var postEntryButton = $("<button>", {id: "postEntryButton", class: "btn btn-primary btn-lg", text: "Post Entry"});
	tabDiv.append(postEntryButton);

	$("#postEntryButton").click(function () {
		window.open("/challenge/" + challengeId + "/newentry", "_self");
	});

	if (user) {
		createAndAppendContentContainer(tabDiv, "myEntries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries/?user=" + user.id + "&challengeId=" + challengeId + "&sortBy=date"}, {type: "popularity", url: "/api/entries/?user=" + user.id + "&challengeId=" + challengeId + "&sortBy=popularity"}]);
	}
}

function setupEntriesTab() {
	var tabDiv = appendNewTab("mainTabGroup", "entries", "Entries");
	createAndAppendContentContainer(tabDiv, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=date" + (user? "&excludeUser=" + user.id : "")}, {type: "popularity", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=popularity" + (user? "&excludeUser=" + user.id : "")}]);
}

function setupCommentsTab() {

}
