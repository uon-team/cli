import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../Utils';
import { StringUtils } from '@uon/core';




export interface WebWorkerConfig {

    // useUonCore: boolean;
    //useUonRouter: boolean;
}

const QUESTIONS = [
    {
        type: 'confirm',
        name: 'useUonCore',
        message: 'Use @uon/core application structure?',
        default: false
    },

];


export class WebWorkerGenerator implements IGenerator {


    async checkPrerequisites(context: GeneratorContext): Promise<boolean> {

        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

        //let answers = await prompt(QUESTIONS);

        // context.configuration = answers;

    }

    async generate(context: GeneratorContext): Promise<void> {

        console.log(`Generating webworker project...`);

        let project_name = context.arguments.name;

        // create new project
        let project = new Project({
            name: project_name,
            projectType: 'webworker',
            root: project_name,
            entry: 'src/main.ts',
            options: {
                outputPath: `dist/${project_name}`,
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
        const project_path = project.rootPath;
        const src_path = _path.join(project_path, 'src');
        const app_path = _path.join(src_path, 'worker');
        //const assets_path = _path.join(src_path, 'assets');
        const env_path = _path.join(src_path, 'environments');


        EnsureDirectoryExistence(src_path);

        const deps = {
            '@uon/core': '^0.4.0',
            '@uon/router': '^0.4.0',
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
        await CreateTSConfig(project_path, ["webworker"]);

        // create main.ts
        await CreateMainTs(src_path);

        // create main module
        await CreateWorkerModuleTs(app_path, 'worker');


        // create environment.ts & environment.prod.ts
        await CreateEnvFile(env_path, 'environment.ts');
        await CreateEnvFile(env_path, 'environment.prod.ts', true);


        console.log(`Saving project file...`);
        await project.save();




    }


}


function CreateMainTs(srcPath: string) {

    const str = `
import { Application } from '@uon/core';
import { WorkerModule } from './worker/worker.module';

// Bootstrap the main app module and start
Application
    .Bootstrap(WorkerModule)
    .start();

    `;

    return WriteFile(_path.join(srcPath, 'main.ts'), Buffer.from(str));

}


async function CreateWorkerModuleTs(modulePath: string, name: string) {

    let ucc_name = StringUtils.camelCase(name);
    ucc_name = ucc_name[0].toUpperCase() + ucc_name.substring(1);


    const routes = `
import { InjectionToken } from '@uon/core';
import { Routes, Router, RouteHandler } from '@uon/router';

export const WEBWORKER_ROUTER = new InjectionToken<Router<RouteHandler>>('WEBWORKER_ROUTER');

/**
 * The worker message route decorator parameters
 */
export interface MessageRoute extends RouteHandlerData {

    /**
     * The path regexp to test
     */
    path: string;


}

/**
 * HttpRoute decorator for router endpoints 
 * @param meta 
 */
export const MessageRoute = MakeRouteHandlerDecorator<MessageRoute>("MessageRoute")

export const ROUTES: Routes = [
    
];
`;

    await WriteFile(_path.join(modulePath, `${name}.routes.ts`), Buffer.from(routes));


    const str = `
import { Module } from '@uon/core';
import { RouterModule, Router } from '@uon/router';
import { ROUTES, WEBWORKER_ROUTER, MessageRoute } from './${name}.routes';

@Module({
    imports: [
        RouterModule.For(WEBWORKER_ROUTER, ROUTES)
    ],
    providers: [
        {
            token: WEBWORKER_ROUTER,
            factory: () => {
                return new Router(MessageRoute)
            },
            deps: []

        },
    ]
})
export class ${ucc_name}Module {}
    `;

    return WriteFile(_path.join(modulePath, `${name}.module.ts`), Buffer.from(str));

}
