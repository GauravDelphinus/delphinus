
function createSocialStatusSectionForComment(data, parentId, contentTag, isReply) {
	var socialStatusSection = $("<div>", {class: "socialStatusSectionSimple"});
	var likeButton = $("<button>", {id: contentTag + data.id + "LikeButton", type: "button", class: "button-link separator"}).append("Like");
	socialStatusSection.append(likeButton);

	
	socialStatusSection.append(createSeparatorElement("dot", "separator-small"));
	
	var restURL = "/api/comments/" + data.id + "/like";

	likeButton.click(function(e) {
		if (user) {
			sendLikeAction(restURL, !$("#" + this.id).hasClass("active"), function(err, likeStatus) {
				if (err) {
					// eat this
				} else {
					var numLikes = parseInt($("#" + contentTag + data.id + "NumLikes").text());
					if (likeStatus) {
						numLikes ++;
					} else {
						numLikes --;
					}
					updateLikes(contentTag, data.id, numLikes);
					updateAmLiking(contentTag, data.id, likeStatus);
				}
			});
		} else {
			window.open("/auth", "_self");
		}
	
	});

	var replyButton = $("<button>", {id: contentTag + data.id + "ReplyButton", type: "button", class: "button-link separator-small"}).append("Reply");
	socialStatusSection.append(replyButton);
	replyButton.click(function(e) {
		if (user) {
			//add a new reply input box only if there isn't already one.
			var newReplyParentId = (isReply) ? (parentId) : (data.id);
			if (!$("#" + contentTag + newReplyParentId + "NewCommentText").length) {
				//*** NOTE ***** 
				// Replying to a reply attaches the new reply to the current reply's parent, not to the reply
				// This is to keep nesting to a max 2 levels.
				
				var newCommentElement = createNewCommentElement(true, newReplyParentId, data.id, contentTag);
				appendNewCommentElement(newCommentElement, newReplyParentId, contentTag, null, true);
			}
			$("#" + contentTag + newReplyParentId + "NewCommentText").focus(); // set focus in the input field
		} else {
			window.open("/auth", "_self");
		}
		
	});

	// Allow delete for comments posted by currently logged-in user
	if (user && user.id == data.postedByUser.id) {
		socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

		var deleteButton = $("<button>", {id: contentTag + data.id + "DeleteButton", type: "button", class: "button-link separator-small"}).append("Delete");
		socialStatusSection.append(deleteButton);
		deleteButton.click(function(e) {
			var result = confirm("Are you sure you want to delete this comment permanently?");
			if (result) {
			    deleteItem(data, contentTag);
			}
		});

		
	}

	socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

	var numLikes = $("<span>", {id: contentTag + data.id + "NumLikes", class: "secondary-info separator-small"}).append("0");
	socialStatusSection.append(numLikes);

	socialStatusSection.append($("<span>", {text: " Likes", class: "secondary-info"}));

	socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

	var postedDate = $("<span>", {class: "secondary-info separator-small", text: "" + formatDate(data.postedDate)});
	socialStatusSection.append("     ");
	socialStatusSection.append(postedDate);

	return socialStatusSection;
}



function sendLikeAction(restURL, likeAction, callback) {
	var jsonObj = {};
	if (likeAction) {
		jsonObj.likeAction = "like";
	} else {
		jsonObj.likeAction = "unlike";
	}
	jsonObj.created = (new Date()).getTime();
	
	$.ajax({
		type: "PUT",
		url: restURL,
		dataType: "json",
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj),
		success: function(jsonData) {
			if (jsonData.likeStatus == "on") {
				callback(0, true);
			} else {
				callback(0, false);
			}
		},
		error: function(jsonData) {
			callback(jsonData.error);
		}
	});
}


