$(document).ready(function(){
  	createLoginHeader();

  	if (user) {
  		if (user.id) {
  			$("#profileInfo").append($("<p>", {text: "ID: " + user.id, class: "userInfoText"}));
  		}

  		if (user.displayName) {
  			$("#profileInfo").append($("<p>", {text: "Display Name: " + user.displayName, class: "userInfoText"}));
  		}

  		if (user.email) {
  			$("#profileInfo").append($("<p>", {text: "Email: " + user.email, class: "userInfoText"}));
  		}

  		if (user.image) {
  			$("#profileInfo").append($("<img>", {src : user.image, class: "userInfoImage"}));
  		}

  		if (user.google) {
  			if (user.google.id) {
  				$("#profileInfo").append($("<p>", {text: "Google ID: " + user.google.id, class: "userInfoText"}));
  			} 
  		} else {
  			$("#profileInfo").append($("<a>", {href: "/auth/google", text: "Connect to Google"})).append("<br>");
  		}

  		if (user.twitter) {
  			if (user.twitter.id) {
  				$("#profileInfo").append($("<p>", {text: "Twitter ID: " + user.twitter.id, class: "userInfoText"}));
  			} 
  		} else {
  			$("#profileInfo").append($("<a>", {href: "/auth/twitter", text: "Connect to Twitter"})).append("<br>");
  		}

  		if (user.facebook) {
  			if (user.facebook.id) {
  				$("#profileInfo").append($("<p>", {text: "Facebook ID: " + user.facebook.id, class: "userInfoText"}));
  			} 
  		} else {
  			$("#profileInfo").append($("<a>", {href: "/auth/facebook", text: "Connect to Facebook"})).append("<br>");
  		}
  	}
});