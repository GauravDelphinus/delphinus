
/**
	Update the given sidebar with the given list of items
	Each item in the list is an object of form {type: "link or button or separator", name: "Name", link: "some link"}
**/
function createSidebar(id, heading, content) {
	var sidebar = $("<div>", {id: id, class: "sidebar"});

	//set the title
	$(sidebar).append($("<div>", {class: "sidebarHeading"}).append(heading));

	var sidebarContent = $("<div>", {class: "sidebarContent"}).appendTo($(sidebar));
	sidebarContent.append(content);

	return sidebar;
}

/**
	Frameless sidebar.  It only has a title, no background.  You simply append the provided
	content below the title.
**/
function createFramelessSidebar(id, heading, content) {
	var sidebar = $("<div>", {id: id, class: "framelessSidebar"});

	//set the title
	$(sidebar).append($("<div>", {class: "sidebarHeading"}).append(heading));

	$(sidebar).append(content);

	return sidebar;
}

function createSimpleLinkList(list) {
	var listContent = $("<div>");
	//now insert items
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		if (item.type && item.type == "link") {
			listContent.append($("<a>", {class: "sidebarLink", href: item.link}).append(item.name));
		}
	}

	return listContent;
}

function createCategorySidebar(callback) {
	var list = [];
	$.getJSON("/api/categories/", function(result) {
		for (var i = 0; i < result.length; i++) {
			list.push({type: "link", name: result[i].name, link: "/challenges/?category=" + result[i].id});
		}

		var sidebar = createSidebar("categoriesSidebar", "Categories", createSimpleLinkList(list));
		return callback(sidebar);
	})
	.fail(function() {
		return callback(null);
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

function createPopularChallengesSidebar(callback) {
	var list = [];
	$.getJSON("/api/challenges?sortBy=popularity", function(list) {
		var scrollableList = createScrollableList("popularChallengesScrollableList", list, true);

		var sidebar = createFramelessSidebar("popularChallengesSidebar", "Popular Challenges", scrollableList);
		return callback(sidebar);
	})
	.fail(function() {
		return callback(null);
	});
}

function createPopularEntriesSidebar(callback) {
	var list = [];
	$.getJSON("/api/entries?sortBy=popularity", function(list) {
		var scrollableList = createScrollableList("popularEntriesScrollableList", list, true);

		var sidebar = createFramelessSidebar("popularEntriesSidebar", "Popular Entries", scrollableList);
		return callback(sidebar);
	})
	.fail(function() {
		return callback(null);
	});
}

function createPopularUsersSidebar(callback) {
	var list = [];
	$.getJSON("/api/users?sortBy=popularity", function(list) {
		/*
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
		*/

		var scrollableList = createScrollableList("popularUsersScrollableList", list, true);

		var sidebar = createFramelessSidebar("popularUsersSidebar", "Popular Users", scrollableList);
		return callback(sidebar);
	})
	.fail(function() {
		return callback(null);
	});
}

function createChallengeSidebar(challengeId, callback) {
	if (challengeId != 0) {
		$.getJSON('/api/challenges/' + challengeId, function(data) {
			var element = createThumbnailElement(data, "challenge", true);
			var sidebar = createFramelessSidebar("challengeSidebar", "Challenge", element);
			return callback(sidebar);
		}).fail(function() {
			return callback(null);
		});
	}
}

function createChallengeCaptionSidebar(challengeId, callback) {
	var content = $("<div>", {class: "wide-container"});
	var message = $("<p>", {class: "text-plain-medium"}).append("Up for the challenge? Let your creative juices flow and create your own caption entry for this challenge now!  It takes just a few seconds!");
	var button = $("<button>", {class: "btn btn-lg button-full"}).append("Create Caption");
	content.append(message).append(button);

	var sidebar = createSidebar("createChallengeCaptionSidebar", "Create your Caption!", content);

	button.click(function() {
		window.open("/newentry?challengeId=" + challengeId, "_self");
	});

	return callback(sidebar);
}

function createIndependentCaptionSidebar(callback) {
	var content = $("<div>", {class: "wide-container"});
	var message = $("<p>", {class: "text-plain-medium"}).append("Let your creative juices flow and create your own caption entry now!  Choose your own image or select among some cool background designs!  It takes just a few seconds!");
	var button = $("<button>", {class: "btn btn-lg button-full"}).append("Create Caption");
	content.append(message).append(button);

	var sidebar = createSidebar("createCaptionSidebar", "Create your Caption!", content);

	button.click(function() {
		window.open("/newentry", "_self");
	});

	return callback(sidebar);
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