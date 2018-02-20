$(document).ready(function(){
	$("#submitButton").click(function() {
		var jsonObj = {
			name: $("#nameText").val(),
			email: $("#emailText").val()
		};

		$.ajax({
		type: "POST",
		url: "/api/contact",
		dataType: "json", // return data type
		contentType: "application/json; charset=UTF-8",
		data: JSON.stringify(jsonObj)
	})
	.done(function(data, textStatus, jqXHR) {
		//if the challenge was posted successfully, redirect to the newly created challenge page
    	window.location.replace("/");
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		window.location.replace("/");
	});
	});
});