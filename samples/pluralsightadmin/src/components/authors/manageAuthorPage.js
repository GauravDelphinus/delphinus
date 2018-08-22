"use strict";

var React = require("react");
var AuthorForm = require("./authorForm");

class ManageAuthorPage extends React.Component {
	constructor(props) {
		super(props);
		this.state = {author: {id: '', firstName: '', lastName: ''}};
		this.setAuthorState = this.setAuthorState.bind(this);
	}
	
	setAuthorState(event) {
		var field = event.target.name;
		var value = event.target.value;
		this.state.author[field] = value;
		return this.setState({author: this.state.author});
	}

	render() {
		return (
			<AuthorForm author={this.state.author} onChange={this.setAuthorState}/>
		);
	}
};

module.exports = ManageAuthorPage;