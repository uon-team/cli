
import * as fs from 'fs';
import * as path from 'path';
import * as ChildProcess from 'child_process';

import { LoadUonJsonFile, ProjectConfig } from './common';

import { StringUtils } from '@uon/core';


export interface SetupOptions {
    templatePath?: string;

}


export async function DoSetup(type: string, name: string, options: SetupOptions) {

    const cd = process.cwd();
    let workspace_path = path.join(cd, name);
    let project_name = StringUtils.hyphenate(name.replace(/ +?/g, ''));

    // load template
    let base_path = options.templatePath || path.resolve(__dirname, '../templates');
    let template = GetTemplate(base_path, type);

    let uon_file: any;
    try {
        uon_file = LoadUonJsonFile();
        workspace_path = cd;
    }
    catch (ex) {

        if (fs.existsSync(workspace_path)) {
            console.error(`Error: directory ${workspace_path} already exists.`);
            return;
        }

        // uon file doesnt exist must creat dir and uon file
        fs.mkdirSync(workspace_path);

        uon_file = {
            workspace: {
                name: project_name
            },
            projects: []
        }

        project_name += `-${template.name}`;

    }

    // create a project config object 
    let project = CreateProjectConfig(project_name, template)
    uon_file.projects.push(project);

    // write out workspace file
    fs.writeFileSync(
        path.join(workspace_path, 'uon.json'),
        JSON.stringify(uon_file, null, 2),
        { encoding: 'utf8' });


    let project_path = path.join(workspace_path, project_name);

    if (fs.existsSync(project_path)) {
        console.error(`Error: directory ${project_path} already exists.`);
        return;
    }

    fs.mkdirSync(project_path);
    process.chdir(project_path);

    // npm init
    let result = await ExecCommand(`npm init -y`)

    console.log(`Created package.json`);
    let pkg_path = path.join(project_path, 'package.json');
    let pkg = require(pkg_path);

    // update package name and main file
    pkg.name = project_name;
    pkg.main = template.defaultMainFilename;

    fs.writeFileSync(pkg_path, JSON.stringify(pkg, null, 2));


    // format package dependencies
    let deps = Object.keys(template.dependencies)
        .map((k) => {
            return `${k}@${template.dependencies[k]}`;
        }).join(' ');

    console.log(`Installing dependencies`);

    // do npm installs
    let ls = await ExecCommand(`npm install --save ${deps}`);
    console.log(ls);


    // copy and render template files
    let files_path = path.join(base_path, type, 'files');
    let file_names = GetAllTemplateFilePaths(files_path, '', []);

    let template_files = file_names.filter((fn) => {
        return /(.*)\.template$/.test(fn);
    });

    let cp_files = file_names.filter((fn) => {
        return !(/(.*)\.template$/.test(fn));
    });

    cp_files.forEach((fn) => {

        let src_path = path.join(files_path, fn);
        let target_path = path.join(project_path, fn);

        // make sure dir exists
        EnsureDirectoryExistence(target_path)

        fs.copyFileSync(src_path, target_path);

    });


    console.log(cp_files);
    console.log(template_files);


}

export function GetTemplate(basePath: string, name: string) {

    let p = path.resolve(path.join(basePath, name, 'template.json'));
    console.log(p);

    if (!fs.existsSync(p)) {
        throw new Error(`No template found for name ${name}`);
    }


    let str = fs.readFileSync(p, 'utf8');


    let json = JSON.parse(str);

    return json;

}

function CreateProjectConfig(projectName: string, template: any) {

    return {
        name: projectName,
        target: template.target,
        main: path.join(projectName, template.defaultMainFilename),
        output: {
            path: 'dist',
            filename: `${projectName}-bundle.js`
        }
    }
}


function ExecCommand(cmd: string) {


    return new Promise<string>((resolve, reject) => {

        // run some commands
        let p = ChildProcess.exec(cmd, (ex, stdout, stderr) => {

            if (ex) {
                return reject(ex);
            }
            resolve(stdout);
        });


    })
}

function GetAllTemplateFilePaths(basePath: string, prefix: string, output: string[] = []) {

    let files_path = path.join(basePath, prefix);
    let file_names = fs.readdirSync(files_path);

    for (let i = 0, l = file_names.length; i < l; i++) {

        let fp = path.join(files_path, file_names[i]);
        let sfp = path.join(prefix, file_names[i]);

        if (fs.statSync(fp).isDirectory()) {
            GetAllTemplateFilePaths(basePath, sfp, output);
        }
        else {
            output.push(sfp);
        }
    }

    return output;

}

function EnsureDirectoryExistence(filePath: string) {
    var dirname = path.dirname(filePath);

    if (fs.existsSync(dirname)) {
        return true;
    }

    EnsureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);

}
