const { info, error } = require('../src/logger');

const { connect, close } = require('../src/utils/database');
const { schoolModel: School } = require('../src/services/school/model');

const disableStudentTeamCreation = 'disableStudentTeamCreation';

module.exports = {
	up: async function up() {
		await connect();

		const schools = await School.find({}).exec();
		info(`Got ${schools.length} schools.`);
		const result = [];
		for (const school of schools) {
			info(`Migrating ${school.name} (${school._id})...`);
			if (school.features.includes(disableStudentTeamCreation)) {
				school.enableStudentTeamCreation = false;
				school.features.splice(school.features.indexOf(disableStudentTeamCreation), 1);
				result.push(school.save());
			}
		}
		await Promise.all(result);
		info('Done.');
		await close();
	},

	down: async function down() {
		await connect();

		const schools = await School.find({}).exec();
		info(`Got ${schools.length} schools.`);
		const result = [];
		for (const school of schools) {
			info(`Migrating ${school.name} (${school._id})...`);
			if (school.enableStudentTeamCreation === false && !school.features.includes(disableStudentTeamCreation)) {
				school.features.push(disableStudentTeamCreation);
				result.push(school.save());
			}
		}
		await Promise.all(result);
		info('Done.');
		await close();
	},
};
