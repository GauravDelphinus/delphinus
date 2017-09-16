function extractImage(files, callback) {

    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
    	// Only process image files.
      if (!f.type.match('image.*')) {
      	alert("not an image");
        continue;
      }

      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {

          //// resizing code
          var img = new Image();

          img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = Math.min(img.width, 1200); // TBD - max width of image, see if we can pass this value down from somewhere
            canvas.height = canvas.width * (img.height / img.width);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // SEND THIS DATA TO WHEREVER YOU NEED IT
            var data = canvas.toDataURL('image/png');

            //$('#challengeImage').prop('src', img.src);
            /*
            $("#challengeImage").prop("src", data);
            */
            callback(data, e.target.result, escape(theFile.name), theFile.type);
          }
          /// resizing code

          // Render image.

          
          img.src = e.target.result;
          /*
          $("#challengeImage").prop("src", e.target.result);
          $("#challengeImage").prop("title", escape(theFile.name));
          $("#selectImage").hide();
          */

          
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsDataURL(f);
    }
}

function formatDate(input) {
	var date = new Date(parseInt(input));

	var dayList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	var monthList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

	var today = new Date();
	var numHours = numHoursBetween(today, date);
	var numDays = numDaysBetween(today, date);
	var output;
	if (numHours < 30) {
		// show in hours ago format
		output = Math.floor(numHours) + " hours ago";
	} else if (numDays < 5) {
		//if posted less than 5 days ago, say something like "4 days ago"
		output = Math.floor(numDays) + " days ago";
	} else {
		//post something like "Sunday, May 12, 2017"
		var day = dayList[date.getDay()];
		var month = monthList[date.getMonth()];
		var dateValue = date.getDate();
		var year = date.getFullYear();

		output = day + ", " + month + " " + dateValue + ", " + year;
	}
	
	return output;
}

function numHoursBetween(d1, d2) {
	var diff = Math.abs(d1.getTime() - d2.getTime());
	return diff / (1000 * 60 * 60);
}

function numDaysBetween (d1, d2) {
	var diff = Math.abs(d1.getTime() - d2.getTime());
	return diff / (1000 * 60 * 60 * 24);
};

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

function createPostHeaderElement(data) {
	var postHeaderElement = $("<div>", {id: data.id + "PostHeader", class: "postHeaderSection"});

	// IMPORTANT: Menu should be the FIRST Child, because it needs to be displayed at top right
	// using float: right (see https://stackoverflow.com/a/33503177/7657145)
	
	// Menu section

	//if I'm the one who posted this item, show the menu option
	if (user && user.id == data.postedByUser.id) {
		var menuIcon = $("<span>", {class: "glyphicon glyphicon-chevron-down"});
		var menuButton = $("<button>", {id: data.id + "ItemMenuButton", class: "itemDropdownButton"}).append(menuIcon);
		var menu = createMenu(menuButton);
		menu.addClass("itemDropdownMenu");
		var deleteIcon = $("<span>", {class: "glyphicon glyphicon-remove"});
		var deleteButton = $("<button>", {id: data.id + "DeleteButton", class: "btn itemDropdownButton", type: "button"}).append(deleteIcon).append(" Delete Post");
		
		appendMenuItemButton(menu, deleteButton);

		deleteButton.click(function() {
			var result = confirm("Are you sure you want to delete this post permanently?");
			if (result) {
			    deleteItem(data);
			}
		});

		postHeaderElement.append(menu);
	}

 	
	// Posted By Section
	var postedBy = $("<div>");
	var postedByName = $("<span>", {id: "postedByName"});
	postedByName.append($("<a>", {href: "/user/" + data.postedByUser.id, text: data.postedByUser.displayName, class: "text-plain-small text-bold link-gray"}));
	var postedByImage = $("<img>", {id: "postedByImage", class: "postedByImage"});
	postedByImage.prop("src", data.postedByUser.image);
	postedBy.append(postedByName);
	postedBy.append(postedByImage);

	var table = $("<table>");
	var tr1 = $("<tr>");
	var imageTd = $("<td>", {rowspan: "2"});
	imageTd.append(postedByImage);
	tr1.append(imageTd);

	var nameTd = $("<td>");
	nameTd.append(postedByName);
	tr1.append(nameTd);

	table.append(tr1);

	var tr2 = $("<tr>");
	var postedDateTd = $("<td>");
	var postedByDate = $("<span>", {id: "postedByDate", class: "text-plain-small text-italic", text: "Posted " + formatDate(data.postedDate)});
	postedByDate.append(postedByDate);

	if (data.categoryID && data.categoryName) {
		var postedCategory = $("<a>", {href: "/challenges?category=" + data.categoryID}).append(data.categoryName);
		postedByDate.append(" under ").append(postedCategory);
	}
	
	postedDateTd.append(postedByDate);
	tr2.append(postedDateTd);

	table.append(tr2);

	postHeaderElement.append(table);


	return postHeaderElement;
}

