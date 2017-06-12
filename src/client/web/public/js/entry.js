$(document).ready(function(){
  	createLoginHeader();

  	setupMainItem();

  	setupTabs();
});

function setupMainItem() {
	$.getJSON('/api/entries/' + entryId, function(data) {
		var mainElement = createMainElement(data, true);
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
	var tabDiv = appendNewTab("mainTabGroup", "comments", "Comments");
	createAndAppendContentContainer(tabDiv, "comments", [{type: "comments"}], [{type: "date", url: "/api/comments/?entityId=" + entryId + "&sortBy=reverseDate"}]);
}

/*
function setupTimelapseView() {

	var timelapseButton = $("<button>", {type: "button", id: "timelapseButton", class: "btn btn-primary", value: "Timelapse View"});
	$("#main").append(timelapseButton);

	$("#timelapseButton").click(function() {
		var jsonObj = {};
	
		jsonObj.entryId = entryId;

		$.getJSON('/api/filters/timelapse/' + entryId, function(data) {
			startTimelapse(data.timelapseData);
		});
	});
}
*/

/*
var timelapseIndex = 0;
var timelapseTimer;

function startTimelapse(data) {
	timelapseTimer = window.setInterval(function() {nextTimelapse(data);}, 2000);
}

function nextTimelapse(data) {
	console.log("nextTimelapse, index = " + timelapseIndex);
	if (data[timelapseIndex].imageType == "url") {
		$("#mainImage").attr("src", data[timelapseIndex].imageData);
	} else {
		$("#mainImage").attr("src", "data:image/jpeg;base64," + data[timelapseIndex].imageData);
	}
	
	timelapseIndex++;

	if (timelapseIndex == data.length) {
		stopTimelapse();
	}
}

function stopTimelapse() {
	console.log("stopTimelapse");
	window.clearInterval(timelapseTimer);
}
*/