function refreshSocialInfo(data, contentTag) {
	var getURL;
	if (data.type == "challenge") {
		getURL = "/api/challenges/" + data.id + "/social";
	} else if (data.type == "entry") {
		getURL = "/api/entries/" + data.id + "/social";
	} else if (data.type == "user") {
		getURL = "/api/users/" + data.id + "/social";
	} else if (data.type == "comment") {
		getURL = "/api/comments/" + data.id + "/social";
	}
	$.getJSON(getURL, function(socialInfo) {
		var showSocialStatusSection = false;
		if (socialInfo.likes) {
			if (socialInfo.likes.amLiking) {
				updateAmLiking(contentTag, data.id, socialInfo.likes.amLiking);
			}

			if (socialInfo.likes.numLikes) {
				showSocialStatusSection = true;
				updateLikes(contentTag, data.id, socialInfo.likes.numLikes);
			}
		}

		if (socialInfo.comments) {
			if (socialInfo.comments.numComments) {
				showSocialStatusSection = true;
				updateComments(contentTag, data.id, socialInfo.comments.numComments);
			}
		}

		if (socialInfo.entries) {
			if (socialInfo.entries.numEntries) {
				showSocialStatusSection = true;
				updateEntries(contentTag, data.id, socialInfo.entries.numEntries);
			}
		}

		if (socialInfo.follows) {
			if (socialInfo.follows.numFollowers) {
				showSocialStatusSection = true;
				updateFollowers(contentTag, data.id, socialInfo.follows.numFollowers);
			}

			if (socialInfo.follows.numFollowing) {
				showSocialStatusSection = true;
				updateFollowing(contentTag, data.id, socialInfo.follows.numFollowing);
			}

			if (socialInfo.follows.amFollowing) {
				updateAmFollowing(contentTag, data.id, socialInfo.follows.amFollowing);
			}
		}

		if (socialInfo.posts) {
			if (socialInfo.posts.numPosts) {
				showSocialStatusSection = true;
				updatePosts(contentTag, data.id, socialInfo.posts.numPosts);
			}
		}

		if (socialInfo.facebook) {
			if (socialInfo.facebook.profileLink) {
				updateFacebookLink(contentTag, data.id, socialInfo.facebook.profileLink);
			}
		}

		if (socialInfo.twitter) {
			if (socialInfo.twitter.profileLink) {
				updateTwitterLink(contentTag, data.id, socialInfo.twitter.profileLink);
			}
		}

		if (socialInfo.google) {
			if (socialInfo.google.profileLink) {
				updateGoogleLink(contentTag, data.id, socialInfo.google.profileLink);
			}
		}

		//if there are no visible social-status-buttons then just hide the SocialStatusSection
		if (showSocialStatusSection) {
			$("#" + contentTag + data.id + "SocialStatusSection").show();
		} else {
			$("#" + contentTag + data.id + "SocialStatusSection").hide();
		}

		//update the rounded corners for the social action buttons
		//this is somewhat of hack since this couldn't work via css - see https://stackoverflow.com/questions/5275098/a-css-selector-to-get-last-visible-div
		$("#" + contentTag + data.id + "SocialActionsSection .social-action-button").removeClass("mediumRoundedBottomLeftCorner").removeClass("mediumRoundedBottomRightCorner");
		$("#" + contentTag + data.id + "SocialActionsSection .social-action-button:visible:first-child").addClass("mediumRoundedBottomLeftCorner");
		$("#" + contentTag + data.id + "SocialActionsSection .social-action-button:visible:last").addClass("mediumRoundedBottomRightCorner");
	})
	.fail(function() {
		//eat this
	});
}

