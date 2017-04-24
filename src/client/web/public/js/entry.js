$(document).ready(function(){
	$.getJSON('/api/entries/' + entryId, parseEntry);

	$("#goToHomePage").click(function() {
    	window.open("/", "_self");
  	});

  	$("#goToChallenge").click(function(){
  		window.open("/challenge/" + challengeId, "_self");
  	});

  	createLoginHeader();
});

function parseEntry(entry) {

	$("#entryImage").attr("src", entry.image);
	$("#entryTitle").text("Entry: " + entryId);
	$(document).prop("title", "Entry: " + entryId);
	var date = new Date(parseInt(entry.created));
	$("#entryCreationDate").text(date.toString());
}