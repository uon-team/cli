import { Project } from "./Project";
import { COMPILERS } from "./types";
import { Type } from "@uon/core";

import * as webpack from 'webpack';
import * as _path from 'path';
import * as fs from 'fs';

import * as ts from 'typescript';
import { ReadFile } from "./Utils";

const CopyWebpackPlugin = require('copy-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

export const TS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/ts-loader/index.js'
);

export const SASS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/sass-loader/dist/index.js'
);

export const CSS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/css-loader/dist/index.js'
) + '?-url';

export const JSON_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/json-loader/index.js'
);

export interface BuildReplacement {
    replace: string;
    with: string;
}
export interface BuildConfigBase {

    projectPath: string;
    entry: string;
    target: 'web' | 'webworker' | 'node' | 'async-node' | 'node-webkit' | 'atom' | 'electron' | 'electron-renderer' | 'electron-main' | ((compiler?: any) => void);

    outputPath: string;
    filename: string;

    assets: string[];

    replacements: BuildReplacement[];

    optimizations: any;

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

    const c_type: Type<any> = COMPILERS[type];
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
    config.replacements.forEach((r) => {
        aliases[r.replace] = r.with;
    });


    // define minifiers
    const minimizers: any[] = [];
    const plugins: any[] = [];

    if (config.assets) {

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

        plugins.push(new CopyWebpackPlugin(copies, {}))


    }


    if (is_prod) {

        let terser_options = {
            parallel: true,
            terserOptions: {
                mangle: true,
                keep_fnames: false,
                output: { comments: false}

            }
        }

        minimizers.push(new TerserPlugin(terser_options));
    }



    const webpack_config: webpack.Configuration = {
        mode: is_prod ? "production" : "development",
        target: config.target,
        entry: config.entry,
        output: {
            path: config.outputPath,
            filename: config.filename
        },
        node: {
            process: false
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
                                transpileOnly: true,
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

