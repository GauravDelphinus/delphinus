$(document).ready(function(){
	//set up all event handlers
	if (!id || !type) {
		window.location.replace("/error");
	}

	if (target == "facebook") {
		detectFacebookPermissions();
	}
});

/*
	Detect Facebook posting permissions, and depending on that,
	show the appropriate message/action to the user
*/
function detectFacebookPermissions() {
	$.getJSON('/api/social?target=facebook&attribute=permissions', function(data) {
		if (data.permissions == "offline") {
			//user is not signed in
			$("#permission-status-section").show();
			$("#content-section").hide();
			$("#permission-status").text("Looks like you're not signed-in to Facebook.  Please sign-in to continue sharing");
			$("#authenticate-facebook-button").empty().append("Sign in to Facebook");
		} else if (data.permissions == "read") {
			//user is signed in, but only in read-only mode
			$("#permission-status-section").show();
			$("#content-section").hide();
			$("#permission-status").text("Looks like you need additional permissions to post this to Facebook.");
			$("#authenticate-facebook-button").empty().append("Review permissions with Facebook");
			$("#authenticate-facebook-button").click(function() {
				window.location.replace("/auth/facebook/share");
			});
		} else if (data.permissions == "publish") {
			//user is signed in with publish permissions
			$("#content-section").show();
			$("#permission-status-section").hide();
			setupPreview(function(link) {
				var shareData = {};
				shareData.link = link;
				shareData.caption = $("#data-caption").val();

				$("#facebook-share-button").click(function() {
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
			$("#permission-status-section").show();
			$("#content-section").hide();
			$("#permission-status").text("Oops... We couldn't determine your connection status with Facebook.");
			$("#authenticate-facebook-button").empty().append("Retry");
			$("#authenticate-facebook-button").click(function() {
				location.reload();
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
function setupPreview(done) {
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
		$("#main").append(mainElement);
		done(link);
	}).fail(function() {
		window.location.replace("/error");
	});
}