function createMenu(menuButton) {
	var menu = $("<div>", {class: "dropdown DropDown"});
	$(menuButton).addClass("class", "dropdown-toggle");
	$(menuButton).attr("data-toggle", "dropdown");
	var menuList = $("<ul>", {class: "dropdown-menu", role: "menu", "aria-labelledby" : $(menuButton).attr("id")});

	menu.append(menuButton);
	menu.append(menuList);

	return menu;
}

function appendMenuItemButton(menu, menuItemButton) {
	var menuList = menu.find(".dropdown-menu");

	//var button = $("<button>", {id: prefix + menuItemTag, class: "btn itemDropdownButton", type: "button"}).append(menuItemIcon).append(menuItemLabel);
	menuList.append($("<li>").append(menuItemButton));
}

/*
	Delete the item from the server permanently.
	Also, refresh client as required.
*/
function deleteItem(data) {
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
		refreshAfterDelete(data.id, data.type);
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		showAlert("There appears to be a problem deleting that item.  Please try again.", 2);
	});
}

function alreadyExists(element) {
	return (element.id == this);
}

/**
	Refresh the client after the specific item has been deleted from the server.
	Figure out the best way to refresh. 
**/
function refreshAfterDelete(id, type) {
	//figure out which page we're on
	if (type == "comment") {
		// Find the parent Id, and then refresh the list in place - Tested!
		var parentId = $("#" + id + "CommentElement").closest(".commentsList").data("id");
		refreshCommentsList(parentId);
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

function createCaptionSectionElement(data) {
	// Caption (if available)
	var captionSection = $("<div>", {class: "captionSection"});
	var caption = $("<span>", {class: "text-plain-large", text: data.caption});
	captionSection.append(caption);

	return captionSection;
}

function createSeparatorElement(type, separatorClass) {
	var separator = $("<span>", {class: separatorClass});

	if (type == "dot") {
		separator.append('\u00B7');
	} else if (type == "bar") {
		separator.append('\u007C');
	}
	
	return separator;
}

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
					alert("some error was found, " + jsonData.error);
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

function createCommentsSectionTrimmed(data) {
	var socialStatusSection = $("<div>", {class: "commentsSectionTrimmed"});
	var likeButton = $("<button>", {id: data.id + "LikeButton", type: "button", class: "buttonSimple"}).append("Like");
	var replyButton = $("<button>", {id: data.id + "ReplyButton", type: "button", class: "buttonSimple"}).append("Reply");
	var likeIcon = $("<span>", {id: data.id + "LikeIcon", class: "glyphicon glyphicon-thumbs-up"});
	var numLikes = $("<span>", {id: data.id + "NumLikes"}).append(" " + data.socialStatus.numLikes);

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
				$("#" + data.id + "LikeButton").addClass("active");
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
					alert("some error was found, " + jsonData.error);
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

	replyButton.click(function(e) {
		var newCommentElement = createNewCommentElement(true, data.id);
		//$("#" + data.id + "CommentElement").after(newCommentElement);
		appendNewCommentElement(newCommentElement, data.id, null, true);
	});

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

function createTimelapseView(data) {
	var timelapseStartButtonSection = $("<div>", {id: data.id + "TimelapseSection", class: "timelapseSection"});
	var startTimelapseIcon = $("<span>", {class: "glyphicon glyphicon-play-circle"});
	var startTimelapseButton = $("<button>", {id: data.id + "StartTimeLapseButton", type: "button", class: "btn btn-primary btn-lg timelapseButton"});
	startTimelapseButton.append(startTimelapseIcon).append("  ").append("Timelapse View");
	timelapseStartButtonSection.append(startTimelapseButton);

	startTimelapseButton.click(function() {
		$.getJSON('/api/filters/timelapse/' + entityId, function(data) {
			startTimelapse(entityId, data.timelapseData);
		})
		.fail(function() {
			window.location.replace("/error?reload=yes"); //reload the page to see if it works the next time
		});
	});

	return timelapseStartButtonSection;
}

var timelapseIndex = 0;
var timelapseTimer;
var rangeUpdateTimer;
var rangeUpdateCount = 0;

function startTimelapse(entityId, data) {
	//change the look to that of a theatre
	$("#" + entityId + "MainElement").css("background", "black");
	$("#" + entityId + "PostedBySection").css("visibility", "hidden");
	$("#" + entityId + "TimelapseSection").css("visibility", "hidden");
	$("#" + entityId + "SocialStatus").css("visibility", "hidden");

	//show the slider view
	var rangeSelector = $("<input>", {id: entityId + "TimelapseRange", class: "timelapseRange", type: "range", min:"0", max:"" + (data.length - 1) * 2000})
	$("#" + entityId + "BottomBar").append(rangeSelector);

	nextTimelapse(entityId, data);
	timelapseTimer = window.setInterval(function() {nextTimelapse(entityId, data);}, 2000);
	rangeUpdateTimer = window.setInterval(updateTimelapseRange, 10);
}

function updateTimelapseRange() {
	rangeUpdateCount += 10;
	$("#" + entityId + "TimelapseRange").val(rangeUpdateCount);
}

function fadeToImage(imageId, newSrc) {
	$("#" + imageId).attr("src", newSrc);

	/*
	$("#" + imageId).fadeTo(1000,0.30, function() {
		$("#" + imageId).attr("src", newSrc);
  	}).fadeTo(500,1);
  	*/
}

function nextTimelapse(entityId, data) {
	if (data[timelapseIndex].imageType == "url") {
		//$("#mainImage").attr("src", data[timelapseIndex].imageData);
		fadeToImage("mainImage", data[timelapseIndex].imageData);
	} else {
		//$("#mainImage").attr("src", "data:image/jpeg;base64," + data[timelapseIndex].imageData);
		fadeToImage("mainImage", "data:image/jpeg;base64," + data[timelapseIndex].imageData);
	}
	
	//set the range input
	$("#" + entityId + "TimelapseRange").val(timelapseIndex * 2000);
	timelapseIndex++;

	if (timelapseIndex == data.length) {
		window.clearInterval(timelapseTimer);	 
		window.clearInterval(rangeUpdateTimer);
		window.setTimeout(function() {stopTimelapse(entityId, data);}, 2000);
	}
}

function stopTimelapse(entityId, data) {
	//change the look to that of a theatre
	$("#" + entityId + "MainElement").css("background", "");
	$("#" + entityId + "PostedBySection").css("visibility", "");
	$("#" + entityId + "TimelapseSection").css("visibility", "");
	$("#" + entityId + "SocialStatus").css("visibility", "");
	$("#" + entityId + "TimelapseRange").css("visibility", "hidden");
}



function createEntityImageElement(data) {
	var entityImage = $("<img>", {id: data.id + "EntityImage", class: "mainImage"});
	entityImage.prop("src", data.image);
	return entityImage;
}

function createMainImageElement(data) {
	var mainImage = $("<img>", {id: "mainImage", class: "mainImage"});
	mainImage.prop("src", data.image);
	return mainImage;
}

function createTextElement(data) {
	var textElement = $("<div>", {class: "commentText text-plain-small"});
	textElement.text(data.text);
	return textElement;
}

function createMainElement(data, setupTimelapseView) {
	var element = $("<div>", {id: data.id + "MainElement", class: "mainElement"});

	element.append(createPostHeaderElement(data));
	element.append(createMainImageElement(data));

	if (data.caption) {
		element.append(createCaptionSectionElement(data));
	}
	
	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}

	if (setupTimelapseView) {
		element.append(createTimelapseView(data));
	}

	//container for likers list, if any
	var likersPopupHeader = $("<h2>").append("Likers");
	var likersPopupBody = createLikersContainer(data);
	element.append(createPopupElement(data.id + "LikersPopup", likersPopupHeader, null, likersPopupBody, function() {
		showHideLikersList(data.id);
	}));

	return element;
}

function createScrollableElement(data) {
	var element = $("<div>", {id: data.id + "ScrollableElement", class: "scrollableElement"});

	element.append(createPostHeaderElement(data));

	var imageLink = $("<a>", {href: data.link}).append(createEntityImageElement(data));
	element.append(imageLink);

	if (data.caption) {
		element.append(createCaptionSectionElement(data));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}
	
	//container for comments, if any
	element.append(createCommentsContainer(data));

	//container for likers list, if any
	var likersPopupHeader = $("<h2>").append("Likers");
	var likersPopupBody = createLikersContainer(data);
	element.append(createPopupElement(data.id + "LikersPopup", likersPopupHeader, null, likersPopupBody, function() {
		showHideLikersList(data.id);
	}));

	return element;
}

function createActivitySectionElement(data) {
	var activitySection = $("<div>", {id: data.id + "ActivitySection", class: "activitySection"});
	var activityText = $("<span>", {id: data.id + "ActivityText", class: "text-plain-small"});

	if (data.activity) {
		if (data.activity.type == "recentlyLiked") {
			if (data.activity.like && data.activity.like.postedByUser) {
				var userLink = $("<a>", {href: "/user/" + data.activity.like.postedByUser.id}).append(data.activity.like.postedByUser.displayName);
				activityText.append(userLink).append(" likes this " + formatDate(data.activity.like.postedDate));
			}
		} else if (data.activity.type == "recentlyCommented") {
			if (data.activity.comment && data.activity.comment.postedByUser) {
				var userLink = $("<a>", {href: "/user/" + data.activity.comment.postedByUser.id}).append(data.activity.comment.postedByUser.displayName);
				activityText.append(userLink).append(" commented on this " + formatDate(data.activity.comment.postedDate));
			}
		} else if (data.activity.type == "highLikeCount" || data.activity.type == "highCommentCount") {
			activityText.append("Popular among other users");
		}

		activitySection.append(activityText);
	}

	return activitySection;
}

function createTextSection(data) {
	var textSection = $("<div>", {id: data.id + "TextSection", class: "textSection"});
	return textSection;
}

function createSocialStatusSectionElement(data, full /* Show all content */) {
	var socialStatus = $("<div>", {id: data.id + "SocialStatus", class: "socialStatusSection"});

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
			$('#' + data.id + 'Tabs a[href="#entries"]').tab('show');
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
				$('#' + data.id + 'Tabs a[href="#followers"]').tab('show');
			});
			socialStatus.append(followersButton);
		}
		
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
				$('#' + data.id + 'Tabs a[href="#posts"]').tab('show');
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
	Show or Hide the Comments List associated with the given Entity.
	parentId - Entity id to which the list is attached (eg. Challenge, Entry, etc.)
