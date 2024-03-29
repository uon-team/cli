import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../generator';
import { Project } from '../../project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../utils';


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
                name: '@uon/core ^0.9.0',
                checked: true
            },
            {
                name: '@uon/view ^0.9.0',
            },
            {
                name: '@uon/model ^0.9.0',
            },
            {
                name: '@uon/math ^0.9.0',
            },
            {
                name: '@uon/geom ^0.9.0',
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


        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

       // let answers = await prompt(QUESTIONS);

        context.configuration = {packages: []};

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

        project.rootPath = _path.join(process.cwd(), context.arguments.name);


        // create project folders
        const project_path = project.rootPath;
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
            dev_deps['@types/node'] = "^16.11.12";
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

        console.log(`Saving project file...`);
        await project.save();


    }


}


function CreateIndexTs(srcPath: string) {

    const str = `

    `;

    return WriteFile(_path.join(srcPath, 'index.ts'), Buffer.from(str));

}
