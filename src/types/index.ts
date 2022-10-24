

import { ServerGenerator } from './server/ServerGenerator';
import { ServerCompiler } from './server/ServerCompiler';
import { LibraryGenerator } from './library/LibraryGenerator';
import { LibraryCompiler } from './library/LibraryCompiler';
import { ViewLibCompiler } from './viewlib/ViewLibCompiler';
import { ViewLibGenerator } from './viewlib/ViewLibGenerator';


export const PROJECT_GEN: any = {
    "server":  ServerGenerator,
    "library": LibraryGenerator,
    "viewlib": ViewLibGenerator
};

export const COMPILERS: any = {
    "server":  ServerCompiler,
    "library": LibraryCompiler,
    "viewlib": ViewLibCompiler
}