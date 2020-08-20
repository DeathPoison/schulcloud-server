const { static: staticContent } = require('@feathersjs/express');
const path = require('path');

const hooks = require('./hooks');
const merlinHooks = require('./hooks/merlin.hooks');
const EduSharingConnector = require('./services/EduSharingConnector');
const MerlinTokenGenerator = require('./services/MerlinTokenGenerator');

class EduSharing {
	find(data) {
		return EduSharingConnector.FIND(data);
	}

	get(id, params) {
		return EduSharingConnector.GET(id, params);
	}
}

class MerlinToken {
	find(data) {
		return MerlinTokenGenerator.FIND(data);
	}
}

module.exports = (app) => {
	const merlinRoute = 'edu-sharing/merlinToken';
	app.use(merlinRoute, new MerlinToken(), (req, res) => {
		res.send(res.data);
	});
	const merlinService = app.service(merlinRoute);
	merlinService.hooks(merlinHooks);

	const eduSharingRoute = '/edu-sharing';
	app.use(eduSharingRoute, new EduSharing(), (req, res) => {
		res.send(res.data);
	});
	const eduSharingService = app.service(eduSharingRoute);
	eduSharingService.hooks(hooks);

	app.use(`${eduSharingRoute}/api`, staticContent(path.join(__dirname, '/docs')));
};
