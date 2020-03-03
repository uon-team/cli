import {
    Visitor, Element, Template,
    Content, Variable, Reference, TextAttribute,
    BoundAttribute, TemplateAttribute, BoundEvent, BoundText, Text, VisitAll
} from "./ast/template.ast";
import { CssSelector, SelectorMatcher } from "./ast/css-selector";

import * as ts from 'typescript';
import { TEMPLATE_ELEMENT_TAG, CONTENT_ELEMENT_TAG, TEXT_BIND_REGEX, INTERPOLATION_DELIMITER } from "./parser/template.parser";


const VIEW_DATA_ID = ts.createIdentifier('_vd');

export const VIEW_LIB_ID = ts.createIdentifier('view_1');

/*
ʘ
GLOBAL['ʄE'] = ɵɵelement;
GLOBAL['ʄT'] = ɵɵtext;
GLOBAL['ʄa'] = ɵɵattr;
GLOBAL['ʄo'] = ɵɵevent;
GLOBAL['ʄc'] = ɵɵcomment;
GLOBAL['ʄP'] = ɵɵcontainer;
GLOBAL['ʄC'] = ɵɵcontent;
GLOBAL['ʄV'] = ɵɵviewcontext;
GLOBAL['ʄT'] = ɵɵtemplatecontext;
GLOBAL['ʄI'] = ɵɵelementcontext;


GLOBAL['ʘE'] = ɵɵelement;
GLOBAL['ʘT'] = ɵɵtext;
GLOBAL['ʘa'] = ɵɵattr;
GLOBAL['ʘe'] = ɵɵevent;
GLOBAL['ʘc'] = ɵɵcomment;
GLOBAL['ʘC'] = ɵɵcontainer;
GLOBAL['ʘP'] = ɵɵcontent;
GLOBAL['ʘV'] = ɵɵviewcontext;
GLOBAL['ʘL'] = ɵɵtemplatecontext;
GLOBAL['ʘD'] = ɵɵelementcontext;

GLOBAL['ʘn'] = ɵɵbinding_text;
GLOBAL['ʘi'] = ɵɵbinding_input;
GLOBAL['ʘk'] = ɵɵbinding_class;
GLOBAL['ʘs'] = ɵɵbinding_style;
GLOBAL['ʘA'] = ɵɵbinding_attr;
GLOBAL['ʘp'] = ɵɵbinding_prop;

GLOBAL['ʘI'] = ɵɵinit;
GLOBAL['ʘu'] = ɵɵswap;

*/

export const VIEW_CONTEXT_FUNC_NAME = ts.createIdentifier('ʘV');
export const ELEMENT_CONTEXT_FUNC_NAME = ts.createIdentifier('ʘD');
export const TEMPLATE_CONTEXT_FUNC_NAME = ts.createIdentifier('ʘL');
export const ELEMENT_FUNC_NAME = ts.createIdentifier('ʘE');
export const TEXT_FUNC_NAME = ts.createIdentifier('ʘT');
export const ADDCLASS_FUNC_NAME = ts.createIdentifier('ʘl');
export const ATTR_FUNC_NAME = ts.createIdentifier('ʘa');
export const EVENT_FUNC_NAME = ts.createIdentifier('ʘe');
export const COMMENT_FUNC_NAME = ts.createIdentifier('ʘc');
export const CONTAINER_FUNC_NAME = ts.createIdentifier('ʘC');
export const CONTENT_FUNC_NAME = ts.createIdentifier('ʘP');

export const REF_FUNC_NAME = ts.createIdentifier('ʘR');

export const BTEXT_FUNC_NAME = ts.createIdentifier('ʘn');
export const BINPUT_FUNC_NAME = ts.createIdentifier('ʘi');
export const SINPUT_FUNC_NAME = ts.createIdentifier('ʘy');
export const BCLASS_FUNC_NAME = ts.createIdentifier('ʘk');
export const BSTYLE_FUNC_NAME = ts.createIdentifier('ʘs');
export const BATTR_FUNC_NAME = ts.createIdentifier('ʘA');
export const BPROP_FUNC_NAME = ts.createIdentifier('ʘp');

