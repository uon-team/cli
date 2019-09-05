#!/usr/bin/env node

const PACKAGE = require('../package.json')
const program = require('commander');

import * as colors from 'colors/safe';
import * as _path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import * as url from 'url';

import { lookup } from 'mime-types';

import { IGenerator, GeneratorContext, GetGenerator, GetProjectGenerator } from './src/Generator';
import { GENERATORS, COMPILERS, PROJECT_GEN } from './src/types';
import { GetCompiler, BuildConfigBase } from './src/Compiler';
import { Project } from './src/Project';
import { WebAppCompiler, WebAppBuildConfig } from './src/types/webapp/WebAppCompiler';
//import { Socket } from 'net';
//import { WebSocket } from '@uon/websocket';

const VERSION_STRING = `${colors.bold('@uon/cli')} v${PACKAGE.version}`;


// version
program
    .version(VERSION_STRING, '-v, --version')
    .usage('<command> [options]')


// new project command
program
    .command('new <type> <name>')
    .description(`Creates a new uon project.`)
    .action(async (type: string, name: string, options: any) => {


        let generator = await GetProjectGenerator(type);

        if (!generator) {
            console.log(`No project generator with type ${colors.red(type)} exists. Type must be one of ${colors.bold(Object.keys(PROJECT_GEN).join(', '))}`)
            return;
        }

        let context: GeneratorContext = {
            project: null,
            arguments: {
                name: name,
                type: type
            },
            configuration: {}
        };


        // check pre-requisites
        try {
            await generator.checkPrerequisites(context);
        }
        catch (err) {
            console.error(err.message);
            return;
        }

        // configure
        try {
            await generator.configure(context);
        }
        catch (err) {
            console.error(err.message);
            return;
        }


        // generate
        try {
            await generator.generate(context);
        }
        catch (err) {
            console.error(err.message);
            return;
        }


    });


// generate a component of <type>
program
    .command('gen <type> <name>')
    .description(`Generate files for a UON project.`)
    .action(async (type: string, name: string, options: any) => {

        let generator = await GetGenerator(type);

        if (!generator) {
            console.log(`No generator with type ${colors.red(type)} exists. Type must be one of ${colors.bold(Object.keys(GENERATORS).join(', '))}`)
            return;
        }

        let project = await Project.FindProject();

        let context: GeneratorContext = {
            project,
            arguments: {
                name: name,
                type: type
            },
            configuration: {}
        };

        // check pre-requisites
        try {
            await generator.checkPrerequisites(context);
        }
        catch (err) {
            console.error(err.message);
            return;
        }

        // configure
        try {
            await generator.configure(context);
        }
        catch (err) {
            console.error(err.message);
            return;
        }


        // generate
        try {
            await generator.generate(context);
        }
        catch (err) {
            console.error(err.message);
            return;
        }

    });


// build
program
    .command('build')
    .description('Compile and package a UON project.')
    .option('-W, --watch', 'Rebuild project on file change.')
    .option('-c, --configuration <type>', 'Specify build configuration defined in uon.json')
    .option('--prod', 'Shortcut to "--configuration production"')
    .action(async (options: any) => {

        let project = await Project.FindProject();

        if (!project) {
            console.log(`No project found.`);
            return;
        }

        let build_options: BuildConfigBase = Object.assign({}, project.options);

        if (options.prod) {
            options.configuration = "production"
        }

        if (options.configuration) {

            let spec_conf = project.configurations[options.configuration];

            if (!spec_conf) {
                console.log(`No configuration with name "${colors.bold(options.configuration)}" found for project "${name}".`);
                return;
            }

            Object.assign(build_options, spec_conf);
        }

        // create compiler
        let compiler = await GetCompiler(project.projectType);

        if (!compiler) {
            console.log(`No compiler with type ${colors.red(project.projectType)} exists. Type must be one of ${colors.bold(Object.keys(COMPILERS).join(', '))}`)
            return;
        }

        // update paths to absolute
        const output_path = _path.resolve(project.rootPath, build_options.outputPath);
        const project_path = project.rootPath;

        build_options.projectPath = project_path;
        build_options.entry = _path.resolve(project_path,
            build_options.entry
                ? build_options.entry
                : project.entry);
        build_options.outputPath = output_path;
        build_options.replacements = (build_options.replacements || []).map((r) => {
            return {
                replace: _path.resolve(project_path, r.replace),
                with: _path.resolve(project_path, r.with),
            }
        });

        await compiler.configure(build_options);
        await compiler.compile(build_options);

    });



// build
program
    .command('serve')
    .description('Starts a local server and watches the source of a webapp project.')
    .option('-H, --host <host>', 'Set the host for the server, defaults to 127.0.0.1')
    .option('-P, --port <port>', 'Set the port for the server, defaults to 8080')
    .option('-c, --configuration <type>', 'Specify build configuration defined in uon.json')
    .option('--prod', 'Shortcut to "--configuration production"')
    .action(async (options: any) => {

        let project = await Project.FindProject();

        if (!project) {
            console.log(`No project found.`);
            return;
        }

        if (project.projectType !== 'webapp') {
            console.log(`Project type must be 'webapp'`);
            return;
        }

        if (options.prod) {
            options.configuration = "production";
        }

        let build_options: BuildConfigBase = Object.assign({}, project.options);

        if (options.configuration) {

            let spec_conf = project.configurations[options.configuration];

            if (!spec_conf) {
                console.log(`No configuration with name "${colors.bold(options.configuration)}" found for project "${name}".`);
                return;
            }

            Object.assign(build_options, spec_conf);
        }

        // create compiler
        const compiler = await GetCompiler(project.projectType) as WebAppCompiler;


        // update paths to absolute
        const output_path = _path.resolve(project.rootPath, build_options.outputPath);
        const project_path = project.rootPath;

        build_options.projectPath = project_path;
        build_options.entry = _path.resolve(project_path,
            build_options.entry || project.entry);
        build_options.outputPath = output_path;
        build_options.replacements = (build_options.replacements || []).map((r) => {
            return {
                replace: _path.resolve(project_path, r.replace),
                with: _path.resolve(project_path, r.with),
            }
        });

        await compiler.configure(build_options as WebAppBuildConfig);


        let server = http.createServer((req, res) => {
            const uri = url.parse(req.url);
            const pathname = uri.pathname === '/' ? 'index.html' : uri.pathname;
            const p = _path.join(output_path, pathname);

            try {

                let rs = fs.createReadStream(p);

                rs.on('error', () => {
                    res.statusCode = 404;
                    res.end();
                });

                rs.on('open', () => {

                    res.setHeader('Content-Type', lookup(pathname) || 'text/plain')
                    rs.pipe(res);
                });

            }
            catch (err) {

                res.statusCode = 404;
                res.end();
            }



        });

        const port = parseInt(options.port) || 8080;
        const host = options.host || '127.0.0.1';

        console.log(options);

        server.listen(port, host, undefined, () => {
            console.log(`listening on ${host}:${port}`);
        });

      /*  const websockets: WebSocket[] = [];

        server.on('upgrade', (req: http.IncomingMessage, socket: Socket, head: Buffer) => {

            

        });
*/

        const watch = await compiler.watch(build_options as WebAppBuildConfig, () => {

        });







    });

// error on unknown commands
program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

// run
program.parse(process.argv);