
/*
	Delete the item from the server permanently.
	Also, refresh client as required.
*/
function deleteItem(data, contentTag) {
	var deleteURL;
	if (data.type == "challenge") {
		deleteURL = "/api/challenges/" + data.id;
	} else if (data.type == "entry") {
		deleteURL = "/api/entries/" + data.id;
	} else if (data.type == "comment") {
		deleteURL = "/api/comments/" + data.id;
	} else {
		// not supported
		return;
	}

	var jsonObj = {};

	$.ajax({
		type: "DELETE",
		url: deleteURL,
		dataType: "json", // return data type
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj)
	})
	.done(function(retdata, textStatus, jqXHR) {
		refreshAfterDelete(data.id, contentTag, data.type);
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		showAlert("There appears to be a problem deleting that item.  Please try again.", 3);
	});
}

function alreadyExists(element) {
	return (element.id == this);
}

/**
	Refresh the client after the specific item has been deleted from the server.
	Figure out the best way to refresh. 
**/
function refreshAfterDelete(id, contentTag, type) {
	//figure out which page we're on
	if (type == "comment") {
		// Find the parent Id, and then refresh the list in place - Tested!
		var parentId = $("#" + contentTag + id + "CommentElement").closest(".commentsList").data("id");
		refreshCommentsList(parentId, contentTag);
		return;
	}

	var currentPath = window.location.pathname;
	
	if (currentPath == "/") {
		// Home page feed view
		//find the parent feed element and delete, if found
		var feedElement = $("#" + id + "FeedElement");
		if (feedElement.length) {
			feedElement.remove();
		} else {
			//last resort - reload page
			location.reload();
		}
	} else if (currentPath == "/entries") {
		// Entries page
		refreshContainerViewAfterDelete(id, "entries");
	} else if (currentPath == "/challenges") {
		// Challenges page
		refreshContainerViewAfterDelete(id, "challenges");
	} else if (currentPath == "/users") {
		// Users page
		location.reload();
	} else if (currentPath.startsWith("/challenge/")) {
		// Specific Challenge Page
		if (currentPath.startsWith("/challenge/" + id)) {
			// Trying to delete the current challenge itself, so redirect to the challenges page
			window.open("/challenges", "_self");
		} else if (type == "entry") {
			// Trying to delete an entry within a challenge
			refreshContainerViewAfterDelete(id, "entries");
		} else {
			location.reload();
		}
	} else if (currentPath.startsWith("/entry/")) {
		// Specific Entry Page
		if (currentPath.startsWith("/entry/" + id)) {
			// Trying to delete the current entry itself, so redirect to the entries page
			window.open("/entries", "_self");
		} else {
			location.reload();
		}
	} else if (currentPath.startsWith("/user/")) {
		// Specific User Page
		location.reload();
	} else {
		// Default to home page
		window.open("/", "_self");
	}
}