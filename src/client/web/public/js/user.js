$(document).ready(function(){
	createLoginHeader();

	createCategorySidebar(function(sidebar) {
		$("#leftMiddleSidebar").append(sidebar);
	});

	// NOTE:
	// userInfo - whose page we're looking at
	// user - currently logged in user

	var profileType = "public";
	if (!user) {
		profileType = "public"; // public profile, not logged in
	} else if (user) {
		if (user.id == userInfo.id) {
			profileType = "mine";  // I'm logged in, and it's my own profile
		} else {
			profileType = "member"; // I'm logged in, and it's another member's profile
		}
	}

	// Profile Image and Name
	$("#profileImage").attr("src", userInfo.image);
	$("#displayName").val(userInfo.displayName);

	// set up all the image related handlers (including carousel, drag drop, etc.)
	setupImageHandlers(profileType);

	setupNameSection(profileType);

	//setupFollowSection(profileType);

	// set up the social information
	setupSocialSection(profileType);

	createPopularUsersSidebar(function(sidebar) {
		$("#rightSidebar").append(sidebar);
	});

	setupTabs(profileType);
});

function setupImageHandlers(profileType) {
	
	if (profileType == "mine") {
		// If I'm viewing my own profile, allow me to change stuff, otherwise don't!
		$(".imageSection").addClass("imageSectionHover");
	}

	/**
		Change Picture shows the Carousel view, where user can select a different
		Image from those pulled from the social networks and make that the profile
		image.  There will be two buttons showing in this view - New Image, which
		will trigger selection of a new image, and Set Image, which sets the currently
		showing image in the carousel as the profile image.
	**/
	$("#changePicture").click(function() {
		$("#changePicture").hide();
		$("#profileImage").hide();
		$("#setImage").show();
		$("#newImage").show();

		setupAndShowCarousel();
	});

	/**
		Save Image uploads the selected image (data blob), and fetches a URL from the server
		which is then set as the new profile image.  If successful, the regular profile view is shown 
		again.  In the profile view, you only see the Change Picture button, as you do by default.  
		If there's a failure, the view remains the same and the user can try clicking on Save again.
	**/
	$("#saveImage").click(function() {
		var selectedImageSrc = $("#profileImage").prop("src");
        //data url
        //upload the image, get a url in response, and set that as the profile link

		var jsonObj = {};
		jsonObj.imageData = selectedImageSrc;

		$.ajax({
			type: "PATCH",
			url: "/api/users/" + userInfo.id,
			dataType: "json", // return data type
			contentType: "application/json; charset=UTF-8",
			data: JSON.stringify(jsonObj)
		})
		.done(function(data, textStatus, jqXHR) {
			//alert("successful, image is " + data.image);
			userInfo.image = data.image;

			$("#profileImage").prop("src", data.image);
			$("#profileImage").show();
			$("#newImage").hide();
			$("#saveImage").hide();
			$("#changePicture").show();
		})
		.fail(function() {
			window.location.replace("/error");
		});
	});

	/**
		Set Image sets the currently visible carousel slide to the user's profile image.
		It updates the server, and if successful, updates the profile image and moves
		back to the regular profile image view, and cleans up and hides the carousel view.
		The Change Picture button shows up again, and other buttons are hidden.  In case of failure,
		it leaves the Set Image button around for the user to retry.
	**/
	$("#setImage").click(function() {
		var selectedImage = $("#imageCarousel .item.active img").prop("src");

		var jsonObj = {};
		jsonObj.imageData = selectedImage;

		$.ajax({
			type: "PATCH",
			url: "/api/users/" + userInfo.id,
          dataType: "json", // return data type
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify(jsonObj)
      	})
		.done(function(data, textStatus, jqXHR) {
          userInfo.image = data.image;

          cleanupAndHideCarousel();

          $("#profileImage").prop("src", data.image);
          $("#profileImage").show();
          $("#newImage").hide();
          $("#setImage").hide();
          $("#changePicture").show();
      	})
		.fail(function() {
			window.location.replace("/error");
		});
	});

	/**
		New Image brings up the Drag/Drop UI as well as the file browse button
		for the user to select a new image.  See HandleFileSelected for the handling
		after a user selects a new image.
	**/
	$("#newImage").click(function() {
		cleanupAndHideCarousel();

		$("#dropzone").show();
		$("#browseImage").show();
		$("#newImage").hide();
		$("#saveImage").hide();
		$("#setImage").hide();
	});

	// Setup the dnd listeners, and the file browse handler
	var dropZone = document.getElementById('dropzone');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', handleFileDropped, false);
	$("#browseImage").on("change", handleFileSelect);
}

