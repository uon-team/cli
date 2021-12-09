#!/usr/bin/env node

import * as fs from 'fs';
import * as _path from 'path';
import { Command } from 'commander';
import { IGenerator, GeneratorContext, GetProjectGenerator } from './src/generator.js';
import { COMPILERS, PROJECT_GEN } from './src/types/index.js';
import { GetCompiler, BuildConfigBase } from './src/compiler.js';
import { Project } from './src/project.js';


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


// error on unknown commands
program.on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
});


// run
program.parse(process.argv);