export const FACTORY_FUNC_NAME = ts.createIdentifier('ʘF');
export const INIT_FUNC_NAME = ts.createIdentifier('ʘI');
export const SWAP_FUNC_NAME = ts.createIdentifier('ʘu');


export interface DirectiveData {
    name: string;
    selectors: CssSelector[];
    fileName: string;
    package: string;
    isView: boolean;
    inputs: string[];
    host: { [k: string]: string }
}


interface TemplateFunctionContext {

    createStatements: ts.Statement[];
    updateStatements: ts.Statement[];
    currentIndex: number;
    currentNodeIndex: number;
    currentViewIndex: number;
    currentViewContext: number;

}


export class TemplateVisitor implements Visitor<number> {

    private _matcher: SelectorMatcher = new SelectorMatcher();

    imports: any[] = [];

    context: TemplateFunctionContext = {
        createStatements: [],
        updateStatements: [],
        currentIndex: -1,
        currentNodeIndex: 0,

        currentViewIndex: -1,
        currentViewContext: 0
    };

    templateFunctions: any[] = [];

    private _tmplId = 0;

    private _nodeIsView: { [k: number]: boolean } = {};



    constructor(private _directives: DirectiveData[],
        private viewName: string,
        private fileName: string,
        private tmplIndex: number = -1) {

        _directives.forEach((d) => {
            this._matcher.addSelectables(d.selectors, d);
        });

        this.context.createStatements.push(
            ... (tmplIndex === -1
                ? CreateViewDataInit(viewName)
                : CreateTemplateDataInit(viewName, tmplIndex, []))
        );
    }

    static CreateHostAttrFunction(viewName: string, fileName: string, attrs: any[]) {

        let visitor = new TemplateVisitor([], viewName, fileName);
        visitor.context.currentIndex = null;
        visitor.context.createStatements = [];

        VisitAll(visitor, attrs);
        const any_type = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
        const params = [
            ts.createParameter(undefined, undefined, undefined, '_vd', undefined, any_type, undefined),
            ts.createParameter(undefined, undefined, undefined, 'index', undefined, any_type, undefined),
            ts.createParameter(undefined, undefined, undefined, 'context', undefined, any_type, undefined)
        ];


        let func = ts.createFunctionExpression(
            undefined, //[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            `uv_h_${visitor.viewName}`,
            undefined,
            params,
            undefined,
            ts.createBlock(visitor.context.createStatements, true)
        );

        return func;

    }

    getCompiledViewFactoryFunction() {

        const any_type = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);

        const params = [
            this.tmplIndex === -1
                ? ts.createParameter(undefined, undefined, undefined, 'host', undefined, any_type, undefined)
                : ts.createParameter(undefined, undefined, undefined, 'context', undefined, any_type, undefined),
            ts.createParameter(undefined, undefined, undefined, 'parentInjector', undefined, any_type, undefined),
            ts.createParameter(undefined, undefined, undefined, 'renderer', undefined, any_type, undefined),
        ];

        if (this.tmplIndex === -1) {
            params.push(ts.createParameter(undefined, undefined, undefined, 'projNodes', undefined, any_type, undefined))
        }

        let func = ts.createFunctionExpression(
            undefined, //[ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            undefined,
            `uv_factory_${this.viewName}`,
            undefined,
            params,
            undefined,
            ts.createBlock(this.context.createStatements.concat([
                ts.createExpressionStatement(ts.createCall(INIT_FUNC_NAME, undefined, [VIEW_DATA_ID])),

                ...this.templateFunctions.map(tf => tf.func),

                ts.createReturn(ts.createPropertyAccess(ts.createIdentifier('_vd'), 'ref'))
            ]), true)
        );

