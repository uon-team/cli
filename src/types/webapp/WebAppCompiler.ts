import { ICompiler, BuildConfigBase, GetWebpackConfig } from "../../Compiler";

import * as webpack from 'webpack';
import * as _path from 'path';

const HtmlWebpackPlugin = require('html-webpack-plugin')
const SassWebpackPlugin = require('sass-webpack-plugin');

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

        const webpack_config = GetWebpackConfig(config);

         // add scss handler
         let sass_plugin = new SassWebpackPlugin(
            config.styles.map(s => _path.resolve(config.projectPath, s))
        );
        webpack_config.plugins.push(sass_plugin);


        let links = config.styles.map(s => {

            return {
                rel: 'stylesheet', 
                type: 'text/css', 
                href: _path.basename(s, '.scss') + '.css'
            }
        });
        // add html handler
        let html_plugin = new HtmlWebpackPlugin({
            template: _path.resolve(config.projectPath, config.index),
            links
        });
        webpack_config.plugins.push(html_plugin);
       

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
                modules: false
            }));
        });
    }
}