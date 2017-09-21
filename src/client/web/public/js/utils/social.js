function createSocialStatusSectionComment(data, parentId, isReply) {
	var socialStatusSection = $("<div>", {class: "socialStatusSectionSimple"});
	var likeButton = $("<button>", {id: data.id + "LikeButton", type: "button", class: "button-link text-plain-small separator"}).append("Like");
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
					var numLikes = parseInt($("#" + data.id + "NumLikes").text());
					if (likeStatus) {
						$("#" + data.id + "LikeButton").addClass("active");
						$("#" + data.id + "NumLikes").text(" " + (numLikes + 1));
					} else {
						$("#" + data.id + "LikeButton").removeClass("active");
						$("#" + data.id + "NumLikes").text(" " + (numLikes - 1));
					}
				}
			});
		} else {
			window.open("/auth", "_self");
		}
	
	});

	var replyButton = $("<button>", {id: data.id + "ReplyButton", type: "button", class: "button-link text-plain-small separator-small"}).append("Reply");
	socialStatusSection.append(replyButton);
	replyButton.click(function(e) {
		if (user) {
			//for reply of reply, the parent is still the top comment
			var newCommentElement = createNewCommentElement(true, (isReply) ? (parentId) : (data.id));
			appendNewCommentElement(newCommentElement, (isReply) ? (parentId) : (data.id), null, true);
		} else {
			window.open("/auth", "_self");
		}
		
	});



	// Allow delete for comments posted by currently logged-in user
	if (user && user.id == data.postedByUser.id) {
		socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

		var deleteButton = $("<button>", {id: data.id + "DeleteButton", type: "button", class: "button-link text-plain-small separator-small"}).append("Delete");
		socialStatusSection.append(deleteButton);
		deleteButton.click(function(e) {
			var result = confirm("Are you sure you want to delete this comment permanently?");
			if (result) {
			    deleteItem(data);
			}
		});

		
	}

	socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

	var numLikes = $("<span>", {id: data.id + "NumLikes", class: "text-plain-small separator-small gray-light"}).append(data.socialStatus.likes.numLikes);
	socialStatusSection.append(numLikes);

	socialStatusSection.append($("<span>", {text: " Likes", class: "text-plain-small gray-light"}));

	socialStatusSection.append(createSeparatorElement("dot", "separator-small"));

	var postedDate = $("<span>", {class: "commentPostedDate separator-small text-plain-small gray-light", text: "" + formatDate(data.postedDate)});
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

