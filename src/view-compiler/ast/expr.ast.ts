


import { ParseSpan, ParserError, ParseSourceSpan, SecurityContext } from '../parser/parse.interfaces';



export const enum BindingType {
    Property,
    Attribute,
    Class,
    Style,
    Animation
}



/**
 * Base class for ast nodes
 */
export class ExprNode {
    constructor(public span: ParseSpan) { }
    visit(visitor: AstVisitor, context: any = null): any { return null; }
    toString(): string { return 'ExprNode'; }
}


export class EmptyExpr extends ExprNode {
    visit(visitor: AstVisitor, context: any = null) {
        // do nothing
    }
}
export class ImplicitReceiver extends ExprNode {
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitImplicitReceiver(this, context);
    }
}

export class Quote extends ExprNode {
    constructor(
        span: ParseSpan, public prefix: string, public uninterpretedExpression: string,
        public location: any) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any { return visitor.visitQuote(this, context); }
    toString(): string { return 'Quote'; }
}

/**
 * Multiple expressions separated by a semicolon.
 */
export class Chain extends ExprNode {
    constructor(span: ParseSpan, public expressions: any[]) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any { return visitor.visitChain(this, context); }
}

export class Conditional extends ExprNode {
    constructor(span: ParseSpan, public condition: ExprNode, public trueExp: ExprNode, public falseExp: ExprNode) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitConditional(this, context);
    }
}

export class PropertyRead extends ExprNode {
    constructor(span: ParseSpan, public receiver: ExprNode, public name: string) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitPropertyRead(this, context);
    }
}

export class PropertyWrite extends ExprNode {
    constructor(span: ParseSpan, public receiver: ExprNode, public name: string, public value: ExprNode) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitPropertyWrite(this, context);
    }
}

export class SafePropertyRead extends ExprNode {
    constructor(span: ParseSpan, public receiver: ExprNode, public name: string) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitSafePropertyRead(this, context);
    }
}

export class KeyedRead extends ExprNode {
    constructor(span: ParseSpan, public obj: ExprNode, public key: ExprNode) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitKeyedRead(this, context);
    }
}

export class KeyedWrite extends ExprNode {
    constructor(span: ParseSpan, public obj: ExprNode, public key: ExprNode, public value: ExprNode) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitKeyedWrite(this, context);
    }
}

export class BindingPipe extends ExprNode {
    constructor(span: ParseSpan, public exp: ExprNode, public name: string, public args: any[]) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any { return visitor.visitPipe(this, context); }
}

export class LiteralPrimitive extends ExprNode {
    constructor(span: ParseSpan, public value: any) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitLiteralPrimitive(this, context);
    }
}

export class LiteralArray extends ExprNode {
    constructor(span: ParseSpan, public expressions: any[]) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitLiteralArray(this, context);
    }
}

export type LiteralMapKey = {
    key: string; quoted: boolean;
};

export class LiteralMap extends ExprNode {
    constructor(span: ParseSpan, public keys: LiteralMapKey[], public values: any[]) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitLiteralMap(this, context);
    }
}

export class Interpolation extends ExprNode {
    constructor(span: ParseSpan, public strings: any[], public expressions: any[]) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitInterpolation(this, context);
    }
}

export class Binary extends ExprNode {
    constructor(span: ParseSpan, public operation: string, public left: ExprNode, public right: ExprNode) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitBinary(this, context);
    }
}

export class PrefixNot extends ExprNode {
    constructor(span: ParseSpan, public expression: ExprNode) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitPrefixNot(this, context);
    }
}

export class NonNullAssert extends ExprNode {
    constructor(span: ParseSpan, public expression: ExprNode) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitNonNullAssert(this, context);
    }
}

export class MethodCall extends ExprNode {
    constructor(span: ParseSpan, public receiver: ExprNode, public name: string, public args: any[]) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitMethodCall(this, context);
    }
}

export class SafeMethodCall extends ExprNode {
    constructor(span: ParseSpan, public receiver: ExprNode, public name: string, public args: any[]) {
        super(span);
    }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitSafeMethodCall(this, context);
    }
}

export class FunctionCall extends ExprNode {
    constructor(span: ParseSpan, public target: ExprNode | null, public args: any[]) { super(span); }
    visit(visitor: AstVisitor, context: any = null): any {
        return visitor.visitFunctionCall(this, context);
    }
}

export class ASTWithSource extends ExprNode {
    constructor(
        public ast: ExprNode,
        public source: string | null,
        public location: string,
        public errors: ParserError[]) {

        super(new ParseSpan(0, source == null ? 0 : source.length));
    }

    visit(visitor: AstVisitor, context: any = null): any {
        return this.ast.visit(visitor, context);
    }

    toString(): string {
        return `${this.source} in ${this.location}`;
    }
}

export class TemplateBinding {
    constructor(
        public span: ParseSpan, public key: string, public keyIsVar: boolean, public name: string,
        public expression: ASTWithSource | null) { }
}




/**
 * The visitor interface
 */
