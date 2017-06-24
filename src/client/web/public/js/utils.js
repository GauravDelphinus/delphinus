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
            callback(data, e.target.result, escape(theFile.name));
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
	var tabGroup = $("<div>", {id: id, class: "container"});
	tabGroup.append($("<ul>", {class: "nav nav-tabs"}));
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

function createPostedBySectionElement(data) {
	// Posted By Section
	var postedBySection = $("<div>", {id: data.id + "PostedBySection", class: "postedBySection"});
	var postedByDate = $("<span>", {id: "postedByDate", class: "postedByDate", text: "Posted " + formatDate(data.postedDate)});
	var postedBy = $("<div>", {class: "postedBy"});
	var postedByName = $("<span>", {id: "postedByName", class: "postedByName"});
	postedByName.append($("<a>", {href: "/user/" + data.postedByUser.id, text: data.postedByUser.displayName}));
	var postedByImage = $("<img>", {id: "postedByImage", class: "postedByImage"});
	postedByImage.prop("src", data.postedByUser.image);
	postedBy.append(postedByName);
	postedBy.append(postedByImage);

	postedBySection.append(postedByDate);
	postedBySection.append(postedBy);

	return postedBySection;
}

function createCaptionSectionElement(data) {
	// Caption (if available)
	var captionSection = $("<div>", {class: "captionSection"});
	var caption = $("<span>", {class: "caption", text: data.caption});
	captionSection.append(caption);

	return captionSection;
}

function createSocialStatusSectionSimple(data) {
	var socialStatusSection = $("<div>", {class: "socialStatusSectionSimple"});
	var likeButton = $("<button>", {id: data.id + "LikeButton", type: "button", class: "likeButtonSimple"}).append("Like");
	var replyButton = $("<button>", {id: data.id + "ReplyButton", type: "button", class: "likeButtonSimple"}).append("Reply");
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
	console.log("stopTimelapse, entityId is " + entityId);
	

	//change the look to that of a theatre
	$("#" + entityId + "MainElement").css("background", "");
	$("#" + entityId + "PostedBySection").css("visibility", "");
	$("#" + entityId + "TimelapseSection").css("visibility", "");
	$("#" + entityId + "SocialStatus").css("visibility", "");
	$("#" + entityId + "TimelapseRange").css("visibility", "hidden");
}

function createSocialStatusSectionElement(data) {
	//console.log("createSocialStatusSectionElement, data is " + JSON.stringify(data));
	// Social Status Section
	var socialStatus = $("<div>", {id: data.id + "SocialStatus", class: "socialStatus"});
	var numLikes = $("<span>", {class: "glyphicon glyphicon-thumbs-up"});
	var numShares = $("<span>", {class: "glyphicon glyphicon-share-alt"});
	var numComments = $("<span>", {class: "glyphicon glyphicon-comment"});
	var likeButton = $("<button>", {id: data.id + "LikeButton", type: "button", class: "btn btn-primary btn-lg socialActionButton"});
	var shareButton = $("<button>", {id: data.id + "ShareButton", type: "button", class: "btn btn-primary btn-lg socialActionButton"});
	var commentButton = $("<button>", {id: data.id + "CommentButton", type: "button", class: "btn btn-primary btn-lg socialActionButton"});
	likeButton.append(numLikes).append(" ").append($("<span>", {id: data.id + "NumLikes", text: data.socialStatus.numLikes}));
	shareButton.append(numShares).append("  ").append($("<span>", {id: data.id + "NumShares", text: data.socialStatus.numShares}));
	commentButton.append(numComments).append("  ").append($("<span>", {id: data.id + "NumComments", text: data.socialStatus.numComments}));
	socialStatus.append(likeButton);
	socialStatus.append(shareButton);
	socialStatus.append(commentButton);

	if (data.socialStatus.numEntries) {
		var numEntries = $("<span>", {class: "glyphicon glyphicon-flag"});
		var entriesButton = $("<button>", {id: data.id + "EntriesButton", type: "button", class: "btn btn-primary btn-lg socialActionButton"});
		entriesButton.append(numEntries).append("  ").append($("<span>", {id: data.id + "NumEntries", text: data.socialStatus.numEntries}));
		socialStatus.append(entriesButton);

		entriesButton.click(function(e) {
		window.open(data.link + "#entries", "_self");
	});
	}

	//console.log("user is " + JSON.stringify(user));
	var restURL;
	if (data.type == "challenge") {
		restURL = "/api/challenges/" + data.id + "/like";
	} else if (data.type == "entry") {
		restURL = "/api/entries/" + data.id + "/like";
	}

	if (user) {
		$.getJSON(restURL, function(result) {
			if (result.likeStatus == "on") {
				//show button as depressed
				$("#" + data.id + "LikeButton").addClass("active");
			}
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
						$("#" + data.id + "NumLikes").text(numLikes + 1);
					} else {
						$("#" + data.id + "LikeButton").removeClass("active");
						$("#" + data.id + "NumLikes").text(numLikes - 1);
					}
				}
			});
		} else {
			window.open("/auth", "_self");
		}
	
	});

	commentButton.click(function(e) {
		window.open(data.link + "#comments", "_self");
	});

	return socialStatus;
}



