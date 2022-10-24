#!/usr/bin/env node

import * as fs from 'fs';
import * as _path from 'path';
import * as http from 'http';
import * as _child_process from 'child_process';

import { Command } from 'commander';
import { IGenerator, GeneratorContext, GetProjectGenerator } from './src/generator.js';
import { COMPILERS, PROJECT_GEN } from './src/types/index.js';
import { GetCompiler, BuildConfigBase } from './src/compiler.js';
import { Project } from './src/project.js';
import { ServerBuildConfig, ServerCompiler } from './src/types/server/ServerCompiler.js';


function GetPackageVersion() {
    return `@uon/cli v0.11.0`;
}


const program = new Command();

// version
program
    .version(GetPackageVersion(), '-v, --version')
    .usage('<command> [options]')

// new project command
program
    .command('new <type> <name>')
    .description(`Creates a new uon project.`)
    .action(async (type: string, name: string, options: any) => {


        let generator = await GetProjectGenerator(type);

        if (!generator) {
            console.log(`No project generator with type ${type} exists. Type must be one of ${Object.keys(PROJECT_GEN).join(', ')}`)
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
                console.log(`No configuration with name "${options.configuration}" found for project "${project.name}".`);
                return;
            }

            Object.assign(build_options, spec_conf);
        }

        // create compiler
        let compiler = await GetCompiler(project);

        if (!compiler) {
            console.log(`No compiler with type ${project.projectType} exists. Type must be one of ${Object.keys(COMPILERS).join(', ')}`)
            return;
        }

        // update paths to absolute
        ConvertPathsToAbsolute(project, build_options);

        await compiler.configure(build_options);
        await compiler.compile(build_options);

    });


// serve

program
    .command('serve')
    .description('Starts a server project and restarts it when files are changed')
    .option('-c, --configuration <type>', 'Specify build configuration defined in uon.json')
    .option('--prod', 'Shortcut to "--configuration production"')
    .action(async (options: any) => {

        let project = await Project.FindProject();

        if (!project) {
            console.log(`No project found.`);
            return;
        }

        if (project.projectType !== 'server') {
            console.log(`Project type must be 'server'`);
            return;
        }

        if (options.prod) {
            options.configuration = "production";
        }

        let build_options: BuildConfigBase = Object.assign({}, project.options);

        if (options.configuration) {

            let spec_conf = project.configurations[options.configuration];

            if (!spec_conf) {
                console.log(`No configuration with name "${options.configuration}" found for project "${project.name}".`);
                return;
            }

            Object.assign(build_options, spec_conf);
        }

        // create compiler
        const compiler = await GetCompiler(project) as ServerCompiler;


        // update paths to absolute
        ConvertPathsToAbsolute(project, build_options);

        await compiler.configure(build_options);

        let child_process: _child_process.ChildProcessWithoutNullStreams = null;

        const watch = await compiler.watch(build_options as ServerBuildConfig, (err) => {

            if(child_process) {
                child_process.kill('SIGINT');
                child_process = null;
            }

            if(err) {
                return;
            }
            
            console.log("Reloading...")

            child_process = _child_process.spawn('node', [_path.join(build_options.outputPath, build_options.filename)], {
                cwd: _path.dirname(build_options.outputPath),
            });
            child_process.stdout.on('data', (data: Buffer) => {
                process.stdout.write(data);
                //console.log(data.toString('utf8'));
            });
            child_process.stderr.on('data', (data: Buffer) => {
                process.stderr.write(data);
                //console.error(data.toString('utf8'));
            });
            
        });

    });


// error on unknown commands
program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});


// run
program.parse(process.argv);



function ConvertPathsToAbsolute(project: Project, options: BuildConfigBase) {

    const output_path = _path.resolve(project.rootPath, options.outputPath);
    const project_path = project.rootPath;

    options.projectPath = project_path;
    options.entry = _path.resolve(project_path,
        options.entry
            ? options.entry
            : project.entry);
    options.outputPath = output_path;
    options.replacements = (options.replacements || []).map((r) => {
        return {
            replace: _path.resolve(project_path, r.replace),
            with: _path.resolve(project_path, r.with),
        }
    });
}
