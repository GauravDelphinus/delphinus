
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
	Create just a sidebar header by itself.
**/
function createSidebarHeader(id, heading) {
	var sidebar = $("<div>", {id: id, class: "sidebar"});

	//set the title
	$(sidebar).append($("<div>", {class: "sidebarHeading"}).append(heading));

	return sidebar;
}

/**
	Frameless sidebar.  It only has a title, no background.  You simply append the provided
	content below the title.
**/
function createSplitSidebar(id, heading, contentList) {
	var sidebar = $("<div>", {id: id, class: "framelessSidebar"});

	//set the title
	$(sidebar).append($("<div>", {class: "split-sidebar-heading"}).append(heading));

	for (var i = 0; i < contentList.length; i++) {
		$(sidebar).append(contentList[i]);
	}

	return sidebar;
}

function createSimpleLinkList(list) {
	var listContent = $("<div>");
	//now insert items
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		if (item.type && item.type == "link") {
			var link = $("<div>", {class: "sidebar-item hoverable"});
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

/**
	Create a sidebar with the most popular challenges
**/
function createPopularChallengesSidebar(callback) {
	var list = [];
	$.getJSON("/api/challenges?sortBy=popularity&limit=5", function(list) {
		var elementList = [];
		for (var i = 0; i < list.length; i++) {
			elementList.push(createSidebarElement(list[i], list[i].id + "challenge", true));
		}
		var sidebar = createSplitSidebar("PopularChallengesSidebar", "Popular Challenges", elementList);

		return callback(sidebar);
	})
	.fail(function() {
		return callback(null);
	});
}

/**
	Create a sidebar with the most popular entries
**/
function createPopularEntriesSidebar(callback) {
	var list = [];
	$.getJSON("/api/entries?sortBy=popularity&limit=5", function(list) {
		var elementList = [];
		for (var i = 0; i < list.length; i++) {
			elementList.push(createSidebarElement(list[i], list[i].id + "entry", true));
		}
		var sidebar = createSplitSidebar("PopularEntriesSidebar", "Popular Entries", elementList);

		return callback(sidebar);
	})
	.fail(function() {
		return callback(null);
	});
}

/**
	Create a sidebar with the most popular users
**/
function createPopularUsersSidebar(callback) {
	var list = [];
	$.getJSON("/api/users?sortBy=popularity&limit=5", function(list) {
		var elementList = [];
		for (var i = 0; i < list.length; i++) {
			elementList.push(createSidebarElement(list[i], list[i].id + "user", true));
		}
		var sidebar = createSplitSidebar("PopularUsersSidebar", "Popular Users", elementList);

		return callback(sidebar);
	})
	.fail(function() {
		return callback(null);
	});
}

/**
	Createa a sidebar that shows a specific challenge image
	with a "Posted Under" header text
**/
function createChallengeSidebar(challengeId, callback) {
	if (challengeId != 0) {
		$.getJSON('/api/challenges/' + entry.sourceId, function(data) {
			var element = createSidebarElement(data, "challenge", true);
			
			var list = [element];
			var sidebar = createSplitSidebar(entry.sourceId + "FramelessSidebar", "Posted Under", list);

			return callback(sidebar);
		}).fail(function() {
			return callback(null);
		});
	} else {
		return callback(null);
	}

}

function createDesignSidebar(designId, callback) {
	if (designId != 0) {
		$.getJSON('/api/designs/' + designId, function(data) {
			var element = createThumbnailElement(data, "challenge", true);
			var sidebar = createSplitSidebar("challengeSidebar", "Challenge", element);
			return callback(sidebar);
		}).fail(function() {
			return callback(null);
		});
	}
}

function createChallengeCaptionSidebar(challengeId, callback) {
	var content = $("<div>", {class: "wide-container"});
	var message = $("<div>", {class: "sidebar-item"}).append($("<p>").append("Let your creative juices flow and create your own caption entry for this challenge now!  It's as simple as Get-Set-Go!"));

	var button = $("<button>").append("Post Caption");
	button.click(function() {
		window.open("/newentry?challengeId=" + challengeId, "_self");
	});

	var link = $("<div>", {class: "sidebar-item active hoverable"}).append(button);
	content.append(message).append(link);

	var sidebar = createSidebar("createChallengeCaptionSidebar", "Up for the challenge?", content);

	return callback(sidebar);
}

function createIndependentCaptionSidebar(callback) {
	var content = $("<div>", {class: "wide-container"});
	var message = $("<div>", {class: "sidebar-item"}).append($("<p>").append("Let your creative juices flow and create your own caption entry now!  Choose your own image or select among some cool background designs!"));
	
	var button = $("<button>").append("Create Caption");
	button.click(function() {
		window.open("/newentry", "_self");
	});

	var link = $("<div>", {class: "sidebar-item active hoverable"}).append(button);
	content.append(message).append(link);

	var sidebar = createSidebar("createCaptionSidebar", "Like this caption?", content);

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