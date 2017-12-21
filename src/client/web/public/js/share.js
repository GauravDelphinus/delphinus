$(document).ready(function(){
	//set up all event handlers
	if (!id || !type) {
		window.location.replace("/error");
	}

	if (target == "facebook") {
		detectFacebookPermissions();
		$("#facebook-section").show();
	} else if (target == "twitter") {
		detectTwitterPermissions();
		$("#twitter-section").show();
	}
});

/*
	Detect Facebook posting permissions, and depending on that,
	show the appropriate message/action to the user
*/
function detectFacebookPermissions() {
	$.getJSON('/api/social?target=facebook&attribute=permissions', function(data) {
		if (data.permissions == "publish") {
			//user is signed in with publish permissions
			$("#facebook-connected-section").show();
			$("#facebook-not-connected-section").hide();
			setupPreview("facebook-preview", function(link) {
				link = getHostnameForCurrentPage() + link;
				
				$("#facebook-share-link").append(link);
				$("#facebook-share-link").attr("href", link);

				$("#facebook-share-button").click(function() {
					sharePost("facebook", $("#facebook-share-text").val(), link, "facebook-share-button");
				});

				$("#facebook-cancel-button").click(function() {
					window.location.replace(getBackLink());
				});
			});
			
		} else if (data.permissions == "read") {
			$("#facebook-connected-section").hide();
			$("#facebook-not-connected-section").show();
			$("#facebook-not-enough-permissions-section").show();
			$("#facebook-not-signed-in-section").hide();

			$("#authenticate-facebook-button").click(function() {
				window.location.replace("/auth/facebook/share");
			});

			$("#facebook-cancel-link1").attr("href", getBackLink());
		} else {
			//either not connected, or couldn't determine the status
			$("#facebook-connected-section").hide();
			$("#facebook-not-connected-section").show();
			$("#facebook-not-enough-permissions-section").hide();
			$("#facebook-not-signed-in-section").show();

			$("#sign-in-facebook-button").click(function() {
				window.location.replace("/auth/facebook/share");
			});

			$("#facebook-cancel-link2").attr("href", getBackLink());
		}
	})
	.fail(function() {
		window.location.replace("/error");
	});
}

/*
	Detect Twitter posting permissions, and depending on that,
	show the appropriate message/action to the user
	Note: On Twitter we always ask for read+write permissions in the
	first place
*/
function detectTwitterPermissions() {
	$.getJSON('/api/social?target=twitter&attribute=permissions', function(data) {
		if (data.permissions == "publish") {
			//user is signed in with publish permissions
			$("#twitter-connected-section").show();
			$("#twitter-not-connected-section").hide();
			setupPreview("twitter-preview", function(link) {
				link = getHostnameForCurrentPage() + link;
				
				$("#twitter-share-link").append(link);
				$("#twitter-share-link").attr("href", link);

				$("#twitter-share-button").click(function() {
					sharePost("twitter", $("#twitter-share-text").val(), link, "twitter-share-button");
				});

				$("#twitter-cancel-button").click(function() {
					window.location.replace(getBackLink());
				});
			});
			
		} else {
			//either not connected, or don't have publish permissions
			$("#twitter-connected-section").hide();
			$("#twitter-not-connected-section").show();
			$("#sign-in-twitter-button").click(function() {
				window.location.replace("/auth/twitter");
			});

			$("#twitter-cancel-link").attr("href", getBackLink());
		}
	})
	.fail(function() {
		window.location.replace("/error");
	});
}

/*
	Set up preview of the entity
*/
function setupPreview(previewTag, done) {
	var getURL = "";
	var link = "";
	if (type == "entry") {
		getURL = "/api/entries/" + id;
		link = "/entry/" + id;
	} else if (type == "challenge") {
		getURL = "/api/challenges/" + id;
		link = "/challenge/" + id;
	}

	//pull data
	$.getJSON(getURL, function(data) {
		var mainElement = createSharePreview(data, "main");
		$("#" + previewTag).append(mainElement);
		done(link);
	}).fail(function() {
		window.location.replace("/error");
	});
}

/*
	Share the post to the target social network
	The post consistns of a 'message' and a 'link'
	The buttonId is the button that was clicked, and it will
	disable the button while posting to prevent multiple clicks
*/
function sharePost(target, message, link, buttonId) {
	var shareData = {message: message, link: link};
	$("#" + buttonId).prop("disabled", true);
	sendShare(target, shareData, function(error) {
		if (error) {
			showAlert("There appears to be a problem posting.  Please try again.", 1);
			$("#" + buttonId).prop("disabled", false);
		}
		else {
			showAlert("Posted successfully!  Redirecting ...", 1, function() {
				window.location.replace(getBackLink());
			});
		}
	});
}

/*
	Get the back link where we should take the user back when he clicks on cancel or go back buttons
	Typically passed as a 'referrer' get parameter to the /share page, and encoded using encodeURIComponent
*/
function getBackLink() {
	var redirectURL = getHostnameForCurrentPage(); //default to home page

	if (referrer) { //if there was a referrer parameter passed, then use that to decode
		redirectURL = decodeURIComponent(referrer);
	}

	return redirectURL;
}