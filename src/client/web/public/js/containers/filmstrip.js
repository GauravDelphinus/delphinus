////**************************** SCROLLABLE / FILMSTRIP VIEW ********************************

//Create an empty scrollable list for hosting content
function createScrollableList(entityId, contentTag) {
	var container = $("<div>", {id: entityId + contentTag + "ScrollableList", class: "scrollabeList"});

	return container;
}

//Append content to an existing scrollable list
function appendScrollableList(entityId, contentTag, list) {
	var container = $("#" + entityId + contentTag + "ScrollableList");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var scrollableElement = createScrollableElement(data, contentTag);
		container.append(scrollableElement);
	}
}


function refreshFilmstripView(contentTag) {
	$("#" + contentTag + "ScrollableList").remove();

	var list = jQuery.data(document.body, contentTag + "List");

	var scrollableList = createScrollableList(contentTag, list);
	$("#" + contentTag + "Container").append(scrollableList);
}