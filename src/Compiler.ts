import { Project } from "./Project";
import { COMPILERS } from "./types";
import { Type } from "@uon/core";

import * as webpack from 'webpack';
import * as _path from 'path';
import * as fs from 'fs';

const CopyWebpackPlugin = require('copy-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');


export const TS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/ts-loader/index.js'
);

export const SASS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/sass-loader/lib/loader.js'
);

export const CSS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/css-loader/dist/index.js'
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


}

export interface ICompiler<T extends BuildConfigBase> {

    configure(config: T): Promise<void>;
    compile(config: T): Promise<void>;
}


/**
    * Get a generator by type
    * @param type 
    */
export async function GetCompiler(type: string): Promise<ICompiler<any>> {

    if (!COMPILERS[type]) {
        return null;
    }

    const c_type: Type<any> = COMPILERS[type];

    const c = new c_type();

    return c;

}


export function GetWebpackConfig(config: BuildConfigBase) {

    const is_prod = config.optimizations && config.optimizations.prod;


    // format replacements as aliases
    const aliases: any = {};
    config.replacements.forEach((r) => {
        aliases[r.replace] = r.with;
    });


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

    // define minifiers
    const minimizers: any[] = [];
    const plugins: any[] = [
        new CopyWebpackPlugin(copies, {})
    ];


    if (is_prod) {

        let terser_options = {
            parallel: true,
            terserOptions: {
                mangle: true,
                keep_fnames: false,

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
                                transpileOnly: true
                            }
                        }
                    ]
                }
            ]
        }
    }

    return webpack_config;


}