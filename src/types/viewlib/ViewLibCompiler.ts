import { ICompiler, BuildConfigBase, GetWebpackConfig } from "../../compiler";

import * as webpack from 'webpack';
import * as _path from 'path';
import { ReadFile } from "../../utils";
import { Project } from "../../project";
import { ViewLibContext } from "./ViewLibContext";


export interface ViewLibBuildConfig extends BuildConfigBase {

}


export class ViewLibCompiler implements ICompiler<ViewLibBuildConfig> {


    constructor(private project: Project) {

    }

    async configure(config: ViewLibBuildConfig): Promise<void> {

     /*   const pkg_buffer = await ReadFile(_path.join(config.projectPath, 'package.json'));
        const pkg = JSON.parse(pkg_buffer.toString());

        const deps = Object.keys(pkg.dependencies || pkg);

        if (deps.indexOf('@uon/view') > -1) {
            console.log('Using @uon/view');

            const vcc = new ViewLibContext(this.project, config);
            await vcc.init();

            config.tsTransformers = [vcc.getBeforeTransformer()];
        }*/

    }

    async compile(config: ViewLibBuildConfig): Promise<void> {

        console.log(`Building viewlib project...`);

        config.target = 'web';

        const webpack_config = GetWebpackConfig(config);
        const compiler = webpack(webpack_config);
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