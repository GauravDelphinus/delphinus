
/*
	Create a new comments list and container, and fetch new comments using the getURL
	Append the received comments to the container, and also append the new comment element (or Sign in button)
*/
function createAndAppendCommentsContainer(appendTo, entityId, contentTag, getURL) {
	var container = createCommentsList(entityId, contentTag);
	var holder = j.CommentsContainer(entityId, contentTag).create();
	holder.append(container);

	appendTo.append(holder);

	refreshCommentsList(entityId, contentTag);
}

/**
	Show or Hide the Comments List associated with the given Entity.
	parentId - Entity id to which the list is attached (eg. Challenge, Entry, etc.)
**/
function showHideCommentsList(entityId, contentTag, show) {
	//comments list is currently hidden, so fetch comments and show the list
	if (show) {
		//empty out and refresh the comments list
		j.CommentsList(entityId, contentTag).get().empty();
		refreshCommentsList(entityId, contentTag);

		//if we're showing the comments list on a popup, then show the popup
		if (j.CommentsPopup(entityId, contentTag).get().length) {
			j.CommentsPopup(entityId, contentTag).get().show();
		}	

		//make sure the tab is 'active', not just 'shown'
		$('#' + entityId + 'Tabs a[href="#comments"]').tab('show');
	} else {
		if (!j.CommentsList(entityId, contentTag).get().is(":empty")) {
			j.CommentsList(entityId, contentTag).get().empty();

			//if we're showing the comments list on a popup, then hide the popup
			if (j.CommentsPopup(entityId, contentTag).get().length) {
				j.CommentsPopup(entityId, contentTag).get().hide();
			}
		}
	}
}

function createCommentsContainer(entityId, contentTag) {
	var container = createCommentsList(entityId, contentTag);
	var holder = j.CommentsContainer(entityId, contentTag).create();
	holder.append(container);

	return holder;
}

function createCommentsContainerForActivity(entityId, activity, contentTag) {
	var container = createCommentsList(entityId, contentTag);
	var holder = j.CommentsContainer(entityId, contentTag).create();
	holder.append(container);

	if (activity && activity.type == "comment" && activity.commentId) {
		var getURL = "/api/comments/" + activity.commentId;
		$.getJSON(getURL, function(commentInfo) {
			var container = j.CommentsList(entityId, contentTag).get();
			container.empty();

			container.append(createCommentElement(commentInfo, entityId, contentTag, false));

			//Now append either the New Commet Input field (if user is signed in) or the Sign in Button
			if (user) {
				//show new comment box if already logged in
				var newCommentElement = createNewCommentElement(false, entityId, entityId, contentTag);
				appendNewCommentElement(newCommentElement, entityId, contentTag, container, false);
			} else {
				var signInToCommentElement = createSignInToCommentElement();
				container.append(signInToCommentElement);
			}
		});
	}

	return holder;
}

function createCommentElement(data, parentId, contentTag, isReply) {
	var element = j.CommentElement(data.id, contentTag).create().prop("class", "commentElement");
	if (isReply) {
		element.addClass("replyElement");
	}

	var table = $("<table>", {class: "commentsTable"});

	var tr = $("<tr>", {class: "commentsRow"});

	var tdLeft = $("<td>", {class: "commentsLeftColumn"});
	var postedByImage = $("<img>", {id: "postedByImage", class: "user-image-medium"});
	postedByImage.prop("src", data.postedByUser.image);
	tdLeft.append(postedByImage);
	tr.append(tdLeft);

	var tdRight = $("<td>", {class: "commentsRightColumn"});
	var postedByName = $("<span>", {id: "postedByName"});
	postedByName.append($("<a>", {href: "/user/" + data.postedByUser.id, text: data.postedByUser.displayName, class: "posted-by"}));
	tdRight.append(postedByName);

	tdRight.append("  ");

	var commentText = $("<span>", {class: "commentText text-plain-small", text: data.text});
	tdRight.append(commentText);

	tdRight.append("<br>");

	tdRight.append(createSocialStatusSectionForComment(data, parentId, contentTag, isReply));
	refreshSocialInfo(data, contentTag);

	tr.append(tdRight);

	table.append(tr);
	element.append(table);

	return element;
}

