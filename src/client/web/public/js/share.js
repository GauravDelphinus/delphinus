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
				var shareData = {};
				shareData.link = link;
				link = getHostnameForCurrentPage() + link;
				
				$("#facebook-share-link").append(link);
				$("#facebook-share-link").attr("href", link);

				$("#facebook-share-button").click(function() {
					shareData.message = $("#facebook-share-text").val();
					sendShare("facebook", shareData, function(error) {
						if (error) {
							showAlert("There appears to be a problem posting to Facebook.  Please try again.", 3);
						}
						else {
							showAlert("Posted successfully!", 3, function() {
								window.location.replace(document.referrer);
							});
						}
					});
				});
			});
			
		} else {
			//either not connected, or don't have publish permissions
			$("#facebook-connected-section").hide();
			$("#facebook-not-connected-section").show();
			$("#sign-in-facebook-button").click(function() {
				window.location.replace("/auth/facebook/share");
			});
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
				var shareData = {};
				shareData.link = link;
				link = getHostnameForCurrentPage() + link;
				
				$("#twitter-share-link").append(link);
				$("#twitter-share-link").attr("href", link);

				$("#twitter-share-button").click(function() {
					shareData.message = $("#twitter-share-text").val();
					sendShare("twitter", shareData, function(error) {
						if (error) {
							showAlert("There appears to be a problem posting to Twitter.  Please try again.", 3);
						}
						else {
							showAlert("Posted successfully!", 3, function() {
								window.location.replace(document.referrer);
							});
						}
					});
				});
			});
			
		} else {
			//either not connected, or don't have publish permissions
			$("#twitter-connected-section").hide();
			$("#twitter-not-connected-section").show();
			$("#sign-in-twitter-button").click(function() {
				window.location.replace("/auth/twitter");
			});
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