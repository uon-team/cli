import { ICompiler, BuildConfigBase, GetWebpackConfig, SASS_LOADER_PATH, CSS_LOADER_PATH } from "../../Compiler";

import * as ts from 'typescript';
import * as _path from 'path';
import { ReadFile } from "../../Utils";



export interface LibraryBuildConfig extends BuildConfigBase {


}


export class LibraryCompiler implements ICompiler<LibraryBuildConfig> {


    constructor() {

    }

    async configure(config: LibraryBuildConfig): Promise<void> {

    }

    async compile(config: LibraryBuildConfig): Promise<void> {

        // typescript transpile only, no webpack packaging

        // load tsconfig
        let ts_config_buffer = await ReadFile(_path.join(config.projectPath, 'tsconfig.json'))
        let ts_config = JSON.parse(ts_config_buffer.toString());

        // get a real ts config object
        let real_config = ts.convertCompilerOptionsFromJson(ts_config.compilerOptions, config.projectPath);

        // set the proper output dir
        real_config.options.outDir = config.outputPath;

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



    }
}