/*
	Create a new Comment element (input text area) given the parentId and entityId
	Note that parentId and entityId will be same for top-level comments
*/
function createNewCommentElement(isReply, parentId, entityId, contentTag) {
	var element = j.NewCommentElement(parentId, contentTag).create().prop("class", "commentElement");
	if (isReply) {
		element.addClass("replyElement");
	}

	var table = $("<table>", {class: "commentsTable"});

	var tr = $("<tr>", {class: "commentsRow"});

	var tdLeft = $("<td>", {class: "commentsLeftColumn"});
	var postedByImage = $("<img>", {id: "postedByImage", class: "user-image-medium"});
	postedByImage.prop("src", user.image);
	tdLeft.append(postedByImage);
	tr.append(tdLeft);

	var tdRight = $("<td>", {class: "commentsRightColumn"});

	var input = j.NewCommentText(parentId, contentTag).create().prop("class", "form-control").prop("placeholder", "Add your comment here");

	tdRight.append(input);

	//post the comment to the server when the user hits ENTER key
	input.on('keyup', function (e) {
	    if (e.keyCode == 13) {
	        // Do something
	        var jsonObj = {};
			jsonObj.text = this.value;
			jsonObj.created = (new Date()).getTime();
			jsonObj.entityId = entityId;
			jsonObj.parentId = parentId;

			$.ajax({
				type: "POST",
				url: "/api/comments",
				dataType: "json", // return data type
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify(jsonObj)
			})
			.done(function(data, textStatus, jqXHR) {
		    	var commentData = {
		    		id: data.id,
		    		postedDate: jsonObj.created,
		    		type: "comment",
		    		text: jsonObj.text,
		    		postedByUser: {
		    			id: user.id,
		    			displayName: user.displayName,
		    			image: user.image		    		
		    		}
		    	};

		    	//comment creation on server was successful, so append the new comment element to the list
		    	var commentElement = createCommentElement(commentData, parentId, contentTag, isReply);
		    	appendCommentElement(commentElement, parentId, contentTag, isReply);

		    	if (isReply) { //remove the input text if we just committed a reply
		    		j.NewCommentElement(parentId, contentTag).get().remove();
		    	} else { //empty out the input text and set it to focus (ready for any new comment)
		    		j.NewCommentText(parentId, contentTag).get().prop("value", "").blur().focus();
		    	}
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				showAlert("There appears to be a problem posting your comment.  Please try again.", 3);
			});
	    }
	});

	tr.append(tdRight);

	table.append(tr);
	element.append(table);

	return element;
}

/*
	Append the new comment element (input text) to the provided container
	In case of replies, the new comment needs to be added to the parent's last child
	while in case of top level comment, it will be added as the last element of the container
*/
function appendNewCommentElement(newCommentElement, parentId, contentTag, container, isReply) {
	if (!isReply) { //new top level comment, append to the end of the list
		//parentElementId should be the container ID
		container.append(newCommentElement);
	} else {
		//adding a new reply
		var parentElement = j.CommentElement(parentId, contentTag).get();
		var current = parentElement;
		var next;
		while (true) {
			next = current.next();
			if (next.length == 0) { //reached the end
				break;
			}
			if (next.hasClass("replyElement")) {
			} else { //reached end of current hierarchy
				break;
			}
			current = next;
		}

		if (next.length == 0) {
			//append at end of list
			parentElement.parent().append(newCommentElement);
		} else {
			//append before the next major element
			next.before(newCommentElement);
		}
	}

	//after successfully appending the new text element, set focus on it
	j.NewCommentText(parentId, contentTag).get().focus();
}

