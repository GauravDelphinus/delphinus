
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
	}
**/
function createAndAppendContentContainer(appendTo, entityId, contentTag, viewOptions, getURL) {
	/** 
		both viewOptions and sortOptions must contain at least one item each.
	**/
	//console.log("createAndAppendContentContainer, entityId: " + entityId + ", contentTag = " + contentTag + ", viewOptions = " + JSON.stringify(viewOptions));
	if (!viewOptions || viewOptions.length == 0) {
		return;
	}

	//create the overall, high-level container
	var container = $("<div>", {id: entityId + contentTag + "Container"});
	appendTo.append(container);


	//Add View Option buttons (Toolbar) - create a container header
	var containerHeader = $("<div>");

	if (viewOptions && viewOptions.length > 1) {
		var viewGroup = $("<div>", {id: entityId + contentTag + "ViewGroup", class: "btn-group", "data-toggle": "buttons"});
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
		containerHeader.append(viewGroup);
		containerHeader.append($("<div>", {class: "clear-floats small-vertical-gap"}));
		container.append(containerHeader);
	}

	var contentHolder = $("<div>");
	container.append(contentHolder);

	initializeContainerAndStartFetchingContent(contentHolder, entityId, contentTag, viewOptions, viewOptions[0].type, getURL);

	$("#" + entityId + contentTag + "ViewGroup button").click(function() {
		if (this.id == "thumbnailViewButton") {
			viewType = "thumbnail";
		} else if (this.id == "scrollableViewButton") {
			viewType = "filmstrip";
		} else if (this.id == "commentsViewButton") {
			viewType = "comments";
		}
		
		//toggle state, and reset all other buttons to not active
		$(this).toggleClass('active')
			.siblings().not(this).removeClass('active');

		initializeContainerAndStartFetchingContent(contentHolder, entityId, contentTag, viewOptions, viewType, getURL);
	});
}

/*
	Reset/initialize the container for the given view type
*/
function initializeContainerAndStartFetchingContent(container, entityId, contentTag, viewOptions, viewType, getURL) {
	//console.log("initializeContainerAndStartFetchingContent, viewType: " + viewType + ", getURL: " + getURL);
	container.empty();

	if (viewType == "thumbnail") {
		container.append(createGrid(entityId, contentTag, 3, false, false, null, null));
	} else if (viewType == "filmstrip") {
		container.append(createScrollableList(entityId, contentTag));
	} else if (viewType == "comments") {
		var commentsList = createCommentsList(entityId, contentTag);
		var commentsContainer = $("<div>", {id: entityId + contentTag + "CommentsContainer"});
		commentsContainer.append(commentsList);
		container.append(commentsContainer);
	} else if (viewType == "feed") {
		container.append(createFeedList(entityId, contentTag));
	}

	//now start infinite scroll!  Pass the combination of contentTag + entityId as the sessionKey
	startFetchOnScroll(getURL, function(list) {
		//process data
		appendContent(list, entityId, contentTag, viewType);
	}, function(err) {
		//done processing all data
		//err means we ended a session mid-way
	}, contentTag + entityId);
}

function appendContent(list, entityId, contentTag, defaultViewType) {

	//console.log("appendContent: entityId: " + entityId + ", contentTag: " + contentTag + ", defaultViewType: " + defaultViewType);
	//If one of the View Options is ON, use that to decide which view to append to
	if ($("#" + entityId + contentTag + "ViewGroup button.active").length) {
		var viewOptionsButtonID = $("#" + entityId + contentTag + "ViewGroup button.active").attr("id");
		if (viewOptionsButtonID == "thumbnailViewButton") {
			appendGrid(entityId, contentTag, list);
		} else if (viewOptionsButtonID == "scrollableViewButton") {
			appendScrollableList(entityId, contentTag, list);
		}
	} else { //View options not showing, so append to the default view option type list
		if (defaultViewType == "thumbnail") {
			appendGrid(entityId, contentTag, list);
		} else if (defaultViewType == "filmstrip") {
			appendScrollableList(entityId, contentTag, list);
		} else if (defaultViewType == "comments") {
			appendCommentsList(entityId, contentTag, list);
		} else if (defaultViewType == "feed") {
			appendFeedList(entityId, contentTag, list);
		}
	}
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



