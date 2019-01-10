import * as fs from 'fs';
import * as path from 'path';

import * as webpack from 'webpack';

import { LoadUonJsonFile, ProjectConfig } from './common';


export interface BuildOptions {
    prod?: boolean;
    watch?: boolean;
    output?: string;

}


let WATCHING: webpack.Compiler.Watching;


process.on('SIGINT', () => {

    if (WATCHING) {
        console.log("\nTerminating build watch\n");
        WATCHING.close(() => {

            process.exit(0);
        });
    }
    else {
        process.exit(0);
    }
});

export function DoBuild(name: string, options: BuildOptions) {


    const config = LoadUonJsonFile();
    let projects: ProjectConfig[] = config.projects;

    if(name !== '*') {
        projects = projects.filter((p) => {
            return p.name === name;
        });
    }

    if(projects.length === 0) {
        throw new Error(`No projects to build, could not find project ${name} in workspace`);
    }

    const configs = projects.map((p) => {
        return CreateWebpackConfig(options, p);
    }).filter(c => c !== null)

    const compiler: webpack.MultiCompiler = webpack(configs);

    if (options.watch) {
        WATCHING = compiler.watch({
            // Example watchOptions
            aggregateTimeout: 300,
            poll: undefined,

        }, (err, stats) => {
            // Print watch/build result here...
            console.log(stats.toString({
                chunks: false,  // Makes the build much quieter
                colors: true    // Shows colors in the console
            }));
        });
    }
    else {
        compiler.run((err, stats) => {

            if (err) {
                console.error(err);
            }

            console.log(stats.toString({
                chunks: false,  // Makes the build much quieter
                colors: true    // Shows colors in the console
            }));
        });
    }




}


function CreateWebpackConfig(options: BuildOptions, project: ProjectConfig) {

    if(project.type === "lib") {
        return null;
    }

    const webpack_config: webpack.Configuration = {
        mode: options.prod ? "production" : "development",
        target: project.target,
        entry: path.resolve(process.cwd(), project.main),
        output: {
            path: path.resolve(process.cwd(), project.output.path),
            filename: project.output.filename
        },
        resolve: {
            // Add `.ts` and `.tsx` as a resolvable extension.
            extensions: [".ts", ".tsx", ".js"],

            // alias all @uon packages
            alias: {
                '@uon/core': path.resolve(__dirname, path.join('../../node_modules', '@uon/core'))
            }
        },
       /* optimization: {
            mergeDuplicateChunks: true,
            providedExports: true,
            usedExports: true,
            
        },*/
        plugins: [
           
        ],
        module: {
            rules: [
                // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
                {
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: path.join(path.resolve(__dirname, '../..'), 'node_modules/ts-loader/index.js'),
                            options: {
                                transpileOnly: true
                            }
                        }
                    ]
                }
            ]
        }
    }

    if (project.target == 'node') {
        webpack_config.node = {
            __dirname: false
        };

        let cwd = path.dirname(webpack_config.entry as string);
        let node_mod_dir = path.join(cwd, 'node_modules');

        /*
        let externals = FindNativeModules(node_mod_dir);
        let externals_keys = Object.keys(externals);

        if (externals_keys.length) {
            let eo: any = {};
            externals_keys.forEach((e) => {
                eo[e] = e;
            });

            webpack_config.externals = eo;
        }*/

       /* webpack_config.externals = [
            function(context, request, callback) {
                console.log(request);
                callback(undefined, undefined);
              }
        ]*/

        // generate a package.json at the output location
        let dist_filename = project.output.filename;
        let dist_package = {
            name: dist_filename.substring(0, dist_filename.lastIndexOf('.')),
            version: '1.0.0',
            main: dist_filename,
            private: true,
            //dependencies: externals
        };


        try {
            fs.mkdirSync(project.output.path);
        }
        catch(err) {

        }

        fs.writeFileSync(path.join(project.output.path, 'package.json'), JSON.stringify(dist_package, null, 2));

    }

    return webpack_config;
}



function FindNativeModules(modulesPath: string) {

    let dirs = fs.readdirSync(modulesPath).filter((dn) => {
        return !dn.startsWith('.');
    });

    // flatten scoped packages
    let final_dir_names: string[] = [];
    dirs.forEach((dn) => {
        if (dn.startsWith('@')) {
            let sub_dirs = fs.readdirSync(path.join(modulesPath, dn));
            sub_dirs.forEach((sd) => {
                final_dir_names.push(`${dn}/${sd}`);
            });

        }
        else {
            final_dir_names.push(dn);
        }
    });

    let externals: { [k: string]: string } = {};

    for (let i = 0; i < final_dir_names.length; ++i) {

        let module_name = final_dir_names[i];
        let module_path = path.join(modulesPath, module_name);
        if (LookForNativeInFolderRecusively(module_name, module_path)) {


            // get package
            let package_str = fs.readFileSync(path.join(module_path, 'package.json'), 'utf8');
            let package_json = JSON.parse(package_str);

            let _required: string[] = package_json._requiredBy;

            if (_required.indexOf('#DEV:/') == -1) {
                externals[package_json.name] = package_json.version;
            }


        }

    }

    return externals;

}

function LookForNativeInFolderRecusively(moduleName: string, currentDir: string) {

    let files = fs.readdirSync(currentDir);

    let sub_dirs: string[] = [];
    let found = false;

    for (let i = 0; i < files.length; ++i) {
        let fn = files[i];
        let stats = fs.statSync(path.join(currentDir, fn))
        if (stats.isDirectory()) {
            sub_dirs.push(fn);

        }
        else if (path.extname(fn) === '.node') {
            found = true;
            break;
        }
    }

    if (!found) {
        for (let i = 0; i < sub_dirs.length; ++i) {
            let sd = sub_dirs[i];
            if (LookForNativeInFolderRecusively(moduleName, path.join(currentDir, sd))) {
                found = true;
                break;
            }
        }
    }

    return found;

}
