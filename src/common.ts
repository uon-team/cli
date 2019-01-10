import * as path from 'path';
import * as fs from 'fs';




export interface ProjectConfig {
    name: string;
    target: 'node' | 'web',
    type?: string;
    main: string;
    output: { path: string, filename: string };
}


export function LoadUonJsonFile() {

    const uon_filepath = path.join(process.cwd(), 'uon.json');

    if (!fs.existsSync(uon_filepath)) {
        throw new Error(`uon.json file not found`);
    }


    let file = fs.readFileSync(uon_filepath, 'utf8');

    try {
        let obj = JSON.parse(file);
        return obj;
    }
    catch (ex) {
        throw ex;
    }

}