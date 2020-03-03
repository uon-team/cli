import { DEFAULT_INTERPOLATION_CONFIG, ParseError, ParseSourceSpan } from "./parse.interfaces";
import { Tokenize, Token, TokenType } from "./html.tokenizer";
import { GetHtmlTagDefinition, TagDefinition, GetNsPrefix, MergeNsAndName } from "./html.tags";
import { Element, Node, Text, BoundText, TextAttribute, BoundEvent, BoundAttribute, Reference, TemplateAttribute, Template } from "../ast/template.ast";
import { BindingType } from "../ast/expr.ast";
import { CssSelector } from "../ast/css-selector";

export const TEMPLATE_ELEMENT_TAG = 'uv-template';
export const CONTENT_ELEMENT_TAG = 'uv-content';

export const TEXT_BIND_REGEX = /{{(.*?)}}/g;
export const INTERPOLATION_DELIMITER = '�';


export class TemplateParseError extends ParseError {

    static Create(elementName: string | null,
        span: ParseSourceSpan,
        msg: string): TemplateParseError {

        return new TemplateParseError(elementName, span, msg);
    }

    constructor(public elementName: string | null, span: ParseSourceSpan, msg: string) {
        super(span, msg);
    }
}


export class TemplateParseResult {

    constructor(public rootNodes: Node[],
        public errors: ParseError[]) { }

}

export class TemplateParser {


    constructor() {


    }

    parse(source: string,
        url: string,
        parseExpansionForms: boolean = false) {

        const tokensAndErrors = Tokenize(source,
            url,
            GetHtmlTagDefinition,
            parseExpansionForms,
            DEFAULT_INTERPOLATION_CONFIG);

        const tree = new _TreeBuilder(tokensAndErrors.tokens, GetHtmlTagDefinition).build();

        return new TemplateParseResult(
            tree.rootNodes,
            (<ParseError[]>tokensAndErrors.errors).concat(tree.errors));
    }

    parseHostAttrs(attrs: {[k: string]: string}) {

        const tree = new _TreeBuilder([], null);

        let result: any[] = [];
        for(let k in attrs) {
            result.push(tree._createAttr(k, attrs[k]));
        }
        
        return result;

    }


}



class _TreeBuilder {

    private _index: number = -1;
    private _peek: Token;

    private _rootNodes: Node[] = [];
    private _errors: TemplateParseError[] = [];

    private _elementStack: Element[] = [];

    constructor(
        private tokens: Token[],
        private getTagDefinition: (tagName: string) => TagDefinition) {

        this._advance();
    }

    build(): TemplateParseResult {

        while (this._peek.type !== TokenType.EOF) {
            if (this._peek.type === TokenType.TAG_OPEN_START) {
                this._consumeStartTag(this._advance());
            }
            else if (this._peek.type === TokenType.TAG_CLOSE) {
                this._consumeEndTag(this._advance());
            }
            else if (this._peek.type === TokenType.CDATA_START) {
                this._closeVoidElement();
                this._consumeCdata(this._advance());
            }
            else if (this._peek.type === TokenType.COMMENT_START) {
                this._closeVoidElement();
                this._consumeComment(this._advance());
            }
            else if (
                this._peek.type === TokenType.TEXT || this._peek.type === TokenType.RAW_TEXT ||
                this._peek.type === TokenType.ESCAPABLE_RAW_TEXT) {

                this._closeVoidElement();
                this._consumeText(this._advance());
            }
            else if (this._peek.type === TokenType.EXPANSION_FORM_START) {
                this._consumeExpansion(this._advance());
            }
            else {
                // Skip all other tokens...
                this._advance();
            }
        }

        return new TemplateParseResult(this._rootNodes, this._errors);
    }

    private _advance(): Token {
        const prev = this._peek;
        if (this._index < this.tokens.length - 1) {
            // Note: there is always an EOF token at the end
            this._index++;
        }
        this._peek = this.tokens[this._index];
        return prev;
    }

    private _advanceIf(type: TokenType): Token | null {
        if (this._peek.type === type) {
            return this._advance();
        }
        return null;
    }

    private _consumeCdata(startToken: Token) {
        this._consumeText(this._advance());
        this._advanceIf(TokenType.CDATA_END);
    }

    private _consumeComment(token: Token) {
        const text = this._advanceIf(TokenType.RAW_TEXT);
        this._advanceIf(TokenType.COMMENT_END);
        const value = text != null ? text.parts[0].trim() : null;
        // this._addToParent(new html.Comment(value, token.sourceSpan));
    }

