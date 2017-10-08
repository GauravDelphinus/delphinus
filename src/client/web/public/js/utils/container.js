function createGrid(contentTag, list, numCols, allowHover, allowSelection, defaultSelectedID, selectionCallback) {
	var table = $("<table>", {id: contentTag + "GridTable"});

	var tdWidth = 100 / numCols;
	if (numCols < 2) {
		numCols = 2;
	}

	var i = 0;
	var numRows = (list.length / numCols) + (((list.length % numCols) > 0) ? 1 : 0);
	for (var row = 0; row < numRows; row ++) {
		var tr = $("<tr>");
		for (var col = 0; col < numCols; col ++) {
			var td = $("<td>", {class: "gridCell", width: tdWidth + "%"});
			if (i < list.length) {
				var data = list[i++];
				var element = createThumbnailElement(data, contentTag, !allowSelection);

				if (allowHover) {
					element.addClass("elementHover");
				}

				if (allowSelection) {
					element.click({id: data.id, element: element}, function(e) {
						$("#" + contentTag + " .thumbnailElement").removeClass("active"); //unselect all first
						e.data.element.addClass("active"); //now make the selection
						selectionCallback(e.data.id);
					});
				}

				//if there's a default selection, make the selection
				if (defaultSelectedID != null && defaultSelectedID != undefined && defaultSelectedID == data.id) {
					element.addClass("active");
				}

				td.append(element);
			}
			tr.append(td);
		}
		table.append(tr);
	}

	return table;
}

function createScrollableList(contentTag, list, compressed = false) {
	var container = $("<div>", {id: contentTag + "ScrollableList", class: "scrollabeList"});

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var scrollableElement = createScrollableElement(data, contentTag, compressed);
		container.append(scrollableElement);
	}

	return container;
}

function createFeedList(contentTag, list) {
	var container = $("<div>", {id: contentTag + "FeedList", class: "feedList"});

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var feedElement = createFeedElement(data, contentTag);
		container.append(feedElement);
	}

	return container;
}

/**
	Create and append a content container with the content.
	appendTo: parent element to which to append this container.  The reason we pass this is so we can append
	the content in the parent early and allow for jquery lookups for child elements (such as buttons when setting up click event handlers)
	entityId: Entity ID
	contentTag: a page-unique string identifier to identify this particular content.  This is prepended to relevant id names
	viewData: the data that is used to determine the viewing order, and the defaults
	{
		defaultViewingMode: "thumbnail" | "filmstrip"
		showThumbnailView: true,
		showFilmStripView: true
	},
	sortData: the data that is used to determine the sorting order and the urls to be used, as well as the default sort order
	{
		defaultSortOrder: "date" | 'popularity'
		getURLDateSort: "get url for sorting by date",
		getURLPopularitySort: "get url for sorting by popularity"
	}
**/
function createAndAppendContentContainer(appendTo, entityId, contentTag, viewOptions, sortOptions) {
	/** 
		both viewOptions and sortOptions must contain at least one item each.
	**/
	if (!viewOptions || viewOptions.length == 0 || !sortOptions || sortOptions.length == 0) {
		return;
	}

	var container = $("<div>", {id: contentTag + "Container"});
	appendTo.append(container);

	var hasViewOrSortOptions = false;
	if (viewOptions && viewOptions.length > 1) {
		var viewGroup = $("<div>", {id: contentTag + "ViewGroup", class: "btn-group", "data-toggle": "buttons"});
		for (var i = 0; i < viewOptions.length; i++) {
			var viewOption = viewOptions[i];
			if (viewOption.type == "thumbnail") {
				viewGroup.append($("<button>", {id: "thumbnailViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-th"})).append(" Thumbnails"));
			} else if (viewOption.type == "filmstrip") {
				viewGroup.append($("<button>", {id: "scrollableViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-film"})).append(" Filmstrip"));
			} else if (viewOption.type == "comments") {
				viewGroup.append($("<button>", {id: "commentsViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-film"})).append(" Comments"));
			}
		}
		container.append(viewGroup);
		hasViewOrSortOptions = true;
	}

	if (sortOptions && sortOptions.length > 1) {
		var sortGroup = $("<div>", {id: contentTag + "SortGroup", class: "btn-group pull-right"});
		sortGroup.append($("<a>", {href: "#", role: "button", class: "btn btn-default disabled", "aria-disabled" : "true"}).append("Sort by"));
		for (var i = 0; i < sortOptions.length; i++) {
			var sortOption = sortOptions[i];
			if (sortOption.type == "date") {
				sortGroup.append($("<button>", {id: "postedDateSortButton", type: "button", class: "btn btn-default", "data-getURL": sortOption.url}).append($("<span>", {class: "glyphicon glyphicon glyphicon-time"})).append(" Date"));
			} else if (sortOption.type == "popularity") {
				sortGroup.append($("<button>", {id: "popularitySortButton", type: "button", class: "btn btn-default", "data-getURL": sortOption.url}).append($("<span>", {class: "glyphicon glyphicon glyphicon-thumbs-up"})).append(" Popularity"));
			}
		}
		container.append(sortGroup);
		hasViewOrSortOptions = true;
	}

	if (hasViewOrSortOptions) {
		container.append($("<div>", {class: "clear-floats small-vertical-gap"}));
	}

	var getURL = sortOptions[0].url;

	refreshListAndUpdateContent(getURL, entityId, contentTag, viewOptions[0].type);

	$("#" + contentTag + "ViewGroup button").click(function() {
		$("#" + contentTag + "ScrollableList").remove();
		$("#" + contentTag + "GridTable").remove();

		var buttonID = this.id;

		var list = jQuery.data(document.body, contentTag + "List");
		
		if (buttonID == "thumbnailViewButton") {
			var grid = createGrid(contentTag, list, 3, false, false, null, null);
			container.append(grid);
		} else if (buttonID == "scrollableViewButton") {
			var scrollableList = createScrollableList(contentTag, list);
			container.append(scrollableList);
		} else if (buttonID == "commentsViewButton") {
			var commentsList = createCommentsList(entityId, contentTag, list);
			var commentsContainer = $("<div>", {id: contentTag + entityId + "CommentsContainer"}).empty();
			commentsContainer.append(commentsList);
			container.append(commentsContainer);
		}

		//toggle state, and reset all other buttons to not active
		$(this).toggleClass('active')
			.siblings().not(this).removeClass('active');
	});

	$("#" + contentTag + "SortGroup button").click(function() {
		var buttonID = this.id;
		var getURL;
		for (var i = 0; i < sortOptions.length; i++) {
			if (sortOptions[i].type == "date" && buttonID == "postedDateSortButton") {
				getURL = sortOptions[i].url;
			} else if (sortOptions[i].type == "popularity" && buttonID == "popularitySortButton") {
				getURL = sortOptions[i].url;
			}
		}

		refreshListAndUpdateContent(getURL, entityId, contentTag, viewOptions[0].type);
	});
}