function createSocialStatusSectionElement(data, contentTag, showBorder = true) {
	var socialStatus = $("<div>", {class: "socialStatusSection" + (showBorder ? " bottom-border" : ""), id: contentTag + data.id + "SocialStatusSection"});

	// For Challenges and Entries
	if (data.type == "challenge" || data.type == "entry") {
		var likeButton = $("<button>", {id: contentTag + data.id + "LikesButton", type: "button", class: "social-status-button separator-medium"});
		likeButton.append($("<span>", {id: contentTag + data.id + "NumLikes", text: "0"}));
		likeButton.append($("<span>", {text: " Likes"}));
		likeButton.hide();

		socialStatus.append(likeButton);

		likeButton.click(function() {
			showHideLikersList(data.id, contentTag, true);
		});
	}
	
	if (data.type == "challenge" || data.type == "entry") {

		var shareButton = $("<button>", {id: contentTag + data.id + "SharesButton", type: "button", class: "social-status-button separator-medium"});
		shareButton.append($("<span>", {id: contentTag + data.id + "NumShares", text: "0"}));
		shareButton.append($("<span>", {text: " Shares"}));
		shareButton.hide();

		socialStatus.append(shareButton);
	}
	
	if (data.type == "challenge" || data.type == "entry") {

		var commentButton = $("<button>", {id: contentTag + data.id + "CommentsButton", type: "button", class: "social-status-button separator-medium"});
		commentButton.append($("<span>", {id: contentTag + data.id + "NumComments", text: "0"}));
		commentButton.append($("<span>", {text: " Comments"}));
		commentButton.hide();

		socialStatus.append(commentButton);

		commentButton.click(function() {			
			showHideCommentsList(data.id, contentTag, true);
		});
	}
	
	// For challenges only
	if (data.type == "challenge") {

		var entriesButton = $("<button>", {id: contentTag + data.id + "EntriesButton", type: "button", class: "social-status-button separator-medium"});
		entriesButton.append($("<span>", {id: contentTag + data.id + "NumEntries", text: "0"}));
		entriesButton.append($("<span>", {text: " Entries"}));
		entriesButton.hide();

		entriesButton.click(function(e) {
			//if we're already in the challenge page, then just open the entries tab
			if ($('#' + data.id + 'Tabs a[href="#entries"]').length !== 0) {
				$('#' + data.id + 'Tabs a[href="#entries"]').tab('show');
			} else {
				//otherwise, redirect to the challenge page and open the entries tab by default
				window.open("/challenge/" + data.id + "#entries", "_self");
			}
		});

		socialStatus.append(entriesButton);
	}

	// For Users
	if (data.type == "user") {
		var followersButton = $("<button>", {id: contentTag + data.id + "FollowersButton", type: "button", class: "social-status-button separator-medium"});
		followersButton.append($("<span>", {id: contentTag + data.id + "NumFollowers", text: "0"}));
		followersButton.append($("<span>", {text: " Followers"}));
		followersButton.hide();

		followersButton.click(function(e) {
			showHideFollowersList(data.id, contentTag, true);
		});
		socialStatus.append(followersButton);

		var followingButton = $("<button>", {id: data.id + "FollowingButton", type: "button", class: "social-status-button separator-medium"});
		followingButton.append($("<span>", {id: data.id + "NumFollowing", text: "0"}));
		followingButton.append($("<span>", {text: " Following"}));
		followingButton.hide();

		followingButton.click(function(e) {
			$('#' + data.id + 'Tabs a[href="#following"]').tab('show');
		});
		socialStatus.append(followingButton);
	}

	if (data.type == "user") {
		var postsButton = $("<button>", {id: contentTag + data.id + "PostsButton", type: "button", class: "social-status-button separator-medium"});
		postsButton.append($("<span>", {id: contentTag + data.id + "NumPosts", text: "0"}));
		postsButton.append($("<span>", {text: " Posts"}));
		postsButton.hide();

		postsButton.click(function(e) {
			//show the popup, or redirect if the popup doesn't exist
			if ($('#' + data.id + 'Tabs a[href="#posts"]').length !== 0) {
				$('#' + data.id + 'Tabs a[href="#posts"]').tab('show');
			} else {
				window.open("/user/" + data.id + "#posts");
			}
			
		});
		socialStatus.append(postsButton);
	}

	return socialStatus;
}


