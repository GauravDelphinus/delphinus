function createMainElement(data, contentTag) {
	var element = $("<div>", {id: contentTag + data.id + "MainElement", class: "centerDisplayWide"});
	if (data.type == "entry") {
		element.addClass("entry-element");
	} else if (data.type == "challenge") {
		element.addClass("challenge-element");
	}

	element.append(createTitleElement(data, contentTag));

	element.append(createMainImageElement(data, contentTag));
	
	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data, contentTag));
	}

	if (data.postedDate) {
		element.append(createPostHeaderElement(data, contentTag));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data, contentTag));
		element.append(createSocialActionsSectionElement(data, contentTag));
	}

	//container for likers list, if any
	element.append(createLikersPopupElement(data, contentTag));

	return element;
}

/*
	Create a preview for the Share Page.  This excludes/trims out some
	elements such as Social buttons, Site logo, etc.
*/
function createSharePreview(data, contentTag) {
	var element = $("<div>", {id: contentTag + data.id + "SharePreview", class: "centerDisplayWide"});
	if (data.type == "entry") {
		element.addClass("entry-element");
	} else if (data.type == "challenge") {
		element.addClass("challenge-element");
	}

	//add trimmed version of title element (for preview)
	element.append(createTitleElementForPreview(data, contentTag));

	element.append(createMainImageElement(data, contentTag));
	
	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data, contentTag));
	}

	if (data.postedDate) {
		element.append(createPostHeaderElement(data, contentTag));
	}

	return element;
}

function createScrollableElement(data, contentTag, compressed = false) {
	var element = $("<div>", {id: contentTag + data.id + "ScrollableElement", class: "scrollableElement"});
	if (data.type == "entry") {
		element.addClass("entry-element");
	} else if (data.type == "challenge") {
		element.addClass("challenge-element");
	}

	if (data.postedDate) {
		element.append(createPostHeaderElement(data, contentTag));
	}

	var imageLink = $("<a>", {href: data.link}).append(createEntityImageElement(data, contentTag));
	element.append(imageLink);

	if (data.caption && data.type != "entry") {
		element.append(createCaptionSectionElement(data, contentTag));
	}

	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data, contentTag));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data, contentTag, !compressed));

		if (!compressed) {
			element.append(createSocialActionsSectionElement(data, contentTag));
		}
		
	}
	
	//container for comments, if any
	element.append(createCommentsContainer(data, contentTag));

	//container for likers list, if any
	element.append(createLikersPopupElement(data, contentTag));

	return element;
}

function createFeedElement(data, contentTag) {
	var element = $("<div>", {id: contentTag + data.id + "FeedElement", class: "feedElement"});
	if (data.type == "entry") {
		element.addClass("entry-element");
	} else if (data.type == "challenge") {
		element.addClass("challenge-element");
	}

	if (data.activity && data.activity.type != "recentlyPosted") {
		element.append(createActivitySectionElement(data, contentTag));
	}

	if (data.postedDate) {
		element.append(createPostHeaderElement(data, contentTag));
	}

	if (data.text) {
		element.append(createTextSection(data, contentTag));
	}

	var imageElement = createEntityImageElement(data, contentTag);

	if (data.link) {
		var imageLink = $("<a>", {href: data.link}).append(imageElement);
		element.append(imageLink);
	} else {
		element.append(imageElement);
	}

	if (data.caption && data.type != "entry") {
		element.append(createCaptionSectionElement(data, contentTag));
	}

	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data, contentTag));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data, contentTag));
		element.append(createSocialActionsSectionElement(data, contentTag));
	}

	//container for comments, if any
	element.append(createCommentsContainer(data, contentTag));

	//container for likers list, if any
	element.append(createLikersPopupElement(data, contentTag));

	return element;
}

function createThumbnailElement(data, contentTag, createLink) {
	var element = $("<div>", {class: "thumbnailElement"});
	if (data.type == "entry") {
		element.addClass("entry-element");
	} else if (data.type == "challenge") {
		element.addClass("challenge-element");
	}

	if (data.postedDate) {
		element.append(createPostHeaderElement(data, contentTag));
	}

	if(createLink) {
		var imageLink = $("<a>", {href: data.link}).append(createEntityImageElement(data, contentTag));
		element.append(imageLink);
	} else {
		element.append(createEntityImageElement(data, contentTag));
	}

	if (data.caption && data.type != "entry") {
		var link = $("<a>", {href: data.link}).append(createCaptionSectionElement(data, contentTag));
		element.append(link);
	}

	if (data.type == "entry") {
		element.append(createTimeLapseProgressSectionElement(data, contentTag));
	}

	if (data.socialStatus) {
		element.append(createSocialStatusSectionElement(data, contentTag, false));
		//element.append(createSocialActionsSectionElement(data, contentTag));
	}

	//container for comments, if any
	var commentPopupHeader = $("<h2>").append("Comments");
	var commentPopupBody = createCommentsContainer(data, contentTag);
	element.append(createPopupElement(contentTag + data.id + "CommentsPopup", "modal-medium", commentPopupHeader, null, commentPopupBody, function() {
		showHideCommentsList(contentTag + data.id, false);
	}));

	//container for likers list, if any
	element.append(createLikersPopupElement(data, contentTag));

	element.append(createFollowersPopupElement(data, contentTag));

	return element;
}

