$(document).ready(function(){
  	createLoginHeader();

  	setupMainItem();

  	setupTabs();
});

function setupMainItem() {
	$.getJSON('/api/entries/' + entryId, function(result) {
		console.log("entry result is " + JSON.stringify(result));
		if (result.length > 0) {
			var e = result[0];
			var u = result[1];

			console.log("e is " + JSON.stringify(e));
			console.log("u is " + JSON.stringify(u));

			var data = {};
			data.image = e.image;
			data.postedDate = new Date(parseInt(e.created));
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

			$("#mainTitle").text(e.caption);
		}
	});
}

function setupTabs() {
	var tabGroup = createNewTabGroup("mainTabGroup");
	$("body").append(tabGroup);

	setupChallengeTab();

	setupCommentsTab();
}

function setupChallengeTab() {
	var tabDiv = appendNewTab("mainTabGroup", "challenge", "Challenge");
	var h3 = $("<h3>").text("Challenge");
	tabDiv.append(h3);

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

			data.link = "/challenge/" + challengeId;

			var scrollableElement = createScrollableElement(data);
			tabDiv.append(scrollableElement);
		}
	});
}

function setupCommentsTab() {

}