import * as fs from 'fs';
import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../Utils';
import { CamelCase } from '@uon/string-utils';


export interface ModuleConfig {
    targetPath: string;
}



export class ModuleGenerator implements IGenerator {

    async checkPrerequisites(context: GeneratorContext): Promise<boolean> {

        

        return true;
    }

    async configure(context: GeneratorContext): Promise<void> {

        if(!context.project) {
            throw new Error(`No project selected, make sure cwd is inside a project folder.`)
        }

        // find the target path
        let project_path = context.project.rootPath;
        let target_path = _path.join(project_path, 'src/app');

        // library doesn't have an app folder
        if(context.project.projectType === 'library') {
            target_path = _path.join(project_path, 'src');
        }

        //
        

        const module_name = context.arguments.name.toLowerCase();
        const module_dir = _path.join(target_path, module_name);
        context.configuration.targetPath = module_dir;

        if(fs.existsSync(module_dir)) {
            throw new Error(`Cannot create module, a folder with name "${module_name}" already exists`);
        }

    }

    async generate(context: GeneratorContext): Promise<void> {

        let opts: ModuleConfig = context.configuration;

        // create module folder
        const module_name = context.arguments.name.toLowerCase();

        console.log(`Generating module "${module_name}"...`);

        await CreateModuleTs(opts.targetPath, module_name);

        console.log(`Done!`);
    }


}


export function CreateModuleTs(modulePath: string, name: string) {

    let ucc_name = CamelCase(name, true);
    
    const str = `
import { Module } from '@uon/core';

@Module({
    imports: [],
    providers: []
})
export class ${ucc_name}Module {}
    `;

    return WriteFile(_path.join(modulePath, `${name}.module.ts`), Buffer.from(str));

}