function createImageElement(data) {
	var mainImage = $("<img>", {id: "mainImage", class: "mainImage"});
	mainImage.prop("src", data.image);
	return mainImage;
}

function createTextElement(data) {
	var textElement = $("<div>", {class: "commentText"});
	textElement.text(data.text);
	return textElement;
}

function createMainElement(data, setupTimelapseView) {
	var element = $("<div>", {id: data.id + "MainElement", class: "mainElement"});

	element.append(createPostedBySectionElement(data));
	element.append(createImageElement(data));

	if (data.caption) {
		element.append(createCaptionSectionElement(data));
	}

	var bottomBar = $("<div>", {id: data.id + "BottomBar", class: "bottomBar"});
	bottomBar.append(createSocialStatusSectionElement(data));
	if (setupTimelapseView) {
		bottomBar.append(createTimelapseView(data));
	}
	
	element.append(bottomBar);

	return element;
}

function createScrollableElement(data) {
	var element = $("<div>", {class: "scrollableElement"});

	element.append(createPostedBySectionElement(data));

	var imageLink = $("<a>", {href: data.link}).append(createImageElement(data));
	element.append(imageLink);

	if (data.caption) {
		element.append(createCaptionSectionElement(data));
	}

	element.append(createSocialStatusSectionElement(data));

	return element;
}

function createCommentElement(data, isReply) {
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
	var postedByName = $("<span>", {id: "postedByName", class: "postedByName"});
	postedByName.append($("<a>", {href: "/user/" + data.postedByUser.id, text: data.postedByUser.displayName}));
	tdRight.append(postedByName);

	tdRight.append("  ");

	var commentText = $("<span>", {class: "commentText", text: data.text});
	tdRight.append(commentText);

	tdRight.append("<br>");

	tdRight.append(createSocialStatusSectionSimple(data));

	tr.append(tdRight);

	table.append(tr);
	element.append(table);

	//handle reply button

	/*	
	element.append(createPostedBySectionElement(data));

	element.append(createTextElement(data));

	element.append(createSocialStatusSectionElement(data));
	*/

	return element;
}

