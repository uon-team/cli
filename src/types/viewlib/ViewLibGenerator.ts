import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../generator';

import { Project } from '../../project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../utils';



export class ViewLibGenerator implements IGenerator {


    async checkPrerequisites(context: GeneratorContext): Promise<boolean> {

        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

        

    }

    async generate(context: GeneratorContext): Promise<void> {

        console.log(`Generating viewlib project...`);

        let project_name = context.arguments.name;

        // create new project
        let project = new Project({
            name: project_name,
            projectType: 'viewlib',
            root: project_name,
            entry: 'src/index.ts',
            options: {
                outputPath: `dist/${project_name}`,
                filename: `${project_name}.js`,
                library: `${project_name}`,
                libraryTarget: 'module'
                /*index: "src/index.html",
                styles: [
                    "src/styles.scss"
                ],
                assets: [
                    "src/assets"
                ]*/
            },
            configurations: {
                production: {
                    replacements: [
                        /*{
                            replace: 'src/environments/environment.ts',
                            with: 'src/environments/environment.prod.ts'
                        }*/
                    ],
                    optimizations: {
                        prod: true
                    }
                }
            }
        });

        project.rootPath = _path.join(process.cwd(), context.arguments.name);


        // create project folders
        const project_path = project.rootPath;
        const src_path = _path.join(project_path, 'src');
        const app_path = _path.join(src_path, 'app');
        const assets_path = _path.join(src_path, 'assets');
        const env_path = _path.join(src_path, 'environments');


        EnsureDirectoryExistence(src_path);

        const deps = {
            //'@uon/core': '^0.9.0',
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
    
        // create .gitignore
        await CreateGitIgnore(project_path);

        // run git init
        console.log(`Running "git init" ...`);
        cmd_result = await ExecCommand('git init');
        //console.log(cmd_result);

        // create tsconfig.json
        await CreateTSConfig(project_path, ["dom"]);

        // create main.ts
        await CreateIndexTs(src_path);

        // create main module
       // await CreateModuleTs(app_path, 'app');


        // create environment.ts & environment.prod.ts
        //await CreateEnvFile(env_path, 'environment.ts');
        //await CreateEnvFile(env_path, 'environment.prod.ts', true);


        // create assets folder
        await WriteFile(_path.join(assets_path, '.gitkeep'), Buffer.from(''));

        // create main style file
        //await WriteFile(_path.join(src_path, 'styles.scss'), Buffer.from(''));

        // create index.html
        //await CreateIndexHTML(src_path, project_name);

        console.log(`Saving project file...`);
        await project.save();




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


function CreateIndexTs(srcPath: string) {

    const str = `

    `;

    return WriteFile(_path.join(srcPath, 'index.ts'), Buffer.from(str));

}
