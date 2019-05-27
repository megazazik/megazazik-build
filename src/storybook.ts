import pargeArgs from 'minimist';
import webpack, { Configuration } from 'webpack';
import TsConfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

const argv = pargeArgs(process.argv.slice(2));

const cssLoaderOptions = {
	modules: true,
	localIdentName: '[path][name]__[local]'
};

interface IParams {
	contextPath: string,
	tsconfig?: string,
}

export function loadStories(...args) {
	require('./stub.stories');
}

export const getStorybookConfig = (params: IParams) => async ({ config: defaultConfig }) => {
	/**
	 * Удаляем лоадер для css по умолчанию
	 */
	defaultConfig.module.rules = defaultConfig.module.rules.filter((rule) => {
		if (typeof (rule.test as RegExp).test === 'function' && (rule.test as RegExp).test('.css')) {
			return false;
		}
		return true;
	});
	
	defaultConfig.module.rules.push({
		test: /\.jsx?$/,
		exclude: /node_modules/,
		use: [{
			loader: 'babel-loader',
			options: {
				presets: [
					'@babel/preset-react', 
					['@babel/preset-env', {modules: false}]
				]
			}
		}]
	});

	defaultConfig.module.rules.push({
		test: /\.(ts|tsx)$/,
		include: params.contextPath,
		loader: require.resolve("ts-loader"),
		options: {
			configFile: params.tsconfig || 'tsconfig.json'
		}
	});

	defaultConfig.module.rules.push({
		test: /\.less$/,
		use: [
			'style-loader',
			{
				loader: 'css-loader',
				options: cssLoaderOptions
			},
			'less-loader'
		]
	});

	defaultConfig.module.rules.push({
		test: /\.css$/,
		use: [
			'style-loader',
			{
				loader: 'css-loader',
				options: cssLoaderOptions
			}
		]
	});

	defaultConfig.resolve.extensions.push(".jsx", ".ts", ".tsx");
	defaultConfig.resolve.modules = [params.contextPath, 'node_modules'];
	defaultConfig.resolve.plugins = defaultConfig.resolve.plugins || [];
	defaultConfig.resolve.plugins.push(
		new TsConfigPathsPlugin({
			configFile: './' + (params.tsconfig || 'tsconfig.json')
		}),
	);

	defaultConfig.context = params.contextPath;

	if (argv._[0]) {
		defaultConfig.plugins.push(new webpack.NormalModuleReplacementPlugin(
			/\@megazazik\/build\/stub/,
			argv._[0]
		));
	}

	return defaultConfig;
};