import { Project } from "./Project";
import { Workspace } from "./Workspace";
import { COMPILERS } from "./types";
import { Type } from "@uon/core";

import * as webpack from 'webpack';
import * as _path from 'path';
import * as fs from 'fs';

const CopyWebpackPlugin = require('copy-webpack-plugin')


export const TS_LOADER_PATH = _path.join(
    _path.resolve(__dirname, '../..'),
    'node_modules/ts-loader/index.js'
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
export async function GetCompiler(type: string, ws: Workspace): Promise<ICompiler<any>> {

    if (!COMPILERS[type]) {
        return null;
    }

    const c_type: Type<any> = COMPILERS[type];

    const c = new c_type();

    return c;

}


export function GetWebpackConfig(config: BuildConfigBase) {


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

    const webpack_config: webpack.Configuration = {
        mode: config.optimizations && config.optimizations.prod ? "production" : "development",
        target: config.target,
        entry: config.entry,
        output: {
            path: config.outputPath,
            filename: config.filename
        },
        resolve: {
            // Add `.ts` and `.tsx` as a resolvable extension.
            extensions: [".ts", ".tsx", ".js"],
            alias: aliases

        },
        /* optimization: {
             mergeDuplicateChunks: true,
             providedExports: true,
             usedExports: true,
             
         },*/
        plugins: [
            new CopyWebpackPlugin(copies, {})
        ],
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