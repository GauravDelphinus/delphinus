$(document).ready(function(){
	createLoginHeader();

	// NOTE:
	// userInfo - whose page we're looking at
	// user - currently logged in user

	console.log("user is " + JSON.stringify(user));
	console.log("userInfo is " + JSON.stringify(userInfo));

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

	console.log("profileType is " + profileType);

	if (userInfo.image.indexOf("http") == -1) {
		userInfo.image = "/users/images/" + userInfo.image;
	}
	// Profile Image and Name
	$("#profileImage").attr("src", userInfo.image);
	$("#displayName").val(userInfo.displayName);

	// set up all the image related handlers (including carousel, drag drop, etc.)
	setupImageHandlers(profileType);

	setupNameSection(profileType);

	setupFollowSection(profileType);

	// set up the social information
	setupSocialSection(profileType);

	//get challenges posted by this user
	$.getJSON('/api/challenges/?user=' + userInfo.id, extractChallenges);

	//get entries posted by this user
	$.getJSON('/api/entries/?user=' + userInfo.id, extractEntries);
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
		jsonObj.user = {};
		jsonObj.user.id = userInfo.id;
		jsonObj.user.image = selectedImageSrc;

		$.ajax({
			type: "PUT",
			url: "/api/users/",
			dataType: "json", // return data type
			contentType: "application/json; charset=UTF-8",
			data: JSON.stringify(jsonObj)
		})
		.done(function(data, textStatus, jqXHR) {
			//alert("successful, image is " + data.image);
			userInfo.image = data.image;

			$("#profileImage").prop("src", "/users/images/" + data.image);
			$("#profileImage").show();
			$("#newImage").hide();
			$("#saveImage").hide();
			$("#changePicture").show();
		})
		.fail(function(jqXHR, textStatus, errorThrown) {
			alert("some error was found, " + errorThrown);
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
		jsonObj.user = {};
		jsonObj.user.id = userInfo.id;
		jsonObj.user.image = selectedImage;

		$.ajax({
			type: "PUT",
			url: "/api/users/",
          dataType: "json", // return data type
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify(jsonObj)
      	})
		.done(function(data, textStatus, jqXHR) {
          //alert("successful, image is " + data.image);
          userInfo.image = data.image;

          cleanupAndHideCarousel();

          $("#profileImage").prop("src", data.image);
          $("#profileImage").show();
          $("#newImage").hide();
          $("#setImage").hide();
          $("#changePicture").show();
      	})
		.fail(function(jqXHR, textStatus, errorThrown) {
			alert("some error was found, " + errorThrown);

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
		jsonObj.user = {};
		jsonObj.user.id = userInfo.id;
		jsonObj.user.displayName = $("#displayName").val();

		$.ajax({
			type: "PUT",
			url: "/api/users/",
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
		.fail(function(jqXHR, textStatus, errorThrown) {
			alert("some error was found, " + errorThrown);

		});
	});
}

function setupFollowSection(profileType) {
	if (profileType == "mine") {
		//don't show the follow button
		$("#followButton").hide();
	} else if (profileType == "member") {
		//find out if you're already following this user or not

		$.getJSON("/api/users/follow/" + userInfo.id, function(result) {
			if (result.followStatus == "following") {
				$("#followButton").prop("value", "FOLLOWING");
          		$("#followButton").data("followStatus", "following");
          		$("#followButton").show();
          	} else if (result.followStatus == "not_following") {
          		$("#followButton").prop("value", "FOLLOW " + userInfo.displayName);
          		$("#followButton").data("followStatus", "not_following");
          		$("#followButton").show();
          }
		});
	} else if (profileType == "public") {
		//redirect to sign-in
		$("#followButton").prop("value", "FOLLOW " + userInfo.displayName);
		$("#followButton").show();
	}


	$("#followButton").click(function() {
		if (profileType == "public") {
			window.open("/auth", "_self");
		} else if (profileType == "member") {

			var jsonObj = {};
			if ($("#followButton").data("followStatus") == "not_following") {
				jsonObj.followAction = "follow";
			} else {
				jsonObj.followAction = "unfollow";
			}

			$.ajax({
				type: "PUT",
				url: "/api/users/follow/" + userInfo.id,
	          dataType: "json", // return data type
	          contentType: "application/json; charset=UTF-8",
	          data: JSON.stringify(jsonObj)
	      	})
			.done(function(data, textStatus, jqXHR) {
	          	if (data.followStatus == "following") {
	          		//already following
	          		$("#followButton").prop("value", "FOLLOWING");
	          		$("#followButton").data("followStatus", "following");
	          		$("#followButton").show();
	          	} else {
	          		$("#followButton").prop("value", "FOLLOW" + userInfo.displayName);
	          		$("#followButton").data("followStatus", "not_following");
	          		$("#followButton").show();
	          	}
	      	})
			.fail(function(jqXHR, textStatus, errorThrown) {
				alert("some error was found, " + errorThrown);

			});
		}
	});

	//calculate the number of followers
	$.getJSON("/api/users/" + userInfo.id + "?numFollowers=true", function(result) {
		console.log("result is " + JSON.stringify(result));
		userInfo.numFollowers = result.numFollowers;

		$("#numFollowers").text(userInfo.numFollowers);
	});

	

	//$("#followLink").text("FOLLOW " + userInfo.displayName).attr("href", "/user/" + userInfo.id + "/follow");

}

function setupSocialSection(profileType) {
	// Followers Section
	//testing
	
	// Social Section
	if (profileType == "public" || profileType == "member") {
		$("#socialHeader").text("Connect with " + userInfo.displayName);
	} else if (profileType == "mine") {
		$("#socialHeader").text("Manage your Social Networks");
	}

	var googleIsConnected = userInfo.hasOwnProperty("google") ? userInfo.google.hasOwnProperty("id") : false;
	var googleProfileLink = (googleIsConnected) ? "https://plus.google.com/" + userInfo.google.id : "/auth/google";
	var twitterIsConnected = userInfo.hasOwnProperty("twitter") ? userInfo.twitter.hasOwnProperty("username") : false;
	var twitterProfileLink = (twitterIsConnected) ? "https://twitter.com/" + userInfo.twitter.username : "/auth/twitter";
	var facebookIsConnected = userInfo.hasOwnProperty("facebook") ? userInfo.facebook.hasOwnProperty("id") : false;
	var facebookProfileLink = (facebookIsConnected) ? "https://www.facebook.com/" + userInfo.facebook.id : "/auth/facebook";

	updateSocialStatus(profileType, googleIsConnected, "#linkGoogle", "#imageGoogle", "#imageGoogleTick", googleProfileLink, "/auth/google", "/images/social/google_regular_300x300.png", "/images/social/google_disabled_300x300.png");
	updateSocialStatus(profileType, twitterIsConnected, "#linkTwitter", "#imageTwitter", "#imageTwitterTick", twitterProfileLink, "/auth/twitter", "/images/social/twitter_regular_300x300.png", "/images/social/twitter_disabled_300x300.png");
	updateSocialStatus(profileType, facebookIsConnected, "#linkFacebook", "#imageFacebook", "#imageFacebookTick", facebookProfileLink, "/auth/facebook", "/images/social/facebook_regular_300x300.png", "/images/social/facebook_disabled_300x300.png");

	// temporary for testing only
	if (userInfo.id) {
		$("#profileInfo").append($("<p>", {text: "ID: " + userInfo.id, class: "userInfoText"}));
	}
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

function extractChallenges(challenges) {
	var numCols = 5; // max columns

	$("#challengesTable").empty();

	for (var i = 0; i < challenges.length; i++) {
		var col = i % numCols;
		var challenge = challenges[i];

		var td = $("<td>").append($("<img>").attr("src", "/challenges/images/" + challenge._id).attr("width", "100"));
		td.append($("<br>"));
		td.append($("<a>").attr("href", "/challenge/" + challenge._id).text(challenge.title));
        
		if (col == 0) {
			$("#challengesTable").append("<tr>").append(td);
		} else {
			$("#challengesTable").append(td);
		}
	}
}

function extractEntries(entries) {
	var numCols = 5; // max columns

	$("#entriesTable").empty();

	for (var i = 0; i < entries.length; i++) {
		var col = i % numCols;
        var entry = entries[i];

		var td = $("<td>").append($("<img>").attr("src", "/entries/images/" + entry._id).attr("width", "100"));
		td.append($("<br>"));
		td.append($("<a>").attr("href", "/entry/" + entry._id).text("Entry " + entry._id));
        
		if (col == 0) {
			$("#entriesTable").append("<tr>").append(td);
		} else {
			$("#entriesTable").append(td);
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