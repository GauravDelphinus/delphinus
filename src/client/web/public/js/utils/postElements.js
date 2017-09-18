function createMainElement(data) {
	var element = $("<div>", {id: data.id + "MainElement", class: "mainElement"});

	element.append(createPostHeaderElement(data));
	element.append(createMainImageElement(data));

	if (data.caption && data.type != "entry") {
		element.append(createCaptionSectionElement(data));
	}
	
	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}

	//container for likers list, if any
	element.append(createLikersPopupElement(data));

	return element;
}

function createScrollableElement(data) {
	var element = $("<div>", {id: data.id + "ScrollableElement", class: "scrollableElement"});

	element.append(createPostHeaderElement(data));

	var imageLink = $("<a>", {href: data.link}).append(createEntityImageElement(data));
	element.append(imageLink);

	if (data.caption && data.type != "entry") {
		element.append(createCaptionSectionElement(data));
	}

	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}
	
	//container for comments, if any
	element.append(createCommentsContainer(data));

	//container for likers list, if any
	element.append(createLikersPopupElement(data));

	return element;
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

	if (data.caption && data.type != "entry") {
		element.append(createCaptionSectionElement(data));
	}

	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}

	//container for comments, if any
	element.append(createCommentsContainer(data));

	//container for likers list, if any
	element.append(createLikersPopupElement(data));

	return element;
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

	if (data.caption && data.type != "entry") {
		var link = $("<a>", {href: data.link}).append(createCaptionSectionElement(data));
		element.append(link);
	}

	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data));
		element.append(createSocialActionsSectionElement(data));
	}

	//container for comments, if any
	var commentPopupHeader = $("<h2>").append("Comments");
	var commentPopupBody = createCommentsContainer(data);
	element.append(createPopupElement(data.id + "CommentsPopup", "modal-medium", commentPopupHeader, null, commentPopupBody, function() {
		showHideCommentsList(data.id, false);
	}));

	//container for likers list, if any
	element.append(createLikersPopupElement(data));

	element.append(createFollowersPopupElement(data));

	return element;
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
	var postedByImage = $("<img>", {id: "postedByImage", class: "user-image-medium"});
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


function createCaptionSectionElement(data) {
	// Caption (if available)
	var captionSection = $("<div>", {class: "captionSection", id: data.id + "CaptionSection"});
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


/*************************************************************************/


function createEntityImageElement(data) {
	var entityImage = $("<img>", {id: data.id + "EntityImage", class: "mainImage"});
	entityImage.prop("src", data.image);
	return entityImage;
}

function createMainImageElement(data) {
	var mainImage = $("<img>", {id: data.id + "EntityImage", class: "mainImage"});
	mainImage.prop("src", data.image);
	return mainImage;
}

function createTextElement(data) {
	var textElement = $("<div>", {class: "commentText text-plain-small"});
	textElement.text(data.text);
	return textElement;
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