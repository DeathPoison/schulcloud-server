const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const request = require('request-promise-native');
const appPromise = require('../../../src/app');
const MockNodes = JSON.stringify(require('./mock/response-node.json'));
const MockAuth = require('./mock/response-auth.json');
const EduSharingResponse = require('../../../src/services/edusharing/services/EduSharingResponse');

describe('EduSharing service', () => {
	let eduSharingResponse;
	let eduSharingService;
	let app;
	before(async () => {
		app = await appPromise;
		eduSharingService = app.service('edu-sharing');
		eduSharingResponse = new EduSharingResponse();
	});

	after((done) => {
		done();
	});

	it('registered the service', async () => {
		assert.ok(eduSharingService);
	});

	it('search with an empty query', async () => {
		const query = {};
		try {
			const response = await eduSharingService.find({ query });
			chai.expect(JSON.stringify(response)).to.equal(JSON.stringify(eduSharingResponse));
		} catch (err) {
			throw new Error(err);
		}
	});

	it('search with params', async () => {
		try {
			sinon.stub(request, 'post').returns(MockNodes);
			sinon.stub(request, 'get').returns(MockAuth);
			const response = await eduSharingService.find({ query: { searchQuery: 'foo' } });
			chai.expect(response.total).to.gte(1);
			request.post.restore();
			request.get.restore();
		} catch (err) {
			throw new Error(err);
		}
	});
});
