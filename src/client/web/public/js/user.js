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

    //get challenges posted by this user
    $.getJSON('/api/challenges/?user=' + user.id, extractChallenges);

    //get entries posted by this user
    $.getJSON('/api/entries/?user=' + user.id, extractEntries);
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