
import * as _path from 'path';
import * as fs from 'fs';
import * as colors from 'colors/safe';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../Utils';

export interface ServerConfig {

    useWebSocket?: boolean;
    useStaticAssets?: boolean
}


const QUESTIONS = [
    {
        type: 'confirm',
        name: 'useStaticAssets',
        message: 'Generate static asset router outlet?',
        default: false
    },
    {
        type: 'confirm',
        name: 'useWebSocket',
        message: 'Use @uon/websocket package?',
        default: false
    },
]

export class ServerGenerator implements IGenerator {


    async checkPrerequisites(context: GeneratorContext): Promise<boolean> {

        // check if a folder of the same name exists
        let project_path = _path.join(process.cwd(), context.arguments.name);
        let exists = fs.existsSync(project_path);

        if (exists) {
            throw new Error(`Directory "./${context.arguments.name}" already exists.`);
        }

        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

        let answers = await prompt(QUESTIONS);

        context.configuration = answers;

    }

    async generate(context: GeneratorContext): Promise<void> {

        
        let project_name = context.arguments.name;

        console.log(`Generating server project "${colors.bold(project_name)}"...`);

        // create new project
        let project = new Project({
            name: project_name,
            projectType: 'server',
            entry: 'src/main.ts',
            options: {
                outputPath: `dist`,
                filename: `${project_name}-bundle.js`,
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

        project.rootPath = _path.join(process.cwd(), context.arguments.name);

        // create project folders
        const project_path = project.rootPath; //_path.join(context.workspace.rootPath, project.root);
        const src_path = _path.join(project_path, 'src');
        const app_path = _path.join(src_path, 'app');
        const assets_path = _path.join(src_path, 'assets');
        const env_path = _path.join(src_path, 'environments');


        EnsureDirectoryExistence(src_path);

        const deps = {
            '@uon/core': '^0.9.0',
            '@uon/http': '^0.9.0',
            '@uon/router': '^0.9.0'
        }

        if(context.configuration.useWebSocket) {
            (<any>deps)['@uon/websocket'] = '^0.9.0';
        }

        const dev_deps = {
            '@types/node': '^10.11.0'
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

        console.log(`Saving project file...`);
        await project.save();




    }


}


async function CreateMainAppModule(appPath: string, config: ServerConfig) {

    const main_module = `
import { Module } from '@uon/core';
import { HttpModule, HTTP_ROUTER } from '@uon/server';
import { RouterModule } from '@uon/router'; 
import { routes } from './app.routes';

@Module({
    imports: [
        HttpModule.WithConfig({
            plainPort: 8080
        }),
        RouterModule.For(HTTP_ROUTER, routes)

    ]
})
export class AppModule {}

    `;

    await WriteFile(_path.join(appPath, 'app.module.ts'), Buffer.from(main_module));


    let asset_route = `
    {
        path: '/assets',
        outlet: StaticAssetOutlet
    },    
`;

    if (config.useStaticAssets) {

        let asset_outlet = `
import { RouterOutlet, ActivatedRoute} from '@uon/router';
import { HttpRoute, HttpResponse, HttpCache } from '@uon/server';        

@RouterOutlet()
export class StaticAssetOutlet {

    constructor(private response: HttpResponse, 
        private route: ActivatedRoute) {}


    @HttpRoute({
        method: 'GET',
        path: '/:path(.*)'
    })
    async serveFile() {


        await this.response.finish();
    }
}

        `;

        await WriteFile(_path.join(appPath, 'static.outlet.ts'), Buffer.from(asset_outlet));

    }


    const routes = `
import { Routes } from '@uon/router'; 
${config.useStaticAssets ? "import { StaticAssetOutlet } from './static.outlet';" : ''}

export const routes: Routes = [
    ${config.useStaticAssets ? asset_route : ''}
];
`;

    await WriteFile(_path.join(appPath, 'app.routes.ts'), Buffer.from(routes));



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

