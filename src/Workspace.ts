
import * as colors from 'colors/safe';
import * as _path from 'path';
import * as fs from 'fs';

import { FileExists, WriteFile, ReadFile } from './Utils';
import { Project } from './Project';


export class Workspace {

    name: string;
    rootPath: string;
    projects: Project[];

    constructor(data: any) {

        this.name = data.name;
        this.projects = data.projects.map((d: any) => new Project(d));
    }

    /**
     * Creates a new project and add to the workspace
     */
    getProjectByName(name: string) {

        for (let i = 0; i < this.projects.length; i++) {
            if (this.projects[i].name === name) {
                return this.projects[i];
            }

        }

        return null;

    }

    getProjectByPath(cwd: string) {

        if(!cwd.startsWith(this.rootPath)) {
            return null;
        }

        for (let i = 0; i < this.projects.length; i++) {
            let project = this.projects[i];
            let project_path = _path.resolve(this.rootPath, project.root);

            if(cwd.startsWith(project_path)) {
                return project;
            }
        }

        return null;

    }


    /**
     * Save the workspace
     */
    async save() {

        await WriteFile(
            _path.join(this.rootPath, 'uon.json'),
            Buffer.from(JSON.stringify(this, null, 4))
        );

    }

    toJSON() {
        return {
            name: this.name,
            projects: this.projects.map(p => p.toJSON())
        }
    }

    /**
     * Create a new workspace folder in the current working directory
     * @param name 
     */
    static async CreateWorkspace(name: string) {


        let folder_path = _path.join(process.cwd(), name);

        // ensure folder doesn't exist
        let exists = await FileExists(folder_path);

        if (exists) {
            console.error(`Folder ${colors.bold(folder_path)} already exists. Exiting.`);
            return;
        }

        // create the folder
        fs.mkdirSync(folder_path);


        // create an empty workspace
        let workspace: any = {
            name: name,
            projects: []
        };

        const file_path = _path.join(folder_path, 'uon.json')

        // write workspace file
        await WriteFile(file_path, Buffer.from(JSON.stringify(workspace, null, 4)));


        console.log(`Created workspace "${colors.bold(colors.blue(name))}"`);


    }

    /**
     * Find a uon workspace up the folder tree 
     */
    static async FindWorkspace() {

        let start_path = process.cwd();

        let uon_filepath = FindUonJsonFile(start_path);

        if (!uon_filepath) {
            throw new Error(`Could not find uon.json workspace file.`);
            return null;
        }

        // load file
        let uon_buffer = await ReadFile(uon_filepath);
        let uon_json = JSON.parse(uon_buffer.toString('utf8'));

        let workspace = new Workspace(uon_json);
        workspace.rootPath = _path.dirname(uon_filepath);

        return workspace;

    }


}

function FindUonJsonFile(path: string): string {

    const uon_filepath = _path.join(path, 'uon.json');

    if (!fs.existsSync(uon_filepath)) {

        let parent_dir = _path.dirname(path);
        if (parent_dir === "/") {
            return null;
        }

        return FindUonJsonFile(parent_dir);
    }

    return uon_filepath;
}