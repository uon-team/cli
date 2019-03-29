

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
import { ModelGenerator } from './scaffolding/ModelGenerator';
import { WebWorkerGenerator } from './webworker/WebWorkerGenerator';
import { WebWorkerCompiler } from './webworker/WebWorkerCompiler';


export const PROJECT_GEN: any = {

    "server":  ServerGenerator,
    "webapp": WebAppGenerator,
    "webworker": WebWorkerGenerator,
    "serviceworker": null,
    "library": LibraryGenerator,
};

export const GENERATORS: any = {

    "service": ServiceGenerator,
    "outlet": OutletGenerator,
    "guard": GuardGenerator,
    "module": ModuleGenerator,
    "model": ModelGenerator,
}

export const COMPILERS: any = {

    "server":  ServerCompiler,
    "webapp": WebAppCompiler,
    "webworker": WebWorkerCompiler,
    "serviceworker": null,
    "library": LibraryCompiler,
}