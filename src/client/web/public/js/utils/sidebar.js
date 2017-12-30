
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
			var link = $("<div>", {class: "sidebar-item"});
			link.append($("<a>", {href: item.link}).append(item.name));
			listContent.append(link);
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

		var sidebar = createSidebar("categoriesSidebar", "Challenge Categories", createSimpleLinkList(list));
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
	$.getJSON("/api/challenges?sortBy=popularity&limit=5", function(list) {
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
	$.getJSON("/api/entries?sortBy=popularity&limit=5", function(list) {
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
	$.getJSON("/api/users?sortBy=popularity&limit=5", function(list) {
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

function createDesignSidebar(designId, callback) {
	if (designId != 0) {
		$.getJSON('/api/designs/' + designId, function(data) {
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
	var message = $("<p>", {class: "text-plain-medium"}).append("Let your creative juices flow and create your own caption entry for this challenge now!  It's as simple as Get-Set-Go!");
	var button = $("<button>", {class: "btn btn-lg button-full"}).append("Create Caption");
	content.append(message).append(button);

	var sidebar = createSidebar("createChallengeCaptionSidebar", "Up for the challenge?", content);

	button.click(function() {
		window.open("/newentry?challengeId=" + challengeId, "_self");
	});

	return callback(sidebar);
}

function createIndependentCaptionSidebar(callback) {
	var content = $("<div>", {class: "wide-container"});
	var message = $("<p>", {class: "text-plain-medium"}).append("Let your creative juices flow and create your own caption entry now!  Choose your own image or select among some cool background designs!");
	var button = $("<button>", {class: "btn btn-lg button-full"}).append("Create Caption");
	content.append(message).append(button);

	var sidebar = createSidebar("createCaptionSidebar", "Like this caption?", content);

	button.click(function() {
		window.open("/newentry", "_self");
	});

	return callback(sidebar);
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