"use strict";

var React = require("react");
var Home = require("./homePage");
var Header = require("./common/header");
var Authors = require("./authors/authorPage");
var About = require("./about/aboutPage");
var ManageAuthorPage = require("./authors/manageAuthorPage");

class App extends React.Component {
	render() {
		var Child;

		switch (this.props.route) {
			case 'about': Child = About; break;
			case 'authors': Child = Authors; break;
			case 'author': Child = ManageAuthorPage; break;
			default: Child = Home; break;
		}

		return (
			<div>
				<Header/>
				<Child/>
			</div>
		);
	}
};

module.exports = App;