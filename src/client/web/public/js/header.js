/*
	Create the 'Sign in' button in the nav bar depending on whether the user is currently
	signed in or not
*/
function createLoginHeader() {
	var navbarItem = $("#userNavbarItem");
	if (user) {
		$(navbarItem).empty().addClass("dropdown");
		$(navbarItem).append($("<a>", {class: "dropdown-toggle", "data-toggle" : "dropdown", href: "#"}).append($("<img>", {src: user.image, class: "userImage"})).append(user.displayName).append($("<span>", {class: "caret"})));
		var items = $("<ul>", {class: "dropdown-menu"});
		$(items).append($("<li>").append($("<a>", {href: "/user"}).append("Profile")));
		$(items).append($("<li>").append($("<a>", {href: "/auth/logout"}).append("Sign out")));
		$(navbarItem).append($(items));

	} else {
		$(navbarItem).empty().removeClass("dropdown");
		$(navbarItem).append($("<a>", {href: "/auth"}).append("Sign in"));
	}
}