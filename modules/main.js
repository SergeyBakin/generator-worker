'use strict';

const async = require('async');
const _ = require('underscore');
const ifaces = require('os').networkInterfaces();
const conf = require('../lib/config')();
console.log('conf',conf);

const confDB = {
	host: process.env.HOST || conf.redis.host,
	port: process.env.PORT || conf.redis.port,
	db: process.env.DB || conf.redis.db || 0
};
const dbApi = require('./dbApi');
let client = null;

const confDB1 = {
	host: process.env.HOST || conf.redis.host,
	port: process.env.PORT || conf.redis.port,
	db: process.env.DB1 || 1
};
const redis = require('redis');
let clientPubSub = redis.createClient(confDB1);

const gen = require('./generator');
const worker = require('./worker');

let generatorValue = '';
let isGenerator = false;
let timeIdPubSub = null;
let timeIdGen = null;
let timeIdWorker = null;
let getMess = getMessage.bind(this);

let hostAddress = null;
_.each(Object.keys(ifaces), (iName) => {
	if (hostAddress) {
		return;
	}
	({address:hostAddress = null} = _.find(ifaces[iName], (num) => {
		return (num.family == 'IPv4' && num.internal);
	}));
});
if (hostAddress) {
	generatorValue += hostAddress + ':';
}
generatorValue += process.pid;

module.exports.getAllErrors = function(cb) {
	dbApi.connect(confDB, (err, _client) => {
		if (err) {
			cb(_.isString(err) ? new Error(err) : err);
		}
		client = _client;
		dbApi.getErrors("allErrors:1", (err, res) => {
			console.log('all Error from Redis',res);
			cb(err);
		});
	});
}

// first method
module.exports.appTimer = function(cb) {
	// time write in redis is 1 000 messages in one second
	commonFunc(generetorMessagesByTimer, listenerMesByTimer, cb);
};

// second method
module.exports.appWhilst = function(cb) {
	// time write in redis is 20 000 messages in one second
	commonFunc(generatorMessagesByWhilst, listenerByWhilst, cb);
};

// third method with Publish / Subscribe
module.exports.appPubSub = function(cb) {
	// it is very quickly
	commonFunc(generatorPubSubByTimer, listenerPubSub, function() {
		clientPubSub.end(true);
		clientPubSub = redis.createClient(confDB1);

		// generatorPubSub();
		//  or
		generatorPubSubByTimer();
	}, cb);
};

function commonFunc(funcGenerator, funcListener, dopFunc, cb) {
	if (!cb) {
		cb = dopFunc;
		dopFunc = funcGenerator;
	}
	async.series([
		(cb) => {
			dbApi.connect(confDB, (err, _client) => {
				if (err) {
					cb(_.isString(err) ? new Error(err) : err);
				}
				client = _client;
				client.on("error", function (err) {
					exit(_.isString(err) ? new Error(err) : err);
				});
				cb();
			});
		},
		(cb) => {
			gen.defineGenerator('generator', generatorValue, isGenerator, (err, objParam) => {
				if (err) {
					return exit(_.isString(err) ? new Error(err) : err);
				}
				if (objParam && _.isObject(objParam)) {
					({isGenerator = isGenerator} = objParam);
				}
				console.log('isGenerator',isGenerator);
				cb();
			});
		},
		(cb) => {
			// Listener Define Generator
			if (isGenerator) {
				let timerGen = setInterval(() => {
					// to set time live generator
					gen.setExpireGenerator('generator', 10, (err, res) => {
						if (err) {
							exit(err);
						}
						if (!isGenerator) {
							clearInterval(timerGen);
						}
					});
				}, 1000);
				cb();
			} else {
				console.log('Worker run');

				let timeId = setInterval(() => {
					gen.defineGenerator('generator', generatorValue, isGenerator, (err, objParam) => {
						if (err) {
							return exit(_.isString(err) ? new Error(err) : err);
						}
						if (objParam && _.isObject(objParam)) {
							({isGenerator = isGenerator} = objParam);
							if (isGenerator) {
								clearInterval(timeId);
							}
							dbApi.delFromSet('worker:count', generatorValue, function(err,repl) {
								if (err) {
									return exit(_.isString(err) ? new Error(err) : err);
								}
								let timerGen = setInterval(() => {
									gen.setExpireGenerator('generator', 10, (err, res) => {
										if (err) {
											exit(err);
										}
										if (!isGenerator) {
											clearInterval(timerGen);
										}
									});
								}, 1000);
							});

							dopFunc();
						}
					});
				}, 1000);
				cb();
			}
		},
		(cb) => {
			if (isGenerator) {
				funcGenerator();
				cb();
			} else {
				// Worker ...
				funcListener();
				cb();
			}
		}
	], (err) => {
		if (err) {
			exit(_.isString(err) ? new Error(err) : err);
		}
		cb();
	});
}

