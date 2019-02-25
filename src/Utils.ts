
import * as fs from 'fs';
import * as _path from 'path';
import * as ChildProcess from 'child_process';



export function ReadFile(path: string) {

    return new Promise<Buffer>((resolve, reject) => {

        fs.readFile(path, (err, data) => {

            if (err) {
                return reject(err);
            }

            resolve(data);

        });

    });
}

export function WriteFile(path: string, content: Buffer) {

    EnsureDirectoryExistence(path);

    return new Promise<void>((resolve, reject) => {

        fs.writeFile(path, content, (err) => {

            if (err) {
                return reject(err);
            }

            resolve();

        });

    });
}


export function FileExists(path: string) {

    return new Promise<boolean>((resolve, reject) => {

        fs.exists(path, (exists) => {

            resolve(exists);

        });

    });
}



export function ExecCommand(cmd: string) {

    return new Promise<string>((resolve, reject) => {

        // run some commands
        let p = ChildProcess.exec(cmd, (ex, stdout, stderr) => {

            if (ex) {
                return reject(ex);
            }
            resolve(stdout);
        });


    });
}

export function EnsureDirectoryExistence(filePath: string) {
    var dirname = _path.dirname(filePath);

    if (fs.existsSync(dirname)) {
        return true;
    }

    EnsureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);

}


export function GetFilePaths(basePath: string, prefix: string, output: string[] = []) {

    let files_path = _path.join(basePath, prefix);
    let file_names = fs.readdirSync(files_path);

    for (let i = 0, l = file_names.length; i < l; i++) {

        let fp = _path.join(files_path, file_names[i]);
        let sfp = _path.join(prefix, file_names[i]);

        if (fs.statSync(fp).isDirectory()) {
            GetFilePaths(basePath, sfp, output);
        }
        else {
            output.push(sfp);
        }
    }

    return output;

}


export async function CreateGitIgnore(path: string) {

    const str = `*.DS_Store
*.project
*.settings
/docs
/node_modules
/typings
/dist
/.vscode
*.log
    `;

    return WriteFile(_path.join(path, '.gitignore'), Buffer.from(str));

}

export async function CreateTSConfig(path: string) {

    const str = `{
    "compilerOptions": {
        "baseUrl": "./",
        "moduleResolution": "node",
        "module": "commonjs",
        "target": "es2015",
        "noImplicitAny": true,
        "sourceMap": true,
        "declaration": true,
        "outDir": "dist/",
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    },
    "lib": [ "es2015" ],
    "include": [
        "src/**/*"
    ],
    "exclude": [
        "node_modules",
        "typings/global",
        "typings/global.d.ts"
    ]
}`;

    return WriteFile(_path.join(path, 'tsconfig.json'), Buffer.from(str));
}

export async function CreateEnvFile(envPath: string, fileName: string, prod = false) {

    const content = `
    
export const ENVIRONMENT = {
    production: ${prod}
};

    `;

    return WriteFile(_path.join(envPath, fileName), Buffer.from(content));

}

export function FindModuleContext(cwd: string, furthest: string): { path: string, module: string} {

    let start = cwd;

    if(cwd === furthest) {
        return null;
    }

    // check for *.module.ts file in current folder
    let files = fs.readdirSync(start);

    for (let i = 0; i < files.length; i++) {
        const f = files[i];

        if(f.match(/(.*)\.module\.ts$/)) {
            return {
                path: start,
                module: f
            };
        }
        
    }

    let parent_dir = _path.dirname(start);
    
    // go up one level
    return FindModuleContext(parent_dir, furthest);







}


