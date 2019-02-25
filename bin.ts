#!/usr/bin/env node

const PACKAGE = require('../package.json')
const program = require('commander');

import * as colors from 'colors/safe';
import * as _path from 'path';

import { Workspace } from './src/Workspace';
import { IGenerator, GeneratorContext, GetGenerator } from './src/Generator';
import { GENERATORS, COMPILERS } from './src/types';
import { GetCompiler, BuildConfigBase } from './src/Compiler';
import { Project } from './src/Project';

const VERSION_STRING = `${colors.bold('@uon/cli')} v${PACKAGE.version}`;


// version
program
    .version(VERSION_STRING, '-v, --version')
    .usage('<command> [options]')


// new workspace command
program
    .command('new <name>')
    .description(`Creates a new uon workspace.`)
    .action((name: string, options: any) => {
        Workspace.CreateWorkspace(name);
    });


// generate a component of <type>
program
    .command('generate <type> <name>')
    .description(`Generate files for a UON project.`)
    .action(async (type: string, name: string, options: any) => {

        let ws = await Workspace.FindWorkspace();
        let generator = await GetGenerator(type, ws);

        if (!generator) {
            console.log(`No generator with type ${colors.red(type)} exists. Type must be one of ${colors.bold(Object.keys(GENERATORS).join(', '))}`)
            return;
        }

        let project = ws.getProjectByPath(process.cwd());

        let context: GeneratorContext = {
            workspace: ws,
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
    .command('build [project]')
    .description('Compile and package a UON project.')
    .option('-W, --watch', 'Rebuild project on file change.')
    .option('-c, --configuration <type>', 'Specify build configuration defined in uon.json')
    .action(async (name: string, options: any) => {

        let ws = await Workspace.FindWorkspace();

        let project: Project;
        if(name) {
            project = ws.getProjectByName(name);
        }
        else {
            project = ws.getProjectByPath(process.cwd());
        }
        

        if (!project) {
            console.log(`No project with name "${colors.bold(name)}" found within workspace.`);
            return;
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
        let compiler = await GetCompiler(project.projectType, ws);

        if (!compiler) {
            console.log(`No compiler with type ${colors.red(project.projectType)} exists. Type must be one of ${colors.bold(Object.keys(COMPILERS).join(', '))}`)
            return;
        }

        // update paths to absolute
        const ws_path = ws.rootPath;
        const output_path = _path.resolve(ws_path, build_options.outputPath);
        const project_path = _path.resolve(ws_path, project.root);

        build_options.projectPath = project_path;
        build_options.entry = _path.resolve(project_path, project.entry);
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


// error on unknown commands
program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});

// run
program.parse(process.argv);