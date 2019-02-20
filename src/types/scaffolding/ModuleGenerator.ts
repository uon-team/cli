import * as fs from 'fs';
import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile } from '../../Utils';


export interface ModuleConfig {

}



export class ModuleGenerator implements IGenerator {


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

        if(!context.project) {
            throw new Error(`No project selected, make sure cwd is inside a project folder.`)
        }



    }

    async generate(context: GeneratorContext): Promise<void> {

        console.log(`Generating Module`);


        
        // create project folders
        //const project_path = _path.join(context.workspace.rootPath, project.root);
        //const src_path = _path.join(project_path, 'src');

        //EnsureDirectoryExistence(src_path);

        const deps: any = {}
        const dev_deps: any = {}

        let opts: ModuleConfig = context.configuration;
       


     

    }


}


function CreateIndexTs(srcPath: string) {

    const str = `

    `;

    return WriteFile(_path.join(srcPath, 'index.ts'), Buffer.from(str));

}
