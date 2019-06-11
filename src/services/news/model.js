const mongoose = require('mongoose');
// const { Forbidden } = require('@feathersjs/errors');
// const { immutableFieldPlugin } = require('../../utils/mongoose');

const { Schema } = mongoose;

const targetModels = ['courses', 'teams', 'class'];

const newsSchema = new Schema({
	schoolId: { type: Schema.Types.ObjectId, required: true, immutable: true },
	title: { type: String, required: true },
	content: { type: String, required: true },
	displayAt: { type: Date, default: Date.now, required: true },

	creatorId: {
		type: Schema.Types.ObjectId,
		ref: 'user',
		required: true,
		immutable: true,
	},
	createdAt: { type: Date, default: Date.now, required: true },

	updaterId: { type: Schema.Types.ObjectId, ref: 'user' },
	updatedAt: { type: Date },
	history: [{ type: Schema.Types.ObjectId, ref: 'newsArchiv' }],
	externalId: { type: String }, // e.g. guid for rss feed items
	source: {
		type: String,
		default: 'internal',
		enum: ['internal', 'rss'],
		immutable: true,
		required: true,
	},
	sourceDescription: {
		type: String,
	},
	target: {
		type: Schema.Types.ObjectId,
		// Instead of a hardcoded model name in `ref`, `refPath` means Mongoose
		// will look at the `targetModel` property to find the right model.
		refPath: 'targetModel',
		immutable: true,
		// target and targetModel must be defined together or not
		required: function requiredTarget() {
			return !!this.targetModel;
		},
	},
	targetModel: {
		type: String,
		enum: targetModels,
		immutable: true,
		// target and targetModel must be defined together or not
		required: function requiredTargetModel() {
			return !!this.target;
		},
	},
});

// newsSchema.plugin(immutableFieldPlugin);

// // eslint-disable-next-line prefer-arrow-callback
// newsSchema.pre('save', function checkImmutables(next) {
// 	const props = newsSchema.tree;
// 	Object.keys(props).forEach((prop) => {
// 		if (props[prop].immutable && !props[prop].isNew && props[prop].isModified) {
// 			throw new Forbidden('bäaaam');
// 		}
// 	});
// 	return next();
// });

const newsModel = mongoose.model('news', newsSchema);

const newsHistoryModel = mongoose.model('newshistory', new Schema({
	title: { type: String, required: true },
	content: { type: String, required: true },
	displayAt: { type: Date, default: Date.now },

	creatorId: { type: Schema.Types.ObjectId, ref: 'user' },
	createdAt: { type: Date, default: Date.now },
	parentId: { type: Schema.Types.ObjectId, ref: 'news' },
}));


module.exports = {
	newsModel,
	targetModels,
	newsHistoryModel,
};