function refreshListAndUpdateContent(getURL, entityId, contentTag, defaultViewType) {
	$.getJSON(getURL, function(list) {

		jQuery.data(document.body, contentTag + "List", list);

		$("#" + contentTag + "ScrollableList").remove();
		$("#" + contentTag + "GridTable").remove();

		if ($("#" + contentTag + "ViewGroup button.active").length) {
			var viewOptionsButtonID = $("#" + contentTag + "ViewGroup button.active").attr("id");
			if (viewOptionsButtonID == "thumbnailViewButton") {
				var grid = createGrid(contentTag, list, 3, false, false, null, null);
				$("#" + contentTag + "Container").append(grid);
			} else if (viewOptionsButtonID == "scrollableViewButton") {
				var scrollableList = createScrollableList(contentTag, list);
				$("#" + contentTag + "Container").append(scrollableList);
			}
		} else {
			if (defaultViewType == "thumbnail") {
				var grid = createGrid(contentTag, list, 3, false, false, null, null);
				$("#" + contentTag + "Container").append(grid);
			} else if (defaultViewType == "filmstrip") {
				var scrollableList = createScrollableList(contentTag, list);
				$("#" + contentTag + "Container").append(scrollableList);
			} else if (defaultViewType == "comments") {
				var commentsList = createCommentsList(entityId, contentTag, list);
				var commentsContainer = $("<div>", {id: contentTag + entityId + "CommentsContainer"}).empty();
				commentsContainer.append(commentsList);
				$("#" + contentTag + "Container").append(commentsContainer);
			} else if (defaultViewType == "feed") {
				var feedList = createFeedList(contentTag, list);
				$("#" + contentTag + "Container").append(feedList);
			}
		}
	}).fail(function() {
		window.location.replace("/error");
	});
}

function createNewTabGroup(id) {
	var tabGroup = $("<div>", {id: id});
	tabGroup.append($("<ul>", {class: "nav nav-tabs", id: id + "Tabs"}));
	tabGroup.append($("<div>", {class: "tab-content"}));

	return tabGroup;
}

function appendNewTab(tabGroupId, id, title) {
	var active = false;
	if ($("#" + tabGroupId + " ul li").length == 0) {
		active = true;
	}

	var li = $("<li>", {class: active ? "active" : ""}).append($("<a>", {"data-toggle" : "tab", href: "#" + id}).text(title));
	$("#" + tabGroupId + " ul").append(li);

	var div = $("<div>", {id: id, class: "tab-pane fade" + (active ? " in active" : "")});
	$("#" + tabGroupId + " .tab-content").append(div);

	return div;
}

/*
	Refresh the container view after an element with id is deleted
	contentTag is the tag identifying the container
	The actual view inside the container coudl be thumbnail or filmstrip view
*/
function refreshContainerViewAfterDelete(id, contentTag) {
	var list = jQuery.data(document.body, contentTag + "List");

	//now remove the deleted item from the list and update it
	var index = list.findIndex(alreadyExists, id);
	if (index != -1) {
		list.splice(index, 1);
	}
	jQuery.data(document.body, contentTag + "List", list);

	//check if we're in thumbnail (grid) view or filmstrip (scrollable) view
	if ($("#" + id + "ThumbnailElement").length) {
		//we're in grid view
		refreshThumbnailView(contentTag);
	} else if ($("#" + id + "ScrollableElement").length) {
		//we're in scrolalble/filmstrip view
		//simply remove the element from the list :)
		$("#" + id + "ScrollableElement").remove();
	} else {
		location.reload();
	}
}

function refreshThumbnailView(contentTag) {
	$("#" + contentTag + "GridTable").remove();

	var list = jQuery.data(document.body, contentTag + "List");

	var grid = createGrid(contentTag, list, 3, false, false, null, null);
	$("#" + contentTag + "Container").append(grid);
}

function refreshFilmstripView(contentTag) {
	$("#" + contentTag + "ScrollableList").remove();

	var list = jQuery.data(document.body, contentTag + "List");

	var scrollableList = createScrollableList(contentTag, list);
	$("#" + contentTag + "Container").append(scrollableList);
}

