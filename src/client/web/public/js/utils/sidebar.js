
/**
	Update the given sidebar with the given list of items
	Each item in the list is an object of form {type: "link or button or separator", name: "Name", link: "some link"}
**/
function updateSidebar(id, heading, content) {
	var sidebar = $("#" + id);
	$(sidebar).empty();

	//set the title
	$(sidebar).append($("<div>", {class: "sidebarHeading"}).append(heading));

	var sidebarContent = $("<div>", {class: "sidebarContent"}).appendTo($(sidebar));
	sidebarContent.append(content);
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

function createCategorySidebar() {
	var list = [];
	$.getJSON("/api/categories/", function(result) {
		for (var i = 0; i < result.length; i++) {
			list.push({type: "link", name: result[i].name, link: "/challenges/?category=" + result[i].id});
		}

		updateSidebar("categoriesSidebar", "Categories", createSimpleLinkList(list));
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
	$.getJSON("/api/challenges?sortBy=popularity", function(list) {
		/*
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
		*/

		var scrollableList = createScrollableList("popularChallengesScrollableList", list);
		updateSidebar("popularChallengesSidebar", "Popular Challenges", scrollableList);
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