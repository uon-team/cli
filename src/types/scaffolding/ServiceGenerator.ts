import * as fs from 'fs';
import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile, FindModuleContext } from '../../Utils';
import { CamelCase } from '@uon/string-utils';


export interface ServiceConfig {
    targetPath: string;
}



export class ServiceGenerator implements IGenerator {

    async checkPrerequisites(context: GeneratorContext): Promise<boolean> {

        

        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

        if(!context.project) {
            throw new Error(`No project selected, make sure cwd is inside a project folder.`)
        }

        let project_path = context.project.rootPath;
        let base_path = _path.join(project_path, 'src/app');

        // library doesn't have an app folder
        if(context.project.projectType === 'library') {
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

        let opts: ServiceConfig = context.configuration;

        const service_name = context.arguments.name.toLowerCase();

        console.log(`Generating service "${service_name}"...`);

        await CreateServiceTs(opts.targetPath, service_name);

        console.log(`Done!`);
    }


}


function CreateServiceTs(modulePath: string, name: string) {

    let ucc_name = CamelCase(name, true);

    const str = `
import { Injectable } from '@uon/core';

@Injectable()
export class ${ucc_name}Service {

    constructor() {

    }
}
`;

    return WriteFile(_path.join(modulePath, `${name}.service.ts`), Buffer.from(str));

}