/**
	Show the list of likes for this parentId, along with names of users and their 'Follow' status
	w.r.t. to currently logged-in user
**/
function showHideLikersList(parentId, contentTag, show) {
	if (show) {
		if ($("#" + contentTag + parentId + "LikersContainer").is(":empty")) {
			var likersList = createLikersList(parentId, contentTag);
			$("#" + contentTag + parentId + "LikersContainer").empty().append(likersList);

			fetchNextBatch("/api/users?likedEntityId=" + parentId, function(list) {
				//processData
				appendLikersList(parentId, contentTag, list);
			}, function (err) {
				if (!err) {
					//done
					if ($("#" + contentTag + parentId + "LikersPopup").length) {
						$("#" + contentTag + parentId + "LikersPopup").show();
					}
				}
			});
		}
	} else {
		if (!$("#" + contentTag + parentId + "LikersContainer").is(":empty")) {
			$("#" + contentTag + parentId + "LikersContainer").empty();

			if ($("#" + contentTag + parentId + "LikersPopup").length) {
				$("#" + contentTag + parentId + "LikersPopup").hide();
			}
		}
	}
}


/**
	Show or Hide the Followers List associated with the given user.
	parentId - User id to which the list is attached
**/
function showHideFollowersList(userId, contentTag, show) {
	//comments list is currently hidden, so fetch comments and show the list
	if (show) {
		if ($("#" + contentTag + userId + "FollowersContainer").is(":empty")) { 
			var followersList = createFollowersList(userId, contentTag);
			$("#" + contentTag + userId + "FollowersContainer").empty().append(followersList);

			fetchNextBatch("/api/users/?followedId=" + userId, function(list) {
				appendFollowersList(userId, contentTag, list);
			}, function (err) {
				if (!err) {
					//done
					if ($("#" + contentTag + userId + "FollowersPopup").length) {
						$("#" + contentTag + userId + "FollowersPopup").show();
					}
				}
			});
		}

		//make sure the tab is 'active', not just 'shown'
		$('#' + userId + 'Tabs a[href="#followers"]').tab('show');
	} else {
		if (!$("#" + contentTag + userId + "FollowersContainer").is(":empty")) {
			$("#" + contentTag + userId + "FollowersContainer").empty();

			//if we're showing the followers list on a popup, then hide the popup
			if ($("#" + contentTag + userId + "FollowersPopup").length) {
				$("#" + contentTag + userId + "FollowersPopup").hide();
			}
		}
	}
}

function updateAmLiking(contentTag, entityId, amLiking) {
	if (amLiking) {
		$("#" + contentTag + entityId + "LikeButton").addClass("active");
	} else {
		$("#" + contentTag + entityId + "LikeButton").removeClass("active");
	}
}

function updateLikes(contentTag, entityId, numLikes) {
	$("#" + contentTag + entityId + "NumLikes").text(numLikes);
	if (numLikes == 0) {
		$("#" + contentTag + entityId + "LikesButton").hide();
	} else {
		$("#" + contentTag + entityId + "LikesButton").show();
	}
}

function updateEntries(contentTag, entityId, numEntries) {
	$("#" + contentTag + entityId + "NumEntries").text(numEntries);
	if (numEntries == 0) {
		$("#" + contentTag + entityId + "EntriesButton").hide();
	} else {
		$("#" + contentTag + entityId + "EntriesButton").show();
	}
}

function updateAmFollowing(contentTag, entityId, amFollowing) {
	if (amFollowing) {
		$("#" + contentTag + entityId + "FollowButton").addClass("active");
		$("#" + contentTag + entityId + "FollowText").empty().append(" Following");
	} else {
		$("#" + contentTag + entityId + "FollowButton").removeClass("active");
		$("#" + contentTag + entityId + "FollowText").empty().append(" Follow");
	}
}

function updateFollowers(contentTag, entityId, numFollowers) {
	$("#" + contentTag + entityId + "NumFollowers").text(numFollowers);
	if (numFollowers == 0) {
		$("#" + contentTag + entityId + "FollowersButton").hide();
	} else {
		$("#" + contentTag + entityId + "FollowersButton").show();
	}
}

function updateFollowing(contentTag, entityId, numFollowing) {
	$("#" + contentTag + entityId + "NumFollowing").text(numFollowing);
	if (numFollowing == 0) {
		$("#" + contentTag + entityId + "FollowingButton").hide();
	} else {
		$("#" + contentTag + entityId + "FollowingButton").show();
	}
}

