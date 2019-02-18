import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../Utils';




export interface WebAppConfig {


}

const QUESTIONS = [
    {
        type: 'confirm',
        name: 'useStaticAssets',
        message: 'Generate static asset router outlet?',
        default: false
    },
];


export class WebAppGenerator implements IGenerator {


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

    }

    async generate(context: GeneratorContext): Promise<void> {

        console.log(`Generating webapp project...`);

        let project_name = context.arguments.name;

        // create new project
        let project = new Project({
            name: project_name,
            projectType: 'webapp',
            root: project_name,
            entry: 'src/main.ts',
            options: {
                outputPath: `dist/${project_name}`,
                filename: `${project_name}-bundle.js`,
                index: "src/index.html",
                styles: [
                    "src/styles.scss"
                ],
                assets: [
                    "src/assets"
                ]
            },
            configurations: {
                production: {
                    replacements: [
                        {
                            replace: 'src/environments/environment.ts',
                            with: 'src/environments/environment.prod.ts'
                        }
                    ],
                    optimizations: {
                        prod: true
                    }
                }
            }
        });

        context.workspace.projects.push(project);


        // create project folders
        const project_path = _path.join(context.workspace.rootPath, project.root);
        const src_path = _path.join(project_path, 'src');
        const app_path = _path.join(src_path, 'app');
        const assets_path = _path.join(src_path, 'assets');
        const env_path = _path.join(src_path, 'environments');


        EnsureDirectoryExistence(src_path);

        const deps = {
            '@uon/core': '^0.4.0',
        }

        const dev_deps = {

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
        //console.log(cmd_result);

        // create .gitignore
        await CreateGitIgnore(project_path);

        // run git init
        console.log(`Running "git init" ...`);
        cmd_result = await ExecCommand('git init');
        //console.log(cmd_result);

        // create tsconfig.json
        await CreateTSConfig(project_path);

        // create main.ts
        await CreateMainTs(src_path);

        // create main module
        await CreateMainAppModule(app_path, context.configuration);

        // create environment.ts & environment.prod.ts
        await CreateEnvFile(env_path, 'environment.ts');
        await CreateEnvFile(env_path, 'environment.prod.ts', true);


        // create assets folder
        await WriteFile(_path.join(assets_path, '.gitkeep'), Buffer.from(''));


        // create main style file
        await WriteFile(_path.join(src_path, 'styles.scss'), Buffer.from(''));

        // create index.html
        await CreateIndexHTML(src_path, project_name);

        console.log(`Updating workspace file...`);
        await context.workspace.save();




    }


}


async function CreateIndexHTML(srcPath: string, name: string) {

    const html = `
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <title>${name}</title>
    <base href="/">

    <meta http-equiv="X-UA-Compatible"
            content="ie=edge">

    <meta name="viewport"
            content="width=device-width, initial-scale=1">

    <link rel="icon"
            type="image/x-icon"
            href="favicon.ico">

</head>
<body>

</body>
</html>
 `;

    await WriteFile(_path.join(srcPath, 'index.html'), Buffer.from(html));



}



async function CreateMainAppModule(appPath: string, config: WebAppConfig) {

    const main_module = `
import { Module } from '@uon/core';

@Module({
    imports: [

    ]
})
export class AppModule {}

    `;

    await WriteFile(_path.join(appPath, 'app.module.ts'), Buffer.from(main_module));



}

function CreateMainTs(srcPath: string) {

    const str = `
import { Application } from '@uon/core';
import { AppModule } from './app/app.module';

// Bootstrap the main app module and start
Application
    .Bootstrap(AppModule)
    .start();

    `;

    return WriteFile(_path.join(srcPath, 'main.ts'), Buffer.from(str));

}