        return func;
    }

    private isView(index: number) {

        return this._nodeIsView[index] === true;
    }

    visitElement(element: Element) {

        let context = this.context;

        if (element.name === TEMPLATE_ELEMENT_TAG) {

            if (element.references.length !== 1) {
                throw new Error(`free-standing template 'uv-template' must have exactly 1 reference`)
            }

            let tmpl_index = this._tmplId++;
            let visitor = new TemplateVisitor(this._directives, `${this.viewName}_${tmpl_index}`, this.fileName, tmpl_index);
            VisitAll(visitor, element.children);
            this.templateFunctions.push({ name: visitor.viewName, func: visitor.getCompiledViewFactoryFunction() });

            // TODO add var

            context.createStatements.push(
                CreateRefStmt(
                    element.references[0].name,
                    ts.createObjectLiteral([ts.createPropertyAssignment('factory', ts.createIdentifier('uv_factory_' + visitor.viewName))]),
                    ts.createIdentifier('view_1.TemplateRef'),
                    this.fileName
                )
            )


            return;
        }


        if (element.name === CONTENT_ELEMENT_TAG) {

            let select = element.attributes.find(a => a.name === 'select');

            context.createStatements.push(
                CreateContentStmt(select ? select.value : '', context.currentIndex)
            );

            return;
        }




        const directive_set = new Set<DirectiveData>();
        this._matcher.match(element.cssSelector, (s, d) => {
            directive_set.add(d);
        });

        let directives: DirectiveData[] = [];
        directive_set.forEach((d) => { directives.push(d) });

        const view = directives.find(d => d.isView);
        //directives = directives.filter(d => !d.isView);


        let prev_index = context.currentIndex;
        let node_index = context.currentNodeIndex++;
        context.currentIndex = node_index;

        const all_attrs = [].concat(element.attributes, element.inputs);
        const sd_result = this.setupDirectives(context.currentIndex, all_attrs, directives);

        const text_attributes: string[] = [];
        sd_result.remaining
            .filter(a => a instanceof TextAttribute)
            .forEach(a => text_attributes.push(a.name, a.value));

        // create element
        context.createStatements.push(
            CreateElementStmt(element.name, text_attributes, context.currentIndex, this.isView(prev_index) ? null : prev_index)
        );

        if (directive_set.size > 0) {
            context.createStatements.push(
                CreateElementContextStmt(this.context.currentIndex, directives.filter(d => !d.isView), this.fileName)
            );
        }

        this._nodeIsView[node_index] = view != null;

        VisitAll(this, sd_result.remaining.filter(a => !(a instanceof TextAttribute)));
        VisitAll(this, element.outputs); // TODO move to all_attrs to handle directive outputs

        // visit children
        let ids = VisitAll(this, element.children);

        // is a view, so instanciate it
        if (view) {
            context.createStatements.push(
                CreateViewCallStmt(view,
                    this.context.currentIndex,
                    ids,
                    this.fileName
                )
            );
        }

        // push statements from directives
        context.createStatements.push(...sd_result.statements);

        // rollback index to parent
        context.currentIndex = prev_index;

        return node_index;

    }

    visitTemplate(template: Template) {

        let tmpl_index = this._tmplId++;

        let visitor = new TemplateVisitor(this._directives, `${this.viewName}_${tmpl_index}`, this.fileName, tmpl_index);
        VisitAll(visitor, template.children);

        this.templateFunctions.push({ name: visitor.viewName, func: visitor.getCompiledViewFactoryFunction() });


        const directive_set = new Set<DirectiveData>();
        this._matcher.match(template.cssSelector, (s, d) => {
            directive_set.add(d);
        });

        let directives: DirectiveData[] = [];
        directive_set.forEach((d) => { directives.push(d) });

        // templated directives only
        directives = directives.filter((d) => {

            if (d.isView) return false

            for (let i = 0; i < d.inputs.length; ++i) {
                for (let j = 0; j < template.templateAttrs.length; ++j) {
                    if (d.inputs[i] === template.templateAttrs[j].name) {
                        return true;
                    }
                }
            }

            return false;
        });




        let context = this.context;
        let prev_index = context.currentIndex;
        let index = context.currentNodeIndex++;

        context.createStatements.push(
            // CreateCommentStmt(`tmpl ${tmpl_index}`, index, is_root_proj ? null : context.currentIndex),
            CreateContainerStmt('uv_factory_' + visitor.viewName,
                index,
                this.isView(prev_index) ? null : context.currentIndex,
                directives,
                this.fileName
            )
        );

        const sd_result = this.setupDirectives(index, template.templateAttrs, directives);
        context.createStatements.push(...sd_result.statements);

        return index;

    }

    visitContent(content: Content) {
        return -1;
    }

    visitVariable(variable: Variable) {
        return -1;
    }

    visitReference(reference: Reference) {
        return -1;
    }

    visitTextAttribute(attribute: TextAttribute) {

        let context = this.context;


        if (attribute.name === 'class') {

            context.createStatements.push(
                CreateAddClassStmt(attribute.value, context.currentIndex)
            );

        }
        else {
            context.createStatements.push(
                CreateAttrStmt(attribute.name, attribute.value, context.currentIndex)
            );
        }

        return -1;

    }

    visitBoundAttribute(attribute: BoundAttribute) {

        let context = this.context;
        let call_id: ts.Identifier;

        if (attribute.type === BindingType.Class) {
            call_id = BCLASS_FUNC_NAME;
        }
        else if (attribute.type === BindingType.Style) {
            call_id = BSTYLE_FUNC_NAME;
        }
        else if (attribute.type === BindingType.Attribute) {
            call_id = BATTR_FUNC_NAME;
        }
        else if (attribute.type === BindingType.Property) {
            call_id = BPROP_FUNC_NAME;
        }

        if (call_id) {

            context.createStatements.push(
                CreateBindingStatement(call_id, attribute.name,
                    CreateFunctionFromSource(attribute.value, { returnLastStatement: true, contexes: null }),
                    context.currentIndex
                )
            );

        }
        return -1;

    }

    visitTemplateAttribute(attribute: TemplateAttribute) {
        return -1;
    }


    visitBoundEvent(attribute: BoundEvent) {

        let context = this.context;
        context.createStatements.push(
            CreateEventStmt(attribute.name,
                CreateFunctionFromSource(attribute.value, { returnLastStatement: false, contexes: null }),
                context.currentIndex
            )
        );
        return -1;

    }


    visitText(text: Text) {

        let context = this.context;
        let index = context.currentNodeIndex++;
        let prev_index = context.currentIndex;

        context.createStatements.push(
            CreateTextStmt(text.value, index, this.isView(prev_index) ? null : context.currentIndex)
        );


        return index;

    }

    visitBoundText(text: BoundText) {

        const tmpl_str = text.value.replace(TEXT_BIND_REGEX, INTERPOLATION_DELIMITER);
        const expr_strs = text.value.match(TEXT_BIND_REGEX).map(n => n.replace(/{|}/g, '').trim());

        const exprs = expr_strs.map((s) => {
            return CreateFunctionFromSource(s, { returnLastStatement: true, contexes: null });
        })

        let context = this.context;
        let index = context.currentNodeIndex++;
        let prev_index = context.currentIndex;

        context.createStatements.push(
            CreateTextStmt('', index, this.isView(prev_index) ? null : context.currentIndex),
            CreateTextBindingStmt(tmpl_str, exprs, index)
        );


        return index;

    }


    private setupDirectives(index: number, attrs: (TextAttribute | BoundAttribute)[], dirs: DirectiveData[]) {

        let attr_map: any = {};
        attrs.forEach(a => attr_map[a.name] = a);
        let remaining = attrs.slice(0);
        let context = this.context;

        let statements: any[] = [];

        dirs.forEach(d => {

            d.inputs.forEach((i) => {
                const i_attr = attr_map[i];

                //console.log(i_attr);
                const is_tmpl_attr = i_attr instanceof TemplateAttribute;
                const is_bound_attr = i_attr instanceof BoundAttribute;

                if (i_attr !== undefined) {
                    if (is_bound_attr || is_tmpl_attr) {

                        statements.push(
                            CreateInputBindingStatement(i_attr.name,
                                d,
                                CreateFunctionFromSource(i_attr.value, { returnLastStatement: true, contexes: null }),
                                index,
                                this.fileName
                            )
                        );

                    }
                    else {
                        // static data
                        statements.push(
                            CreateSetInputStatement(i_attr.name,
                                d,
                                i_attr.value,
                                index,
                                this.fileName
                            )
                        );

                    }

                    remaining.splice(remaining.indexOf(i_attr), 1);

                    /* if (!is_tmpl_attr) {
                         remaining.push(new TextAttribute(i_attr.name, String(i_attr.value)))
                     }*/

                }
            })
        });

        return { remaining, statements };

    }


}


