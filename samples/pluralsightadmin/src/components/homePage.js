"use strict";

var React = require('react');
var Router = require("react-router");
var Link = Router.Link;

class Home extends React.Component {
	render() {
		return (
			<div className="jumbotron">
				<h1>Pluralsight Administration</h1>
				<p>React, React Router, and Flux for ultra-responsive web apps.</p>
			</div>
		);
	}
};

module.exports = Home;