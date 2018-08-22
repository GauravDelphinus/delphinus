$ = jQuery = require("jquery");
var React = require("react");
var ReactDOM = require("react-dom");
var App = require("./components/app");

function render() {
	var route = window.location.hash.substr(1);
	ReactDOM.render(<App route={route}/>, document.getElementById("app"));
}

window.addEventListener('hashchange', render);
render();
