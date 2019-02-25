import * as fs from 'fs';
import * as _path from 'path';

import { IGenerator, GeneratorContext } from '../../Generator';

import { prompt } from 'inquirer';
import { Project } from '../../Project';
import { EnsureDirectoryExistence, ExecCommand, WriteFile, CreateGitIgnore, CreateTSConfig, CreateEnvFile, FindModuleContext } from '../../Utils';
import { StringUtils } from '@uon/core';


export interface OutletConfig {
    targetPath: string;
    addHttp: boolean;
}



export class OutletGenerator implements IGenerator {

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
        context.configuration.addHttp = context.project.projectType === 'server';

    }

    async generate(context: GeneratorContext): Promise<void> {

        let opts: OutletConfig = context.configuration;

        const service_name = context.arguments.name.toLowerCase();

        console.log(`Generating outlet "${service_name}"...`);

        await CreateOutletTs(opts.targetPath, service_name, context.configuration);

        console.log(`Done!`);
    }


}


function CreateOutletTs(modulePath: string, name: string, config: OutletConfig) {

    let ucc_name = StringUtils.camelCase(name);
    ucc_name = ucc_name[0].toUpperCase() + ucc_name.substring(1);


    let extra_import: string = '';
    let ctor = `
    constructor(private route: ActivatedRoute) {}
`

    if(config.addHttp) {
        extra_import += `import { HttpRoute, HttpResponse, HttpRequest } from '@uon/server';`;
        ctor = `
    constructor(private route: ActivatedRoute,
        private response: HttpResponse,
        private request: HttpRequest) {}    
        
        `
    }

    const str = `
import { RouterOutlet, ActivatedRoute } from "@uon/router";
${extra_import}

@RouterOutlet()
export class ${ucc_name}Outlet {

    ${ctor}

}
`;

    return WriteFile(_path.join(modulePath, `${name}.outlet.ts`), Buffer.from(str));

}
