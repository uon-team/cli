import { ICompiler, BuildConfigBase, GetWebpackConfig } from "../../compiler";

//import { webpack, Compiler } from 'webpack';

import { webpack } from 'webpack';
import * as _path from 'path';


export interface ServerBuildConfig extends BuildConfigBase {


}


export class ServerCompiler implements ICompiler<ServerBuildConfig> {


    constructor() {

    }

    async configure(config: ServerBuildConfig): Promise<void> {

        config.target = 'node';


    }

    async compile(config: ServerBuildConfig): Promise<void> {

        console.log(`Building server project...`);

        const webpack_config = GetWebpackConfig(config);

        // add node specific options
        webpack_config.node = {
            __dirname: false
        };
        

        // create a webpack compiler
        const compiler = webpack(webpack_config);

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

    async watch(config: ServerBuildConfig, callback: (err: any) => void) {

        const webpack_config = GetWebpackConfig(config);

        // add node specific options
        webpack_config.node = {
            __dirname: false
        };

        /*webpack_config.resolve = {
            symlinks: true,

        };*/

        // create a webpack compiler
        const compiler = webpack(webpack_config);
        compiler.watch({
            aggregateTimeout: 500,
            poll: 2000,
            followSymlinks: true,

        }, (err, stats) => {

            if (err) {
                console.error(err);
            }

            /*console.log(stats.toString({
                chunks: false,  // Makes the build much quieter
                colors: true,    // Shows colors in the console
                chunkOrigins: false,
                modules: false,

            }));*/

            callback(err);
        })

    }
}