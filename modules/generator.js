'use strict';

const dbApi = require('./dbApi');
const mesError = 'Nothing parameters form generator';
let getMess = getMessage.bind(this);

module.exports.defineGenerator = (generatorKey, generatorValue, isGenerator, cb) => {
	isGenerator = (!!isGenerator).toString();
	if (!generatorKey || !generatorValue || !isGenerator) {
		return cb(mesError);
	}
	dbApi.getByKey(generatorKey, (err, repl) => {
		if (err) {
			return cb(err);
		}

		if (!repl) {
			dbApi.setNXByKey(generatorKey, generatorValue, (err, repl) => {
				if (err) {
					return cb(err);
				}
				console.log('set I`m GENERATOR');
				isGenerator = true;
				this.setExpireGenerator(generatorKey, 10, (err, res) => {
					if (err) {
						return cb(err);
					}
					cb(null, {isGenerator:isGenerator});
				});
			});
		} else if (repl == generatorValue) {
			isGenerator = true;
			console.log('I`m GENERATOR');
			this.setExpireGenerator(generatorKey, 10, (err, res) => {
				if (err) {
					return cb(err);
				}
				cb(null, {isGenerator:isGenerator});
			});
		} else {
			cb(null, null);
		}
	});
};

module.exports.generateMessage = (key, cb) => {
	if (!key) {
		return cb(mesError);
	}
	dbApi.listPush(key, getMess(), (err, repl) => {
		if (err) {
			return cb(err);
		} else {
			cb(null, repl);
		}
	});
};

module.exports.setExpireGenerator = (key, time, cb) => {
	dbApi.setExpire(key, time, (err, res) => {
		if (err) {
			return cb(err);
		}
		cb(err, res);
	});
};

function getMessage() {
	this.cnt = this.cnt || 0;
	return this.cnt++;
}
