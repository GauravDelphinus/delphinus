$(document).ready(function(){
  	createLoginHeader();

    // NOTE:
    // userInfo - whose page we're looking at
    // user - currently logged in user

    console.log("user is " + JSON.stringify(user));
    console.log("userInfo is " + JSON.stringify(userInfo));

  	if (userInfo) {

  		if (userInfo.displayName) {
  			//$("#profileInfo").append($("<p>", {text: "Display Name: " + userInfo.displayName, class: "userInfoText"}));
        $("#displayName").text(userInfo.displayName);
  		}

  		if (userInfo.image) {
  			//$("#profileInfo").append($("<img>", {src : userInfo.image, class: "userInfoImage"}));
        $("#image").attr("src", userInfo.image);
  		}

      if (!user || (user && (user.id != userInfo.id))) {
        // show public information
        if (userInfo.google && userInfo.google.id) {
          $("#linkGoogle").attr("href", "https://plus.google.com/" + userInfo.google.id);
          $("#imageGoogle").attr("src", "/images/social/google_regular_300x300.png");
        } else {
          $("#linkGoogle").hide();
          $("#imageGoogle").hide();
        }

        if (userInfo.twitter && userInfo.twitter.id) {
          $("#linkTwitter").attr("href", "https://twitter.com/" + userInfo.twitter.id);
          $("#imageTwitter").attr("src", "/images/social/twitter_regular_300x300.png");
        } else {
          $("#linkTwitter").hide();
          $("#imageTwitter").hide();
        }

        if (userInfo.facebook && userInfo.facebook.id) {
          $("#linkFacebook").attr("href", "https://www.facebook.com/" + userInfo.facebook.id);
          $("#imageFacebook").attr("src", "/images/social/facebook_regular_300x300.png");
        } else {
          $("#linkFacebook").hide();
          $("#imageFacebook").hide();
        }
      } else if (user && user.id == userInfo.id) {
        // if currently logged in user is the same user

        if (userInfo.google && userInfo.google.id) {
          $("#linkGoogle").attr("href", "https://plus.google.com/" + userInfo.google.id);
          $("#imageGoogle").attr("src", "/images/social/google_regular_300x300.png");
        } else {
          $("#linkGoogle").attr("href", "/auth/google");
          $("#imageGoogle").attr("src", "/images/social/google_disabled_300x300.png");
        }
        $("#linkGoogle").show();
        $("#imageGoogle").show();

        if (userInfo.twitter && userInfo.twitter.id) {
          $("#linkTwitter").attr("href", "https://twitter.com/" + userInfo.twitter.id);
          $("#imageTwitter").attr("src", "/images/social/twitter_regular_300x300.png");
        } else {
          $("#linkTwitter").attr("href", "/auth/twitter");
          $("#imageTwitter").attr("src", "/images/social/twitter_disabled_300x300.png");
        }
        $("#linkTwitter").show();
        $("#imageTwitter").show();

        if (userInfo.facebook && userInfo.facebook.id) {
          $("#linkFacebook").attr("href", "https://www.facebook.com/" + userInfo.facebook.id);
          $("#imageFacebook").attr("src", "/images/social/facebook_regular_300x300.png");
        } else {
          $("#linkFacebook").attr("href", "https://www.facebook.com/" + userInfo.facebook.id);
          $("#imageFacebook").attr("src", "/images/social/facebook_disabled_300x300.png");
        }
        $("#linkFacebook").show();
        $("#imageFacebook").show();

     		if (userInfo.id) {
          $("#profileInfo").append($("<p>", {text: "ID: " + userInfo.id, class: "userInfoText"}));
        }

        if (userInfo.email) {
          $("#profileInfo").append($("<p>", {text: "Email: " + userInfo.email, class: "userInfoText"}));
        }

        /*
        if (userInfo.google) {
    			if (userInfo.google.id) {
    				$("#profileInfo").append($("<p>", {text: "Google ID: " + userInfo.google.id, class: "userInfoText"}));
    			} 
    		} else {
    			$("#profileInfo").append($("<a>", {href: "/auth/google", text: "Connect to Google"})).append("<br>");
    		}

    		if (userInfo.twitter) {
    			if (userInfo.twitter.id) {
    				$("#profileInfo").append($("<p>", {text: "Twitter ID: " + userInfo.twitter.id, class: "userInfoText"}));
    			} 
    		} else {
    			$("#profileInfo").append($("<a>", {href: "/auth/twitter", text: "Connect to Twitter"})).append("<br>");
    		}

    		if (userInfo.facebook) {
    			if (userInfo.facebook.id) {
    				$("#profileInfo").append($("<p>", {text: "Facebook ID: " + userInfo.facebook.id, class: "userInfoText"}));
    			} 
    		} else {
    			$("#profileInfo").append($("<a>", {href: "/auth/facebook", text: "Connect to Facebook"})).append("<br>");
    		}
        */


      }
      

      //get challenges posted by this user
      $.getJSON('/api/challenges/?user=' + userInfo.id, extractChallenges);

      //get entries posted by this user
      $.getJSON('/api/entries/?user=' + userInfo.id, extractEntries);
  	}


});

function extractChallenges(challenges) {
  var numCols = 5; // max columns

  $("#challengesTable").empty();

  for (var i = 0; i < challenges.length; i++) {
    var col = i % numCols;
    //var row = i / numCols;

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
    //var row = i / numCols;

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