function CreateElementStmt(tag: string, attrs: string[], index: number, parent: number) {

    let call = ts.createCall(ELEMENT_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(tag),
        ts.createArrayLiteral(attrs.map(a => ts.createLiteral(a))),
        ts.createLiteral(index),
        parent === null ? ts.createNull() : ts.createLiteral(parent)
    ]);

    return ts.createStatement(call);

}


function CreateTextStmt(initialValue: string, index: number, parent: number) {

    let call = ts.createCall(TEXT_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(initialValue),
        ts.createLiteral(index),
        parent === null ? ts.createNull() : ts.createLiteral(parent)
    ]);

    return ts.createStatement(call);

}

function CreateTextBindingStmt(templateStr: string, exprs: ts.FunctionExpression[], index: number) {

    let call = ts.createCall(BTEXT_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(index),
        ts.createLiteral(templateStr),
        ts.createArrayLiteral(exprs)
    ]);

    return ts.createStatement(call);
}



function CreateInputBindingStatement(key: string, dir: DirectiveData, expr: ts.FunctionExpression, index: number, fileName: string) {

    let call = ts.createCall(BINPUT_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        index === null ? ts.createIdentifier('index') : ts.createLiteral(index),
        CreateDirRequireCall(dir, fileName),
        ts.createLiteral(key),
        expr
    ]);

    return ts.createStatement(call);

}
function CreateSetInputStatement(key: string, dir: DirectiveData, value: string, index: number, fileName: string) {

    let call = ts.createCall(SINPUT_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        index === null ? ts.createIdentifier('index') : ts.createLiteral(index),
        CreateDirRequireCall(dir, fileName),
        ts.createLiteral(key),
        ts.createLiteral(value)
    ]);

    return ts.createStatement(call);

}