function createPostHeaderElement(data, contentTag) {
	var postHeaderElement = $("<div>", {id: contentTag + data.id + "PostHeader", class: "postHeaderSection"});

	// IMPORTANT: Menu should be the FIRST Child, because it needs to be displayed at top right
	// using float: right (see https://stackoverflow.com/a/33503177/7657145)
	
	// Menu section

	//if I'm the one who posted this item, show the menu option
	if (user && user.id == data.postedByUser.id) {
		var menuIcon = $("<span>", {class: "glyphicon glyphicon-chevron-down"});
		var menuButton = $("<button>", {id: contentTag + data.id + "ItemMenuButton", class: "itemDropdownButton"}).append(menuIcon);
		var menu = createMenu(menuButton);
		menu.addClass("itemDropdownMenu");
		var deleteIcon = $("<span>", {class: "glyphicon glyphicon-remove"});
		var deleteButton = $("<button>", {id: contentTag + data.id + "DeleteButton", class: "btn itemDropdownButton", type: "button"}).append(deleteIcon).append(" Delete Post");
		
		appendMenuItemButton(menu, deleteButton);

		deleteButton.click(function() {
			var result = confirm("Are you sure you want to delete this post permanently?");
			if (result) {
			    deleteItem(data, contentTag);
			}
		});

		postHeaderElement.append(menu);
	}

 	
	// Posted By Section
	var postedBy = $("<div>");
	var postedByName = $("<span>", {id: "postedByName"});
	postedByName.append($("<a>", {href: "/user/" + data.postedByUser.id, text: data.postedByUser.displayName, class: "posted-by"}));
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
	var postedByDate = $("<span>", {id: "postedByDate", class: "posted-date", text: "Posted " + formatDate(data.postedDate)});
	postedByDate.append(postedByDate);

	if (data.categoryID && data.categoryName) {
		var postedCategory = $("<a>", {href: "/challenges?category=" + data.categoryID, class: "posted-category"}).append(data.categoryName);
		postedByDate.append(" under ").append(postedCategory);
	}
	
	postedDateTd.append(postedByDate);
	tr2.append(postedDateTd);

	table.append(tr2);

	postHeaderElement.append(table);


	return postHeaderElement;
}


function createCaptionSectionElement(data, contentTag) {
	// Caption (if available)
	var captionSection = $("<div>", {class: "captionSection", id: contentTag + data.id + "CaptionSection"});
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


function createEntityImageElement(data, contentTag) {
	var entityImage = $("<img>", {id: contentTag + data.id + "EntityImage", class: "mainImage"});
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

function createActivitySectionElement(data, contentTag) {
	var activitySection = $("<div>", {id: contentTag + data.id + "ActivitySection", class: "activitySection"});
	var activityText = $("<span>", {id: contentTag + data.id + "ActivityText", class: "text-plain-small"});

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

function createTextSection(data, contentTag) {
	var textSection = $("<div>", {id: contentTag + data.id + "TextSection", class: "textSection"});
	return textSection;
}

/*
Create the header element for the main challenge page.
*/
function createTitleElement(data, contentTag) {
	var titleElement = $("<div>", {id: contentTag + data.id + "TitleSection", class: "centerDisplayHeader"});
	if (data.type == "challenge") {
		titleElement.addClass("challenge-title");
	} else if (data.type == "entry") {
		titleElement.addClass("entry-title");
	}

	var logo = $("<img>", {src: "/images/branding/captionify_logo_tiny.png"});
	var entityTypeTitle = $("<p>", {class: "entityTypeTitle"});
	if (data.type == "entry") {
		entityTypeTitle.append("CAPTION ENTRY");
	} else if (data.type == "challenge") {
		entityTypeTitle.append("CHALLENGE");
	}

	var title = $("<h1>", {class: "main-title"}).append(data.caption);

	titleElement.append(logo);
	titleElement.append($("<br>"));
	titleElement.append(entityTypeTitle);
	
	if (data.type == "challenge") {
		titleElement.append($("<hr>", {class: "low-top-margin"}));
		titleElement.append(title);
		titleElement.append($("<hr>", {class: "low-bottom-margin"}));
	} else if (data.type == "entry") {
		titleElement.append($("<hr>", {class: "low-top-margin low-bottom-margin"}));
	}

	return titleElement;
}

/*
Create the header element for the main challenge page.
*/
function createTitleElementForPreview(data, contentTag) {
	var titleElement = $("<div>", {id: contentTag + data.id + "TitleSection", class: "centerDisplayHeader"});
	if (data.type == "challenge") {
		titleElement.addClass("challenge-title");
	} else if (data.type == "entry") {
		titleElement.addClass("entry-title");
	}

	var title = $("<h1>", {class: "main-title"}).append(data.caption);
	
	if (data.type == "challenge") {
		titleElement.append($("<hr>", {class: "low-top-margin"}));
		titleElement.append(title);
		titleElement.append($("<hr>", {class: "low-bottom-margin"}));
	} else if (data.type == "entry") {
		titleElement.append($("<hr>", {class: "low-top-margin low-bottom-margin"}));
	}

	return titleElement;
}