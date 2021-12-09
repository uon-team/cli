

import { ServerGenerator } from './server/ServerGenerator';
import { ServerCompiler } from './server/ServerCompiler';
import { LibraryGenerator } from './library/LibraryGenerator';
import { LibraryCompiler } from './library/LibraryCompiler';


export const PROJECT_GEN: any = {
    "server":  ServerGenerator,
    "library": LibraryGenerator,
};

export const COMPILERS: any = {
    "server":  ServerCompiler,
    "library": LibraryCompiler
}