#!/usr/bin/env node

import { DoSetup } from './src/setup';
import { DoBuild } from './src/build';
const PACKAGE = require('../package.json')
const program = require('commander');

const VERSION_STRING = `@uon/cli v${PACKAGE.version}`;


program
    .version(VERSION_STRING, '-v, --version')
    .usage('<command> [options]')

// new project command
program
    .command('new <template> <name>')
    .description(`Creates a new workspace and a new project from a template.`)
    .option('-t, --templatePath', 'A folder where templates are stored')
    .option('-D, --distinct', 'Create a new workspace folder even if a uon.json file is found.')
    .action((type: string, name: string, options: any) => {
        DoSetup(type, name, options);
    });


// generate a component of <type>
program
    .command('generate <type> <name>')
    .description(`Generate files for a UON project.`)


// build
program
    .command('build <name>') 
    .description('Compile and package a UON project.')
    .option('-W, --watch', 'Rebuild project on file change.')
    .option('-p, --prod', 'Build in production mode.')
    .option('-o, --output', 'The output folder. (defaults to "{cwd}/dist/")')
    .action((name: string, options: any) => {
        DoBuild(name, options);
    });

// run
program.parse(process.argv);