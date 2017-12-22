var Entity = require("./entity");

class ContentEntity extends Entity {
	constructor(id, imageType, created, caption, postedBy) {
		super(id);

		this.imageType = imageType;
		this.created = created;
		this.caption = caption;
		this.postedBy = postedBy;
	}
}

module.exports = ContentEntity;