function CreateBindingStatement(id: ts.Identifier, key: string, expr: ts.FunctionExpression, index: number) {

    const params: ts.Expression[] = [
        VIEW_DATA_ID,
        index === null ? ts.createIdentifier('index') : ts.createLiteral(index),
        ts.createLiteral(key),
        expr
    ];

    if (index === null) {
        params.push(ts.createIdentifier('context'));
    }

    let call = ts.createCall(id, undefined, params);

    return ts.createStatement(call);

}

function CreateContainerStmt(factoryName: string, index: number, parent: number, dirs: DirectiveData[], fileName: string) {

    let call = ts.createCall(CONTAINER_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(index),
        parent === null ? ts.createNull() : ts.createLiteral(parent),
        ts.createArrayLiteral(dirs.map((d) => {
            return CreateDirRequireCall(d, fileName);

        })),
        ts.createIdentifier(factoryName)
    ]);

    return ts.createStatement(call);

}

function CreateContentStmt(select: string, parent: number) {

    let call = ts.createCall(CONTENT_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        select ? ts.createLiteral(select) : ts.createNull(),
        ts.createLiteral(parent)
    ]);

    return ts.createStatement(call);

}


function CreateAddClassStmt(value: string, index: number) {

    let call = ts.createCall(ADDCLASS_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createArrayLiteral(value.split(/\s+/).map(s => ts.createLiteral(s))),
        index === null ? ts.createIdentifier('index') : ts.createLiteral(index)
    ]);

    return ts.createStatement(call);

}

