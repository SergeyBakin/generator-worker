'use strict';

const _ = require('underscore');
const minimist = require('minimist')(process.argv);
const getErrors = _.find(minimist._, (elem) => elem == 'getErrors');

const main = require('./modules/main');

if (getErrors) {
	main.getAllErrors(function(err) {
		if (err) {
			console.log('error', err);
		}
	});
} else {
	main.appPubSub(function() {});
}
