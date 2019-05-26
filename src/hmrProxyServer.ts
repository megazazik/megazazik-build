#!/usr/bin/env node

import pargeArgs from 'minimist';
import express from 'express';
import webpack from 'webpack';
import proxy from 'express-http-proxy';
import path from 'path';

const argv = pargeArgs(process.argv.slice(2));

const help = argv['help'] || argv['h'];

/** @todo сделать настройки tsconfig по умолчанию или яснее сообщить об этом */

if (help) {
	console.log(`This command starts HRM proxy server.
Arguments:
--config (-c) - путь до файла с конфигом webpack
--port (-p) - порт, на котором запускается hrm сервер. По умолчанию - 8080
--proxy-port (-P) - порт, на который проксируются запросы. По умолчанию - 8888

You should pass tsconfig with options: {"module": "commonjs", "target": "es6"}`);
	process.exit(0);
}

const port = argv['port'] || argv['p'] || 8080;
const proxyPort = argv['proxy-port'] || argv['P'] || 8888;
const configFileName = argv['config'] || argv['c'];

if (!configFileName) {
	console.error('You should specify a config file name with --config (-c) option');
	process.exit(1);
}

const app = express();

const webpackConfig = require(path.resolve(configFileName));

// add plugins for HMR
webpackConfig.plugins.push(
	new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
);

// add webpack-hot-middleware/client
Object.keys(webpackConfig.entry).forEach((entryName) => {
	if (!Array.isArray(webpackConfig.entry[entryName])) {
		webpackConfig.entry[entryName] = [webpackConfig.entry[entryName]]
	}
	
	webpackConfig.entry[entryName].unshift('webpack-hot-middleware/client');
})

// add react-hot-loader
webpackConfig.module.rules.forEach( (loader) => {
	const usedLoader = typeof loader.use === 'string' ? 
			loader.use :
		Array.isArray(loader.use) ? 
			loader.use[0].loader || loader.use[0] :
			loader.use.loader;

	if (usedLoader === 'babel-loader') {
		if (typeof loader.use === 'string') {
			loader.use = [
				{
					loader: loader.use[0],
					options: {}
				}
			]
		}

		loader.use[0].options.cacheDirectory = true;
		loader.use[0].options.plugins = ['react-hot-loader/babel'];
	}

	if (usedLoader === 'ts-loader') {
		loader.use.unshift({
			loader: 'babel-loader',
			options: {
				babelrc: false,
				plugins: ['react-hot-loader/babel'],
			},
		})
	}
});

webpackConfig.resolve.alias = {
	'react-dom': '@hot-loader/react-dom'
};

const compiler = webpack(webpackConfig);

app.use(require('webpack-dev-middleware')(
	compiler,
	{
		noInfo: true,
		publicPath: webpackConfig.output.publicPath
	}
));

app.use(require('webpack-hot-middleware')(compiler));

app.use(proxy(
	`0.0.0.0:${proxyPort}`,
	{
		proxyReqPathResolver (req: Request) {
			return req.url;
		}
	}
));

app.listen(port, () => {
	console.log(`
HRM proxy server started on port ${port}.
Requests are redirected to port ${proxyPort}.
`);
});