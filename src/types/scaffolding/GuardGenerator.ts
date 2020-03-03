import * as fs from 'fs';
import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile, FindModuleContext } from '../../Utils';
import { CamelCase } from '@uon/string-utils';


export interface GuardConfig {
    targetPath: string;
}



export class GuardGenerator implements IGenerator {

    async checkPrerequisites(context: GeneratorContext): Promise<boolean> {



        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

        if (!context.project) {
            throw new Error(`No project selected, make sure cwd is inside a project folder.`)
        }

        let project_path = context.project.rootPath;
        let base_path = _path.join(project_path, 'src/app');

        // library doesn't have an app folder
        if (context.project.projectType === 'library') {
            base_path = _path.join(project_path, 'src');
        }

        let cwd = process.cwd();

        // find closest module
        let module_context = FindModuleContext(cwd.length > base_path.length ? cwd : base_path, project_path);

        if(!module_context) {
            throw new Error(`Could not find module from path "${cwd}"`);
        }

        context.configuration.targetPath = module_context.path;

    }

    async generate(context: GeneratorContext): Promise<void> {

        let opts: GuardConfig = context.configuration;

        const service_name = context.arguments.name.toLowerCase();

        console.log(`Generating guard "${service_name}"...`);

        await CreateGuardTs(opts.targetPath, service_name);

        console.log(`Done!`);
    }


}


function CreateGuardTs(modulePath: string, name: string) {

    let ucc_name = CamelCase(name, true);
    
    const str = `
import { Injectable } from '@uon/core';
import { IRouteGuardService, ActivatedRoute } from "@uon/router";

@Injectable()
export class ${ucc_name}Guard implements IRouteGuardService {

    constructor() {}

    checkGuard(route: ActivatedRoute) {
        return true;
    }
}
`;

    return WriteFile(_path.join(modulePath, `${name}.guard.ts`), Buffer.from(str));

}
