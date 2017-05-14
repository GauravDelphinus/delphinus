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

function formatDate(date) {
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
	// Social Status Section
	var socialStatusSection = $("<div>", {class: "socialStatusSection"});
	var socialStatus = $("<div>", {class: "socialStatus"});
	var numLikes = $("<span>", {class: "glyphicon glyphicon-thumbs-up"});
	var numShares = $("<span>", {class: "glyphicon glyphicon-share-alt"});
	var numComments = $("<span>", {class: "glyphicon glyphicon-comment"});
	var likeButton = $("<button>", {id: "likeButton", type: "button", class: "btn btn-primary btn-lg socialActionButton"});
	var shareButton = $("<button>", {id: "shareButton", type: "button", class: "btn btn-primary btn-lg socialActionButton"});
	var commentButton = $("<button>", {id: "commentButton", type: "button", class: "btn btn-primary btn-lg socialActionButton"});
	likeButton.append(numLikes).append("  " + data.socialStatus.numLikes);
	shareButton.append(numShares).append("  " + data.socialStatus.numShares);
	commentButton.append(numComments).append("  " + data.socialStatus.numComments);
	socialStatus.append(likeButton);
	socialStatus.append(shareButton);
	socialStatus.append(commentButton);
	socialStatusSection.append(socialStatus);

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
	
	element.append(createImageElement(data));

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