export interface AstVisitor {
    visitBinary(ast: Binary, context: any): any;
    visitChain(ast: Chain, context: any): any;
    visitConditional(ast: Conditional, context: any): any;
    visitFunctionCall(ast: FunctionCall, context: any): any;
    visitImplicitReceiver(ast: ImplicitReceiver, context: any): any;
    visitInterpolation(ast: Interpolation, context: any): any;
    visitKeyedRead(ast: KeyedRead, context: any): any;
    visitKeyedWrite(ast: KeyedWrite, context: any): any;
    visitLiteralArray(ast: LiteralArray, context: any): any;
    visitLiteralMap(ast: LiteralMap, context: any): any;
    visitLiteralPrimitive(ast: LiteralPrimitive, context: any): any;
    visitMethodCall(ast: MethodCall, context: any): any;
    visitPipe(ast: BindingPipe, context: any): any;
    visitPrefixNot(ast: PrefixNot, context: any): any;
    visitNonNullAssert(ast: NonNullAssert, context: any): any;
    visitPropertyRead(ast: PropertyRead, context: any): any;
    visitPropertyWrite(ast: PropertyWrite, context: any): any;
    visitQuote(ast: Quote, context: any): any;
    visitSafeMethodCall(ast: SafeMethodCall, context: any): any;
    visitSafePropertyRead(ast: SafePropertyRead, context: any): any;
    visit?(ast: ExprNode, context?: any): any;
}



export class RecursiveAstVisitor implements AstVisitor {
    visitBinary(ast: Binary, context: any): any {
        ast.left.visit(this);
        ast.right.visit(this);
        return null;
    }
    visitChain(ast: Chain, context: any): any {
        return this.visitAll(ast.expressions, context);
    }
    visitConditional(ast: Conditional, context: any): any {
        ast.condition.visit(this);
        ast.trueExp.visit(this);
        ast.falseExp.visit(this);
        return null;
    }
    visitPipe(ast: BindingPipe, context: any): any {
        ast.exp.visit(this);
        this.visitAll(ast.args, context);
        return null;
    }
    visitFunctionCall(ast: FunctionCall, context: any): any {
        ast.target!.visit(this);
        this.visitAll(ast.args, context);
        return null;
    }
    visitImplicitReceiver(ast: ImplicitReceiver, context: any): any { return null; }
    visitInterpolation(ast: Interpolation, context: any): any {
        return this.visitAll(ast.expressions, context);
    }
    visitKeyedRead(ast: KeyedRead, context: any): any {
        ast.obj.visit(this);
        ast.key.visit(this);
        return null;
    }
    visitKeyedWrite(ast: KeyedWrite, context: any): any {
        ast.obj.visit(this);
        ast.key.visit(this);
        ast.value.visit(this);
        return null;
    }
    visitLiteralArray(ast: LiteralArray, context: any): any {
        return this.visitAll(ast.expressions, context);
    }
    visitLiteralMap(ast: LiteralMap, context: any): any { return this.visitAll(ast.values, context); }
    visitLiteralPrimitive(ast: LiteralPrimitive, context: any): any { return null; }
    visitMethodCall(ast: MethodCall, context: any): any {
        ast.receiver.visit(this);
        return this.visitAll(ast.args, context);
    }
    visitPrefixNot(ast: PrefixNot, context: any): any {
        ast.expression.visit(this);
        return null;
    }
    visitNonNullAssert(ast: NonNullAssert, context: any): any {
        ast.expression.visit(this);
        return null;
    }
    visitPropertyRead(ast: PropertyRead, context: any): any {
        ast.receiver.visit(this);
        return null;
    }
    visitPropertyWrite(ast: PropertyWrite, context: any): any {
        ast.receiver.visit(this);
        ast.value.visit(this);
        return null;
    }
    visitSafePropertyRead(ast: SafePropertyRead, context: any): any {
        ast.receiver.visit(this);
        return null;
    }
    visitSafeMethodCall(ast: SafeMethodCall, context: any): any {
        ast.receiver.visit(this);
        return this.visitAll(ast.args, context);
    }
    visitAll(asts: ExprNode[], context: any): any {
        asts.forEach(ast => ast.visit(this, context));
        return null;
    }
    visitQuote(ast: Quote, context: any): any { return null; }
}


// Bindings
export class ParsedProperty {
    public readonly isLiteral: boolean;
    public readonly isAnimation: boolean;

    constructor(
        public name: string,
        public expression: ASTWithSource,
        public type: ParsedPropertyType,
        public sourceSpan: ParseSourceSpan) {

        this.isLiteral = this.type === ParsedPropertyType.LITERAL_ATTR;
        this.isAnimation = this.type === ParsedPropertyType.ANIMATION;
    }
}

export enum ParsedPropertyType {
    DEFAULT,
    LITERAL_ATTR,
    ANIMATION
}

export const enum ParsedEventType {
    // DOM or Directive event
    Regular,
    // Animation specific event
    Animation,
}

export class ParsedEvent {
    // Regular events have a target
    // Animation events have a phase
    constructor(
        public name: string, public targetOrPhase: string, public type: ParsedEventType,
        public handler: ExprNode, public sourceSpan: ParseSourceSpan) { }
}

export class ParsedVariable {
    constructor(public name: string, public value: string, public sourceSpan: ParseSourceSpan) { }
}


export class BoundElementProperty {
    constructor(
        public name: string, public type: BindingType,
        public value: ExprNode, public unit: string | null, public sourceSpan: ParseSourceSpan) { }
}