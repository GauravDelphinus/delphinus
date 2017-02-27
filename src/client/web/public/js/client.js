$(document).ready(function(){
	console.log("document.ready called, id is " + id);
	$.getJSON('/challenge' + findGetParameter("id"), parseChallenge);

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
	$("#challenge").empty();
	$("#challenge").append($("<img>").attr("src", this.image));
	$("#challenge").append($("<p>").text(this.title));
	$("#challenge").append($("<p>").text(this.created));

	/*
	$.each(challenge, function(){
		$("#challenge").append($("<img>").attr("src", this.imageURL));
		$("#challenge").append($("<p>").text(this.caption));
	});
	*/
}

function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
    .substr(1)
        .split("&")
        .forEach(function (item) {
        tmp = item.split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    });
    return result;
}