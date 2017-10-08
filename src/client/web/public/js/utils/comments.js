
function createCommentsSectionTrimmed(data, contentTag) {
	var socialStatusSection = $("<div>", {class: "commentsSectionTrimmed"});
	var likeButton = $("<button>", {id: contentTag + data.id + "LikeButton", type: "button", class: "buttonSimple"}).append("Like");
	var replyButton = $("<button>", {id: contentTag + data.id + "ReplyButton", type: "button", class: "buttonSimple"}).append("Reply");
	var likeIcon = $("<span>", {id: contentTag + data.id + "LikeIcon", class: "glyphicon glyphicon-thumbs-up"});
	var numLikes = $("<span>", {id: contentTag + data.id + "NumLikes"}).append(" " + data.socialStatus.numLikes);

	var postedDate = $("<span>", {class: "commentPostedDate", text: "" + formatDate(data.postedDate)});

	socialStatusSection.append(likeButton);
	socialStatusSection.append(replyButton);
	socialStatusSection.append(likeIcon);
	socialStatusSection.append(numLikes);
	socialStatusSection.append("     ");
	socialStatusSection.append(postedDate);

	var restURL = "/api/comments/" + data.id + "/like";
	if (user) {
		$.getJSON(restURL, function(result) {
			if (result.likeStatus == "on") {
				//show button as depressed
				$("#" + contentTag + data.id + "LikeButton").addClass("active");
			}
		})
		.fail(function() {
			//eat this
		});
	}

	likeButton.click(function(e) {
		if (user) {
			sendLikeAction(restURL, !$("#" + this.id).hasClass("active"), function(err, likeStatus) {
				if (err) {
					// eat this
				} else {
					var numLikes = parseInt($("#" + contentTag + data.id + "NumLikes").text());
					if (likeStatus) {
						$("#" + contentTag + data.id + "LikeButton").addClass("active");
						$("#" + contentTag + data.id + "NumLikes").text(" " + (numLikes + 1));
					} else {
						$("#" + contentTag + data.id + "LikeButton").removeClass("active");
						$("#" + contentTag + data.id + "NumLikes").text(" " + (numLikes - 1));
					}
				}
			});
		} else {
			window.open("/auth", "_self");
		}
	
	});

	replyButton.click(function(e) {
		var newCommentElement = createNewCommentElement(true, data.id, contentTag);
		//$("#" + data.id + "CommentElement").after(newCommentElement);
		appendNewCommentElement(newCommentElement, data.id, contentTag, null, true);
	});

	return socialStatusSection;
}

/**
	Show or Hide the Comments List associated with the given Entity.
	parentId - Entity id to which the list is attached (eg. Challenge, Entry, etc.)
**/
function showHideCommentsList(parentId, contentTag, show) {
	//comments list is currently hidden, so fetch comments and show the list
	if (show) {
		if ($("#" + contentTag + parentId + "CommentsContainer").is(":empty")) { 
			$.getJSON("/api/comments/?entityId=" + parentId + "&sortBy=reverseDate", function(list) {
				var commentsList = createCommentsList(parentId, contentTag, list);
				$("#" + contentTag + parentId + "CommentsContainer").empty().append(commentsList);
				$("#" + contentTag + parentId + "NewCommentText").focus(); // set focus in the input field
			})
			.fail(function() {
				//eat this
			});

			//if we're showing the comments list on a popup, then show the popup
			if ($("#" + contentTag + parentId + "CommentsPopup").length) {
				$("#" + contentTag + parentId + "CommentsPopup").show();
			}
		}

		//make sure the tab is 'active', not just 'shown'
		$('#' + parentId + 'Tabs a[href="#comments"]').tab('show');
	} else {
		if (!$("#" + contentTag + parentId + "CommentsContainer").is(":empty")) {
			$("#" + contentTag + parentId + "CommentsContainer").empty();

			//if we're showing the comments list on a popup, then hide the popup
			if ($("#" + contentTag + parentId + "CommentsPopup").length) {
				$("#" + contentTag + parentId + "CommentsPopup").hide();
			}
		}
	}
}

function createCommentsContainer(data, contentTag) {
	var container = $("<div>", {id: contentTag + data.id + "CommentsContainer"}).empty();

	if (data.activity && data.activity.comment) {
		container.append(createCommentElement(data.activity.comment, data.id, contentTag, false));
	}

	return container;
}

