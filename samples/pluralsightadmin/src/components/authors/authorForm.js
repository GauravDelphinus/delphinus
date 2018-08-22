"use strict";

var React = require("react");

class AuthorForm extends React.Component {
	render() {
		return (
			<form>
				<h1>Manage Author</h1>
				<input
					type="text"
					className="form-control"
					name="firstName"
					placeholder="First Name"
					ref="firstName"
					value={this.props.author.firstName}
					onChange={this.props.onChange}
					 />

				<input
					type="text"
					name="lastName"
					className="form-control"
					placeholder="Last Name"
					ref="lastName"
					value={this.props.author.lastName}
					onChange={this.props.onChange}
					 />

				<input type="submit" value="Save" className="btn btn-default" onClick={this.props.onSave} />
			</form>
		);
	}
};

module.exports = AuthorForm;