**/
function showHideCommentsList(parentId, show) {
	//comments list is currently hidden, so fetch comments and show the list
	if (show) {
		if ($("#" + parentId + "CommentsContainer").is(":empty")) { 
			$.getJSON("/api/comments/?entityId=" + parentId + "&sortBy=reverseDate", function(list) {
				var commentsList = createCommentsList(parentId, list);
				$("#" + parentId + "CommentsContainer").empty().append(commentsList);
				$("#" + parentId + "NewCommentText").focus(); // set focus in the input field
			})
			.fail(function() {
				//eat this
			});

			//if we're showing the comments list on a popup, then show the popup
			if ($("#" + parentId + "CommentsPopup").length) {
				$("#" + parentId + "CommentsPopup").show();
			}
		}

		//make sure the tab is 'active', not just 'shown'
		$('#' + parentId + 'Tabs a[href="#comments"]').tab('show');
	} else {
		if (!$("#" + parentId + "CommentsContainer").is(":empty")) {
			$("#" + parentId + "CommentsContainer").empty();

			//if we're showing the comments list on a popup, then hide the popup
			if ($("#" + parentId + "CommentsPopup").length) {
				$("#" + parentId + "CommentsPopup").hide();
			}
		}
	}
}

/**
	Refresh the comments list attached to the given entity (parentId)
	This assumes that the comments list is already showing to the user
**/
function refreshCommentsList(parentId) {
	$.getJSON("/api/comments/?entityId=" + parentId + "&sortBy=reverseDate", function(list) {
		var commentsList = createCommentsList(parentId, list);
		$("#" + parentId + "CommentsContainer").empty().append(commentsList);
		$("#" + parentId + "NewCommentText").focus(); // set focus in the input field

		//also, update the counter
		$("#" + parentId + "NumComments").text(list.length);
	})
	.fail(function() {
		//eat this
	});
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
	
	// ADD ENTRY BUTTON ---------------------------------
	if (data.socialStatus.entries) {
		var addEntryButton = $("<button>", {id: data.id + "AddEntryButton", type: "button", class: "button-active-link text-plain-small text-bold"});
		addEntryButton.append($("<span>", {class: "glyphicon glyphicon-flag glyphiconAlign"})).append(" Captionify");
		socialActionsSection.append(addEntryButton);

		addEntryButton.click(function(e) {
			window.open("/challenge/" + data.id + "/newentry", "_self");
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
						alert("some error was found " + err);
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
      	showAlert("Posted successfully!", 2);
  	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		showAlert("There appears to be a problem posting.  Please try again later.", 2);
	});	
}

/*
	Good looking alert box that fades away after a certain number of seconds
*/
function showAlert(message, secondsToFade) {
	alert(message);
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

function createFeedElement(data) {
	var element = $("<div>", {id: data.id + "FeedElement", class: "feedElement"});

	if (data.activity && data.activity.type != "recentlyPosted") {
		element.append(createActivitySectionElement(data));
	}

	element.append(createPostHeaderElement(data));

	if (data.text) {
		element.append(createTextSection(data));
	}

	var imageElement = createEntityImageElement(data);

	if (data.link) {
		var imageLink = $("<a>", {href: data.link}).append(imageElement);
		element.append(imageLink);
	} else {
		element.append(imageElement);
	}

	if (data.caption) {
		element.append(createCaptionSectionElement(data));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}

	//container for comments, if any
	element.append(createCommentsContainer(data));

		//container for likers list, if any
	var likersPopupHeader = $("<h2>").append("Likers");
	var likersPopupBody = createLikersContainer(data);
	element.append(createPopupElement(data.id + "LikersPopup", likersPopupHeader, null, likersPopupBody, function() {
		showHideLikersList(data.id);
	}));

	return element;
}

function createLikersContainer(data) {
	var container = $("<div>", {id: data.id + "LikersContainer"}).empty();

	return container;
}

function createCommentsContainer(data) {
	var container = $("<div>", {id: data.id + "CommentsContainer"}).empty();

	if (data.activity && data.activity.comment) {
		//data.activity.comment.postedByUser = data.activity.user;
		container.append(createCommentElement(data.activity.comment, data.id, false));
	}

	return container;
}

function createCommentElement(data, parentId, isReply) {
	var element = $("<div>", {id: data.id + "CommentElement", class: "commentElement"});
	if (isReply) {
		element.addClass("replyElement");
	}

	var table = $("<table>", {class: "commentsTable"});

	var tr = $("<tr>", {class: "commentsRow"});

	var tdLeft = $("<td>", {class: "commentsLeftColumn"});
	var postedByImage = $("<img>", {id: "postedByImage", class: "postedByImage"});
	postedByImage.prop("src", data.postedByUser.image);
	tdLeft.append(postedByImage);
	tr.append(tdLeft);

	var tdRight = $("<td>", {class: "commentsRightColumn"});
	var postedByName = $("<span>", {id: "postedByName", class: "postedByName text-plain-small text-bold"});
	postedByName.append($("<a>", {href: "/user/" + data.postedByUser.id, text: data.postedByUser.displayName, class: "link-gray"}));
	tdRight.append(postedByName);

	tdRight.append("  ");

	var commentText = $("<span>", {class: "commentText text-plain-small", text: data.text});
	tdRight.append(commentText);

	tdRight.append("<br>");

	tdRight.append(createSocialStatusSectionComment(data, parentId, isReply));

	tr.append(tdRight);

	table.append(tr);
	element.append(table);

	return element;
}

function createNewCommentElement(isReply, parentId) {
	var element = $("<div>", {id: parentId + "NewCommentElement", class: "commentElement"});
	if (isReply) {
		element.addClass("replyElement");
	}

	var table = $("<table>", {class: "commentsTable"});

	var tr = $("<tr>", {class: "commentsRow"});

	var tdLeft = $("<td>", {class: "commentsLeftColumn"});
	var postedByImage = $("<img>", {id: "postedByImage", class: "postedByImage"});
	postedByImage.prop("src", user.image);
	tdLeft.append(postedByImage);
	tr.append(tdLeft);

	var tdRight = $("<td>", {class: "commentsRightColumn"});

	var input = $("<input>", {type: "text", id: parentId + "NewCommentText", class:"form-control", placeholder: "Add your comment here"});

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
		    	var commentElement = createCommentElement(data, parentId, isReply);
		    	var atEnd = (!isReply);
		    	appendCommentElement(commentElement, parentId, isReply);
		    	if (isReply) {
		    		$("#" + parentId + "NewCommentElement").remove();
		    	} else {
		    		$("#" + parentId + "NewCommentText").prop("value", "").blur().focus();
		    		
		    		//update the numComments in the Social Status section
		    		var numComments = parseInt($("#" + parentId + "NumComments").text());
		    		numComments++;
		    		$("#" + parentId + "NumComments").text(numComments);
		    		$("#" + parentId + "CommentsButton").show();
		    	}
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				showAlert("There appears to be a problem posting your comment.  Please try again.", 2);
			});
	    }
	});

	tr.append(tdRight);

	table.append(tr);
	element.append(table);

	return element;
}

