'use strict';

const globalHooks = require('../../../hooks');
const hooks = require('feathers-hooks');
const auth = require('feathers-authentication');

//TODO: after hook for get that checks access.
//TODO: rethink security, due to no schoolId we can't restrict anything.

const restrictToUserOrRole = (hook) => {
	let userService = hook.app.service("users");
	return userService.find({
		query: {
			_id: hook.params.account.userId,
			$populate: 'roles'
		}
	}).then(res => {
		let access = false;
		res.data[0].roles.map(role => {
			if (role.name === 'superhero' || role.name === 'teacher' || role.name === 'administrator')
				access = true;
		});
		if (access)
			return hook;
		else
			hook.params.query.userId = hook.params.account.userId;

		return hook;
	});
};

const addDates = (hook) => {
	if (hook.data.parentConsents) {
		let parentConsent = hook.data.parentConsents[0];
		if ("privacyConsent" in parentConsent) {
			parentConsent.dateOfPrivacyConsent = Date.now();
		}
		if ("researchConsent" in parentConsent) {
			parentConsent.dateOfResearchConsent = Date.now();
		}
		if ("termsOfUseConsent" in parentConsent) {
			parentConsent.dateOfTermsOfUseConsent = Date.now();
		}
		if ("thirdPartyConsent" in parentConsent) {
			parentConsent.dateOfThirdPartyConsent = Date.now();
		}
	}
	if (hook.data.userConsent) {
		let userConsent = hook.data.userConsent;
		if ("privacyConsent" in userConsent) {
			userConsent.dateOfPrivacyConsent = Date.now();
		}
		if ("researchConsent" in userConsent) {
			userConsent.dateOfResearchConsent = Date.now();
		}
		if ("termsOfUseConsent" in userConsent) {
			userConsent.dateOfTermsOfUseConsent = Date.now();
		}
		if ("thirdPartyConsent" in userConsent) {
			userConsent.dateOfThirdPartyConsent = Date.now();
		}
	}
};



exports.before = {
	all: [],
	find: [auth.hooks.authenticate('jwt'), globalHooks.ifNotLocal(restrictToUserOrRole)],
	get: [auth.hooks.authenticate('jwt')],
	create: [addDates],
	update: [auth.hooks.authenticate('jwt'), addDates],
	patch: [auth.hooks.authenticate('jwt'), addDates],
	remove: [auth.hooks.authenticate('jwt'),]
};

const redirectDic = {
	u14: '/firstLogin/U14/',
	u18: '/firstLogin/14_17/',
	ue18: '/firstLogin/UE18/',
	normal: '/dashboard/',
	err: '/consentError'
};

const accessCheck = (hook) => {
	let access = true;
	let redirect = redirectDic['ue18'];
	let requiresParentConsent = true;
	let data = hook.result.data || hook.result;
	data = (Array.isArray(data)) ? (data) : ([data]);

	if (data.length == 0)
		return hook;

	return hook.app.service('users').get(data[0].userId)
		.then(user => {
			if (!user.birthday) {
				access = false;
				requiresParentConsent = false;
				return Promise.resolve;
			}
			let age = user.age;

			if (age < 18) {
				redirect = redirectDic['u14'];
				let parentConsent = data[0].parentConsents[0] || {};
				//check parent consents
				if (!(parentConsent.privacyConsent && parentConsent.termsOfUseConsent &&
					parentConsent.thirdPartyConsent && parentConsent.researchConsent)) {
					access = false;
					redirect = redirectDic['err'];
					return Promise.resolve();
				}
			}
			if (age > 13) {
				redirect = redirectDic['u18'];
				//check user consents
				let userConsent = data[0].userConsent || {};
				if (!(userConsent.privacyConsent && userConsent.termsOfUseConsent &&
					userConsent.thirdPartyConsent && userConsent.researchConsent)) {
					access = false;
					redirect = redirectDic['err'];
					return Promise.resolve();
				}
			}
			if (age > 17)
				redirect = redirectDic['ue18'];
				requiresParentConsent = true;
			if ((user.preferences || {}).firstLogin)
				redirect = redirectDic['normal'];
		})
		.then(() => {
			if (hook.result.data) {
				hook.result.data[0].access = access; 
				hook.result.data[0].redirect = redirect;
				hook.result.data[0].requiresParentConsent = requiresParentConsent;
			} else {
				hook.result.access = access;
				hook.result.redirect = redirect;
				hook.result.requiresParentConsent = requiresParentConsent;
			};
			return Promise.resolve(hook);
		})
		.catch(err => {
			return Promise.reject(err);
		});

};

exports.after = {
	all: [],
	find: [accessCheck],
	get: [accessCheck],
	create: [],
	update: [],
	patch: [],
	remove: []
};
