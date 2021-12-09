import { ICompiler, BuildConfigBase, GetWebpackConfig, SASS_LOADER_PATH, CSS_LOADER_PATH } from "../../Compiler";

import * as webpack from 'webpack';
import * as _path from 'path';
import { ReadFile } from "../../Utils";
import { ViewCompilerContext } from "../../view-compiler/ViewCompilerContext";
import { Project } from "../../Project";

const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");



export interface WebAppBuildConfig extends BuildConfigBase {

    index: string;
    polyfills: string;
    styles: string[];
}


export class WebAppCompiler implements ICompiler<WebAppBuildConfig> {


    constructor(private project: Project) {

    }

    async configure(config: WebAppBuildConfig): Promise<void> {

        config.target = config.target || 'web';

        const pkg_buffer = await ReadFile(_path.join(config.projectPath, 'package.json'));
        const pkg = JSON.parse(pkg_buffer.toString());

        const deps = Object.keys(pkg.dependencies || pkg);

        if (deps.indexOf('@uon/view') > -1) {
            console.log('Using @uon/view');

            const vcc = new ViewCompilerContext(this.project, config);
            await vcc.init();


            config.tsTransformers = [vcc.getBeforeTransformer()];
        }

    }

    async compile(config: WebAppBuildConfig): Promise<void> {

        console.log(`Building webapp project...`);

        // get default webpack config
        const webpack_config = this.configureWebpack(config);

        // create a webpack compiler
        const compiler: webpack.Compiler = webpack(webpack_config);

        // run it
        compiler.run((err: any, stats: any) => {

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

    async watch(config: WebAppBuildConfig, cb?: () => void): Promise<any> {

        // get default webpack config
        const webpack_config = this.configureWebpack(config);

        // create a webpack compiler
        const compiler: webpack.Compiler = webpack(webpack_config);


        let result = compiler.watch({}, (err: any, stats: any) => {

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


        if (config.index) {
            // add html handler
            let html_plugin = new HtmlWebpackPlugin({
                template: _path.resolve(config.projectPath, config.index)
            });
            webpack_config.plugins.push(html_plugin);
        }


        if (config.federation) {

            // add module federation
            webpack_config.plugins.push(
                new ModuleFederationPlugin({
                    name: this.project.name,
                    filename: config.filename,
                    library: { type: "commonjs2", name: this.project.name },
                    //shared: config.federation.shared || [], //["@uon/core", "@uon/view", "@uon/router"],
                    //exposes: config.federation.exposes
                })
            );

            webpack_config.externals = [];
            if (config.federation.shared) {
                config.federation.shared.forEach((s) => {
                    (webpack_config.externals as any).push(
                        function (context: any, request: any, callback: any) {
                            if (new RegExp(`^${s}$`).test(request)) {
                                return callback(null, 'commonjs ' + request);
                            }
                            callback();
                        }
                    );
                })
            }
        }



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

        webpack_config.devtool = config.optimizations && config.optimizations.prod ? false : 'eval-source-map';

        // modify entry to include styles and polyfills
        webpack_config.entry = <any>(Array.isArray(webpack_config.entry)
            ? webpack_config.entry
            : [webpack_config.entry]);

        let extra_entries = config.styles.map(s => _path.resolve(config.projectPath, s));
        webpack_config.entry = (webpack_config.entry as any).concat(extra_entries);


        return webpack_config;

    }
}