#!/usr/bin/env node

import path from 'path';
import minimist from 'minimist';
import webpack from "webpack";
import chalk from 'chalk';

const argv = minimist(process.argv.slice(2));

const configFileName = argv['config'] || argv['c'];
if (!configFileName) {
	console.error('You should specify a config file name with --config (-c) option');
	process.exit(1);
}

const watch = argv.watch || argv.w || false;

try {
	const startTime = new Date(Date.now());
	console.log("Build start:  " + startTime.getHours() + ':' + startTime.getMinutes() + ':' + startTime.getSeconds());

	webpack(
		{
			...require(path.resolve(configFileName)),
			watch
		},
		(e, stats) => {
			console.log(stats.toString({
				chunks: false,
				chunkModules: false,
				cached: false,
				chunkOrigins: false,
				modules: false,
				colors: true,
				warningsFilter: /export .* was not found in/
			}));
			const endTime = new Date(Date.now());
			console.log("Build end:  " + endTime.getHours() + ':' + endTime.getMinutes() + ':' + endTime.getSeconds());
		}
	);
} catch (e) {
	console.log(chalk.red(`[${e.name}]: ${e.message}`));

	if (typeof e.stack !== 'undefined') {
		console.log(chalk.red(e.stack));
	}

	process.exitCode = 1;
}