function updatePosts(contentTag, entityId, numPosts) {
	//followers
	$("#" + contentTag + entityId + "NumPosts").text(numPosts);
	if (numPosts == 0) {
		$("#" + contentTag + entityId + "PostsButton").hide();
	} else {
		$("#" + contentTag + entityId + "PostsButton").show();
	}
}

function updateFacebookLink(contentTag, entityId, facebookLink) {
	$("#" + contentTag + entityId + "FacebookButton").show();
	$("#" + contentTag + entityId + "FacebookButton").data("facebookLink", facebookLink);
}

function updateTwitterLink(contentTag, entityId, twitterLink) {
	$("#" + contentTag + entityId + "TwitterButton").show();
	$("#" + contentTag + entityId + "TwitterButton").data("twitterLink", twitterLink);
}

function updateGoogleLink(contentTag, entityId, googleLink) {
	$("#" + contentTag + entityId + "GoogleButton").show();
	$("#" + contentTag + entityId + "GoogleButton").data("googleLink", googleLink);
}

function createSocialActionsSectionElement(data, contentTag, full /* show full status */) {
	var socialActionsSection = $("<div>", {id: contentTag + data.id + "SocialActionsSection", class: "socialActionsSection"});

	// LIKE BUTTON ---------------------------------
	if (data.type == "challenge" || data.type == "entry") {
		var likeButton = $("<div>", {id: contentTag + data.id + "LikeButton", class: "social-action-button"});
		likeButton.append($("<i>", {class: "far fa-thumbs-up", "aria-hidden" : "true"})).append(" Like");
		socialActionsSection.append(likeButton);

		var restURL;
		if (data.type == "challenge") {
			restURL = "/api/challenges/" + data.id + "/like";
		} else if (data.type == "entry") {
			restURL = "/api/entries/" + data.id + "/like";
		}

		likeButton.click(function(e) {
			if (user) {
				sendLikeAction(restURL, !$("#" + this.id).hasClass("active"), function(err, likeStatus) {
					if (err) {
						// eat this
					} else {
						var numLikes = parseInt($("#" + contentTag + data.id + "NumLikes").text());
						if (likeStatus) {
							numLikes ++;
							
						} else {
							numLikes --;
						}
						updateLikes(contentTag, data.id, numLikes);
						updateAmLiking(contentTag, data.id, likeStatus);
					}
				});
			} else {
				window.open("/auth", "_self");
			}
		
		});
	}

	// COMMENT BUTTON ---------------------------------
	if (data.type == "challenge" || data.type == "entry") {
		var commentButton = $("<div>", {id: contentTag + data.id + "CommentButton", class: "social-action-button"});
		commentButton.append($("<i>", {class: "far fa-comment", "aria-hidden" : "true"})).append(" Comment");
		socialActionsSection.append(commentButton);
		
		commentButton.click(function(e) {
			showHideCommentsList(data.id, contentTag, true);
		});
	}

	// SHARE BUTTON ---------------------------------
	if (data.type == "challenge" || data.type == "entry") {
		var shareButton = $("<div>", {id: contentTag + data.id + "ShareButton"});
		shareButton.append($("<i>", {class: "fas fa-share", "aria-hidden" : "true"})).append(" Share");
		
		var menu = createMenu(shareButton);
		menu.addClass("social-action-button");
		var facebookButton = $("<button>", {class: "button-empty", type: "button"}).append($("<i>", {class: "fab fa-fw fa-facebook-f", "aria-hidden" : "true"})).append(" Share on Facebook");
		appendMenuItemButton(menu, facebookButton);
		facebookButton.click(function() {
			window.location.replace("/share?id=" + data.id + "&type=" + data.type + "&target=facebook" + "&referrer=" + encodeURIComponent(getFullPathForCurrentPage()));
		});

		var twitterButton = $("<button>", {class: "button-empty", type: "button"}).append($("<i>", {class: "fab fa-fw fa-twitter", "aria-hidden" : "true"})).append(" Share on Twitter");
		appendMenuItemButton(menu, twitterButton);
		twitterButton.click(function() {
			window.location.replace("/share?id=" + data.id + "&type=" + data.type + "&target=twitter" + "&referrer=" + encodeURIComponent(getFullPathForCurrentPage()));
		});

		socialActionsSection.append(menu);
	}

	// TIME LAPSE BUTTON
	if (data.type == "entry") {
		var timelapseButton = $("<div>", {id: contentTag + data.id + "TimelapseButton", class: "social-action-button"});
		timelapseButton.append($("<i>", {class: "fas fa-play", "aria-hidden" : "true"})).append(" Timelapse");
		socialActionsSection.append(timelapseButton);

		timelapseButton.click(function(e) {
			$.getJSON('/api/filters/timelapse/' + data.id, function(imageData) {
				startTimelapse(data.id, contentTag, imageData);
			})
			.fail(function() {
				window.location.replace("/error?reload=yes"); //reload the page to see if it works the next time
			});
		});
	}
	
	// ADD ENTRY BUTTON ---------------------------------
	if (data.type == "challenge") {
		var addEntryButton = $("<div>", {id: contentTag + data.id + "AddEntryButton", class: "social-action-button"});
		addEntryButton.append($("<i>", {class: "far fa-edit", "aria-hidden" : "true"})).append(" Captionify");
		socialActionsSection.append(addEntryButton);

		addEntryButton.click(function(e) {
			window.open("/newentry?challengeId=" + data.id, "_self");
		});
	}
	
	// FOLLOW BUTTON ---------------------------------
	if (data.type == "user" && (!user || user.id != data.id)) {
		var followButton = $("<div>", {id: contentTag + data.id + "FollowButton", class: "social-action-button"}).append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append($("<span>", {id: contentTag + data.id + "FollowText"}));
		
		socialActionsSection.append(followButton);

		followButton.children("#" + contentTag + data.id + "FollowText").append(" Follow");

		var dataId = data.id;
		followButton.click(function(e) {
			if (user) {
				var follow = false;
				if (!$(this).hasClass("active")) {
					follow = true;
				}

				sendFollow(dataId, follow, function (err, followResult) {
					if (err) {
						// eat this
					} else {
						var numFollowers = parseInt($("#" + contentTag + dataId + "NumFollowers").text());
						if (followResult) {
							numFollowers ++;
						} else {
							numFollowers --;
						}
						updateFollowers(contentTag, data.id, numFollowers);
						updateAmFollowing(contentTag, data.id, followResult);
					}
				});
			} else {
				window.open("/auth", "_self");
			}
		});
	}

	if (data.type == "user") {
		var facebookButton = $("<div>", {id: contentTag + data.id + "FacebookButton", class: "social-action-button"});
		facebookButton.append($("<i>", {class: "fa fa-facebook"})).append(" Facebook");
		socialActionsSection.append(facebookButton);
		facebookButton.hide();

		facebookButton.click(function() {
			window.open($("#" + contentTag + data.id + "FacebookButton").data("facebookLink"), "_blank");
		});
	}

	if (data.type == "user") {
		var twitterButton = $("<div>", {id: contentTag + data.id + "TwitterButton", class: "social-action-button"});
		twitterButton.append($("<i>", {class: "fa fa-twitter"})).append(" Twitter");
		socialActionsSection.append(twitterButton);
		twitterButton.hide();

		twitterButton.click(function() {
			window.open($("#" + contentTag + data.id + "TwitterButton").data("twitterLink"), "_blank");
		});
	}

	if (data.type == "user") {
		var googleButton = $("<div>", {id: contentTag + data.id + "GoogleButton", class: "social-action-button"});
		googleButton.append($("<i>", {class: "fa fa-google"})).append(" Google");
		socialActionsSection.append(googleButton);
		googleButton.hide();

		googleButton.click(function() {
			window.open($("#" + contentTag + data.id + "GoogleButton").data("googleLink"), "_blank");
		});
	}

	return socialActionsSection;
}

