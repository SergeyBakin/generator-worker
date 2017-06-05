"use strict";

const fs = require("fs");
let cfg = null;
let Config = function() {
	if (! cfg) {
		let defConfig;
		if (fs.existsSync(__dirname + "/../config.json")) {
			defConfig = fs.readFileSync(__dirname + "/../config.json");
			defConfig = JSON.parse(defConfig);
			cfg = defConfig;
		} else {
			return null;
		}
	}
	return cfg;
};
module.exports = Config;