function CreateAttrStmt(name: string, value: string, index: number) {

    let call = ts.createCall(ATTR_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(name),
        ts.createLiteral(value),
        index === null ? ts.createIdentifier('index') : ts.createLiteral(index)
    ]);

    return ts.createStatement(call);

}

function CreateEventStmt(name: string, func: ts.FunctionExpression, index: number | null) {


    const params: ts.Expression[] = [
        VIEW_DATA_ID,
        ts.createLiteral(name),
        func,
        index === null ? ts.createIdentifier('index') : ts.createLiteral(index)
    ];

    if (index === null) {
        params.push(ts.createIdentifier('context'));
    }

    let call = ts.createCall(EVENT_FUNC_NAME, undefined, params);

    return ts.createStatement(call);

}

function CreateElementContextStmt(index: number, dirs: DirectiveData[], fileName: string) {

    let call = ts.createCall(ELEMENT_CONTEXT_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(index),
        //ts.createPropertyAccess(ts.createIdentifier('_vd'), 'injector'),
        ts.createArrayLiteral(dirs.map((d) => {
            return CreateDirRequireCall(d, fileName);

        }))
    ]);

    return ts.createStatement(call);

}

function CreateRefStmt(key: string, expr: ts.Expression, typeExpr: ts.Expression, fileName: string) {

    let call = ts.createCall(REF_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(key),
        //ts.createPropertyAccess(ts.createIdentifier('_vd'), 'injector'),
        expr,
        typeExpr
    ]);

    return ts.createStatement(call);

}


function CreateViewDataInit(className: string) {

    const vd_stmt = ts.createVariableStatement(
        [ts.createModifier(ts.SyntaxKind.ConstKeyword)],
        ts.createVariableDeclarationList(
            [
                ts.createVariableDeclaration(
                    `_vd`,
                    ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                    ts.createCall(VIEW_CONTEXT_FUNC_NAME, undefined, [
                        ts.createIdentifier(className),
                        ts.createIdentifier('parentInjector'),
                        ts.createIdentifier('host'),
                        ts.createIdentifier('renderer'),
                        ts.createIdentifier('projNodes'),
                    ])
                ),
            ],
            ts.NodeFlags.Const,
        ),
    );


    return [vd_stmt];
}


function CreateTemplateDataInit(name: string, index: number, directives: DirectiveData[]) {

    const vd_stmt = ts.createVariableStatement(
        [ts.createModifier(ts.SyntaxKind.ConstKeyword)],
        ts.createVariableDeclarationList(
            [
                ts.createVariableDeclaration(
                    `_vd`,
                    ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                    ts.createCall(TEMPLATE_CONTEXT_FUNC_NAME, undefined, [
                        ts.createIdentifier('context'),
                        ts.createIdentifier('parentInjector'),
                        ts.createIdentifier('renderer'),
                        ts.createIdentifier('projNodes'),
                        // ts.createIdentifier('directives'),
                    ])
                ),
            ],
            ts.NodeFlags.Const,
        ),
    );


    return [vd_stmt];
}