function sendShare(provider, data, done) {
	var jsonObj = {};
	jsonObj.message = data.message;
	jsonObj.link = data.link;

	var postURL = "/api/social";
	if (provider == "facebook") {
		jsonObj.target = "facebook";
	} else if (provider == "twitter") {
		jsonObj.target = "twitter";
	}

	$.ajax({
		type: "POST",
		url: postURL,
      	dataType: "json", // return data type
      	contentType: "application/json; charset=UTF-8",
      	data: JSON.stringify(jsonObj)
  	})
	.done(function(data, textStatus, jqXHR) {
		done(null);
      	
  	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		done(new Error("Error posting"));
		
	});	
}

function sendFollow(userId, follow, callback) {
	var jsonObj = {};
	if (follow) {
		jsonObj.followAction = "follow";
	} else {
		jsonObj.followAction = "unfollow";
	}

	$.ajax({
		type: "PUT",
		url: "/api/users/" + userId + "/follow",
      	dataType: "json", // return data type
      	contentType: "application/json; charset=UTF-8",
      	data: JSON.stringify(jsonObj)
  	})
	.done(function(data, textStatus, jqXHR) {
      	if (data.followStatus == "on") {
      		callback(0, true);
      	} else {
      		callback(0, false);
      	}
  	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		callback(errorThrown);
	});
}

