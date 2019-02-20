

import { ServerGenerator } from './server/ServerGenerator';
import { ServerCompiler } from './server/ServerCompiler';
import { WebAppGenerator } from './webapp/WebAppGenerator';
import { WebAppCompiler } from './webapp/WebAppCompiler';
import { LibraryGenerator } from './library/LibraryGenerator';
import { LibraryCompiler } from './library/LibraryCompiler';
import { ModuleGenerator } from './scaffolding/ModuleGenerator';
import { ServiceGenerator } from './scaffolding/ServiceGenerator';
import { GuardGenerator } from './scaffolding/GuardGenerator';
import { OutletGenerator } from './scaffolding/OutletGenerator';

export const GENERATORS: any = {

    "server":  ServerGenerator,
    "webapp": WebAppGenerator,
    "library": LibraryGenerator,

    "service": ServiceGenerator,
    "outlet": OutletGenerator,
    "guard": GuardGenerator,
    "module": ModuleGenerator,
    "model": null,
}

export const COMPILERS: any = {

    "server":  ServerCompiler,
    "webapp": WebAppCompiler,
    "library": LibraryCompiler,
}