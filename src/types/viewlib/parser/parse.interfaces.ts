/**
 * Represents an error during parsing
 */
export class ParserError {
    public message: string;
    constructor(message: string,
        public input: string,
        public errLocation: string,
        public ctxLocation?: any) {

        this.message = `Parser Error: ${message} ${errLocation} [${input}] in ${ctxLocation}`;
    }
}


export enum ParseErrorLevel {
    WARNING,
    ERROR,
}

export class ParseError {
    constructor(
        public span: ParseSourceSpan,
        public msg: string,
        public level: ParseErrorLevel = ParseErrorLevel.ERROR) { }

    contextualMessage(): string {
        const ctx = this.span.start.getContext(100, 3);
        return ctx ? `${this.msg} ("${ctx.before}[${ParseErrorLevel[this.level]} ->]${ctx.after}")` :
            this.msg;
    }

    toString(): string {
        const details = this.span.details ? `, ${this.span.details}` : '';
        return `${this.contextualMessage()}: ${this.span.start}${details}`;
    }
}

/**
 * The start and end character locations in the expression
 */
export class ParseSpan {
    constructor(public start: number, public end: number) { }
}


export class ParseSourceSpan {
    constructor(
        public start: ParseLocation, public end: ParseLocation, public details: string | null = null) { }

    toString(): string {
        return this.start.file.content.substring(this.start.offset, this.end.offset);
    }
}


export class ParseLocation {
    constructor(
        public file: ParseSourceFile, public offset: number, public line: number,
        public col: number) { }

    toString(): string {
        return this.offset != null ? `${this.file.url}@${this.line}:${this.col}` : this.file.url;
    }

    getContext(maxChars: number, maxLines: number): { before: string, after: string } | null {
        const content = this.file.content;
        let startOffset = this.offset;

        if (startOffset != null) {
            if (startOffset > content.length - 1) {
                startOffset = content.length - 1;
            }
            let endOffset = startOffset;
            let ctxChars = 0;
            let ctxLines = 0;

            while (ctxChars < maxChars && startOffset > 0) {
                startOffset--;
                ctxChars++;
                if (content[startOffset] == '\n') {
                    if (++ctxLines == maxLines) {
                        break;
                    }
                }
            }

            ctxChars = 0;
            ctxLines = 0;
            while (ctxChars < maxChars && endOffset < content.length - 1) {
                endOffset++;
                ctxChars++;
                if (content[endOffset] == '\n') {
                    if (++ctxLines == maxLines) {
                        break;
                    }
                }
            }

            return {
                before: content.substring(startOffset, this.offset),
                after: content.substring(this.offset, endOffset + 1),
            };
        }

        return null;
    }
}

export class ParseSourceFile {
    constructor(public content: string, public url: string) { }
}


export class InterpolationConfig {
    constructor(public start: string, public end: string) { }
}

export const DEFAULT_INTERPOLATION_CONFIG = new InterpolationConfig('{{', '}}');


export enum SecurityContext {
    NONE = 0,
    HTML = 1,
    STYLE = 2,
    SCRIPT = 3,
    URL = 4,
    RESOURCE_URL = 5,
}



export enum LifecycleHooks {
    OnInit,
    OnDestroy,
    DoCheck,
    OnChanges,
    AfterContentInit,
    AfterContentChecked,
    AfterViewInit,
    AfterViewChecked
}

export function SplitAtColon(input: string, defaultValues: string[]): string[] {
    return _SplitAt(input, ':', defaultValues);
}

export function SplitAtPeriod(input: string, defaultValues: string[]): string[] {
    return _SplitAt(input, '.', defaultValues);
}

function _SplitAt(input: string, character: string, defaultValues: string[]): string[] {
    const characterIndex = input.indexOf(character);
    if (characterIndex == -1) return defaultValues;
    return [input.slice(0, characterIndex).trim(), input.slice(characterIndex + 1).trim()];
}


export function Stringify(token: any): string {
    if (typeof token === 'string') {
        return token;
    }

    if (token instanceof Array) {
        return '[' + token.map(Stringify).join(', ') + ']';
    }

    if (token == null) {
        return '' + token;
    }

    if (token.overriddenName) {
        return `${token.overriddenName}`;
    }

    if (token.name) {
        return `${token.name}`;
    }

    const res = token.toString();

    if (res == null) {
        return '' + res;
    }

    const newLineIndex = res.indexOf('\n');
    return newLineIndex === -1 ? res : res.substring(0, newLineIndex);
}
// Escape characters that have a special meaning in Regular Expressions
export function EscapeRegExp(s: string): string {
    return s.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
}