function CreateViewCallStmt(view: DirectiveData, hostIndex: number, projContentIndex: number[], fileName: string) {



    let call = ts.createCall(
        ts.createPropertyAccess(CreateDirRequireCall(view, fileName), FACTORY_FUNC_NAME),
        undefined,
        [
            ts.createElementAccess(ts.createPropertyAccess(ts.createIdentifier('_vd'), 'nodes'), hostIndex),
            ts.createElementAccess(ts.createPropertyAccess(ts.createIdentifier('_vd'), 'injectors'), hostIndex),
            ts.createIdentifier('renderer'),
            ts.createArrayLiteral(projContentIndex.map(n => ts.createElementAccess(ts.createIdentifier('_vd.nodes'), n)))

        ]
    );


    let swap_call = ts.createCall(SWAP_FUNC_NAME, undefined, [
        VIEW_DATA_ID,
        ts.createLiteral(hostIndex),
        call
    ]);

    return ts.createExpressionStatement(swap_call);
}

import * as _path from 'path';
import { BindingType } from "./ast/expr.ast";

function CreateDirRequireCall(d: DirectiveData, fileName: string) {


    if (d.fileName === fileName) {
        return ts.createIdentifier(d.name)
    }

    return ts.createPropertyAccess(
        ts.createCall(ts.createIdentifier('require'), undefined, [
            ts.createLiteral(d.package ? d.package : GetRelativePath(_path.dirname(fileName), d.fileName))
        ]),
        ts.createIdentifier(d.name)
    );
}

function GetRelativePath(from: string, to: string) {

    let rel = _path.relative(from, to);
    rel = rel.substring(0, rel.lastIndexOf('.ts'));

    if (!rel.startsWith('.')) {
        rel = './' + rel;
    }

    return rel;
}


interface TemplateExprContext {
    name: string;

}

interface CreateFunctionOptions {
    returnLastStatement: boolean;
    contexes: any;

}

function CreateFunctionFromSource(text: string, options: CreateFunctionOptions) {

    const src = ts.createSourceFile('tmp', text, ts.ScriptTarget.ES2015);


    const flags: any = {};

    let res = ts.transform(src, [GetIdentifierTransformer(options, flags)]);
    let last_index = res.transformed[0].statements.length - 1;

    const new_statements = res.transformed[0].statements.map((s: ts.ExpressionStatement, i) => {

        let s2 = ts.getMutableClone(s);
        s2.parent = src;

        return options.returnLastStatement && i === last_index ? ts.createReturn(s2.expression) : s2;
    });

    const args: ts.ParameterDeclaration[] = [
        ts.createParameter(undefined, undefined, undefined, 'context')
    ];


    // in case of output we include $event
    if (!options.returnLastStatement) {
        args.push(ts.createParameter(undefined, undefined, undefined, '$event'))
    }

    return ts.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        args,
        undefined,
        ts.createBlock(new_statements)
    );

}

function GetIdentifierTransformer(options: any, outputFlag: any) {

    return function TransformIdentifier(ctx: ts.TransformationContext) {

        let id_count = 0;

        function VisitNode(node: ts.Node): ts.Node {

            if (ts.isIdentifier(node)) {

                id_count++
                if (id_count === 1 && node.text !== '$event') {
                    return ts.createIdentifier(`context.${node.text}`);
                }

                return ts.createIdentifier(`${node.text}`);
            }
            else {

                id_count = 0;

                if (ts.isCallExpression(node)) {

                    let id = ts.visitNode(node.expression, VisitNode);
                    let args = node.arguments.map(a => { id_count = 0; return ts.visitNode(a, VisitNode) });

                    return ts.updateCall(node, id, undefined, args);

                }
                else if(ts.isBinaryExpression(node)) {


                    let left = ts.visitNode(node.left, VisitNode);

                    id_count = 0;
                    let right = ts.visitNode(node.right, VisitNode);

                    return ts.updateBinary(node, left, right, node.operatorToken);

                    
                }
                

            }


            return ts.visitEachChild(node, VisitNode, ctx);
        }

        return function (node: ts.SourceFile) {

            return ts.visitNode(node, VisitNode);
        }

    }
}
