////**************************** FEED VIEW ********************************

//Create an empty feed list for hosting content
function createFeedList(entityId, contentTag) {
	var container = $("<div>", {id: entityId + contentTag + "FeedList", class: "feedList"});

	return container;
}

/*
	Append newly fetched content to the existing feed list
*/
function appendFeedList(entityId, contentTag, list) {
	var container = $("#" + entityId + contentTag + "FeedList");
	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var feedElement = createFeedElement(data, contentTag);
		container.append(feedElement);
	}
}