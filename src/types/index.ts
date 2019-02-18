

import { ServerGenerator } from './server/ServerGenerator';
import { ServerCompiler } from './server/ServerCompiler';
import { WebAppGenerator } from './webapp/WebAppGenerator';
import { WebAppCompiler } from './webapp/WebAppCompiler';
import { LibraryGenerator } from './library/LibraryGenerator';
import { LibraryCompiler } from './library/LibraryCompiler';

export const GENERATORS: any = {

    "server":  ServerGenerator,
    "webapp": WebAppGenerator,
    "library": LibraryGenerator,

    "service": null,
    "outlet": null,
    "guard": null,
    "module": null,
    "model": null,
}

export const COMPILERS: any = {

    "server":  ServerCompiler,
    "webapp": WebAppCompiler,
    "library": LibraryCompiler,
}