function createNewCommentElement(isReply, parentId) {
	console.log("createNewCommentElement, user is " + JSON.stringify(user));
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

	var input = $("<input>", {type: "text", id: "newCommentText", class:"form-control", placeholder: "Add your comment here"});

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
				//alert("Challenge posted successfully, challenge id = " + data._id);
		    	//appendCommentElement("comments", data);
		    	var commentElement = createCommentElement(data, isReply);
		    	appendCommentElement(commentElement, parentId);
		    	if (isReply) {
		    		$("#" + parentId + "NewCommentElement").remove();
		    	} else {
		    		$("#" + parentId + "NewCommentElement").prop("placeholder", "Add your comment here");
		    	}
			})
			.fail(function(jqXHR, textStatus, errorThrown) {
				alert("some error was found, " + errorThrown);
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
}

function appendCommentElement(commentElement, parentId) {
	//var commentElement = createCommentElement(data);
	if (parentId == entityId) {
		$("#" + entityId + "NewCommentElement").before(commentElement);
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
		
		//var nextSibling = parentElement.next(":not(.replyElement)");
		//console.log("nextSibling found by api is " + nextSibling.attr("id"));
		if (next.length == 0) {
			//append at end
			parentElement.parent().append(commentElement);
		} else {
			next.before(commentElement);
		}
	}
	
	//$("#" + contentTag + "CommentsList").append(commentElement);
}

function createThumbnailElement(data) {
	var element = $("<div>", {class: "thumbnailElement"});

	if (data.postedDate) {
		element.append(createPostedBySectionElement(data));
	}
	
	var imageLink = $("<a>", {href: data.link}).append(createImageElement(data));
	element.append(imageLink);

	if (data.caption) {
		var link = $("<a>", {href: data.link}).append(createCaptionSectionElement(data));
		element.append(link);
	}

	element.append(createSocialStatusSectionElement(data));

	return element;
}

function createGrid(id, list, numCols, allowHover, allowSelection, selectionCallback) {
	var table = $("<table>", {id: id, class: "gridTable"});

	var tdWidth = 100 / numCols;
	for (var i = 0; i < list.length; i++) {
		var col = i % numCols;
		var tr;
		//var row = i / numCols;

		var data = list[i];

		var td = $("<td>", {id: data.id, width: tdWidth + "%"});
		var element = createThumbnailElement(data);

		if (allowHover) {
			element.addClass("elementHover");
		}

		if (allowSelection) {
			element.click({id: data.id, element: element}, function(e) {
				$("#" + id + " .thumbnailElement").removeClass("elementSelected"); //unselect all first
				e.data.element.addClass("elementSelected"); //now make the selection
				selectionCallback(e.data.id);
			});
		}

		td.append(element);
		
		if (col == 0) {
			tr = $("<tr>");
			table.append(tr);
		}
		tr.append(td);
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

function createCommentsList(id, list) {
	var container = $("<div>", {id: id, class: "commentsList"});

	for (var i = 0; i < list.length; i++) {
		var data = list[i];

		var commentElement = createCommentElement(data, false);
		container.append(commentElement);

		//passing the right array element to the callback by using the technique desribed at https://stackoverflow.com/questions/27364891/passing-additional-arguments-into-a-callback-function
		(function(id) {
			$.getJSON("/api/comments/?entityId=" + id + "&sortBy=reverseDate", function(replyList) {
				if (replyList.length > 0) {
					for (var j = 0; j < replyList.length; j++) {
						var replyData = replyList[j];

						var replyElement = createCommentElement(replyData, true);
						appendCommentElement(replyElement, id);
					}
				}
			});
		})(data.id);
	}

	if (user) {
		//show new comment box if already logged in
		var newCommentElement = createNewCommentElement(false, entityId);
		appendNewCommentElement(newCommentElement, entityId, container, false);
	} else {
		var newCommentLink = $("<a>", {href: "/auth/", class: "btn btn-primary center", text: "Add new comment"});
		container.append(newCommentLink);
	}
	

	return container;
}

/**
	Create and append a content container with the content.
	appendTo: parent element to which to append this container.  The reason we pass this is so we can append
	the content in the parent early and allow for jquery lookups for child elements (such as buttons when setting up click event handlers)
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
function createAndAppendContentContainer(appendTo, contentTag, viewOptions, sortOptions) {

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

	refreshListAndUpdateContent(getURL, contentTag, viewOptions[0].type);

	$("#" + contentTag + "ViewGroup button").click(function() {
		$("#" + contentTag + "ScrollableList").remove();
		$("#" + contentTag + "GridTable").remove();

		var buttonID = this.id;

		var list = jQuery.data(document.body, contentTag + "List");
		
		if (buttonID == "thumbnailViewButton") {
			var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null);
			container.append(grid);
		} else if (buttonID == "scrollableViewButton") {
			var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
			container.append(scrollableList);
		} else if (buttonID == "commentsViewButton") {
			var commentsList = createCommentsList(contentTag + "CommentsList", list);
			container.append(commentsList);
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

		refreshListAndUpdateContent(getURL, contentTag);
	});
}

function refreshListAndUpdateContent(getURL, contentTag, defaultViewType) {
	$.getJSON(getURL, function(list) {

		jQuery.data(document.body, contentTag + "List", list);

		$("#" + contentTag + "ScrollableList").remove();
		$("#" + contentTag + "GridTable").remove();

		//var  = $("#" + contentTag + "ViewGroup button.active");

		if ($("#" + contentTag + "ViewGroup button.active").length) {
			var viewOptionsButtonID = $("#" + contentTag + "ViewGroup button.active").attr("id");
			if (viewOptionsButtonID == "thumbnailViewButton") {
				var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null);
				$("#" + contentTag + "Container").append(grid);
			} else if (viewOptionsButtonID == "scrollableViewButton") {
				var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
				$("#" + contentTag + "Container").append(scrollableList);
			}
		} else {
			if (defaultViewType == "thumbnail") {
				var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null);
				$("#" + contentTag + "Container").append(grid);
			} else if (defaultViewType == "filmstrip") {
				var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
				$("#" + contentTag + "Container").append(scrollableList);
			} else if (defaultViewType == "comments") {
				var commentsList = createCommentsList(contentTag + "CommentsList", list);
				$("#" + contentTag + "Container").append(commentsList);
			}
		}
	});
}

function setupTabRedirection() {
	// Javascript to enable link to tab
	var url = document.location.toString();
	if (url.match('#')) {
	    $('.nav-tabs a[href="#' + url.split('#')[1] + '"]').tab('show');
	} //add a suffix

	// Change hash for page-reload
	$('.nav-tabs a').on('shown.bs.tab', function (e) {
	    window.location.hash = e.target.hash;
	});

	//var element = $(".nav-tabs").get(0);
	var element = document.getElementById("mainTabGroup");
	element.scrollIntoView(true);
}