function setupNameSection(profileType) {
	if (profileType == "mine") {
		// If I'm viewing my own profile, allow me to change stuff, otherwise don't!
		$("#displayName").prop("readonly", true);
		$(".displayName").addClass("displayNameHover");
		$(".profileName").addClass("profileNameHover");
	}

	$("#editName").click(function () {
		$("#displayName").prop("readonly", false);
		$("#displayName").focus();

		$("#editName").hide();
		$("#saveName").show();
	});

	$("#saveName").click(function() {
		var jsonObj = {};
		jsonObj.displayName = $("#displayName").val();

		$.ajax({
			type: "PATCH",
			url: "/api/users/" + userInfo.id,
          dataType: "json", // return data type
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify(jsonObj)
      	})
		.done(function(data, textStatus, jqXHR) {
          userInfo.displayName = data.displayName;

          $("#displayName").prop("readonly", true);
          $("#saveName").hide();
          $("#editName").show();
      	})
		.fail(function() {
			window.location.replace("/error");
		});
	});
}

function setupSocialSection(profileType) {
	// Followers Section
	console.log("calling get on /api/users/" + userInfo.id);
	$.getJSON("/api/users/" + userInfo.id, function(data) {
		console.log("received data = " + JSON.stringify(data));
		var socialStatusSection = createSocialStatusSectionElement(data);
		$("#socialStatusSection").append(socialStatusSection);

		var socialActionsSection = createSocialActionsSectionElement(data, true);
		$("#socialStatusSection").append(socialActionsSection);
	})
	.fail(function() {
		window.location.replace("/error");
	});
}

function setupTabs(profileType) {
	var tabGroup = createNewTabGroup(userInfo.id);
	$("#user").append(tabGroup);

	//set up profile tab
	//Don't show profile tab until we have a way to figure out 
	//how to revoke access for Twitter (already know how to do it for Facebook)
	//the server side code is already in place
	//setupProfileTab(profileType);

	setupPostsTab();

	setupFollowersTab();

	setupFollowingTab();

	setupTabRedirection(userInfo.id);
}


function setupProfileTab(profileType) {
	//if it's my profile, show the "Profile" tab
	if (profileType == "mine") {
		var tabDiv = appendNewTab(userInfo.id, "profile", "Profile");
		var title = $("<div>", {class: "sectionTitle"}).append("Manage your social networks");
		tabDiv.append(title);

		var connectedStatus = $("<span>", {class: "text-plain-small text-bold"}).append("Connected");
		var disconnectedStatus = $("<span>", {class: "text-plain-small text-bold"}).append("Not Connected");
		
		var facebookLogo = $("<span>").append($("<img>", {src: "/images/social/facebook_share.png"}));
		var connectFacebook = $("<a>", {class: "text-plain-small text-bold", href: "/auth/facebook"}).append("Connect");
		var disconnectFacebook = $("<a>", {class: "text-plain-small text-bold", href: "/auth/facebook/logout"}).append("Disconnect");

		var twitterLogo = $("<span>").append($("<img>", {src: "/images/social/twitter_share.png"}));
		var connectTwitter = $("<a>", {class: "text-plain-small text-bold", href: "/auth/twitter"}).append("Connect");
		var disconnectTwitter = $("<a>", {class: "text-plain-small text-bold", href: "/auth/twitter/logout"}).append("Disconnect");

		var table = $("<table>", {width: "100%"});

		//Facebook
		var tr = $("<tr>").append($("<td>", {width: "33%"}).append(facebookLogo));
		if (userInfo.facebook) {
			tr.append($("<td>", {width: "33%"}).append(connectedStatus.clone()));
			tr.append($("<td>", {width: "33%"}).append(disconnectFacebook));
		} else {
			tr.append($("<td>", {width: "33%"}).append(disconnectedStatus.clone()));
			tr.append($("<td>", {width: "33%"}).append(connectFacebook));
		}
		table.append(tr);

		//Twitter
		var tr = $("<tr>").append($("<td>", {width: "33%"}).append(twitterLogo));
		if (userInfo.twitter) {
			tr.append($("<td>", {width: "33%"}).append(connectedStatus.clone()));
			tr.append($("<td>", {width: "33%"}).append(disconnectTwitter));
		} else {
			tr.append($("<td>", {width: "33%"}).append(disconnectedStatus.clone()));
			tr.append($("<td>", {width: "33%"}).append(connectTwitter));
		}
		table.append(tr);

		tabDiv.append(table);

	}
}

function setupPostsTab() {
	var tabDiv = appendNewTab(userInfo.id, "posts", "Posts");
	createAndAppendContentContainer(tabDiv, 0, "posts", [{type: "thumbnail"}, {type: "filmstrip"}], [{type: "date", url: "/api/posts/?postedBy=" + userInfo.id + "&sortBy=dateCreated"}, {type: "popularity", url: "/api/posts/?postedBy=" + userInfo.id + "&sortBy=popularity"}]);
}

