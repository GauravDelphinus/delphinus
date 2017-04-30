function createLoginHeader() {

	if (!$("#header").length) {
		console.log("header not found");
		$("<div>", {id: "header"}).attr("class", "header").prependTo("body");
	}
	
	if (user) {
		console.log("user found");
		$("<div>", {id: "dropdown", class : "dropdown userLoginHeader"}).appendTo("#header");
		$("<a>", {href: "#", id: "dropdownmenu", class: "dropdown-toggle", "data-toggle" : "dropdown", text: user.displayName}).appendTo("#dropdown");
		$("<b>", {class: "caret"}).appendTo("#dropdownmenu");

		$("<ul>", {id: "dropdownlist", class: "dropdown-menu", role: "menu", "aria-labelledby" : "dropdownmenu"}).appendTo("#dropdown");

		$("<li>").append($("<a>", {text: "Profile", href: "/user/" + user.id})).appendTo("#dropdownlist");
		$("<li>").append($("<a>", {text: "Sign Out", href: "/auth/logout"})).appendTo("#dropdownlist");

	} else {
		$("<a>", {text: "Sign in", href : "/auth"}).attr("class", "userLoginHeader").appendTo("#header");
	}
}