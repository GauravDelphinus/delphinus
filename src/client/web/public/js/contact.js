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
		showAlert("Thank you for your interest, you will hear from us shortly!", 2, function() {
			window.location.replace("/");
		});	
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		showAlert("Oops, looks like there's a problem with your submission.  Please try again later.", 2, function() {
			window.location.replace("/");
		});
	});
	});
});