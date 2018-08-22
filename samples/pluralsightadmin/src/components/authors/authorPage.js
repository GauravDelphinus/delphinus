"use strict";

var React = require("react");
var AuthorApi = require("../../api/authorApi");
var AuthorList = require("./authorList");

class AuthorPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			authors: []
		};
	}
	/*
	getInitialState() {
		return {
			authors: []
		};
	}
	*/
	componentDidMount() {
		this.setState({authors: AuthorApi.getAllAuthors()});
	}
	render() {
		return (
			<div>
				<a href="/#author" className="btn btn-default">Add Author</a>
				<AuthorList authors={this.state.authors}/>
			</div>
		);
	}
};

module.exports = AuthorPage;