    private _consumeExpansion(token: Token) {
        const switchValue = this._advance();

        const type = this._advance();
        const cases: any[] = [];

        // read =
        while (this._peek.type === TokenType.EXPANSION_CASE_VALUE) {
            const expCase = this._parseExpansionCase();
            if (!expCase) return;  // error
            cases.push(expCase);
        }

        // read the final }
        if (this._peek.type !== TokenType.EXPANSION_FORM_END) {
            this._errors.push(
                TemplateParseError.Create(null, this._peek.sourceSpan, `Invalid ICU message. Missing '}'.`));
            return;
        }
        const sourceSpan = new ParseSourceSpan(token.sourceSpan.start, this._peek.sourceSpan.end);
        /*this._addToParent(new BoundText(
            switchValue.parts[0], type.parts[0], cases, sourceSpan, switchValue.sourceSpan));*/
        this._addToParent(new BoundText(switchValue.parts[0]));
        this._advance();
    }

    private _parseExpansionCase(): any | null {
        const value = this._advance();

        // read {
        if (this._peek.type !== TokenType.EXPANSION_CASE_EXP_START) {
            this._errors.push(
                TemplateParseError.Create(null, this._peek.sourceSpan, `Invalid ICU message. Missing '{'.`));
            return null;
        }

        // read until }
        const start = this._advance();

        const exp = this._collectExpansionExpTokens(start);
        if (!exp) return null;

        const end = this._advance();
        exp.push(new Token(TokenType.EOF, [], end.sourceSpan));

        // parse everything in between { and }
        const parsedExp = new _TreeBuilder(exp, this.getTagDefinition).build();
        if (parsedExp.errors.length > 0) {
            this._errors = this._errors.concat(<TemplateParseError[]>parsedExp.errors);
            return null;
        }

        const sourceSpan = new ParseSourceSpan(value.sourceSpan.start, end.sourceSpan.end);
        const expSourceSpan = new ParseSourceSpan(start.sourceSpan.start, end.sourceSpan.end);
        /* return new html.ExpansionCase(
             value.parts[0], parsedExp.rootNodes, sourceSpan, value.sourceSpan, expSourceSpan);
     
     */
    }

    private _collectExpansionExpTokens(start: Token): Token[] | null {
        const exp: Token[] = [];
        const expansionFormStack = [TokenType.EXPANSION_CASE_EXP_START];

        while (true) {
            if (this._peek.type === TokenType.EXPANSION_FORM_START ||
                this._peek.type === TokenType.EXPANSION_CASE_EXP_START) {
                expansionFormStack.push(this._peek.type);
            }

            if (this._peek.type === TokenType.EXPANSION_CASE_EXP_END) {
                if (LastOnStack(expansionFormStack, TokenType.EXPANSION_CASE_EXP_START)) {
                    expansionFormStack.pop();
                    if (expansionFormStack.length == 0) return exp;

                } else {
                    this._errors.push(
                        TemplateParseError.Create(null, start.sourceSpan, `Invalid ICU message. Missing '}'.`));
                    return null;
                }
            }

            if (this._peek.type === TokenType.EXPANSION_FORM_END) {
                if (LastOnStack(expansionFormStack, TokenType.EXPANSION_FORM_START)) {
                    expansionFormStack.pop();
                } else {
                    this._errors.push(
                        TemplateParseError.Create(null, start.sourceSpan, `Invalid ICU message. Missing '}'.`));
                    return null;
                }
            }

            if (this._peek.type === TokenType.EOF) {
                this._errors.push(
                    TemplateParseError.Create(null, start.sourceSpan, `Invalid ICU message. Missing '}'.`));
                return null;
            }

            exp.push(this._advance());
        }
    }

    private _consumeText(token: Token) {
        let text = token.parts[0].trim();
        if (text.length > 0 && text[0] == '\n') {
            const parent = this._getParentElement();
            if (parent != null && parent.children.length == 0 &&
                this.getTagDefinition(parent.name).ignoreFirstLf) {
                text = text.substring(1);
            }
        }

        if (text.length > 0) {
            let match = text.match(TEXT_BIND_REGEX);
            this._addToParent(match ? new BoundText(text) : new Text(text));
        }
    }

    private _closeVoidElement(): void {
        const el = this._getParentElement();
        if (el && this.getTagDefinition(el.name).isVoid) {
            this._elementStack.pop();
        }
    }

