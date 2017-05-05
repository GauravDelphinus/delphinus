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
  	if (userInfo) {

      // Profile Image and Name
      setupCarousel(userInfo);


      if (userInfo.displayName) {
        $("#displayName").text(userInfo.displayName);
      }

      // Followers Section
      //testing
      userInfo.numFollowers = 122;
      if (userInfo.numFollowers) {
        $("#numFollowers").text(userInfo.numFollowers);
      }

      $("#followLink").text("FOLLOW " + userInfo.displayName).attr("href", "/user/" + userInfo.id + "/follow");

      // Social Section
      if (profileType == "public" || profileType == "member") {
        $("#socialHeader").text("Connect with " + userInfo.displayName);
      } else if (profileType == "mine") {
        $("#socialHeader").text("Manage your Social Networks");
      }

      console.log("userInfo is " + JSON.stringify(userInfo));

      console.log("userInfo.google is " + userInfo.google);
      console.log("userInfo.twitter is " + userInfo.twitter);
      console.log("userInfo.facebook is " + userInfo.facebook);

      var googleIsConnected = userInfo.hasOwnProperty("google") ? userInfo.google.hasOwnProperty("id") : false;
      var googleProfileLink = (googleIsConnected) ? "https://plus.google.com/" + userInfo.google.id : "/auth/google";
      var twitterIsConnected = userInfo.hasOwnProperty("twitter") ? userInfo.twitter.hasOwnProperty("username") : false;
      var twitterProfileLink = (twitterIsConnected) ? "https://twitter.com/" + userInfo.twitter.username : "/auth/twitter";
      var facebookIsConnected = userInfo.hasOwnProperty("facebook") ? userInfo.facebook.hasOwnProperty("id") : false;
      var facebookProfileLink = (facebookIsConnected) ? "https://www.facebook.com/" + userInfo.facebook.id : "/auth/facebook";

      updateSocialStatus(profileType, googleIsConnected, "#linkGoogle", "#imageGoogle", "#imageGoogleTick", googleProfileLink, "/auth/google", "/images/social/google_regular_300x300.png", "/images/social/google_disabled_300x300.png");
      updateSocialStatus(profileType, twitterIsConnected, "#linkTwitter", "#imageTwitter", "#imageTwitterTick", twitterProfileLink, "/auth/twitter", "/images/social/twitter_regular_300x300.png", "/images/social/twitter_disabled_300x300.png");
      updateSocialStatus(profileType, facebookIsConnected, "#linkFacebook", "#imageFacebook", "#imageFacebookTick", facebookProfileLink, "/auth/facebook", "/images/social/facebook_regular_300x300.png", "/images/social/facebook_disabled_300x300.png");

      
     		if (userInfo.id) {
          $("#profileInfo").append($("<p>", {text: "ID: " + userInfo.id, class: "userInfoText"}));
        }

        if (userInfo.email) {
          $("#profileInfo").append($("<p>", {text: "Email: " + userInfo.email, class: "userInfoText"}));
        }

      //get challenges posted by this user
      $.getJSON('/api/challenges/?user=' + userInfo.id, extractChallenges);

      //get entries posted by this user
      $.getJSON('/api/entries/?user=' + userInfo.id, extractEntries);

      //trigger the carousel
      $("#imageCarousel").carousel();
  	}


});

function setupCarousel(userInfo) {
        if (userInfo.image) {
        appendProfileImageToCarousel(userInfo.image, true);
      }

      if (userInfo.hasOwnProperty("facebook")) {
        if (userInfo.facebook.image) {
          appendProfileImageToCarousel(userInfo.facebook.image);
        }
      }
      if (userInfo.hasOwnProperty("google")) {
        console.log("num Google Images = " + userInfo.google.images.length);
        if (userInfo.google.images && userInfo.google.images.length > 0) {
          for (var i = 0; i < userInfo.google.images.length; i++) {
            appendProfileImageToCarousel(userInfo.google.images[i]);
          }
        }
      }

      if (userInfo.hasOwnProperty("twitter")) {
        console.log("num Twitter Images = " + userInfo.twitter.images.length);
        if (userInfo.twitter.images && userInfo.twitter.images.length > 0) {
          for (var i = 0; i < userInfo.twitter.images.length; i++) {
            appendProfileImageToCarousel(userInfo.twitter.images[i]);
          }
        }
      }
}
function appendProfileImageToCarousel(imageUrl, active) {
  this.carouselSlideIndex = 0;

  $div = $("<div>", {class: "item" + (active ? " active" : "")}).appendTo($(".carousel-inner"));
  $div.append($("<img>", {class: "img-responsive profileImage", src: imageUrl, height: "200px"}));

  $ci = $(".carousel-indicators");
  $("<li>", {"data-target" : "#imageCarousel", "data-slide-to" : this.carouselSlideIndex, class : (active ? " active" : "")}).appendTo($ci);

  this.carouselSlideIndex++;
}

function updateSocialStatus(profileType, isConnected, linkID, imageID, imageTickID, profilePath, authPath, regularIconPath, disabledIconPath) {
  // Google
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