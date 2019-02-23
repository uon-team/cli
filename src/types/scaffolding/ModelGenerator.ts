import * as fs from 'fs';
import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile, FindModuleContext } from '../../Utils';
import { StringUtils } from '@uon/core';


export interface ModelConfig {
    targetPath: string;
}



export class ModelGenerator implements IGenerator {

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
        cwd = cwd.length > base_path.length ? cwd : base_path;

        context.configuration.targetPath = cwd;

    }

    async generate(context: GeneratorContext): Promise<void> {

        let opts: ModelConfig = context.configuration;

        const model_name = context.arguments.name.toLowerCase();

        console.log(`Generating model "${model_name}"...`);

        await CreateModelTs(opts.targetPath, model_name);

        console.log(`Done!`);
    }


}


function CreateModelTs(modulePath: string, name: string) {

    let ucc_name = StringUtils.camelCase(name);
    ucc_name = ucc_name[0].toUpperCase() + ucc_name.substring(1);

    const str = `
import { Model, ID, Member, NumberMember, ArrayMember } from '@uon/model';

@Model()
export class ${ucc_name} {

}
`;

    return WriteFile(_path.join(modulePath, `${name}.ts`), Buffer.from(str));

}