function appendCommentElement(commentElement, parentId, contentTag, isReply) {
	if (!isReply) {
		j.NewCommentElement(parentId, contentTag).get().before(commentElement);
	} else {
		//reply
		var parentElement = j.CommentElement(parentId, contentTag).get();
		var current = parentElement;
		var next;
		while (true) {
			next = current.next();
			if (next.length == 0) {
				break;
			}
			if (next.hasClass("replyElement")) {
			} else {
				break;
			}
			current = next;
		}
		
		if (next.length == 0) {
			//append at end
			parentElement.parent().append(commentElement);
		} else {
			next.before(commentElement);
		}
	}	
}

function createCommentsList(id, contentTag) { //id is the entity id
	var container = j.CommentsList(id, contentTag).create().prop("class", "commentsList").prop("data-id", id);
	
	return container;
}

function appendCommentsList(container, entityId, contentTag, list) { //id is the entity id
	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var commentElement = createCommentElement(data, entityId, contentTag, false);
		container.append(commentElement);

		//passing the right array element to the callback by using the technique desribed at https://stackoverflow.com/questions/27364891/passing-additional-arguments-into-a-callback-function
		(function(id) {
			$.getJSON("/api/comments/?entityId=" + id, function(replyList) {
				if (replyList.length > 0) {
					for (var j = 0; j < replyList.length; j++) {
						var replyData = replyList[j];

						var replyElement = createCommentElement(replyData, id, contentTag, true);
						appendCommentElement(replyElement, id, contentTag, true);
					}
				}
			})
			.fail(function() {
				//eat this
			});
		})(data.id);
	}

	return container;
}


function updateComments(contentTag, entityId, numComments) {
	$("#" + contentTag + entityId + "NumComments").text(numComments);

	if (numComments == 0) {
		$("#" + contentTag + entityId + "CommentsButton").hide();
	} else {
		$("#" + contentTag + entityId + "CommentsButton").show();
	}
}

function createSignInToCommentElement() {
	var signInToCommentElement = $("<div>", {class: "full-width-center-content"});
	var newCommentLink = $("<a>", {href: "/auth/", class: "btn btn-link", text: "Sign in to add a new comment"});
	signInToCommentElement.append(newCommentLink);
	return signInToCommentElement;
}

/**
        Refresh the comments list attached to the given entity (parentId)
        This assumes that the comments list is already showing to the user
**/
function refreshCommentsList(entityId, contentTag) {
	var getURL = "/api/comments?entityId=" + entityId;
	$.getJSON(getURL, function(list) {
		var container = j.CommentsList(entityId, contentTag).get();
		container.empty();

		appendCommentsList(container, entityId, contentTag, list);

		//Now append either the New Commet Input field (if user is signed in) or the Sign in Button
		if (user) {
			//show new comment box if already logged in
			var newCommentElement = createNewCommentElement(false, entityId, entityId, contentTag);
			appendNewCommentElement(newCommentElement, entityId, contentTag, container, false);
		} else {
			var signInToCommentElement = createSignInToCommentElement();
			container.append(signInToCommentElement);
		}
	});
}

//jQuery helper functions to get and create elements
var j = {
	createHelperObject: function(entityId, contentTag, type, name) {
		var id = contentTag + entityId + name;
		return {
			get: function() {
				return $("#" + id);
			},
			create: function() {
				return $(type, {id: id});
			}
		}
	},
	CommentsList: function(entityId, contentTag) {
		return this.createHelperObject(entityId, contentTag, "<div>", "CommentsList");
	},
	CommentsContainer: function(entityId, contentTag) {
		return this.createHelperObject(entityId, contentTag, "<div>", "CommentsContainer");
	},
	NewCommentElement: function(entityId, contentTag) {
		return this.createHelperObject(entityId, contentTag, "<div>", "NewCommentElement");
	},
	CommentElement: function(entityId, contentTag) {
		return this.createHelperObject(entityId, contentTag, "<div>", "CommentElement");
	},
	CommentsPopup: function(entityId, contentTag) {
		return this.createHelperObject(entityId, contentTag, "<div>", "CommentsPopup");
	},
	NewCommentText: function(entityId, contentTag) {
		return this.createHelperObject(entityId, contentTag, "<input>", "NewCommentText");
	}
};