const Activity = require("./activity").Activity;

class EntryActivity extends Activity {
	constructor (timestamp, userId, entryId) {
		super ("Entry", timestamp, userId);

		this.entryId = entryId;
	}
}

module.exports = {
	EntryActivity : EntryActivity
};