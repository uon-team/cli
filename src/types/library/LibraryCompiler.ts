import { ICompiler, BuildConfigBase, GetWebpackConfig, SASS_LOADER_PATH, CSS_LOADER_PATH } from "../../Compiler";

import * as ts from 'typescript';
import * as _path from 'path';
import { ReadFile, WriteFile } from "../../Utils";



export interface LibraryBuildConfig extends BuildConfigBase {


}


export class LibraryCompiler implements ICompiler<LibraryBuildConfig> {


    constructor() {

    }

    async configure(config: LibraryBuildConfig): Promise<void> {

    }

    async compile(config: LibraryBuildConfig): Promise<void> {

        // typescript transpile only, no webpack packaging
        console.log(`Building library project...`);


        console.log(`\t Loading tsconfig.json...`);
        // load tsconfig
        let ts_config_buffer = await ReadFile(_path.join(config.projectPath, 'tsconfig.json'))
        let ts_config = JSON.parse(ts_config_buffer.toString());

        // get a real ts config object
        let real_config = ts.convertCompilerOptionsFromJson(ts_config.compilerOptions, config.projectPath);

        // set the proper output dir
        real_config.options.outDir = config.outputPath;

        console.log(`\t Transpiling typescript to ${ts_config.compilerOptions.target}...`);
        let program = ts.createProgram([config.entry], real_config.options);
        let emit_result = program.emit();

        let all_diagnostics = ts
            .getPreEmitDiagnostics(program)
            .concat(emit_result.diagnostics);

        all_diagnostics.forEach(diagnostic => {
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


        console.log(`\t Removing scripts from package.json`);

        // remove scripts
        delete pkg.scripts;

        console.log(`\t Copying package.json to dist folder ...`);

        await WriteFile(_path.join(config.outputPath, 'package.json'),
            Buffer.from(JSON.stringify(pkg, null, 2)));


        // copy LICENCE and README.md

        try {
            let licence_buffer = await ReadFile(_path.join(config.projectPath, 'LICENSE'));
        
            console.log(`\t Copying LICENSE to dist folder ...`);
            await WriteFile(_path.join(config.outputPath, 'LICENSE'), licence_buffer);
        }
        catch(ex) {

        }

        try {
            let readme_buffer = await ReadFile(_path.join(config.projectPath, 'README.md'));
        
            console.log(`\t Copying README.md to dist folder ...`);
            await WriteFile(_path.join(config.outputPath, 'README.md'), readme_buffer);
        }
        catch(ex) {

        }

        // copy .gitignore
        try {
            let gi_buffer = await ReadFile(_path.join(config.projectPath, '.gitignore'));
    
            await WriteFile(_path.join(config.outputPath, '.gitignore'), gi_buffer);
        }
        catch(ex) {

        }


    }
}