function appendNewCommentElement(newCommentElement, parentId, container, isReply) {
	//var newCommentElement = createNewCommentElement(false, entityId);
	//$("#" + parentId).append(newCommentElement);
	if (!isReply) { //new top level comment, append to the end of the list
		//parentElementId should be the container ID
		container.append(newCommentElement);
	} else {
		//adding a new reply
		var parentElement = $("#" + parentId + "CommentElement");
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

function appendCommentElement(commentElement, parentId, isReply) {
	//var commentElement = createCommentElement(data);
	if (!isReply) {
		$("#" + parentId + "NewCommentElement").before(commentElement);
		//$("#" + parentId + "CommentsList").append(commentElement);
	} else {
		//reply
		var parentElement = $("#" + parentId + "CommentElement");
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

function createThumbnailElement(data, createLink) {
	var element = $("<div>", {class: "thumbnailElement"});

	if (data.postedDate) {
		element.append(createPostHeaderElement(data));
	}


	if(createLink) {
		var imageLink = $("<a>", {href: data.link}).append(createEntityImageElement(data));
		element.append(imageLink);
	} else {
		element.append(createEntityImageElement(data));
	}

	if (data.caption) {
		var link = $("<a>", {href: data.link}).append(createCaptionSectionElement(data));
		element.append(link);
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}

	//container for comments, if any
	var commentPopupHeader = $("<h2>").append("Comments");
	var commentPopupBody = createCommentsContainer(data);
	element.append(createPopupElement(data.id + "CommentsPopup", commentPopupHeader, null, commentPopupBody, function() {
		showHideCommentsList(data.id, false);
	}));

	//container for likers list, if any
	var likersPopupHeader = $("<h2>").append("Likers");
	var likersPopupBody = createLikersContainer(data);
	element.append(createPopupElement(data.id + "LikersPopup", likersPopupHeader, null, likersPopupBody, function() {
		showHideLikersList(data.id);
	}));

	return element;
}

function createPopupElement(id, headerContent, footerContent, bodyContent, closeCallback) {
	var element = $("<div>", {id: id, class: "modal"});
	
	var closeButton = $("<span>", {id: id + "PopupClose", class: "close"}).append("&times;");
	closeButton.click(function() {
		closeCallback();
	});

	var header = $("<div>", {class: "modal-header"}).append(closeButton);
	if (headerContent) {
		header.append(headerContent);
	}

	var body = $("<div>", {class: "modal-body"});
	if (bodyContent) {
		body.append(bodyContent);
	}

	var footer = $("<div>", {class: "modal-footer"});
	if (footerContent) {
		footer.append(footerContent);
	}

	var content = $("<div>", {class: "modal-content"});
	content.append(header);
	content.append(body);
	content.append(footer);

	element.append(content);

	return element;
}

function createGrid(id, list, numCols, allowHover, allowSelection, defaultSelectedID, selectionCallback) {
	var table = $("<table>", {id: id});

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
				var element = createThumbnailElement(data, !allowSelection);

				if (allowHover) {
					element.addClass("elementHover");
				}

				if (allowSelection) {
					element.click({id: data.id, element: element}, function(e) {
						$("#" + id + " .thumbnailElement").removeClass("active"); //unselect all first
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

function createScrollableList(id, list) {
	var container = $("<div>", {id: id, class: "scrollabeList"});

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var scrollableElement = createScrollableElement(data);
		container.append(scrollableElement);
	}

	return container;
}

function createFeedList(id, list) {
	var container = $("<div>", {id: id, class: "feedList"});

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var feedElement = createFeedElement(data);
		container.append(feedElement);
	}

	return container;
}

function createLikersList(id, list) {
	var container = $("<div>", {id: id + "LikersList", class: "likersList", "data-id": id});

	var table = $("<table>");

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var row = $("<tr>");
		var userImage = $("<img>", {src: data.image, class: "likerImage"});

		var userName = $("<span>", {class: "userName"}).append(data.caption);
		var followButton = $("<button>", {type: "button", id: data.id + "FollowButton"});
		if (data.socialStatus.follows.amFollowing) {
			//already following
			followButton.append($("<span>", {class: "glyphicon glyphicon-ok"}).append(" Following"));
			followButton.attr("disabled", "disabled"); // no need to be clickable as already following
		} else {
			followButton.append($("<span>", {class: "glyphicon glyphicon-plus"}).append(" Follow"));
			followButton.click((function(id) {
				return function(e) {

				sendFollow(id, true, function(err, followResult) {
					if (err) {
						//eat this
					} else {
						if (followResult) {
							//now following
							var button = $("#" + id + "FollowButton");
							button.empty();
							button.append($("<span>", {class: "glyphicon glyphicon-ok"}).append(" Following"));
							button.attr("disabled", "disabled"); // no need to be clickable as already following
						}
					}
				});
			}
		})(data.id));
		}

		row.append($("<td>").append(userImage));
		row.append($("<td>").append(userName));
		row.append($("<td>").append(followButton));

		table.append(row);
	}

	container.append(table);

	return container;
}

function createCommentsList(id, list) { //id is the entity id
	var container = $("<div>", {id: id + "CommentsList", class: "commentsList", "data-id" : id});

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var commentElement = createCommentElement(data, id, false);
		container.append(commentElement);

		//passing the right array element to the callback by using the technique desribed at https://stackoverflow.com/questions/27364891/passing-additional-arguments-into-a-callback-function
		(function(id) {
			$.getJSON("/api/comments/?entityId=" + id + "&sortBy=reverseDate", function(replyList) {
				if (replyList.length > 0) {
					for (var j = 0; j < replyList.length; j++) {
						var replyData = replyList[j];

						var replyElement = createCommentElement(replyData, id, true);
						appendCommentElement(replyElement, id, true);
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
		var newCommentElement = createNewCommentElement(false, id);
		appendNewCommentElement(newCommentElement, id, container, false);
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

function refreshThumbnailView(contentTag) {
	$("#" + contentTag + "GridTable").remove();

	var list = jQuery.data(document.body, contentTag + "List");

	var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null, null);
	$("#" + contentTag + "Container").append(grid);
}

function refreshFilmstripView(contentTag) {
	$("#" + contentTag + "ScrollableList").remove();

	var list = jQuery.data(document.body, contentTag + "List");

	var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
	$("#" + contentTag + "Container").append(scrollableList);
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


	if (viewOptions && viewOptions.length > 1) {
		var viewGroup = $("<div>", {id: contentTag + "ViewGroup", class: "btn-group", "data-toggle": "buttons"});
		for (var i = 0; i < viewOptions.length; i++) {
			var viewOption = viewOptions[i];
			if (viewOption.type == "thumbnail") {
				viewGroup.append($("<button>", {id: "thumbnailViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-th"})).append(" Thumbnail View"));
			} else if (viewOption.type == "filmstrip") {
				viewGroup.append($("<button>", {id: "scrollableViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-film"})).append(" Filmstrip View"));
			} else if (viewOption.type == "comments") {
				viewGroup.append($("<button>", {id: "commentsViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-film"})).append(" Comments View"));
			}
		}
		container.append(viewGroup);
	}

	if (sortOptions && sortOptions.length > 1) {
		var sortGroup = $("<div>", {id: contentTag + "SortGroup", class: "btn-group pull-right"});
		for (var i = 0; i < sortOptions.length; i++) {
			var sortOption = sortOptions[i];
			if (sortOption.type == "date") {
				sortGroup.append($("<button>", {id: "postedDateSortButton", type: "button", class: "btn btn-default", "data-getURL": sortOption.url}).append($("<span>", {class: "glyphicon glyphicon glyphicon-time"})).append(" Sort by Date"));
			} else if (sortOption.type == "popularity") {
				sortGroup.append($("<button>", {id: "popularitySortButton", type: "button", class: "btn btn-default", "data-getURL": sortOption.url}).append($("<span>", {class: "glyphicon glyphicon glyphicon-thumbs-up"})).append(" Sort by Popularity"));
			}
		}
		container.append(sortGroup);
	}

	var getURL = sortOptions[0].url;

	refreshListAndUpdateContent(getURL, entityId, contentTag, viewOptions[0].type);

	$("#" + contentTag + "ViewGroup button").click(function() {
		$("#" + contentTag + "ScrollableList").remove();
		$("#" + contentTag + "GridTable").remove();

		var buttonID = this.id;

		var list = jQuery.data(document.body, contentTag + "List");
		
		if (buttonID == "thumbnailViewButton") {
			var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null, null);
			container.append(grid);
		} else if (buttonID == "scrollableViewButton") {
			var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
			container.append(scrollableList);
		} else if (buttonID == "commentsViewButton") {
			var commentsList = createCommentsList(entityId, list);
			var commentsContainer = $("<div>", {id: entityId + "CommentsContainer"}).empty();
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
				var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null, null);
				$("#" + contentTag + "Container").append(grid);
			} else if (viewOptionsButtonID == "scrollableViewButton") {
				var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
				$("#" + contentTag + "Container").append(scrollableList);
			}
		} else {
			if (defaultViewType == "thumbnail") {
				var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null, null);
				$("#" + contentTag + "Container").append(grid);
			} else if (defaultViewType == "filmstrip") {
				var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
				$("#" + contentTag + "Container").append(scrollableList);
			} else if (defaultViewType == "comments") {
				var commentsList = createCommentsList(entityId, list);
				var commentsContainer = $("<div>", {id: entityId + "CommentsContainer"}).empty();
				commentsContainer.append(commentsList);
				$("#" + contentTag + "Container").append(commentsContainer);
			} else if (defaultViewType == "feed") {
				var feedList = createFeedList(contentTag + "FeedList", list);
				$("#" + contentTag + "Container").append(feedList);
			}
		}
	}).fail(function() {
		window.location.replace("/error");
	});
}

//$('#' + parentId + 'Tabs a[href="#comments"]').tab('show');
function setupTabRedirection(id) {
	// Javascript to enable link to tab
	var url = document.location.toString();
	if (url.match('#')) {
		var hash = url.split('#')[1];
	    $('#' + id + 'Tabs a[href="#' + hash + '"]').tab('show');
	} //add a suffix

	// Change hash for page-reload
	$('.nav-tabs a').on('shown.bs.tab', function (e) {
	    window.location.hash = e.target.hash;
	});

	var element = document.getElementById(id + "Tabs");
	element.scrollIntoView(true);
}


/**
	Update the given sidebar with the given list of items
	Each item in the list is an object of form {type: "link or button or separator", name: "Name", link: "some link"}
**/
function updateSidebar(id, heading, list) {
	var sidebar = $("#" + id);
	$(sidebar).empty();

	//set the title
	$(sidebar).append($("<span>", {class: "sidebarHeading"}).append(heading));

	//now insert items
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		if (item.type && item.type == "link") {
			$(sidebar).append($("<a>", {class: "sidebarLink", href: item.link}).append(item.name));
		}
	}
}

function createCategorySidebar() {
	var list = [];
	$.getJSON("/api/categories/", function(result) {
		for (var i = 0; i < result.length; i++) {
			list.push({type: "link", name: result[i].name, link: "/challenges/?category=" + result[i].id});
		}

		updateSidebar("categoriesSidebar", "Categories", list);
	})
	.fail(function() {
		//eat this
	});
}

/**
	Update the given sidebar with the given list of items
	Each item in the list is an object of the form: {image: <image link>, name: <name>, link: <link>, description: <description>}
**/
function updateRichSidebar(id, heading, list, singleColumn) {
	var sidebar = $("#" + id);
	$(sidebar).empty();

	//set the title
	$(sidebar).append($("<span>", {class: "sidebarHeading"}).append(heading));

	//now insert items
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var sidebarItem = $("<div>", {class: "sidebarItem"});

		if (singleColumn) { // single column
			var imageTd = $("<td>", {class: "sidebarItemImage"}).append($("<img>", {src: item.image}));
			var titleTd = $("<td>", {class: "sidebarItemTitle"}).append($("<a>", {href: item.link}).append(item.name));
			var descriptionTd = $("<td>", {class: "sidebarItemDescription"}).append($("<span>").append(item.description));

			var table = $("<table>").append($("<tr>").append(imageTd)).append($("<tr>").append(titleTd)).append($("<tr>").append(descriptionTd));
		
		} else { // 2 column
			var imageTd = $("<td>", {class: "sidebarItemImage", rowspan: "2"}).append($("<img>", {src: item.image}));
			var titleTd = $("<td>", {class: "sidebarItemTitle"}).append($("<a>", {href: item.link}).append(item.name));
			var descriptionTd = $("<td>", {class: "sidebarItemDescription"}).append($("<span>").append(item.description));

			var table = $("<table>").append($("<tr>").append(imageTd).append(titleTd)).append($("<tr>").append(descriptionTd));
		}

		sidebarItem.append(table);
		$(sidebar).append(sidebarItem);
	}
}

function createPopularChallengesSidebar() {
	var list = [];
	$.getJSON("/api/challenges?sortBy=popularity", function(result) {
		for (var i = 0; i < result.length; i++) {
			var data = result[i];
			var description = "";
			if (data.socialStatus.likes && data.socialStatus.likes.numLikes > 0) {
				description += data.socialStatus.likes.numLikes + " Likes";
			}
			if (data.socialStatus.shares && data.socialStatus.shares.numShares > 0) {
				description += (description.length > 0) ? (", ") : ("");
				description += data.socialStatus.shares.numShares + " Shares";
			}
			if (data.socialStatus.comments && data.socialStatus.comments.numComments > 0) {
				description += (description.length > 0) ? (", ") : ("");
				description += data.socialStatus.comments.numComments + " Comments";
			}
			if (data.socialStatus.entries && data.socialStatus.entries.numEntries > 0) {
				description += (description.length > 0) ? (", ") : ("");
				description += data.socialStatus.entries.numEntries + " Entries";
			}

			list.push({image: data.image, name: data.caption, link: data.link, description: description});
		}

		updateRichSidebar("popularChallengesSidebar", "Popular Challenges", list, true);
	})
	.fail(function() {
		//eat this
	});
}

function createPopularEntriesSidebar() {
	var list = [];
	$.getJSON("/api/entries?sortBy=popularity", function(result) {
		for (var i = 0; i < result.length; i++) {
			var data = result[i];
			var description = "";
			if (data.socialStatus.likes && data.socialStatus.likes.numLikes > 0) {
				description += data.socialStatus.likes.numLikes + " Likes";
			}
			if (data.socialStatus.shares && data.socialStatus.shares.numShares > 0) {
				description += (description.length > 0) ? (", ") : ("");
				description += data.socialStatus.shares.numShares + " Shares";
			}
			if (data.socialStatus.comments && data.socialStatus.comments.numComments > 0) {
				description += (description.length > 0) ? (", ") : ("");
				description += data.socialStatus.comments.numComments + " Comments";
			}

			list.push({image: data.image, name: data.caption, link: data.link, description: description});
		}

		updateRichSidebar("popularEntriesSidebar", "Popular Entries", list, true);
	})
	.fail(function() {
		//eat this
	});
}

function createPopularUsersSidebar() {
	var list = [];
	$.getJSON("/api/users?sortBy=popularity", function(result) {
		for (var i = 0; i < result.length; i++) {
			var data = result[i];
			var description = "";
			if (data.socialStatus.follows && data.socialStatus.follows.numFollowers > 0) {
				description += data.socialStatus.follows.numFollowers + " Followers";
			}
			if (data.socialStatus.posts 	 && data.socialStatus.posts.numPosts > 0) {
				description += (description.length > 0) ? (", ") : ("");
				description += data.socialStatus.posts.numPosts + " Posts";
			}

			list.push({image: data.image, name: data.caption, link: data.link, description: description});
		}

		updateRichSidebar("popularUsersSidebar", "Popular Users", list, true);
	})
	.fail(function() {
		//eat this
	});
}

/*
	Update the Shortcuts sidebar with the User Profile link, incase the user is signed in
*/
function updateShortcutsSidebar() {
	if (user) {
		var link = $("<a>", {id: "sidebarProfileLink", class: "sidebarLink", href: "/user"}).append(user.displayName);
		$("#shortcutsSidebar a:nth-of-type(1)").after(link);
	} else {
		$("#sidebarProfileLink").remove();
	}
}

/*
	Keep the sidebars scrollable but visible in fixed positions.
	Refer https://stackoverflow.com/questions/45626470/allow-one-column-to-scroll-till-end-of-content-and-then-remain-fixed
*/
function keepSidebarVisible() {
	$(window).scroll(function(event) {
        $('.fixed').scrollTop($(this).scrollTop());
    });
}