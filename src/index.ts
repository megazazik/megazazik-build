import webpack, { Configuration, Options } from 'webpack';
import nodeExternals from 'webpack-node-externals';
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CleanWebpackPlugin from 'clean-webpack-plugin';
import { resolve } from 'path';
import TsConfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

export * from './storybook';

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

interface IParams {
	entry: Configuration['entry'],
	emitFiles?: boolean,
	publicPath?: string,
	outputPath: string,
	contextPath: string,
	extResolveModule?: string,
	addChunkHash?: boolean,
	tsconfig?: string,
	watch?: boolean,
}

export function createClientEntry(params: IParams) {
	const config = createCommonEntry(params);

	config.optimization = {splitChunks: {cacheGroups: {}}};
	Object.keys(config.entry).forEach((entryName) => {
		(config.optimization.splitChunks as Options.SplitChunksOptions).cacheGroups[entryName + '_eng'] = {
			name: entryName + '.eng',
			test: (m, c) => /[\\/]eng\.json$/.test(m.resource) && c.some((c) => c.name === entryName),
			chunks: (chunk) => chunk.name === entryName,
			enforce: true,
			reuseExistingChunk: false,
		},
		(config.optimization.splitChunks as Options.SplitChunksOptions).cacheGroups[entryName + '_rus'] = {
			name: entryName + '.rus',
			test: (m, c) => /[\\/]rus\.json$/.test(m.resource) && c.some((c) => c.name === entryName),
			chunks: (chunk) => chunk.name === entryName,
			enforce: true,
			reuseExistingChunk: false,
		}
	});

	config.optimization.namedChunks = true;
	config.optimization.removeEmptyChunks = false;

	return config;
}

export function createServerEntry(params: Omit<IParams, 'emitFiles'>) {
	var serverEntry = createCommonEntry({
		...params,
		emitFiles: false,
	});
	serverEntry.target = "node";
	/** @todo is it nesessary */
	serverEntry.node = {
		__dirname: false,
		__filename: false
	}
	serverEntry.output.libraryTarget = "commonjs2";

	serverEntry.externals = [nodeExternals()];

	return serverEntry;
}

export function createCommonEntry({
	entry,
	emitFiles,
	publicPath = '',
	outputPath,
	contextPath,
	extResolveModule,
	addChunkHash,
	tsconfig,
	watch,
}: IParams): Configuration {
	const cssLoaderOptions = {
		modules: true,
		localIdentName: '[folder]__[local]__[hash:base64:5]',
	};

	const config: Configuration = {
		mode: NODE_ENV as any,
		context: contextPath,
		entry,
		output: {
			filename: `[name]${addChunkHash ? '.[chunkhash]' : ''}.js`.replace(/\\/g, '/'),
			sourceMapFilename: ('[file].map').replace(/\\/g, '/'),
			path: outputPath,
			publicPath: publicPath
		},
		resolve: {
			extensions: [".js", ".jsx", ".ts", ".tsx"],
			modules: [
				contextPath,
				extResolveModule,
				"node_modules"
			].filter(Boolean),
			plugins: [
				new TsConfigPathsPlugin({
					configFile: './' + (tsconfig || 'tsconfig.json')
				}),
			],
		},
		resolveLoader: {
			modules: [
				"node_modules",
				resolve(__dirname, '../node_modules')
			]
		},
		module: {
			rules: [
				{
					test: /\.jsx?$/,
					exclude: /node_modules/,
					use: [{
						loader: 'babel-loader',
						options: {
							presets: [
								'react', 
								['@babel/preset-env', {modules: false}]
							]
						}
					}]
				},
				{
					test: /\.tsx?$/,
					use: [{
						loader: 'ts-loader',
						options: {
							configFile: tsconfig || 'tsconfig.json'
						}
					}]
				},
				{
					test: /\.css$/,
					/** @todo add postcss */
					use: [
						emitFiles && (isProduction ? MiniCssExtractPlugin.loader : 'style-loader'),
						{
							loader: emitFiles ? 'css-loader' : 'css-loader/locals',
							options: cssLoaderOptions
						}
					].filter(Boolean)
				},
				{
					test: /\.less$/,
					/** @todo add postcss */
					use: [
						emitFiles && (isProduction ? MiniCssExtractPlugin.loader : 'style-loader'),
						{
							loader: emitFiles ? 'css-loader' : 'css-loader/locals',
							options: cssLoaderOptions
						},
						'less-loader'
					].filter(Boolean)
				},
				{
					test: /\.(svg|png|jpg)$/,
					use: [{
						loader: 'url-loader',
						options: {
							emitFile: emitFiles,
							limit: 1000,
							name: '[path][name].[ext]'
						}
					}]
				}
			]
		},
		plugins: [
			new webpack.DefinePlugin({NODE_ENV: JSON.stringify(NODE_ENV)}),
			new webpack.NamedModulesPlugin(),
			new CleanWebpackPlugin(),
		],
		devtool: '#source-map',
		watch
	};

	/**
	 * @todo add styles minifier 
	 * https://webpack.js.org/plugins/mini-css-extract-plugin/#minimizing-for-production
	 */

	if (emitFiles) {
		config.plugins.push(new MiniCssExtractPlugin({
			filename: "[name].css"
		}))
	}

    return config;
}