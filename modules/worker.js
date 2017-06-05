'use strict';

const dbApi = require('./dbApi');
const mesError = 'Nothing parameters from worker';

module.exports.listenerMessage = (keyMessage, keyErrors, eventHandler, cb) => {
	if (!keyMessage || !keyErrors || !eventHandler || !cb) {
		return cb(mesError);
	}
	dbApi.listPop(keyMessage, (err, repl) => {
		if (err) {
			return cb(err);
		}
		if (repl) {
			eventHandler(repl, function(err, msg) {
				if (err) {
					dbApi.listPush(keyErrors, msg, (err, repl) => {
						cb(err, repl);
					});
				} else {
					cb(null, repl);
				}
			});
		} else {
			cb();
		}
	});
};