function generatorPubSub() {
	async.whilst(
		function() { return isGenerator;},
		function(cb) {
			dbApi.getRandomWorker('worker:count', function(err, valueWorker) {
				if (err) {
					return cb(err);
				} else if (valueWorker) {
					clientPubSub.publish(valueWorker, getMess());
				}
				cb();
			});
		},
		function(err) {
			if (err) {
				exit(_.isString(err) ? new Error(err) : err);
			}
		}
	);
}

function generatorPubSubByTimer() {
	timeIdPubSub = setInterval(() => {
		dbApi.getRandomWorker('worker:count', (err, valueWorker) => {
			if (err) {
				exit(_.isString(err) ? new Error(err) : err);
			}
			if (valueWorker) {
				clientPubSub.publish(valueWorker, getMess());
			}
		});
	}, 100);
}

function listenerPubSub() {
	dbApi.addToSet('worker:count', generatorValue, (err, repl) => {
		if (err) {
			exit(_.isString(err) ? new Error(err) : err);
		}
		clientPubSub.subscribe(generatorValue);
		clientPubSub.on('message', (channel, message) => {
			console.log('message',message);
			eventHandler(message, function(err, msg) {
				if (err) {
					dbApi.listPush('allErrors:1', msg, (err, repl) => {
						if (err) {
							exit(_.isString(err) ? new Error(err) : err);
						}
					});
				}
			});
		});
	});
}

function listenerMesByTimer() {
	timeIdWorker = setInterval(() => {
		worker.listenerMessage('message:1', 'allErrors:1', eventHandler, (err, repl) => {
			if (err) {
				exit(_.isString(err) ? new Error(err) : err);
			}
			if (isGenerator) {
				return clearInterval(timeIdWorker);
			}
		});
	}, 100);
}

function listenerByWhilst() {
	async.whilst(
		function() { return !isGenerator;},
		function(cb) {
			worker.listenerMessage('message:1', 'allErrors:1', eventHandler, (err, repl) => {
				cb(err);
			});
		},
		function(err) {
			if (err) {
				exit(_.isString(err) ? new Error(err) : err);
			}
		}
	);
}

function generetorMessagesByTimer() {
	timeIdGen = setInterval(() => {
		gen.generateMessage('message:1', (err, repl) => {
			if (err) {
				exit(_.isString(err) ? new Error(err) : err);
			}
			if (!isGenerator) {
				console.log('GENERATOR_stoped_send_messages');
				clearInterval(timeIdGen);
			}
		});
	}, 200);
}

function generatorMessagesByWhilst() {
	async.whilst(
		function() { return isGenerator;},
		function(cb) {
			gen.generateMessage('message:1', (err, repl) => {
				cb(err);
			});
		},
		function(err) {
			if (err) {
				exit(_.isString(err) ? new Error(err) : err);
			}
		}
	);
}

function getMessage() {
	this.cnt = this.cnt || 0;
	return this.cnt++;
}

function eventHandler(msg, cb) {
	function onComplete() {
		var error = Math.random() > 0.85;
		cb(error, msg);
	}
	// processing takes time...
	setTimeout(onComplete, Math.floor(Math.random()*1000));
}

function exit(err) {
	if (err) {
		console.error('err',err);
	}
	if (isGenerator) {
		isGenerator = false;
		clearInterval(timeIdGen);
		dbApi.delKey('generator', (err, repl) => {
			if (err) {
				console.error('error delKey', err);
			}
			console.log('Delete generator',repl);
			client.quit();
			process.exit(0);
		});
	} else {
		clientPubSub.unsubscribe(generatorValue);
		clearInterval(timeIdWorker);
		dbApi.delFromSet('worker:count', generatorValue, function(err,repl) {
			console.log('delFromSet_repl',repl);
			if (err) {
				console.error('delete worker', err);
			}
			console.log(`Worker ${process.pid} died`);
			client.quit();
			process.exit(0);
		});
	}
}



process.on('SIGINT', () => {
	exit();
});

process.on('SIGTSTP', () => {
	console.log('SIGTSTP');
	exit();
});

process.on('SIGTERM', () => {
	console.log('SIGTERM');
	exit();
});

process.on("uncaughtException", (err) => {
	console.error('uncaughtException: ', err.message);
	console.error('err.stack',err.stack);
	exit();
});
