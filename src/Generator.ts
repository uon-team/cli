
import { Type } from '@uon/core';
import { Workspace } from './Workspace';
import { GENERATORS } from './types'
import { Project } from './Project';

export interface GeneratorContext {

    workspace: Workspace;
    project: Project;

    arguments: {
        name: string;
        type: string;
        [k: string]: any
    },

    configuration: any;
}



export interface IGenerator {

    checkPrerequisites(context: GeneratorContext): Promise<boolean>;

    configure(context: GeneratorContext): Promise<void>;

    generate(context: GeneratorContext): Promise<void>;

}


/**
    * Get a generator by type
    * @param type 
    */
export async function GetGenerator(type: string, ws: Workspace): Promise<IGenerator> {

    if (!GENERATORS[type]) {
        return null;
    }

    const gen_type: Type<any> = GENERATORS[type];

    const generator = new gen_type();

    return generator;

}