function createCommentElement(data, parentId, contentTag, isReply) {
	var element = $("<div>", {id: contentTag + data.id + "CommentElement", class: "commentElement"});
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

	tdRight.append(createSocialStatusSectionComment(data, parentId, contentTag, isReply));

	tr.append(tdRight);

	table.append(tr);
	element.append(table);

	return element;
}

function createNewCommentElement(isReply, parentId, contentTag) {
	var element = $("<div>", {id: contentTag + parentId + "NewCommentElement", class: "commentElement"});
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

	var input = $("<input>", {type: "text", id: contentTag + parentId + "NewCommentText", class:"form-control", placeholder: "Add your comment here"});

	tdRight.append(input);

	//set up submit logic
	input.on('keyup', function (e) {
	    if (e.keyCode == 13) {
	        // Do something
	        var jsonObj = {};
			jsonObj.text = this.value;
			jsonObj.created = (new Date()).getTime();
			jsonObj.entityId = parentId;

			$.ajax({
				type: "POST",
				url: "/api/comments",
				dataType: "json", // return data type
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify(jsonObj)
			})
			.done(function(data, textStatus, jqXHR) {
		    	//appendCommentElement("comments", data);
		    	var commentElement = createCommentElement(data, parentId, contentTag, isReply);
		    	var atEnd = (!isReply);
		    	appendCommentElement(commentElement, parentId, contentTag, isReply);
		    	if (isReply) {
		    		$("#" + contentTag + parentId + "NewCommentElement").remove();
		    	} else {
		    		$("#" + contentTag + parentId + "NewCommentText").prop("value", "").blur().focus();
		    		
		    		//update the numComments in the Social Status section
		    		var numComments = parseInt($("#" + contentTag + parentId + "NumComments").text());
		    		numComments++;
		    		$("#" + contentTag + parentId + "NumComments").text(numComments);
		    		$("#" + contentTag + parentId + "CommentsButton").show();
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

function appendNewCommentElement(newCommentElement, parentId, contentTag, container, isReply) {
	//var newCommentElement = createNewCommentElement(false, entityId);
	//$("#" + parentId).append(newCommentElement);
	if (!isReply) { //new top level comment, append to the end of the list
		//parentElementId should be the container ID
		container.append(newCommentElement);
	} else {
		//adding a new reply
		var parentElement = $("#" + contentTag + parentId + "CommentElement");
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
		//var nextSibling = parentElement.next(":not(.replyElement)");
		if (next.length == 0) {
			//append at end
			parentElement.parent().append(newCommentElement);
		} else {
			next.before(newCommentElement);
		}
	}

	$("#" + parentId + "NewCommentText").focus(); // set focus in the input field
}

function appendCommentElement(commentElement, parentId, contentTag, isReply) {
	//var commentElement = createCommentElement(data);
	if (!isReply) {
		$("#" + contentTag + parentId + "NewCommentElement").before(commentElement);
		//$("#" + parentId + "CommentsList").append(commentElement);
	} else {
		//reply
		var parentElement = $("#" + contentTag + parentId + "CommentElement");
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

function createCommentsList(id, contentTag, list) { //id is the entity id
	var container = $("<div>", {id: contentTag + id + "CommentsList", class: "commentsList", "data-id" : id});

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var commentElement = createCommentElement(data, id, contentTag, false);
		container.append(commentElement);

		//passing the right array element to the callback by using the technique desribed at https://stackoverflow.com/questions/27364891/passing-additional-arguments-into-a-callback-function
		(function(id) {
			$.getJSON("/api/comments/?entityId=" + id + "&sortBy=reverseDate", function(replyList) {
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

	if (user) {
		//show new comment box if already logged in
		var newCommentElement = createNewCommentElement(false, id, contentTag);
		appendNewCommentElement(newCommentElement, id, contentTag, container, false);
	} else {
		var signInToCommentElement = createSignInToCommentElement();
		container.append(signInToCommentElement);
	}
	

	return container;
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
function refreshCommentsList(parentId, contentTag) {
	console.log("refreshCommentsList, parentId = " + parentId + ", contentTag = " + contentTag);
        $.getJSON("/api/comments/?entityId=" + parentId + "&sortBy=reverseDate", function(list) {
                var commentsList = createCommentsList(parentId, contentTag, list);
                $("#" + contentTag + parentId + "CommentsContainer").empty().append(commentsList);
                $("#" + contentTag + parentId + "NewCommentText").focus(); // set focus in the input field

                //also, update the counter
                $("#" + contentTag + parentId + "NumComments").text(list.length);
        });
}