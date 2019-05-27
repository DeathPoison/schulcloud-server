const service = require('feathers-mongoose');
const { newsModel, newsHistoryModel } = require('./model');
const hooks = require('./hooks');

/**
 * Recursively flattens an array
 * @param {Array} arr array to flatten
 * @example flatten([1, [2], [[3, 4], 5], 6]) => [1, 2, 3, 4, 5, 6]
 * @returns {Array} flatted array
 */
const flatten = arr => arr.reduce((agg, el) => {
	if (el instanceof Array) {
		return agg.concat(flatten(el));
	}
	return agg.concat(el);
}, []);

/**
 * Emulates Feathers-style pagination on a given array.
 * @param {Array} data Array-like collection to paginate
 * @param {Object} params Feathers request params containing paginate, $limit, and $skip
 * @returns {Object} { total, limit, skip, data }
 */
const paginate = (data, params) => {
	if (params.paginate === false) {
		return data;
	}
	const limit = params.$limit || data.length;
	const skip = params.$skip || 0;
	const paginatedData = data.slice(skip, skip + limit);
	return {
		total: data.length,
		limit,
		skip,
		data: paginatedData,
	};
};

class NewsService {
	setup(app) {
		this.app = app;
	}

	/**
	 * Returns all school news the user is allowed to see.
	 * @param {Object} { userId, schoolId } -- The user's Id and schoolId
	 * @returns Array<News Document>
	 * @memberof NewsService
	 */
	async findSchoolNews({ userId, schoolId }) {
		const user = await this.app.service('users').get(userId);
		const hasAccess = user.permissions.includes('NEWS_VIEW');
		if (!hasAccess) {
			throw new Error('Mising permissions to view school news.');
		}
		return newsModel.find({	schoolId }).lean();
	}

	/**
	 * Returns scoped news the user is allowed to see
	 *
	 * @param {BsonId|String} userId the user's Id
	 * @param {BsonId|String} target (optional) Id of the news target (course, team, etc.)
	 * @returns Array<News Document>
	 * @memberof NewsService
	 */
	async findScopedNews(userId, target) {
		const scopes = await newsModel.distinct('targetModel');
		const ops = scopes.map(async (scope) => {
			// For each possible target model, find all targets the user has NEWS_VIEW permissions in.
			const scopeListService = this.app.service(`/users/:scopeId/${scope}`);
			if (scopeListService === undefined) {
				throw new Error(`Missing ScopeListService for scope "${scope}".`);
			}
			let scopeItems = await scopeListService.find({
				route: { scopeId: userId.toString() },
				query: { permissions: ['NEWS_VIEW'] },
			});
			if (target) {
				// if a target id is given, only return news from this target
				scopeItems = scopeItems.filter(i => i._id.toString() === target.toString());
			}
			return Promise.all(scopeItems.map(async (item) => {
				const news = await newsModel.find({
					targetModel: scope,
					target: item._id,
				}).lean();
				// Manually populate the target (current API requires this):
				return Promise.all(news.map(async n => ({
					...n,
					target: await this.app.service(scope).get(n.target),
				})));
			}));
		});
		const results = await Promise.all(ops);
		return flatten(results);
	}

	/**
	 * GET /news/
	 * Returns all news the user can see.
	 * @param {*} params
	 * @returns array of news items
	 * @memberof NewsService
	 */
	async find(params) {
		let news = [];
		const scoped = params.query && params.query.target;
		if (scoped) {
			news = news.concat(await this.findScopedNews(params.account.userId, params.query.target));
		} else {
			news = news.concat(await this.findSchoolNews(params.account));
			news = news.concat(await this.findScopedNews(params.account.userId));
		}
		return Promise.resolve(paginate(news, params));
	}
}

module.exports = function news() {
	const app = this;
	const newsService = new NewsService();
	app.use('/news', newsService);
	app.service('news').hooks(hooks);

	app.use('/newshistory', service({
		Model: newsHistoryModel,
	}));
	const newsHistoryService = app.service('/newshistory');
	newsHistoryService.hooks(hooks);
};
