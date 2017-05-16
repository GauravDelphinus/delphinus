$(document).ready(function(){
	createLoginHeader();

	setupMainItem();

	setupTabs();
});

function setupMainItem() {
	$.getJSON('/api/challenges/' + challengeId, function(result) {
		console.log("result is " + JSON.stringify(result));
		if (result.length > 0) {
			var c = result[0];
			var u = result[1];

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

			var mainElement = createMainElement(data);
			$("#main").append(mainElement);

			$("#mainTitle").text(c.title);
		}
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
		$.getJSON('/api/entries/?challengeId=' + challengeId + "&user=" + user.id, function(result) {
			for (var i = 0; i < result.length; i++) {
				//console.log("result " + i + " is " + JSON.stringify(result[i]));
				var e = result[i][0];
				var u = result[i][1];
				//console.log("e = " + JSON.stringify(e));
				//console.log("u = " + JSON.stringify(u));
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

				var scrollableElement = createScrollableElement(data);
				tabDiv.append(scrollableElement);
			}
		});
	}
}

function setupEntriesTab() {
	var tabDiv = appendNewTab("mainTabGroup", "entries", "Entries");
	createAndAppendContentContainer(tabDiv, "entries", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=date" + (user? "&excludeUser=" + user.id : "")}, {type: "popularity", url: "/api/entries/?challengeId=" + challengeId + "&sortBy=popularity" + (user? "&excludeUser=" + user.id : "")}]);

	/*
	var tabDiv = appendNewTab("mainTabGroup", "entries", "Entries");
	var h3 = $("<h3>").text("Entries");
	tabDiv.append(h3);

	$.getJSON('/api/entries/?challengeId=' + challengeId + (user? "&excludeUser=" + user.id : ""), function(result) {

		for (var i = 0; i < result.length; i++) {
			//console.log("result " + i + " is " + JSON.stringify(result[i]));
			var e = result[i][0];
			var u = result[i][1];
			//console.log("e = " + JSON.stringify(e));
			//console.log("u = " + JSON.stringify(u));
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

			var scrollableElement = createScrollableElement(data);
			tabDiv.append(scrollableElement);
		}
	});

	*/
}

function setupCommentsTab() {

}

function parseUser(users) {
	
}

function postEntry() {
	
}

function extractEntries(entries) {
	
}