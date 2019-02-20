import { ICompiler, BuildConfigBase, GetWebpackConfig } from "../../Compiler";

import * as webpack from 'webpack';
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