function createSocialStatusSectionElement(data, full /* Show all content */) {
	var socialStatus = $("<div>", {class: "socialStatusSection", id: data.id + "SocialStatusSection"});

	// For Challenges and Entries
	if (data.socialStatus.likes) {
		var likeButton = $("<button>", {id: data.id + "LikesButton", type: "button", class: "button-link text-plain-small separator-medium"});
		likeButton.append($("<span>", {id: data.id + "NumLikes", text: data.socialStatus.likes.numLikes}));
		likeButton.append($("<span>", {text: " Likes"}));
		if (data.socialStatus.likes.numLikes <= 0) {
			likeButton.hide();
		}
		socialStatus.append(likeButton);

		likeButton.click(function() {
			showHideLikersList(data.id);
		});
	}
	
	if (data.socialStatus.shares) {

		var shareButton = $("<button>", {id: data.id + "SharesButton", type: "button", class: "button-link text-plain-small separator-medium"});
		shareButton.append($("<span>", {id: data.id + "NumShares", text: data.socialStatus.shares.numShares}));
		shareButton.append($("<span>", {text: " Shares"}));
		if (data.socialStatus.shares.numShares <= 0) {
			shareButton.hide();
		}
		socialStatus.append(shareButton);
	}
	
	if (data.socialStatus.comments) {

		var commentButton = $("<button>", {id: data.id + "CommentsButton", type: "button", class: "button-link text-plain-small separator-medium"});
		commentButton.append($("<span>", {id: data.id + "NumComments", text: data.socialStatus.comments.numComments}));
		commentButton.append($("<span>", {text: " Comments"}));
		if (data.socialStatus.comments.numComments <= 0) {
			commentButton.hide();
		}
		socialStatus.append(commentButton);

		commentButton.click(function() {			
			showHideCommentsList(data.id, true);
		});
	}
	
	// For challenges only
	if (data.socialStatus.entries) {

		var entriesButton = $("<button>", {id: data.id + "EntriesButton", type: "button", class: "button-link text-plain-small separator-medium"});
		entriesButton.append($("<span>", {id: data.id + "NumEntries", text: data.socialStatus.entries.numEntries}));
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

			var followersButton = $("<button>", {id: data.id + "FollowersButton", type: "button", class: "button-link text-plain-small separator-medium"});
			followersButton.append($("<span>", {id: data.id + "NumFollowers", text: data.socialStatus.follows.numFollowers}));
			followersButton.append($("<span>", {text: " Followers"}));
			if (data.socialStatus.follows.numFollowers <= 0) {
				followersButton.hide();
			}

			followersButton.click(function(e) {
				//$('#' + data.id + 'Tabs a[href="#followers"]').tab('show');
				showHideFollowersList(data.id, true);
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

			var postsButton = $("<button>", {id: data.id + "PostsButton", type: "button", class: "button-link text-plain-small separator-medium"});
			postsButton.append($("<span>", {id: data.id + "NumPosts", text: data.socialStatus.posts.numPosts}));
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
function showHideLikersList(parentId) {
	if ($("#" + parentId + "LikersContainer").is(":empty")) {
		$.getJSON("/api/users/?likedEntityId=" + parentId + "&sortBy=reverseDate", function(list) {
			var likersList = createLikersList(parentId, list);
			$("#" + parentId + "LikersContainer").empty().append(likersList);
		})
		.fail(function() {
			//eat this
		});

		if ($("#" + parentId + "LikersPopup").length) {
			$("#" + parentId + "LikersPopup").show();
		}
	} else {
		$("#" + parentId + "LikersContainer").empty();

		if ($("#" + parentId + "LikersPopup").length) {
			$("#" + parentId + "LikersPopup").hide();
		}
	}
}


/**
	Show or Hide the Followers List associated with the given user.
	parentId - User id to which the list is attached
**/
function showHideFollowersList(userId, show) {
	//comments list is currently hidden, so fetch comments and show the list
	if (show) {
		if ($("#" + userId + "FollowersContainer").is(":empty")) { 
			$.getJSON("/api/users/?followedId=" + userId + "&sortBy=lastSeen", function(list) {
				var followersList = createFollowersList(userId, list);
				$("#" + userId + "FollowersContainer").empty().append(followersList);
			})
			.fail(function() {
				//eat this
			});

		}

		//if we're showing the followers list on a popup, then show the popup
		if ($("#" + userId + "FollowersPopup").length) {
			$("#" + userId + "FollowersPopup").show();
		}

		//make sure the tab is 'active', not just 'shown'
		$('#' + userId + 'Tabs a[href="#followers"]').tab('show');
	} else {
		if (!$("#" + userId + "FollowersContainer").is(":empty")) {
			$("#" + userId + "FollowersContainer").empty();

			//if we're showing the followers list on a popup, then hide the popup
			if ($("#" + userId + "FollowersPopup").length) {
				$("#" + userId + "FollowersPopup").hide();
			}
		}
	}
}



function createSocialActionsSectionElement(data, full /* show full status */) {
	var socialActionsSection = $("<div>", {id: data.id + "SocialActionsSection", class: "socialActionsSection"});

	// LIKE BUTTON ---------------------------------
	if (data.socialStatus.likes) {
		var likeButton = $("<button>", {id: data.id + "LikeButton", type: "button", class: "button-active-link text-plain-small text-bold"});
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
						var numLikes = parseInt($("#" + data.id + "NumLikes").text());
						if (likeStatus) {
							numLikes ++;
							$("#" + data.id + "LikeButton").addClass("active");
							$("#" + data.id + "NumLikes").text(numLikes);
							$("#" + data.id + "LikesButton").show();
						} else {
							numLikes --;
							$("#" + data.id + "LikeButton").removeClass("active");
							$("#" + data.id + "NumLikes").text(numLikes);
							if (numLikes == 0) {
								$("#" + data.id + "LikesButton").hide();
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
		var commentButton = $("<button>", {id: data.id + "CommentButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		commentButton.append($("<span>", {class: "glyphicon glyphicon-comment glyphiconAlign"})).append(" Comment");
		socialActionsSection.append(commentButton);
		
		commentButton.click(function(e) {
			showHideCommentsList(data.id, true);	
		});
	}
	

	// SHARE BUTTON ---------------------------------
	if (data.socialStatus.shares) {
		var shareButton = $("<button>", {id: data.id + "ShareButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		shareButton.append($("<span>", {class: "glyphicon glyphicon-share-alt glyphiconAlign"})).append(" Share");
		
		if (user.facebook || user.twitter || user.google) {
			var menu = createMenu(shareButton);
			var facebookButton = $("<button>", {class: "button-empty", type: "button"}).append($("<i>", {class: "fa fa-facebook", "aria-hidden" : "true"})).append("Share on Facebook");
			appendMenuItemButton(menu, facebookButton);
			facebookButton.click(function() {
				sendShare("facebook", data);
			});

			var twitterButton = $("<button>", {class: "button-empty", type: "button"}).append("Share on Twitter");
			appendMenuItemButton(menu, twitterButton);
			twitterButton.click(function() {
				sendShare("twitter", data);
			});
			
			socialActionsSection.append(menu);
		} else {
			// no social provider, so redirect to auth page
			socialActionsSection.append(shareButton);
			shareButton.click(function(e) {
				window.open("/auth", "_self");
			});
		}
	}

	// TIME LAPSE BUTTON
	if (data.type == "entry") {
		var timelapseButton = $("<button>", {id: data.id + "TimelapseButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		timelapseButton.append($("<span>", {class: "glyphicon glyphicon-play-circle glyphiconAlign"})).append(" Timelapse");
		socialActionsSection.append(timelapseButton);

		timelapseButton.click(function(e) {
			$.getJSON('/api/filters/timelapse/' + data.id, function(imageData) {
				startTimelapse(data.id, imageData);
			})
			.fail(function() {
				window.location.replace("/error?reload=yes"); //reload the page to see if it works the next time
			});
		});
	}
	
	// ADD ENTRY BUTTON ---------------------------------
	if (data.socialStatus.entries) {
		var addEntryButton = $("<button>", {id: data.id + "AddEntryButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		addEntryButton.append($("<span>", {class: "glyphicon glyphicon-flag glyphiconAlign"})).append(" Captionify");
		socialActionsSection.append(addEntryButton);

		addEntryButton.click(function(e) {
			window.open("/newentry?challengeId=" + data.id, "_self");
		});
	}
	
	// FOLLOW BUTTON ---------------------------------
	if (data.socialStatus.follows && (!user || user.id != data.id)) {
		var followButton = $("<button>", {id: data.id + "FollowButton", type: "button", class: "button-active-link text-plain-small text-bold"}).append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append($("<span>", {id: data.id + "FollowText"}));
		
		socialActionsSection.append(followButton);

		if (data.socialStatus.follows.amFollowing) {
			followButton.addClass("active");
			followButton.children("#" + data.id + "FollowText").append(" Following");
		} else {
			followButton.children("#" + data.id + "FollowText").append(" Follow");
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
						var numFollowers = parseInt($("#" + dataId + "NumFollowers").text());
			          	if (followResult) {
			          		numFollowers ++;
			          		$("#" + dataId + "NumFollowers").text(numFollowers);
			          		$("#" + dataId + "FollowButton").addClass("active");
			          		$("#" + dataId + "FollowText").empty().append(" Following");
			          		$("#" + dataId + "FollowersButton").show();
			          	} else {
			          		numFollowers --;
			          		$("#" + dataId + "NumFollowers").text(numFollowers);
			          		$("#" + dataId + "FollowButton").removeClass("active");
			          		$("#" + dataId + "FollowText").empty().append(" Follow");
			          		if (numFollowers <= 0) {
			          			$("#" + dataId + "FollowersButton").hide();
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
			var facebookButton = $("<button>", {id: data.id + "FacebookButton", type: "button", class: "button-active-link text-plain-small text-bold"});
			facebookButton.append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append(" Facebook");
			socialActionsSection.append(facebookButton);

			facebookButton.click(function() {
				window.open(data.socialStatus.facebook.profileLink, "_blank");
			});
		}
	}

	if (full && data.socialStatus.twitter) {
		if (data.socialStatus.twitter.profileLink) {
			var twitterButton = $("<button>", {id: data.id + "TwitterButton", type: "button", class: "button-active-link text-plain-small text-bold"});
			twitterButton.append($("<span>", {class: "glyphicon glyphicon-thumbs-up glyphiconAlign"})).append(" Twitter");
			socialActionsSection.append(twitterButton);

			twitterButton.click(function() {
				window.open(data.socialStatus.twitter.profileLink, "_blank");
			});
		}
	}

	return socialActionsSection;
}

function sendShare(provider, data) {
	var jsonObj = {};
	jsonObj.message = data.caption;
	jsonObj.link = data.link;

	var postURL = "/api/social";
	if (provider == "facebook") {
		postURL += "?target=facebook";
	} else if (provider == "twitter") {
		postURL += "?target=twitter";
	}

	$.ajax({
		type: "POST",
		url: postURL,
      	dataType: "json", // return data type
      	contentType: "application/json; charset=UTF-8",
      	data: JSON.stringify(jsonObj)
  	})
	.done(function(data, textStatus, jqXHR) {
      	showAlert("Posted successfully!", 3);
  	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		showAlert("There appears to be a problem posting.  Please try again later.", 3);
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

function createLikersContainer(data) {
	var container = $("<div>", {id: data.id + "LikersContainer"}).empty();

	return container;
}

function createFollowersContainer(data) {
	var container = $("<div>", {id: data.id + "FollowersContainer"}).empty();

	return container;
}

function createLikersPopupElement(data) {
	var likersPopupHeader = $("<h2>").append("People who like this");
	var likersPopupBody = createLikersContainer(data);
	var element = createPopupElement(data.id + "LikersPopup", "modal-narrow", likersPopupHeader, null, likersPopupBody, function() {
		showHideLikersList(data.id);
	});

	return element;
}

function createFollowersPopupElement(data) {
	var followersPopupHeader = $("<h2>").append("Followers");
	var followersPopupBody = createFollowersContainer(data);
	var element = createPopupElement(data.id + "FollowersPopup", "modal-narrow", followersPopupHeader, null, followersPopupBody, function() {
		showHideFollowersList(data.id, false);
	});

	return element;
}

function createLikersList(id, list) {
	var container = $("<div>", {id: id + "LikersList", class: "likersList", "data-id": id});

	var table = $("<table width='100%'>");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var row = $("<tr>");
		var userImage = $("<img>", {src: data.image, class: "user-image-tiny"});

		var userName = $("<a>", {class: "link-gray", href: "/user/" + data.id}).append(data.caption);
		var followButton = $("<button>", {type: "button", id: data.id + "FollowButton", class: "btn button-full-width "});
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
						console.log("sendFollow result, err = " + err + ", followResult = " + JSON.stringify(followResult));
						if (err) {
							//eat this
						} else {
							if (followResult) {
								//now following
								var button = $("#" + id + "FollowButton");
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

function createFollowersList(id, list) {
	var container = $("<div>", {id: id + "FollowersList", class: "followersList", "data-id": id});

	var table = $("<table width='100%'>");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var row = $("<tr>");
		var userImage = $("<img>", {src: data.image, class: "user-image-tiny"});

		var userName = $("<a>", {class: "link-gray", href: "/user/" + data.id}).append(data.caption);
		var followButton = $("<button>", {type: "button", id: data.id + "FollowButton", class: "btn button-full-width "});
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
						console.log("sendFollow result, err = " + err + ", followResult = " + JSON.stringify(followResult));
						if (err) {
							//eat this
						} else {
							if (followResult) {
								//now following
								var button = $("#" + id + "FollowButton");
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
