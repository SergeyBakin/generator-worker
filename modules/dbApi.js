'use strict';

const redis = require('redis');
let client = null;
const mesError = 'Nothing parameters from api';

exports.connect = (confDB, cb) => {
	if (!confDB) {
		return cb(mesError);
	}
	if (client) {
		return cb(null, client);
	}
	client = redis.createClient(confDB);
	client.once("connect", (err) => {
		cb(err, client);
	});
};

exports.closeDB = (cb) => {
	if (!client) {
		return cb();
	}
	client.quit();
	cb();
};

exports.getByKey = (key, cb) => {
	if (!key) {
		return cb(mesError);
	}
	client.get(key, (err, repl) => {
		cb(err, repl);
	});
};

exports.setNXByKey = (key, value, cb) => {
	if (!key || !value) {
		return cb(mesError);
	}
	client.setnx(key, value, (err, repl) => {
		cb(err, repl);
	});
};

exports.delKey = (key, cb) => {
	if (!key) {
		return cb(mesError);
	}
	client.del(key, (err, repl) => {
		cb(err, repl);
	});
};

exports.listPush = (key, value, cb) => {
	if (!key || (!value && value != 0)) {
		return cb(mesError);
	}
	client.rpush(key, value, (err, repl) => {
		cb(err, repl);
	});
};

exports.listPop = (key, cb) => {
	if (!key) {
		return cb(mesError);
	}
	client.lpop(key, (err, repl) => {
		cb(err, repl);
	});
};

exports.addToSet = (key, value, cb) => {
	if (!key || !value) {
		return cb(mesError);
	}
	client.sadd(key, value, (err, repl) => {
		cb(err, repl);
	});
};

exports.getRandomWorker = (key, cb) => {
	if (!key) {
		return cb(mesError);
	}
	client.srandmember(key, (err, repl) => {
		cb(err, repl);
	});
};

exports.delFromSet = (key, value, cb) => {
	if (!key || !value) {
		return cb(mesError);
	}
	client.srem(key, value, (err, repl) => {
		cb(err, repl);
	});
};

exports.getErrors = (key, cb) => {
	if (!key) {
		return cb(mesError);
	}
	client.llen(key, (err, range) => {
		if (err) {
			return cb(err);
		}
		if (!range) {
			return cb('Error in the DB is empty');
		}
		client.lrange(key, 0, range-1, (err, repl) => {
			if (err) {
				return cb(err);
			}
			client.del(key, (err, res) => {
				cb(err, repl);
			});
		});
	});
};

exports.setExpire = (key, time, cb) => {
	time = parseInt(time);
	if (!time || !key) {
		return cb(mesError);
	}
	client.expire(key, time, function(err, repl) {
		cb(err, repl);
	});
};
