$(document).ready(function(){
	$("#postChallenge").click(postChallenge);

	createLoginHeader();

	setupTabs();
});

function setupTabs() {
	var tabGroup = createNewTabGroup("mainTabGroup");
	$("body").append(tabGroup);

	setupChallenges();

	setupEntries();

	setupButtons();
}

function setupChallenges() {
	createAndAppendContentContainer($("#challenges"), "challenges", [{type: "thumbnail"}], [{type: "date", url: "/api/challenges?sortBy=date&count=6"}]);
}

function setupEntries() {
	createAndAppendContentContainer($("#entries"), "entries", [{type: "thumbnail"}], [{type: "date", url: "/api/entries?sortBy=date&count=6"}]);
}

function setupButtons() {
	$("#postChallenge").click(function() {
		window.open("/newchallenge", "_self");
	});

	$("#browseChallenges").click(function() {
		window.open("/challenges", "_self");
	});

	$("#postEntry").click(function() {
		window.open("/newentry", "_self");
	});

	$("#browseEntries").click(function() {
		window.open("/entries", "_self");
	});
}

/*

function setupChallengesTabOld() {
	var tabDiv = appendNewTab("mainTabGroup", "challenges", "Challenges");
	var h3 = $("<h3>").text("Challenges");
	tabDiv.append(h3);

	var viewGroup = $("<div>", {id: "challengesViewGroup", class: "btn-group"});
	viewGroup.append($("<button>", {id: "thumbnailViewButton", type: "button", class: "btn btn-default"}).append($("<span>", {class: "glyphicon glyphicon-th"})).append(" Thumbnail View"));
	viewGroup.append($("<button>", {id: "scrollableViewButton", type: "button", class: "btn btn-default"}).append($("<span>", {class: "glyphicon glyphicon-film"})).append(" Filmstrip View"));
	tabDiv.append(viewGroup);

	var sortGroup = $("<div>", {id: "challengesSortGroup", class: "btn-group pull-right"});
	sortGroup.append($("<button>", {id: "postedDateSortButton", type: "button", class: "btn btn-default"}).append($("<span>", {class: "glyphicon glyphicon glyphicon-time"})).append(" Sort by Date"));
	sortGroup.append($("<button>", {id: "popularitySortButton", type: "button", class: "btn btn-default"}).append($("<span>", {class: "glyphicon glyphicon glyphicon-thumbs-up"})).append(" Sort by Popularity"));
	tabDiv.append(sortGroup);

	$.getJSON('/api/challenges/', function(result) {
		var list = [];
		for (var i = 0; i < result.length; i++) {
			var c = result[i][0];
			var u = result[i][1];

			var data = {};
			data.image = c.image;
			data.postedDate = new Date(parseInt(c.created));
			data.postedByUser = {};
			data.postedByUser.id = u.id;
			data.postedByUser.displayName = u.displayName;
			data.postedByUser.image = u.image;

			data.socialStatus = {};
			data.socialStatus.numLikes = 121;
			data.socialStatus.numShares = 23;
			data.socialStatus.numComments = 45;

			data.link = "/challenge/" + c.id;

			list.push(data);
		}

		jQuery.data(document.body, "challengesList", list);

		var scrollableList = createScrollableList("scrollableChallengeList", list);
		tabDiv.append(scrollableList);
	});

	$("#challengesViewGroup button").click(function() {
		$("#scrollableChallengeList").remove();
		$("#gridChallengeTable").remove();

		var buttonID = this.id;

		var list = jQuery.data(document.body, "challengesList");
		
		if (buttonID == "thumbnailViewButton") {
			var grid = createGrid("gridChallengeTable", list, 3, false, false, null);
			tabDiv.append(grid);
		} else if (buttonID == "scrollableViewButton") {
			var scrollableList = createScrollableList("scrollableChallengeList", list);
			tabDiv.append(scrollableList);
		}
	});
}
*/
/*
function setupEntriesTabOld() {
	var tabDiv = appendNewTab("mainTabGroup", "entries", "Entries");
	var h3 = $("<h3>").text("Entries");
	tabDiv.append(h3);

	var viewGroup = $("<div>", {id: "entriesViewGroup", class: "btn-group"});
	viewGroup.append($("<button>", {id: "thumbnailViewButton", type: "button", class: "btn btn-default"}).append($("<span>", {class: "glyphicon glyphicon-th"})));
	viewGroup.append($("<button>", {id: "scrollableViewButton", type: "button", class: "btn btn-default"}).append($("<span>", {class: "glyphicon glyphicon-film"})));
	tabDiv.append(viewGroup);

	$.getJSON('/api/entries/', function(result) {
		var list = [];
		for (var i = 0; i < result.length; i++) {
			var e = result[i][0];
			var u = result[i][1];
			var data = {};
			data.image = "/entries/images/" + e.id;
			data.postedDate = new Date(parseInt(e.created));
			data.postedByUser = {};
			data.postedByUser.id = u.id;
			data.postedByUser.displayName = u.displayName;
			data.postedByUser.image = u.image;
			data.link = "/entry/" + e.id;

			data.socialStatus = {};
			data.socialStatus.numLikes = 121;
			data.socialStatus.numShares = 23;
			data.socialStatus.numComments = 45;

			if (e.caption) {
				data.caption = e.caption;
			}

			list.push(data);
		}

		jQuery.data(document.body, "entriesList", list);

		var scrollableList = createScrollableList("scrollableEntriesList", list);
		tabDiv.append(scrollableList);
	});

	$("#entriesViewGroup button").click(function() {
		$("#scrollableEntriesList").remove();
		$("#gridEntriesTable").remove();

		var buttonID = this.id;

		var list = jQuery.data(document.body, "entriesList");
		
		if (buttonID == "thumbnailViewButton") {
			var grid = createGrid("gridEntriesTable", list, 3, false, false, null);
			tabDiv.append(grid);
		} else if (buttonID == "scrollableViewButton") {
			var scrollableList = createScrollableList("scrollableEntriesList", list);
			tabDiv.append(scrollableList);
		}
	});
}
*/

function postChallenge() {
	window.open("/newchallenge", "_self");
}