
class Activity {
	constructor(type, timestamp, userId) {
		this.type = type;
		this.timestamp = timestamp;
		this.user = userId;
	}
}

module.exports = {
	Activity : Activity
};