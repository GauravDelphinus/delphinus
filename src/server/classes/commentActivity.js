const Activity = require("./activity").Activity;

class CommentActivity extends Activity {
	constructor (type, timestamp, userId, commentId) {
		super("Comment", timestamp, userId);

		this.commentId = commentId;
	}
}

module.exports = {
	CommentActivity : CommentActivity
};