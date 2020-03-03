import { ICompiler, BuildConfigBase, GetWebpackConfig, SASS_LOADER_PATH, CSS_LOADER_PATH, CreateTsProgram } from "../../Compiler";

import * as ts from 'typescript';
import * as _path from 'path';
import * as fs from 'fs';
import { ReadFile, WriteFile } from "../../Utils";
import { ViewCompilerContext } from "../../view-compiler/ViewCompilerContext";
import { Project } from "../../Project";


export interface LibraryBuildConfig extends BuildConfigBase {


}


export class LibraryCompiler implements ICompiler<LibraryBuildConfig> {

    private transformers: ts.CustomTransformers = {
        before: [],
        after: [],
        afterDeclarations: []
    };

    constructor(private project: Project) {

    }

    async configure(config: LibraryBuildConfig): Promise<void> {

        const pkg_buffer = await ReadFile(_path.join(config.projectPath, 'package.json'));
        const pkg = JSON.parse(pkg_buffer.toString());

        const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.peerDependencies || {}));

        if (deps.indexOf('@uon/view') > -1 || pkg.name === '@uon/view') {

            console.log('Using @uon/view');

            const vcc = new ViewCompilerContext(this.project, config);
            await vcc.init();

            let trans = vcc.getBeforeTransformer();

            this.transformers.before.push(trans);
            this.transformers.afterDeclarations.push(trans);
        }

    }

    async compile(config: LibraryBuildConfig): Promise<void> {

        // typescript transpile only, no webpack packaging
        console.log(`Building library project...`);

        const program = await CreateTsProgram(config);

        // emit js code
        let emit_result = program.emit(
            undefined,
            undefined,
            undefined,
            undefined,
            this.transformers
        );


        let all_diagnostics = (ts
            .getPreEmitDiagnostics(program) as any)
            .concat(emit_result.diagnostics);

        all_diagnostics.forEach((diagnostic: any) => {
            if (diagnostic.file) {
                let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
                    diagnostic.start!
                );
                let message = ts.flattenDiagnosticMessageText(
                    diagnostic.messageText,
                    "\n"
                );
                console.log(
                    `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
                );
            } else {
                console.log(
                    `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
                );
            }
        });

        // copy package.json to outputPath
        let pkg_buffer = await ReadFile(_path.join(config.projectPath, 'package.json'));
        let pkg = JSON.parse(pkg_buffer.toString());


        // remap main to local target dir
        pkg.main = _path.basename(config.entry, '.ts') + '.js';

        // remap types
        if (pkg.types) {
            pkg.types = _path.basename(config.entry, '.ts') + '.d.ts';
        }

        console.log(`\t Removing scripts from package.json`);

        // remove scripts
        delete pkg.scripts;

        console.log(`\t Copying package.json to dist folder ...`);

        await WriteFile(_path.join(config.outputPath, 'package.json'),
            Buffer.from(JSON.stringify(pkg, null, 2)));


        // copy LICENCE and README.md

        try {
            const licence_buffer = await ReadFile(_path.join(config.projectPath, 'LICENSE'));

            //console.log(`\t Copying LICENSE to dist folder ...`);
            await WriteFile(_path.join(config.outputPath, 'LICENSE'), licence_buffer);
        }
        catch (ex) {

        }

        try {
            const readme_buffer = await ReadFile(_path.join(config.projectPath, 'README.md'));

            //console.log(`\t Copying README.md to dist folder ...`);
            await WriteFile(_path.join(config.outputPath, 'README.md'), readme_buffer);
        }
        catch (ex) {

        }

        // copy .gitignore
        try {
            let gi_buffer = await ReadFile(_path.join(config.projectPath, '.gitignore'));

            await WriteFile(_path.join(config.outputPath, '.gitignore'), gi_buffer);
        }
        catch (ex) {

        }


        if (config.assets) {

            // format assets to be copied as is
            const copies = config.assets.map((a) => {
                let res: any = {
                    from: _path.resolve(config.projectPath, a)
                };

                if (fs.statSync(_path.resolve(config.projectPath, a)).isDirectory()) {
                    res.to = _path.join(config.outputPath, _path.basename(a));
                }

                return res;
            });

            for (let i = 0; i < copies.length; ++i) {
                let c = copies[0];
                if (c.to) {
                    CopyRecursiveSync(c.from, c.to);
                }
            }

        }


    }
}


function CopyRecursiveSync(src: string, dest: string) {
    var exists = fs.existsSync(src);
    var stats = exists && fs.statSync(src);
    var isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        try { fs.mkdirSync(dest) } catch(e) {};
        fs.readdirSync(src).forEach(function (childItemName) {
            CopyRecursiveSync(_path.join(src, childItemName),
                _path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);    // UPDATE FROM:    fs.linkSync(src, dest);
    }
};