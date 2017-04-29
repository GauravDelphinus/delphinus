$(document).ready(function(){
	$.getJSON('/api/entries/' + entryId, parseEntry);
	$.getJSON("/api/users?entryId=" + entryId, parseUser);

	$("#goToHomePage").click(function() {
    	window.open("/", "_self");
  	});

  	$("#goToChallenge").click(function(){
  		window.open("/challenge/" + challengeId, "_self");
  	});

  	createLoginHeader();
});

function parseUser(users) {
	var user = users[0];
	$("#entryPostedBy").append($("<a>", {href: "/user/" + user.id, text: user.displayName}));
	$("#entryPostedBy").append($("<img>", {src: user.image}));
}

function parseEntry(entry) {

	$("#entryImage").attr("src", entry.image);
	$("#entryTitle").text("Entry: " + entryId);
	$(document).prop("title", "Entry: " + entryId);
	var date = new Date(parseInt(entry.created));
	$("#entryCreationDate").text(date.toString());
}