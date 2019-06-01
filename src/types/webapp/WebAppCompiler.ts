import { ICompiler, BuildConfigBase, GetWebpackConfig, SASS_LOADER_PATH, CSS_LOADER_PATH } from "../../Compiler";

import * as webpack from 'webpack';
import * as _path from 'path';

const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");



export interface WebAppBuildConfig extends BuildConfigBase {

    index: string;
    polyfills: string;
    styles: string[];
}


export class WebAppCompiler implements ICompiler<WebAppBuildConfig> {


    constructor() {

    }

    async configure(config: WebAppBuildConfig): Promise<void> {

        config.target = 'web';

    }

    async compile(config: WebAppBuildConfig): Promise<void> {

        console.log(`Building webapp project...`);

        // get default webpack config
        const webpack_config = this.configureWebpack(config);

        // create a webpack compiler
        const compiler: webpack.Compiler = webpack(webpack_config);

        // run it
        compiler.run((err, stats) => {

            if (err) {
                console.error(err);
            }

            console.log(stats.toString({
                chunks: false,  // Makes the build much quieter
                colors: true,    // Shows colors in the console
                chunkOrigins: false,
                modules: false,
                children: false
            }));
        });
    }

    async watch(config: WebAppBuildConfig, cb?: () => void) {

        // get default webpack config
        const webpack_config = this.configureWebpack(config);

        // create a webpack compiler
        const compiler: webpack.Compiler = webpack(webpack_config);


        let result = compiler.watch({}, (err, stats) => {

            if (err) {
                console.error(err);
            }

            console.log(stats.toString({
                chunks: false,  // Makes the build much quieter
                colors: true,    // Shows colors in the console
                chunkOrigins: false,
                modules: false,
                children: false
            }));

            cb && cb();
        });

        return result;


    }

    private configureWebpack(config: WebAppBuildConfig) {


        const is_prod = config.optimizations && config.optimizations.prod;

        // get default webpack config
        const webpack_config = GetWebpackConfig(config);

        // replace output filename
        webpack_config.output.filename = is_prod ? '[name].[hash].js' : '[name].js';

        // add scss handler
        let scss_plugin = new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: is_prod ? 'styles.[hash].css' : 'styles.css',
        });
        webpack_config.plugins.push(scss_plugin);

        // add html handler
        let html_plugin = new HtmlWebpackPlugin({
            template: _path.resolve(config.projectPath, config.index)
        });
        webpack_config.plugins.push(html_plugin);

        // add css loading rules
        webpack_config.module.rules.push({
            test: /\.scss$/,
            use: [
                MiniCssExtractPlugin.loader,
                CSS_LOADER_PATH,
                {
                    loader: SASS_LOADER_PATH,
                    options: {

                    }
                }
            ],
        });

        // add css optimizer in prod build
        if (is_prod) {
            webpack_config.optimization.minimizer.push(new OptimizeCSSAssetsPlugin({}));
        }


        // modify entry to include styles and polyfills
        webpack_config.entry = <any>(Array.isArray(webpack_config.entry)
            ? webpack_config.entry
            : [webpack_config.entry]);

        let extra_entries = config.styles.map(s => _path.resolve(config.projectPath, s));
        webpack_config.entry = (webpack_config.entry as any).concat(extra_entries);


        return webpack_config;

    }
}