function createLikersContainer(data, contentTag) {
	var container = $("<div>", {id: contentTag + data.id + "LikersContainer"}).empty();

	return container;
}

function createFollowersContainer(data, contentTag) {
	var container = $("<div>", {id: contentTag + data.id + "FollowersContainer"}).empty();

	return container;
}

function createLikersPopupElement(data, contentTag) {
	var likersPopupHeader = $("<h2>").append("People who like this");
	var likersPopupBody = createLikersContainer(data, contentTag);
	var element = createPopupElement(contentTag + data.id + "LikersPopup", "modal-narrow", likersPopupHeader, null, likersPopupBody, function() {
		showHideLikersList(data.id, contentTag, false);
	});

	return element;
}

function createFollowersPopupElement(data, contentTag) {
	var followersPopupHeader = $("<h2>").append("Followers");
	var followersPopupBody = createFollowersContainer(data, contentTag);
	var element = createPopupElement(contentTag + data.id + "FollowersPopup", "modal-narrow", followersPopupHeader, null, followersPopupBody, function() {
		showHideFollowersList(data.id, contentTag, false);
	});

	return element;
}

function appendLikersList(id, contentTag, list) {
	var table = $("#" + contentTag + id + "LikersList table");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var row = $("<tr>");
		var userImage = $("<img>", {src: data.image, class: "user-image-tiny"});
		var userName = $("<span>", {class: "posted-by-name-light"});
		userName.append($("<a>", {class: "link-gray", href: "/user/" + data.id}).append(data.displayName));

		row.append($("<td>", {class: "user-image-column"}).append(userImage));
		row.append($("<td>", {class: "user-name-column"}).append(userName));

		table.append(row);
	}

	return table;
}

function createLikersList(id, contentTag) {
	var container = $("<div>", {id: contentTag + id + "LikersList", class: "likersList", "data-id": id});

	var table = $("<table width='100%'>");

	container.append(table);

	return container;
}

function appendFollowersList(id, contentTag, list) {
	var table = $("#" + contentTag + id + "FollowersList table");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var row = $("<tr>");
		var userImage = $("<img>", {src: data.image, class: "user-image-tiny"});
		var userName = $("<span>", {class: "posted-by-name-light"});
		userName.append($("<a>", {class: "link-gray", href: "/user/" + data.id}).append(data.displayName));

		row.append($("<td>", {class: "user-image-column"}).append(userImage));
		row.append($("<td>", {class: "user-name-column"}).append(userName));

		table.append(row);
	}

	return table;
}

function createFollowersList(id, contentTag, list) {
	var container = $("<div>", {id: contentTag + id + "FollowersList", class: "followersList", "data-id": id});

	var table = $("<table width='100%'>");

	container.append(table);

	return container;
}
