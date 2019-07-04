import { WriteFile, ReadFile } from "./Utils";
import * as _path from 'path';
import * as fs from 'fs';





export interface IProjectType {

}

export class Project {

    name: string;
    projectType: string;
    rootPath: string;
    entry: string;

    options: any;
    configurations: {[k: string]: any};

    constructor(data: any) {
        
        this.name = data.name;
        this.projectType = data.projectType;
        this.entry = data.entry;

        this.options = data.options;
        this.configurations = data.configurations;


    }

     /**
     * Save the project
     */
    async save() {

        await WriteFile(
            _path.join(this.rootPath, 'uon.json'),
            Buffer.from(JSON.stringify(this, null, 4))
        );

    }


    toJSON() {
        return {
            $schema: "https://uon.io/schemas/uon.json",
            name: this.name,
            projectType: this.projectType,
            entry: this.entry,
            options: this.options,
            configurations: this.configurations
        }
    }

      /**
     * Find a uon workspace up the folder tree 
     */
    static async FindProject() {

        let start_path = process.cwd();

        let uon_filepath = FindUonJsonFile(start_path);

        if (!uon_filepath) {
            throw new Error(`Could not find uon.json project file.`);
        }

        // load file
        let uon_buffer = await ReadFile(uon_filepath);
        let uon_json = JSON.parse(uon_buffer.toString('utf8'));

        let project = new Project(uon_json);
        project.rootPath = _path.dirname(uon_filepath);

        return project;

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