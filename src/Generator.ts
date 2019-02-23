
import { Type } from '@uon/core';
import { GENERATORS, PROJECT_GEN } from './types'
import { Project } from './Project';

export interface GeneratorContext {

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
   export async function GetProjectGenerator(type: string): Promise<IGenerator> {

    if (!PROJECT_GEN[type]) {
        return null;
    }

    const gen_type: Type<any> = PROJECT_GEN[type];

    const generator = new gen_type();

    return generator;

}



/**
    * Get a generator by type
    * @param type 
    */
export async function GetGenerator(type: string): Promise<IGenerator> {

    if (!GENERATORS[type]) {
        return null;
    }

    const gen_type: Type<any> = GENERATORS[type];

    const generator = new gen_type();

    return generator;

}

