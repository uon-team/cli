import { Project } from "./project";
import { COMPILERS } from "./types/";
import { ReadFile } from "./utils";

import * as ts from 'typescript';
import * as webpack from 'webpack';
import * as _path from 'path';
import * as fs from 'fs';

const TerserPlugin = require("terser-webpack-plugin");

import * as CopyPlugin from 'copy-webpack-plugin';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';

export const TS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/ts-loader/index.js'
);

export interface BuildReplacement {
    replace: string;
    with: string;
}

export interface FederationOptions {
    shared: string[];
    exposes: { [k: string]: string };
}

export interface BuildConfigBase {

    projectPath: string;
    entry: string;
    target: 'web' | 'webworker' | 'node' | 'async-node' | 'node-webkit' | 'atom' | 'electron' | 'electron-renderer' | 'electron-main';

    library?: string;
    libraryTarget?: string;

    outputPath: string;
    filename: string;

    assets: string[];

    replacements: BuildReplacement[];

    optimizations: any;


    federation?: FederationOptions;

    tsTransformers?: any[];


}

export interface ICompiler<T extends BuildConfigBase> {

    configure(config: T): Promise<void>;
    compile(config: T): Promise<void>;
}


/**
    * Get a generator by type
    * @param type 
    */
export async function GetCompiler(project: Project): Promise<ICompiler<any>> {

    const type = project.projectType;
    if (!COMPILERS[type]) {
        return null;
    }

    const c_type: any = COMPILERS[type];
    const c = new c_type(project);
    return c;
}

export async function CreateTsProgram(config: BuildConfigBase) {

    // load tsconfig
    let ts_config_buffer = await ReadFile(_path.join(config.projectPath, 'tsconfig.json'))
    let ts_config = JSON.parse(ts_config_buffer.toString());

    // get a real ts config object
    let real_config = ts.convertCompilerOptionsFromJson(ts_config.compilerOptions, config.projectPath);

    // set the proper output dir
    real_config.options.outDir = config.outputPath;


    //ts.createCompilerHost(real_config);

    return ts.createProgram([config.entry], real_config.options);

}


export function GetWebpackConfig(config: BuildConfigBase) {

    const is_prod = config.optimizations && config.optimizations.prod;

    // format replacements as aliases
    const aliases: any = {};
    if(config.replacements) {
        config.replacements.forEach((r) => {
            aliases[r.replace] = r.with;
        });
    }

    // define minifiers
    const minimizers: any[] = [];
    const plugins: any[] = [];

    if (config.assets && config.assets.length) {
        // format assets to be copied as is
        const copies = config.assets.map((a) => {
            let res: any = {
                from: _path.resolve(config.projectPath, a)
            };

            if (fs.statSync(_path.resolve(config.projectPath, a)).isDirectory()) {
                res.to = _path.join(config.outputPath, _path.basename(a));
            }

            return res;
        });

        let opts: CopyPlugin.CopyPluginOptions = {
            patterns: copies
        };

        plugins.push(new CopyPlugin(opts))


    }

   /* if (is_prod) {

        let terser_options = {
            parallel: true,
            terserOptions: {
                mangle: true,
                keep_fnames: false,
                output: { comments: false }

            }
        }

        minimizers.push(new TerserPlugin(terser_options));
    }*/




    const webpack_config: webpack.Configuration = {
        mode: is_prod ? "production" : "development",
        target: config.target,
        entry: config.entry,
       /* experiments: {
            outputModule: true
        },*/

        output: {
            path: config.outputPath,
            filename: config.filename,
            ...config.libraryTarget && { library: config.libraryTarget == 'module' ? undefined : config.library, libraryTarget: config.libraryTarget || 'commonjs2' },
        },
        node: {

        },
        resolve: {
            // Add `.ts` and `.tsx` as a resolvable extension.
            extensions: [".ts", ".tsx", ".js"],
            alias: aliases,
            plugins: [
                new TsconfigPathsPlugin({
                    configFile: _path.join(config.projectPath, "tsconfig.json")
                }),
            ],
            modules: [_path.join(config.projectPath, "node_modules")]

        },

        optimization: {
            minimizer: minimizers
        },

        plugins: plugins,

        module: {
            rules: [
                // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
                {
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: TS_LOADER_PATH,
                            options: {
                                transpileOnly: false,
                                getCustomTransformers: (program: ts.Program) => ({
                                    before: [...(config.tsTransformers || [])],
                                    afterDeclarations: [...(config.tsTransformers || [])]
                                })
                            }
                        }
                    ]
                }
            ]
        }
    }

    return webpack_config;


}

