function createSocialStatusSectionComment(data, parentId, contentTag, isReply) {
	var socialStatusSection = $("<div>", {class: "socialStatusSectionSimple"});
	var likeButton = $("<button>", {id: contentTag + data.id + "LikeButton", type: "button", class: "button-link text-plain-small separator"}).append("Like");
	if (data.socialStatus.likes.amLiking) {
		likeButton.addClass("active");
	}
	socialStatusSection.append(likeButton);

	
	socialStatusSection.append(createSeparatorElement("dot", "separator-small"));
	
	var restURL = "/api/comments/" + data.id + "/like";
	/*
	if (user) {
		$.getJSON(restURL, function(result) {
			if (result.likeStatus == "on") {
				//show button as depressed
				$("#" + data.id + "LikeButton").addClass("active");
			}
		})
		.fail(function() {
			//eat this
		});
	}
	*/

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

	var replyButton = $("<button>", {id: contentTag + data.id + "ReplyButton", type: "button", class: "button-link text-plain-small separator-small"}).append("Reply");
	socialStatusSection.append(replyButton);
	replyButton.click(function(e) {
		if (user) {
			//add a new reply input box only if there isn't already one.
			if (!$("#" + contentTag + ((isReply) ? (parentId) : (data.id)) + "NewCommentText").length) {
				//for reply of reply, the parent is still the top comment
				var newCommentElement = createNewCommentElement(true, (isReply) ? (parentId) : (data.id), contentTag);
				appendNewCommentElement(newCommentElement, (isReply) ? (parentId) : (data.id), contentTag, null, true);
			}
			$("#" + contentTag + ((isReply) ? (parentId) : (data.id)) + "NewCommentText").focus(); // set focus in the input field
		} else {
			window.open("/auth", "_self");
		}
		
	});



	// Allow delete for comments posted by currently logged-in user
	if (user && user.id == data.postedByUser.id) {
		socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

		var deleteButton = $("<button>", {id: contentTag + data.id + "DeleteButton", type: "button", class: "button-link text-plain-small separator-small"}).append("Delete");
		socialStatusSection.append(deleteButton);
		deleteButton.click(function(e) {
			var result = confirm("Are you sure you want to delete this comment permanently?");
			if (result) {
			    deleteItem(data, contentTag);
			}
		});

		
	}

	socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

	var numLikes = $("<span>", {id: contentTag + data.id + "NumLikes", class: "secondary-info separator-small"}).append(data.socialStatus.likes.numLikes);
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

function createSocialStatusSectionElement(data, contentTag, showBorder = true) {
	var socialStatus = $("<div>", {class: "socialStatusSection" + (showBorder ? " bottom-border" : ""), id: contentTag + data.id + "SocialStatusSection"});

	// For Challenges and Entries
	if (data.socialStatus.likes) {
		var likeButton = $("<button>", {id: contentTag + data.id + "LikesButton", type: "button", class: "button-link text-plain-small separator-medium"});
		likeButton.append($("<span>", {id: contentTag + data.id + "NumLikes", text: data.socialStatus.likes.numLikes}));
		likeButton.append($("<span>", {text: " Likes"}));
		if (data.socialStatus.likes.numLikes <= 0) {
			likeButton.hide();
		}
		socialStatus.append(likeButton);

		likeButton.click(function() {
			showHideLikersList(data.id, contentTag, true);
		});
	}
	
	if (data.socialStatus.shares) {

		var shareButton = $("<button>", {id: contentTag + data.id + "SharesButton", type: "button", class: "button-link text-plain-small separator-medium"});
		shareButton.append($("<span>", {id: contentTag + data.id + "NumShares", text: data.socialStatus.shares.numShares}));
		shareButton.append($("<span>", {text: " Shares"}));
		if (data.socialStatus.shares.numShares <= 0) {
			shareButton.hide();
		}
		socialStatus.append(shareButton);
	}
	
	if (data.socialStatus.comments) {

		var commentButton = $("<button>", {id: contentTag + data.id + "CommentsButton", type: "button", class: "button-link text-plain-small separator-medium"});
		commentButton.append($("<span>", {id: contentTag + data.id + "NumComments", text: data.socialStatus.comments.numComments}));
		commentButton.append($("<span>", {text: " Comments"}));
		if (data.socialStatus.comments.numComments <= 0) {
			commentButton.hide();
		}
		socialStatus.append(commentButton);

		commentButton.click(function() {			
			showHideCommentsList(data.id, contentTag, true);
		});
	}
	
	// For challenges only
	if (data.socialStatus.entries) {

		var entriesButton = $("<button>", {id: contentTag + data.id + "EntriesButton", type: "button", class: "button-link text-plain-small separator-medium"});
		entriesButton.append($("<span>", {id: contentTag + data.id + "NumEntries", text: data.socialStatus.entries.numEntries}));
		entriesButton.append($("<span>", {text: " Entries"}));
		if (data.socialStatus.entries.numEntries <= 0) {
			entriesButton.hide();
		}

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
	if (data.socialStatus.follows) {

		if (data.socialStatus.follows.numFollowers) {

			var followersButton = $("<button>", {id: contentTag + data.id + "FollowersButton", type: "button", class: "button-link text-plain-small separator-medium"});
			followersButton.append($("<span>", {id: contentTag + data.id + "NumFollowers", text: data.socialStatus.follows.numFollowers}));
			followersButton.append($("<span>", {text: " Followers"}));
			if (data.socialStatus.follows.numFollowers <= 0) {
				followersButton.hide();
			}

			followersButton.click(function(e) {
				showHideFollowersList(data.id, contentTag, true);
			});
			socialStatus.append(followersButton);
		}
		
		/*
		if (data.socialStatus.follows.numFollowing) {

			var followingButton = $("<button>", {id: data.id + "FollowingButton", type: "button", class: "button-link text-plain-small separator-medium"});
			followingButton.append($("<span>", {id: data.id + "NumFollowing", text: data.socialStatus.follows.numFollowing}));
			followingButton.append($("<span>", {text: " Following"}));
			if (data.socialStatus.follows.numFollowing <= 0) {
				followingButton.hide();
			}

			followingButton.click(function(e) {
				$('#' + data.id + 'Tabs a[href="#following"]').tab('show');
			});
			socialStatus.append(followingButton);
		}
		*/
	}

	if (data.socialStatus.posts) {
		if (data.socialStatus.posts.numPosts) {

			var postsButton = $("<button>", {id: contentTag + data.id + "PostsButton", type: "button", class: "button-link text-plain-small separator-medium"});
			postsButton.append($("<span>", {id: contentTag + data.id + "NumPosts", text: data.socialStatus.posts.numPosts}));
			postsButton.append($("<span>", {text: " Posts"}));
			if (data.socialStatus.posts.numPosts <= 0) {
				postsButton.hide();
			}

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
			$.getJSON("/api/users/?likedEntityId=" + parentId + "&sortBy=popularity", function(list) {
				var likersList = createLikersList(parentId, contentTag, list);
				$("#" + contentTag + parentId + "LikersContainer").empty().append(likersList);
			})
			.fail(function() {
				//eat this
			});

			if ($("#" + contentTag + parentId + "LikersPopup").length) {
				$("#" + contentTag + parentId + "LikersPopup").show();
			}
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
			$.getJSON("/api/users/?followedId=" + userId + "&sortBy=lastSeen", function(list) {
				var followersList = createFollowersList(userId, contentTag, list);
				$("#" + contentTag + userId + "FollowersContainer").empty().append(followersList);
			})
			.fail(function() {
				//eat this
			});

		}

		//if we're showing the followers list on a popup, then show the popup
		if ($("#" + contentTag + userId + "FollowersPopup").length) {
			$("#" + contentTag + userId + "FollowersPopup").show();
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



function createSocialActionsSectionElement(data, contentTag, full /* show full status */) {
	var socialActionsSection = $("<div>", {id: contentTag + data.id + "SocialActionsSection", class: "socialActionsSection"});

	// LIKE BUTTON ---------------------------------
	if (data.socialStatus.likes) {
		var likeButton = $("<button>", {id: contentTag + data.id + "LikeButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		likeButton.append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append(" Like");
		socialActionsSection.append(likeButton);

		var restURL;
		if (data.type == "challenge") {
			restURL = "/api/challenges/" + data.id + "/like";
		} else if (data.type == "entry") {
			restURL = "/api/entries/" + data.id + "/like";
		}

		if (data.socialStatus.likes.amLiking) {
			likeButton.addClass("active");
		}
		/*
		if (user) {
			$.getJSON(restURL, function(result) {
				if (result.likeStatus == "on") {
					//show button as depressed
					$("#" + data.id + "LikeButton").addClass("active");
				}
			});
		}*/

		likeButton.click(function(e) {
			if (user) {
				sendLikeAction(restURL, !$("#" + this.id).hasClass("active"), function(err, likeStatus) {
					if (err) {
						// eat this
					} else {
						var numLikes = parseInt($("#" + contentTag + data.id + "NumLikes").text());
						if (likeStatus) {
							numLikes ++;
							$("#" + contentTag + data.id + "LikeButton").addClass("active");
							$("#" + contentTag + data.id + "NumLikes").text(numLikes);
							$("#" + contentTag + data.id + "LikesButton").show();
						} else {
							numLikes --;
							$("#" + contentTag + data.id + "LikeButton").removeClass("active");
							$("#" + contentTag + data.id + "NumLikes").text(numLikes);
							if (numLikes == 0) {
								$("#" + contentTag + data.id + "LikesButton").hide();
							}
						}
					}
				});
			} else {
				window.open("/auth", "_self");
			}
		
		});
	}

	// COMMENT BUTTON ---------------------------------
	if (data.socialStatus.comments) {
		var commentButton = $("<button>", {id: contentTag + data.id + "CommentButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		commentButton.append($("<span>", {class: "glyphicon glyphicon-comment glyphiconAlign"})).append(" Comment");
		socialActionsSection.append(commentButton);
		
		commentButton.click(function(e) {
			showHideCommentsList(data.id, contentTag, true);	
		});
	}

	// SHARE BUTTON ---------------------------------
	if (data.socialStatus.shares) {
		var shareButton = $("<button>", {id: contentTag + data.id + "ShareButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		shareButton.append($("<span>", {class: "glyphicon glyphicon-share-alt glyphiconAlign"})).append(" Share");
		
		var menu = createMenu(shareButton);
		var facebookButton = $("<button>", {class: "button-empty", type: "button"}).append($("<i>", {class: "fa fa-facebook", "aria-hidden" : "true"})).append("Share on Facebook");
		appendMenuItemButton(menu, facebookButton);
		facebookButton.click(function() {
			window.location.replace("/share?id=" + data.id + "&type=" + data.type + "&target=facebook" + "&referrer=" + encodeURIComponent(getFullPathForCurrentPage()));
		});

		var twitterButton = $("<button>", {class: "button-empty", type: "button"}).append("Share on Twitter");
		appendMenuItemButton(menu, twitterButton);
		twitterButton.click(function() {
			window.location.replace("/share?id=" + data.id + "&type=" + data.type + "&target=twitter" + "&referrer=" + encodeURIComponent(getFullPathForCurrentPage()));
		});

		socialActionsSection.append(menu);
	}

	// TIME LAPSE BUTTON
	if (data.type == "entry") {
		var timelapseButton = $("<button>", {id: contentTag + data.id + "TimelapseButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		timelapseButton.append($("<span>", {class: "glyphicon glyphicon-play-circle glyphiconAlign"})).append(" Timelapse");
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
	if (data.socialStatus.entries) {
		var addEntryButton = $("<button>", {id: contentTag + data.id + "AddEntryButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		addEntryButton.append($("<span>", {class: "glyphicon glyphicon-flag glyphiconAlign"})).append(" Captionify");
		socialActionsSection.append(addEntryButton);

		addEntryButton.click(function(e) {
			window.open("/newentry?challengeId=" + data.id, "_self");
		});
	}
	
	// FOLLOW BUTTON ---------------------------------
	if (data.socialStatus.follows && (!user || user.id != data.id)) {
		var followButton = $("<button>", {id: contentTag + data.id + "FollowButton", type: "button", class: "button-active-link text-plain-small text-bold"}).append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append($("<span>", {id: contentTag + data.id + "FollowText"}));
		
		socialActionsSection.append(followButton);

		if (data.socialStatus.follows.amFollowing) {
			followButton.addClass("active");
			followButton.children("#" + contentTag + data.id + "FollowText").append(" Following");
		} else {
			followButton.children("#" + contentTag + data.id + "FollowText").append(" Follow");
		}

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
			          		$("#" + contentTag + dataId + "NumFollowers").text(numFollowers);
			          		$("#" + contentTag + dataId + "FollowButton").addClass("active");
			          		$("#" + contentTag + dataId + "FollowText").empty().append(" Following");
			          		$("#" + contentTag + dataId + "FollowersButton").show();
			          	} else {
			          		numFollowers --;
			          		$("#" + contentTag + dataId + "NumFollowers").text(numFollowers);
			          		$("#" + contentTag + dataId + "FollowButton").removeClass("active");
			          		$("#" + contentTag + dataId + "FollowText").empty().append(" Follow");
			          		if (numFollowers <= 0) {
			          			$("#" + contentTag + dataId + "FollowersButton").hide();
			          		}
			          	}
					}
				});
			} else {
				window.open("/auth", "_self");
			}
		});
	}

	if (full && data.socialStatus.facebook) {
		if (data.socialStatus.facebook.profileLink) {
			var facebookButton = $("<button>", {id: contentTag + data.id + "FacebookButton", type: "button", class: "button-active-link text-plain-small text-bold"});
			facebookButton.append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append(" Facebook");
			socialActionsSection.append(facebookButton);

			facebookButton.click(function() {
				window.open(data.socialStatus.facebook.profileLink, "_blank");
			});
		}
	}

	if (full && data.socialStatus.twitter) {
		if (data.socialStatus.twitter.profileLink) {
			var twitterButton = $("<button>", {id: contentTag + data.id + "TwitterButton", type: "button", class: "button-active-link text-plain-small text-bold"});
			twitterButton.append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append(" Twitter");
			socialActionsSection.append(twitterButton);

			twitterButton.click(function() {
				window.open(data.socialStatus.twitter.profileLink, "_blank");
			});
		}
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
      	if (data.followStatus == "following") {
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

function createLikersList(id, contentTag, list) {
	var container = $("<div>", {id: contentTag + id + "LikersList", class: "likersList", "data-id": id});

	var table = $("<table width='100%'>");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var row = $("<tr>");
		var userImage = $("<img>", {src: data.image, class: "user-image-tiny"});

		var userName = $("<a>", {class: "link-gray", href: "/user/" + data.id}).append(data.caption);
		var followButton = $("<button>", {type: "button", id: contentTag + data.id + "FollowButton", class: "btn button-full-width "});
		if (data.socialStatus.follows.amFollowing) {
			//already following
			followButton.append($("<span>", {class: "glyphicon glyphicon-ok"})).append(" Following");
			followButton.addClass("button-full");
			followButton.attr("disabled", "disabled"); // no need to be clickable as already following
		} else {
			followButton.append($("<span>", {class: "glyphicon glyphicon-plus"})).append(" Follow");
			followButton.addClass("button-line");
			followButton.click(
			

				(function(id) {
				return function(e) {

					if (!user) {
						//not logged in, so redirect to login page
						window.open("/auth", "_self");
					}
					sendFollow(id, true, function(err, followResult) {
						if (err) {
							//eat this
						} else {
							if (followResult) {
								//now following
								var button = $("#" + contentTag + id + "FollowButton");
								button.empty();
								button.append($("<span>", {class: "glyphicon glyphicon-ok"})).append(" Following");
								button.removeClass("button-line");
								button.addClass("button-full");
								button.attr("disabled", "disabled"); // no need to be clickable as already following
							}
						}
					});
				}
			})(data.id));
		}

		row.append($("<td>", {class: "user-image-column"}).append(userImage));
		row.append($("<td>", {class: "user-name-column"}).append(userName));
		if (user && user.id == data.id) {
			//it's me, so don't show the button!
			row.append($("<td>"));
		} else {
			row.append($("<td>").append(followButton));
		}

		table.append(row);
	}

	container.append(table);

	return container;
}

function createFollowersList(id, contentTag, list) {
	var container = $("<div>", {id: contentTag + id + "FollowersList", class: "followersList", "data-id": id});

	var table = $("<table width='100%'>");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var row = $("<tr>");
		var userImage = $("<img>", {src: data.image, class: "user-image-tiny"});

		var userName = $("<a>", {class: "link-gray", href: "/user/" + data.id}).append(data.caption);
		var followButton = $("<button>", {type: "button", id: contentTag + data.id + "FollowButton", class: "btn button-full-width "});
		if (data.socialStatus.follows.amFollowing) {
			//already following
			followButton.append($("<span>", {class: "glyphicon glyphicon-ok"})).append(" Following");
			followButton.addClass("button-full");
			followButton.attr("disabled", "disabled"); // no need to be clickable as already following
		} else {
			followButton.append($("<span>", {class: "glyphicon glyphicon-plus"})).append(" Follow");
			followButton.addClass("button-line");
			followButton.click(
			

				(function(id) {
				return function(e) {

					if (!user) {
						//not logged in, so redirect to login page
						window.open("/auth", "_self");
					}
					sendFollow(id, true, function(err, followResult) {
						if (err) {
							//eat this
						} else {
							if (followResult) {
								//now following
								var button = $("#" + contentTag + id + "FollowButton");
								button.empty();
								button.append($("<span>", {class: "glyphicon glyphicon-ok"})).append(" Following");
								button.removeClass("button-line");
								button.addClass("button-full");
								button.attr("disabled", "disabled"); // no need to be clickable as already following
							}
						}
					});
				}
			})(data.id));
		}

		row.append($("<td>", {class: "user-image-column"}).append(userImage));
		row.append($("<td>", {class: "user-name-column"}).append(userName));
		if (user && user.id == data.id) {
			//it's me, so don't show the button!
			row.append($("<td>"));
		} else {
			row.append($("<td>").append(followButton));
		}

		table.append(row);
	}

	container.append(table);

	return container;
}