function setupFollowersTab() {
	var tabDiv = appendNewTab(userInfo.id, "followers", "Followers");
	createAndAppendContentContainer(tabDiv, 0, "followers", [{type: "thumbnail"}], [{type: "date", url: "/api/users/?followedId=" + userInfo.id + "&sortBy=lastSeen"}]);
}

function setupFollowingTab() {
	var tabDiv = appendNewTab(userInfo.id, "following", "Following");
	createAndAppendContentContainer(tabDiv, 0, "following", [{type: "thumbnail"}], [{type: "date", url: "/api/users/?followingId=" + userInfo.id + "&sortBy=lastSeen"}]);
}

function setupAndShowCarousel() {
	var alreadyAddedImages = [];

	if (userInfo.image) {
		appendProfileImageToCarousel(userInfo.image, true);
		alreadyAddedImages.push(userInfo.image);
	}

	if (userInfo.hasOwnProperty("facebook")) {
		if (userInfo.facebook.image && ($.inArray(userInfo.facebook.image, alreadyAddedImages) == -1)) {
			appendProfileImageToCarousel(userInfo.facebook.image);
			alreadyAddedImages.push(userInfo.facebook.image);
		}
	}

	if (userInfo.hasOwnProperty("google")) {
		if (userInfo.google.images && userInfo.google.images.length > 0) {
			for (var i = 0; i < userInfo.google.images.length; i++) {
				if ($.inArray(userInfo.google.images[i], alreadyAddedImages) == -1) {
					appendProfileImageToCarousel(userInfo.google.images[i]);
					alreadyAddedImages.push(userInfo.google.images[i]);
				}
			}
		}
	}

	if (userInfo.hasOwnProperty("twitter")) {
		if (userInfo.twitter.images && userInfo.twitter.images.length > 0) {
			for (var i = 0; i < userInfo.twitter.images.length; i++) {
				if ($.inArray(userInfo.twitter.images[i], alreadyAddedImages) == -1) {
					appendProfileImageToCarousel(userInfo.twitter.images[i]);
					alreadyAddedImages.push(userInfo.twitter.images[i]);
				}
			}
		}
	}

	//make sure to make the first item active
	$("#imageCarousel").show();
	$("#imageCarousel").carousel(0);

}

function cleanupAndHideCarousel() {
	$(".carousel .item").remove();
	$(".carousel-indicators li").remove();
	$("#imageCarousel").removeData();
	$("#imageCarousel").hide();
}

function appendProfileImageToCarousel(imageUrl, active, append /* false if prepend */) {
	this.carouselSlideIndex = 0;

	$div = $("<div>", {class: "item" + (active ? " active" : "")}).appendTo($(".carousel-inner"));
	$div.append($("<img>", { class: "img-responsive profileImage img-rounded", src: imageUrl , height: "200px"}));

	$ci = $(".carousel-indicators");

	$li = $("<li>", {"data-target" : "#imageCarousel", "data-slide-to" : this.carouselSlideIndex, class : (active ? " active" : "")});
	if (append) {
		$li.appendTo($ci);
	} else {
		$li.prependTo($ci);
	}

	this.carouselSlideIndex++;
}

function updateSocialStatus(profileType, isConnected, linkID, imageID, imageTickID, profilePath, authPath, regularIconPath, disabledIconPath) {
	if (isConnected) {
		if (profileType == "public") {
			$(linkID).attr("href", profilePath);
			$(imageID).attr("src", regularIconPath);
			$(imageID).show();
			$(imageTickID).hide();
		} else if (profileType == "member") {
			$(linkID).attr("href", profilePath);
			$(imageID).attr("src", regularIconPath);
			$(imageID).show();
			if (false) { // if user and userInfo are connected on Google
				$(imageTickID).show();
			} else {
				$(imageTickID).hide();
			}
		} else if (profileType == "mine") {
			$(linkID).attr("href", profilePath);
			$(imageID).attr("src", regularIconPath);
			$(imageID).show();
			$(imageTickID).show();
		}
	} else {
		if (profileType == "mine") {
			//show a grayed icon, with a link to connect
			$(linkID).attr("href", authPath);
			$(imageID).attr("src", disabledIconPath);
			$(imageTickID).hide();
		} else {
			$(imageID).hide();
			$(imageTickID).hide();
		}
	}
}

function handleFileDropped(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	extractImage(evt.dataTransfer.files, handleFileSelected);
}

/**
	This is called after a new image is dropped or selected by the user.  The
	user is then given the option to either Save Image to save the image to the profile
	or to try again by clicking the New Image button.
**/
function handleFileSelected(data, path, title) {
  $("#profileImage").prop("src", data);
  $("#profileImage").show();

  $("#dropzone").hide();
  $("#browseImage").hide();
  $("#newImage").show();
  $("#saveImage").show();
}

function handleFileSelect(evt) {
    extractImage(evt.target.files, handleFileSelected); // FileList object
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}