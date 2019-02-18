




export interface IProjectType {

}

export class Project {

    name: string;
    projectType: string;
    root: string;
    entry: string;

    options: any;
    configurations: {[k: string]: any};

    constructor(data: any) {
        
        this.name = data.name;
        this.projectType = data.projectType;
        this.root = data.root;
        this.entry = data.entry;

        this.options = data.options;
        this.configurations = data.configurations;


    }


    toJSON() {
        return {
            name: this.name,
            projectType: this.projectType,
            root: this.root,
            entry: this.entry,
            options: this.options,
            configurations: this.configurations
        }
    }


}