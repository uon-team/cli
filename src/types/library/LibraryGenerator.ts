import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../Utils';




export interface LibraryConfig {

    packages: string[];
    includeNodeTypes: boolean;
}

const QUESTIONS = [
    {
        type: 'checkbox',
        message: 'Select @uon packages to include',
        name: 'packages',
        choices: [
            {
                name: '@uon/core ^0.4.0',
                checked: true
            },
            {
                name: '@uon/model ^0.4.0',
            },
            {
                name: '@uon/math ^0.4.0',
            },
            {
                name: '@uon/geom ^0.4.0',
            }
        ]
    },
    {
        type: 'confirm',
        message: 'Include Node.js types (@types/node)?',
        name: 'includeNodeTypes'
    }

];


export class LibraryGenerator implements IGenerator {


    async checkPrerequisites(context: GeneratorContext): Promise<boolean> {

        // check if a project of the same name exists
        let ws_projects = context.workspace.projects
            .filter((p) => {
                return p.name === context.arguments.name;
            });

        if (ws_projects.length > 0) {
            throw new Error(`Project with name "${context.arguments.name}" already exist in workspace.`);
        }


        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

        let answers = await prompt(QUESTIONS);

        context.configuration = answers;

        console.log(answers);

    }

    async generate(context: GeneratorContext): Promise<void> {

        console.log(`Generating library project...`);


        let project_name = context.arguments.name;

        // create new project
        let project = new Project({
            name: project_name,
            projectType: 'library',
            root: project_name,
            entry: 'src/index.ts',
            options: {
                outputPath: `dist/${project_name}`,
            }
        });

        context.workspace.projects.push(project);


        // create project folders
        const project_path = _path.join(context.workspace.rootPath, project.root);
        const src_path = _path.join(project_path, 'src');

        EnsureDirectoryExistence(src_path);

        const deps: any = {}
        const dev_deps: any = {}

        let opts: LibraryConfig = context.configuration;
        opts.packages.forEach((i) => {
            let parts = i.split(' ');
            deps[parts[0]] = parts[1];
        });

        if (opts.includeNodeTypes) {
            dev_deps['@types/node'] = "^10.11.0";
        }


        // create package.json
        console.log(`Running "npm init" ...`);
        process.chdir(project_path);
        let cmd_result = await ExecCommand('npm init -y');

        const package_path = _path.join(project_path, 'package.json');
        let pkg: any = require(package_path);

        pkg.dependencies = deps;
        pkg.devDependencies = dev_deps;

        await WriteFile(package_path, Buffer.from(JSON.stringify(pkg, null, 2)));

        console.log(`Running "npm install" ...`);
        cmd_result = await ExecCommand('npm install');

        // create .gitignore
        await CreateGitIgnore(project_path);

        // run git init
        console.log(`Running "git init" ...`);
        cmd_result = await ExecCommand('git init');
        //console.log(cmd_result);

        // create tsconfig.json
        await CreateTSConfig(project_path);

        // create index.ts
        await CreateIndexTs(src_path);

        console.log(`Updating workspace file...`);
        await context.workspace.save();


    }


}


function CreateIndexTs(srcPath: string) {

    const str = `

    `;

    return WriteFile(_path.join(srcPath, 'index.ts'), Buffer.from(str));

}
