function createLoginHeader() {

	if (!$("#userLoginHeader").length) {
		$("<div>", {id: "userLoginHeader"}).attr("class", "userLoginHeader").prependTo("body");
	}
	
	if (user) {
		$("<div>", {class : "dropdown"}).appendTo("#userLoginHeader").append($("<span>", {id : "dropbtn", class : "dropbtn"}));

		
		var img = $("<img>");
		img.attr("src", user.image);
		img.attr("class", "userImageHeader");
		img.appendTo("#dropbtn");


		$("<p>", {text: user.displayName}).attr("class", "userNameHeader").appendTo("#dropbtn");

		$("<div>", {id: "dropDownList", class : "dropdown-content"}).appendTo(".dropdown");
		$("<a>", {text: "Sign Out", href : "/auth/logout"}).attr("class", "signOutTextHeader").appendTo("#dropDownList");

	} else {
		$("<a>", {text: "Sign in", href : "/auth/google"}).attr("class", "signInTextHeader").appendTo("#userLoginHeader");
	}
}