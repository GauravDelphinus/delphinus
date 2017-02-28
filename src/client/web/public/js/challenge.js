$(document).ready(function(){
	console.log("document.ready called, id is " + challengeId);
	$.getJSON('/api/challenges/' + challengeId, parseChallenge);

/*
	//set up form submit
	$('form').submit(function (e) {
		e.preventDefault();
		$.post('/quotes-api', {searchQuery: $("#searchQuery").val()});
		this.reset();
	});
	*/
});

function parseChallenge(challenge) {
	console.log("parseChallenge called, challenge.title = " + challenge.title);
	$("#challenge").empty();
	$("#challenge").append($("<img>").attr("src", challenge.image));
	$("#challenge").append($("<p>").text(challenge.title));
	$("#challenge").append($("<p>").text(challenge.created));

	/*
	$.each(challenge, function(){
		$("#challenge").append($("<img>").attr("src", this.imageURL));
		$("#challenge").append($("<p>").text(this.caption));
	});
	*/
}