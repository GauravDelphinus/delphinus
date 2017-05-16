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
            console.log("image.onload called");
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
	var postedBySection = $("<div>", {class: "postedBySection"});
	var postedByDate = $("<span>", {id: "postedByDate", class: "postedByDate", text: "Posted " + formatDate(data.postedDate)});
	var postedBy = $("<div>", {class: "postedBy"});
	var postedByName = $("<span>", {id: "postedByName", class: "postedByName"});
	postedByName.append($("<a>", {href: "/user/" + data.postedByUser.id, text: "by " + data.postedByUser.displayName}));
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

function createSocialStatusSectionElement(data) {
	console.log("createSocialStatusSectionElement, data is " + JSON.stringify(data));
	// Social Status Section
	var socialStatusSection = $("<div>", {class: "socialStatusSection"});
	var socialStatus = $("<div>", {class: "socialStatus"});
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
	socialStatusSection.append(socialStatus);

	console.log("user is " + JSON.stringify(user));
	var restURL;
	if (data.type == "challenge") {
		restURL = "/api/challenges/" + data.id + "/like";
	} else if (data.type == "entry") {
		restURL = "/api/entries/" + data.id + "/like";
	}

	if (user) {
		$.getJSON(restURL, function(result) {
			console.log("received like status from server: " + JSON.stringify(result));
			if (result.likeStatus == "on") {
				//show button as depressed
				console.log("button " + data.id + "LikeButton length is " + $("#" + data.id + "LikeButton").length);
				$("#" + data.id + "LikeButton").addClass("active");
			}
		});
	}

	//set up social button callbacks
	likeButton.click(function(e) {
		console.log("button clicked, this is " + this + ", id is " + this.id);
		if (user) {
			var jsonObj = {};
			if ($("#" + this.id).hasClass("active")) {
				//already liked, so send unlike request
				console.log("currently on");
				jsonObj.likeAction = "unlike";
			} else {
				console.log("currently off");
				jsonObj.likeAction = "like";
			}
			$.ajax({
				type: "PUT",
				url: restURL,
				dataType: "json",
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify(jsonObj),
				success: function(jsonData) {
					console.log("received jsonData = " + JSON.stringify(jsonData));
					var numLikes = parseInt($("#" + data.id + "NumLikes").text());
					if (jsonData.likeStatus == "on") {
						console.log("setting on");
						$("#" + data.id + "LikeButton").addClass("active");
						$("#" + data.id + "NumLikes").text(numLikes + 1);
					} else {
						console.log("setting off");
						$("#" + data.id + "LikeButton").removeClass("active");
						$("#" + data.id + "NumLikes").text(numLikes - 1);
					}
				},
				error: function(jsonData) {
					//alert("error, data is " + jsonData);
					//var jsonData = $.parseJSON(data);
					alert("some error was found, " + jsonData.error);
				}
			});
		} else {
			window.open("/auth", "_self");
		}
		
	});

	return socialStatusSection;
}

function createImageElement(data) {
	var mainImage = $("<img>", {class: "mainImage"});
	mainImage.prop("src", data.image);
	return mainImage;
}

function createMainElement(data) {
	var element = $("<div>", {class: "mainElement"});

	element.append(createPostedBySectionElement(data));
	element.append(createImageElement(data));

	if (data.caption) {
		element.append(createCaptionSectionElement(data));
	}

	element.append(createSocialStatusSectionElement(data));

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

	for (var i = 0; i < list.length; i++) {
		var col = i % numCols;
		var tr;
		//var row = i / numCols;

		var data = list[i];

		var td = $("<td>", {id: data.id});
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

	console.log("viewOptions is " + JSON.stringify(viewOptions));

	if (viewOptions && viewOptions.length > 1) {
		var viewGroup = $("<div>", {id: contentTag + "ViewGroup", class: "btn-group", "data-toggle": "buttons"});
		for (var i = 0; i < viewOptions.length; i++) {
			var viewOption = viewOptions[i];
			if (viewOption.type == "thumbnail") {
				viewGroup.append($("<button>", {id: "thumbnailViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-th"})).append(" Thumbnail View"));
			} else if (viewOption.type == "filmstrip") {
				viewGroup.append($("<button>", {id: "scrollableViewButton", type: "button", "data-toggle": "buttons", class: "btn btn-default" + (i == 0 ? " active" : "")}).append($("<span>", {class: "glyphicon glyphicon-film"})).append(" Filmstrip View"));
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
		console.log("result from getJSON is " + JSON.stringify(list));

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
			console.log("view options button does not exist, defaultViewType is " + defaultViewType);
			if (defaultViewType == "thumbnail") {
				var grid = createGrid(contentTag + "GridTable", list, 3, false, false, null);
				$("#" + contentTag + "Container").append(grid);
			} else if (defaultViewType == "filmstrip") {
				var scrollableList = createScrollableList(contentTag + "ScrollableList", list);
				$("#" + contentTag + "Container").append(scrollableList);
			}
		}
	});
}
