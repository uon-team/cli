import { BindingType } from "./expr.ast";
import { CssSelector } from "./css-selector";


export interface Node {
    visit<T>(visitor: Visitor<T>): T;
}

export class Text implements Node {
    constructor(public value: string) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitText(this); }
}

export class BoundText implements Node {
    constructor(public value: string) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitBoundText(this); }
}

export class TextAttribute implements Node {
    constructor(public name: string, public value: string) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitTextAttribute(this); }
}

export class BoundAttribute implements Node {
    constructor(
        public name: string, 
        public type: BindingType,
        public value: string) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitBoundAttribute(this); }
}

export class TemplateAttribute implements Node {
    constructor(
        public name: string,
        public value: string) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitTemplateAttribute(this); }
}


export class BoundEvent implements Node {
    constructor(
        public name: string,
        public value: string,
        public target: string | null,
        public phase: string | null) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitBoundEvent(this); }
}

export class Element implements Node {

    constructor(
        public name: string,
        public attributes: TextAttribute[],
        public inputs: BoundAttribute[],
        public outputs: BoundEvent[],
        public children: Node[],
        public references: Reference[],
        public cssSelector: CssSelector) {

    }
    visit<T>(visitor: Visitor<T>): T { return visitor.visitElement(this); }
}


export class Template implements Node {
    constructor(
        public tagName: string,
        public attributes: TextAttribute[],
        public inputs: BoundAttribute[],
        public outputs: BoundEvent[],
        public templateAttrs: TemplateAttribute[], //(BoundAttribute | TextAttribute)[],
        public children: Node[],
        public references: Reference[],
        public variables: Variable[],
        public cssSelector: CssSelector) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitTemplate(this); }
}

export class Content implements Node {
    constructor(
        public selector: string,
        public attributes: TextAttribute[]) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitContent(this); }
}

export class Variable implements Node {
    constructor(
        public name: string,
        public value: string) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitVariable(this); }
}

export class Reference implements Node {
    constructor(
        public name: string,
        public value: string) { }

    visit<T>(visitor: Visitor<T>): T { return visitor.visitReference(this); }
}

export interface Visitor<T = any> {

    visitElement(element: Element): T;
    visitTemplate(template: Template): T;
    visitContent(content: Content): T;
    visitVariable(variable: Variable): T;
    visitReference(reference: Reference): T;
    visitTextAttribute(attribute: TextAttribute): T;
    visitBoundAttribute(attribute: BoundAttribute): T;
    visitTemplateAttribute(attribute: TemplateAttribute): T;
    visitBoundEvent(attribute: BoundEvent): T;
    visitText(text: Text): T;
    visitBoundText(text: BoundText): T;
}


export function VisitAll<T>(visitor: Visitor<T>, nodes: Node[]): T[] {
    const result: T[] = [];

    for (const node of nodes) {
        const new_node = node.visit(visitor);
        if (new_node) {
            result.push(new_node);
        }
    }

    return result;
}