    private _consumeStartTag(startTagToken: Token) {

        const prefix = startTagToken.parts[0];
        const name = startTagToken.parts[1];
        const attrs: any[] = [];
        while (this._peek.type === TokenType.ATTR_NAME) {
            attrs.push(this._consumeAttr(this._advance()));
        }

        const fullName = this._getElementFullName(prefix, name, this._getParentElement());
        let selfClosing = false;
        // Note: There could have been a tokenizer error
        // so that we don't get a token for the end tag...
        if (this._peek.type === TokenType.TAG_OPEN_END_VOID) {
            this._advance();
            selfClosing = true;
            const tagDef = this.getTagDefinition(fullName);
            if (!(tagDef.canSelfClose || GetNsPrefix(fullName) !== null || tagDef.isVoid)) {
                this._errors.push(TemplateParseError.Create(
                    fullName, startTagToken.sourceSpan,
                    `Only void and foreign elements can be self closed "${startTagToken.parts[1]}"`));
            }
        }
        else if (this._peek.type === TokenType.TAG_OPEN_END) {
            this._advance();
            selfClosing = false;
        }

        const text_attrs = attrs.filter(a => a instanceof TextAttribute);
        const bound_attr = attrs.filter(a => a instanceof BoundAttribute);
        const bound_events = attrs.filter(a => a instanceof BoundEvent);
        const references = attrs.filter(a => a instanceof Reference);
        const template_attrs = attrs.filter(a => a instanceof TemplateAttribute);

        /*if (fullName === TEMPLATE_ELEMENT_TAG) {
            let element_node = new Template(fullName,
                null,
                null,
                null,
                null,
                [],
                references,
                [],
                null
            );
            this._pushElement(element_node);
            return;
        }*/

        const flat_attrs: { name: string, value: string }[] = []
            .concat(text_attrs)
            .concat(bound_attr);

        let element_node: Element | Template = new Element(fullName,
            text_attrs,
            bound_attr,
            bound_events,
            [],
            references,
            CreateElementCssSelector(
                fullName,
                flat_attrs.map<[string, string]>(a => [a.name, a.value])
            )
        );

        if (template_attrs.length > 0) {

            element_node = new Template((element_node as Element).name,
                text_attrs,
                bound_attr,
                bound_events,
                template_attrs,
                [element_node],
                references,
                [/* add variables */],
                CreateElementCssSelector(name,
                    flat_attrs.concat(template_attrs).map<[string, string]>(a => [a.name, a.value])
                )
            );
        }

        this._pushElement(element_node);

        if (selfClosing) {
            this._popElement(fullName);
        }
    }

    private _pushElement(el: Element | Template) {
        const parentEl = this._getParentElement();

        const real_el: Element = el instanceof Template
            ? el.children[0] as Element
            : el;

        if (parentEl &&
            this.getTagDefinition(parentEl.name).isClosedByChild(real_el.name)) {

            this._elementStack.pop();
        }


        /* const tagDef = this.getTagDefinition(el.name);
         const { parent, container } = this._getParentElementSkippingContainers();
 
         if (parent && tagDef.requireExtraParent(parent.name)) {
             const newParent = new Element(
                 tagDef.parentToAdd, [], [], [], [], [], null);
             this._insertBeforeContainer(parent, container, newParent);
         }*/

        this._addToParent(el);
        this._elementStack.push(real_el);
    }

    private _consumeEndTag(endTagToken: Token) {
        const fullName = this._getElementFullName(
            endTagToken.parts[0],
            endTagToken.parts[1],
            this._getParentElement()
        );

        if (this.getTagDefinition(fullName).isVoid) {
            this._errors.push(TemplateParseError.Create(
                fullName, endTagToken.sourceSpan,
                `Void elements do not have end tags "${endTagToken.parts[1]}"`));
        } else if (!this._popElement(fullName)) {
            const errMsg =
                `Unexpected closing tag "${fullName}". It may happen when the tag has already been closed by another tag. For more info see https://www.w3.org/TR/html5/syntax.html#closing-elements-that-have-implied-end-tags`;
            this._errors.push(TemplateParseError.Create(fullName, endTagToken.sourceSpan, errMsg));
        }
    }

    private _popElement(fullName: string): boolean {
        for (let stackIndex = this._elementStack.length - 1; stackIndex >= 0; stackIndex--) {
            const el = this._elementStack[stackIndex];
            if (el.name == fullName) {
                this._elementStack.splice(stackIndex, this._elementStack.length - stackIndex);
                return true;
            }

            if (!this.getTagDefinition(el.name).closedByParent) {
                return false;
            }
        }
        return false;
    }

    private _consumeAttr(attrName: Token): any {
        const fullName = MergeNsAndName(attrName.parts[0], attrName.parts[1]);
        let end = attrName.sourceSpan.end;
        let value = '';
        let valueSpan: ParseSourceSpan = undefined!;
        if (this._peek.type === TokenType.ATTR_VALUE) {
            const valueToken = this._advance();
            value = valueToken.parts[0];
            end = valueToken.sourceSpan.end;
            valueSpan = valueToken.sourceSpan;
        }

        return this._createAttr(fullName, value);
    }


    _createAttr(k: string, value: string) {

        if (k.startsWith('[')) {
            const k2 = k.substring(1, k.length - 1);
            return CreateBoundAttribute(k2, value);
        }
        else if (k.startsWith('(')) {
            const k2 = k.substring(1, k.length - 1);
            return new BoundEvent(k2, value, null, null);
        }
        else if (k.startsWith('*')) {
            const k2 = k.substr(1, k.length - 1);
            return new TemplateAttribute(k2, value);
        }
        else if (k.startsWith('#')) {
            const k2 = k.substr(1, k.length - 1);
            return new Reference(k2, value);

        }
        else if (k.startsWith('@')) {

            const k2 = k.substr(1, k.length - 1);
            return new BoundAttribute(k2, BindingType.Animation, value);
        }
        else {
            return new TextAttribute(k, value);
        }


    }


    private _getParentElement(): Element | null {
        return this._elementStack.length > 0 ? this._elementStack[this._elementStack.length - 1] : null;
    }

    /**
     * Returns the parent in the DOM and the container.
     *
     * `<ng-container>` elements are skipped as they are not rendered as DOM element.
     */
    private _getParentElementSkippingContainers(): { parent: Element | null, container: Element | null } {
        let container: Element | null = null;

        /*for (let i = this._elementStack.length - 1; i >= 0; i--) {
            if (!IsContainer(this._elementStack[i].name)) {
                return { parent: this._elementStack[i], container };
            }
            container = this._elementStack[i];
        }

        return { parent: null, container };*/

        return { parent: this._elementStack[this._elementStack.length - 1], container };
    }

    private _addToParent(node: Node) {
        const parent = this._getParentElement();
        if (parent != null) {
            parent.children.push(node);
        } else {
            this._rootNodes.push(node);
        }
    }

    /**
     * Insert a node between the parent and the container.
     * When no container is given, the node is appended as a child of the parent.
     * Also updates the element stack accordingly.
     *
     * @internal
     */
    private _insertBeforeContainer(
        parent: Element, container: Element | null, node: Element) {
        if (!container) {
            this._addToParent(node);
            this._elementStack.push(node);
        } else {
            if (parent) {
                // replace the container with the new node in the children
                const index = parent.children.indexOf(container);
                parent.children[index] = node;
            } else {
                this._rootNodes.push(node);
            }
            node.children.push(container);
            this._elementStack.splice(this._elementStack.indexOf(container), 0, node);
        }
    }

    private _getElementFullName(prefix: string, localName: string, parentElement: Element | null):
        string {
        if (prefix == null) {
            prefix = this.getTagDefinition(localName).implicitNamespacePrefix!;
            if (prefix == null && parentElement != null) {
                prefix = GetNsPrefix(parentElement.name);
            }
        }

        return MergeNsAndName(prefix, localName);
    }

}

function LastOnStack(stack: any[], element: any): boolean {
    return stack.length > 0 && stack[stack.length - 1] === element;
}



function CreateBoundAttribute(key: string, value: string) {



    if (key.startsWith('class.')) {
        const k2 = key.replace('class.', '');
        return new BoundAttribute(k2, BindingType.Class, value);
    }
    if (key.startsWith('style.')) {
        const k2 = key.replace('style.', '');
        return new BoundAttribute(k2, BindingType.Style, value);
    }
    if (key.startsWith('attr.')) {
        const k2 = key.replace('attr.', '');
        return new BoundAttribute(k2, BindingType.Attribute, value);
    }

    return new BoundAttribute(key, BindingType.Property, value);
}

export function CreateElementCssSelector(
    elementName: string,
    attributes: [string, string][]): CssSelector {

    const cssSelector = new CssSelector();
    const elNameNoNs = elementName;

    cssSelector.setElement(elNameNoNs);

    for (let i = 0; i < attributes.length; i++) {
        const attrName = attributes[i][0];
        const attrNameNoNs = attrName;
        const attrValue = attributes[i][1];

        cssSelector.addAttribute(attrNameNoNs, attrValue);
        if (attrName.toLowerCase() === 'class') {
            const classes = SplitClasses(attrValue);
            classes.forEach(className => cssSelector.addClassName(className));
        }
    }
    return cssSelector;
}

export function SplitClasses(classAttrValue: string): string[] {
    return classAttrValue.trim().split(/\s+/g);
}