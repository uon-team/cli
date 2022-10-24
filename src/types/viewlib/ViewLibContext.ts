import { BuildConfigBase, CreateTsProgram } from "../../compiler";

import * as ts from 'typescript';
import * as _path from 'path';
import * as fs from 'fs';

import { ReadFile, WriteFile, FindPackageJsonFilePath } from "../../utils";
import { Project } from "../../project";
import { CssSelector } from "./ast/css-selector";
import { TemplateParser } from "./parser/template.parser";
import { DirectiveData, TemplateVisitor, ELEMENT_FUNC_NAME, TEXT_FUNC_NAME, ATTR_FUNC_NAME } from "./TemplateVisitor";
import { VisitAll } from "./ast/template.ast";


const DIRECTIVE_BRAND_PREFIX = '_uv_d_';
const VIEW_BRAND_PREFIX = '_uv_v_';
const INPUT_BRAND_PREFIX = '_uv_i_';


export class ViewLibContext {

    private directives: DirectiveData[] = [];

    constructor(private project: Project, private config: BuildConfigBase) {

    }

    /**
     * setup ts transformers
     */
    async init() {

        const vcc = this;

        const program = await CreateTsProgram(this.config);
        const sources = program.getSourceFiles();

        const checker = program.getTypeChecker();

        sources.forEach(async (s) => {

            const package_name = await FindPackageName(s.fileName);

            const tv = (node: ts.Node): any => {

                if (ts.isSourceFile(node)) {
                    return ts.forEachChild(node, tv);
                }

                // handle pre-compiled libraries
                if (s.isDeclarationFile &&
                    ts.isVariableStatement(node) &&
                    node.declarationList.declarations) {

                    const decl = node.declarationList.declarations[0];
                    const name = (decl.name as ts.Identifier).escapedText.toString();

                    const is_view = name.startsWith(VIEW_BRAND_PREFIX);
                    const is_directive = name.startsWith(DIRECTIVE_BRAND_PREFIX);
                    const is_input_list = name.startsWith(INPUT_BRAND_PREFIX);

                    if (is_view || is_directive) {

                        const type = (decl.type as ts.LiteralTypeNode).literal;
                        const selector_str = (type as any).text;

                        const selectors = CssSelector.Parse(selector_str);

                        const dir: DirectiveData = {
                            name: name.substr((is_view ? VIEW_BRAND_PREFIX : DIRECTIVE_BRAND_PREFIX).length),
                            selectors: selectors,
                            fileName: s.fileName,
                            package: package_name,
                            isView: is_view,
                            inputs: [],
                            host: {}
                        };

                        this.directives.push(dir);

                        console.log('found', dir.name, selector_str, dir.package);

                        //console.log(dir);
                    }
                    else if (is_input_list) {

                        const class_name = name.substr(INPUT_BRAND_PREFIX.length);
                        const dir = this.directives.find(d => d.name === class_name);
                        const inputs = [];
                        if (ts.isUnionTypeNode(decl.type)) {
                            decl.type.types.forEach((t: ts.LiteralTypeNode) => {
                                inputs.push((t.literal as any).text);
                            });
                        }
                        else if (ts.isLiteralTypeNode(decl.type)) {
                            inputs.push((decl.type.literal as any).text);
                        }

                        dir.inputs = inputs;

                    }

                }
                // handle current compilation source
                else if (ts.isClassDeclaration(node) && !s.isDeclarationFile) {

                    const dir_dec_import_name = this.getImportSpecifierUsedName(s, '@uon/view', 'Directive');
                    const view_dec_import_name = this.getImportSpecifierUsedName(s, '@uon/view', 'View');
                    const input_dec_import_name = this.getImportSpecifierUsedName(s, '@uon/view', 'Input');

                    const has_view = HasDecorator(node, view_dec_import_name, s);
                    const has_dir = HasDecorator(node, dir_dec_import_name, s);

                    // @View || @Directive
                    if (has_view || has_dir) {

                        const selector = FindDecoratorValue(node,
                            has_view
                                ? view_dec_import_name
                                : dir_dec_import_name,
                            'selector', s);

                        // find inputs on members
                        const inputs: string[] = [];
                        if (input_dec_import_name) {
                            node.members.forEach(m => {

                                if (ts.isPropertyDeclaration(m) && HasDecorator(m, input_dec_import_name, s)) {
                                    inputs.push(m.name.getText(s));
                                }
                            });
                        }


                        const dir: DirectiveData = {
                            name: node.name.escapedText.toString(),
                            selectors: CssSelector.Parse(selector),
                            fileName: s.fileName,
                            package: null,
                            isView: has_view,
                            inputs: inputs,
                            host: {}
                        };
                        this.directives.push(dir);

                        console.log('found', dir.name, selector);

                    }


                }


            }

            ts.visitNode(s, tv);
        })


    }


    getBeforeTransformer() {

        let vcc = this;

        let input_dec_import_name: string;
        let dir_dec_import_name: string;
        let view_dec_import_name: string;
        let module_dec_import_name: string;

        let new_imports: any[] = [];
        let new_statements: any[] = [];
        let dts_statements: any[] = [];


        let cls_inputs: any[];


        function ViewTransformFactory(context: ts.TransformationContext) {


            function ViewDirectiveVisitor(node: ts.ClassElement): ts.ClassElement {

                const has_input = HasDecorator(node, input_dec_import_name);

                if (has_input) {

                    cls_inputs.push(node.name.getText());

                    if (ts.isSetAccessor(node)) {
                        node = context.factory.updateSetAccessorDeclaration(node, undefined, node.modifiers, node.name, node.parameters, node.body);
                    }
                    else if (ts.isPropertyDeclaration(node)) {
                        node = context.factory.updatePropertyDeclaration(node,
                            undefined,
                            node.modifiers,
                            node.name,
                            node.questionToken, node.type,
                            node.initializer
                        );
                    }


                }

                return node;
            }


            function ViewVisitor(node: ts.Node): ts.Node {

                // visit all nodes on source files
                if (ts.isSourceFile(node)) {

                    if (!node.statements) {
                        return node;
                    }

                    // d.ts file update
                    if (node.isDeclarationFile) {
                        return context.factory.updateSourceFile(node,
                            new_imports.concat(node.statements, dts_statements),
                            true)
                        /*return ts.updateSourceFileNode(node,
                             new_imports.concat(node.statements, dts_statements),
                             true
                         );*/
                    }

                    // reset arrays
                    new_imports = [];
                    new_statements = [];
                    dts_statements = [];

                    let src_node = ts.visitEachChild(node, ViewVisitor, context);


                    return context.factory.updateSourceFile(src_node,
                        new_imports.concat(src_node.statements, new_statements)
                    );
                }


                if (ts.isClassDeclaration(node)) {

                    // @Module
                    if (HasDecorator(node, module_dec_import_name)) {
                        console.log('found @Module', node.name.escapedText);
                    }


                    const class_name = node.name.escapedText.toString();
                    const file_name = node.getSourceFile().fileName;
                    const has_view = HasDecorator(node, view_dec_import_name);
                    const has_dir = HasDecorator(node, dir_dec_import_name);

                    if (has_view || has_dir) {


                        const parser = new TemplateParser();

                        // push selector to d.ts file
                        const selector = FindDecoratorValue(node, has_view ? view_dec_import_name : dir_dec_import_name, 'selector');
                        const sel_var = CreateSelectorDTSVariable(context.factory,
                            class_name,
                            has_view ? VIEW_BRAND_PREFIX : DIRECTIVE_BRAND_PREFIX,
                            selector
                        );
                        dts_statements.push(sel_var);

                        const host_attrs = FindDecoratorValue(node,
                            has_view
                                ? view_dec_import_name
                                : dir_dec_import_name,
                            'host');

                        const parsed_host_attrs = parser.parseHostAttrs(host_attrs || {});

                        let host_stmt = context.factory.createVariableDeclaration(
                            class_name + '.' + 'ʘH',
                            undefined,
                            undefined,
                            TemplateVisitor.CreateHostAttrFunction(class_name, file_name, parsed_host_attrs)
                        );

                        new_statements.push(host_stmt);

                        const view_providers = FindDecoratorValue(node,
                            has_view
                                ? view_dec_import_name
                                : dir_dec_import_name,
                            'providers');


                        if (view_providers) {
                            let prov_stmt = context.factory.createVariableDeclaration(
                                class_name + '.' + 'ʘP',
                                undefined,
                                undefined,
                                view_providers
                            );

                            new_statements.push(prov_stmt);
                        }


                        if (has_view) {

                            //parse template
                            const template_str = GetViewTemplateString(node, view_dec_import_name);

                            const dir = vcc.directives.find(d => {
                                return d.fileName === file_name && d.name === class_name
                            });

                            const element_selector = dir.selectors.find(s => s.isElementSelector);

                            if (!element_selector) {
                                throw new Error(`@View ${class_name} must have an element selector!\n in file ${file_name}`);
                            }


                            const parse_result = parser.parse(template_str, file_name);

                            if (parse_result.errors.length) {
                                throw new Error(parse_result.errors.join('\n'));
                            }

                            const tmpl_visitor = new TemplateVisitor(vcc.directives, class_name, file_name);
                            VisitAll(tmpl_visitor, parse_result.rootNodes);

                            let func = tmpl_visitor.getCompiledViewFactoryFunction();

                            let factory_stmt =  context.factory.createVariableDeclaration(
                                class_name + '.' + 'ʘF',
                                undefined,
                                undefined,
                                func
                            );
                            let selector_stmt = context.factory.createVariableDeclaration(
                                class_name + '.' + 'ʘT',
                                undefined,
                                undefined,
                                context.factory.createStringLiteral(element_selector.element)
                            );

                            new_statements.push(factory_stmt, selector_stmt);

                        }


                        cls_inputs = [];

                        const stripped_members = ts.visitNodes(node.members, ViewDirectiveVisitor);
                        if (cls_inputs.length) {
                            dts_statements.push(CreateInputDTSVariable(class_name, INPUT_BRAND_PREFIX, cls_inputs));
                        }

                        // return updated class
                        return context.factory.updateClassDeclaration(node,
                            [],
                            node.modifiers,
                            node.name,
                            node.typeParameters,
                            node.heritageClauses,
                            stripped_members);
                    }

                }

                // all other nodes stay unchanged
                return node;

            }

            return function (node: ts.SourceFile) {

                input_dec_import_name = vcc.getImportSpecifierUsedName(node, vcc.project.name === '@uon/view'
                    ? '../meta/directive.decorator'
                    : '@uon/view',
                    'Input');

                dir_dec_import_name = vcc.getImportSpecifierUsedName(node, vcc.project.name === '@uon/view'
                    ? '../meta/directive.decorator'
                    : '@uon/view',
                    'Directive');

                view_dec_import_name = vcc.getImportSpecifierUsedName(node, '@uon/view', 'View');
                module_dec_import_name = vcc.getImportSpecifierUsedName(node, '@uon/core', 'Module');



                return ts.visitNode(node, ViewVisitor);
            };
        }

        return ViewTransformFactory;
    }


    getImportSpecifierUsedName(sf: ts.SourceFile, moduleName: string, importName: string): string | null {

        for (let i = 0; i < sf.statements.length; i++) {
            const stmt = sf.statements[i];

            if (ts.isImportDeclaration(stmt)) {

                let name = '';

                if (ts.isToken(stmt.moduleSpecifier)) {
                    name = (stmt.moduleSpecifier as any).text;
                }
                else {
                    console.log('not token');
                    name = stmt.moduleSpecifier.getText().substring(1, name.length - 1);
                }

                if (name.indexOf(moduleName) > -1) {

                    const specifiers: ts.ImportSpecifier[] = [];

                    stmt.importClause.namedBindings.forEachChild((n) => {
                        if (ts.isImportSpecifier(n)) {
                            specifiers.push(n);
                        }
                    });

                    for (let j = 0; j < specifiers.length; j++) {
                        const is = specifiers[j];
                        const base_name = (is.propertyName || is.name).escapedText.toString();
                        if (base_name === importName) {
                            return is.name.escapedText.toString();
                        }
                    }

                }
            }

        }

        return null;

    }

}


function HasDecorator(node: ts.ClassDeclaration | ts.ClassElement, decoratorName: string, src?: ts.SourceFile) {

    if (!node.decorators) {
        return false;
    }

    for (let i = 0; i < node.decorators.length; i++) {
        const dec = node.decorators[i];

        let dec_id = dec.expression.getChildAt(0, src);

        if ((dec_id as any).text === decoratorName) {
            return true
        }
    }

    return false;
}


function FindDecoratorValue(node: ts.ClassDeclaration, decoratorName: string, key: string, src?: ts.SourceFile): any {

    for (let i = 0; i < node.decorators.length; i++) {
        const dec = node.decorators[i];

        let dec_id = dec.expression.getChildAt(0, src);

        if ((dec_id as any).text === decoratorName) {

            let list = dec.expression.getChildren(src).find(n => n.kind === ts.SyntaxKind.SyntaxList);
            let obj_literal = list.getChildren(src).find(n => ts.isObjectLiteralExpression(n)) as ts.ObjectLiteralExpression;

            let selector = obj_literal.properties.find(n => n.name.getText(src) === key) as ts.PropertyAssignment;
            //call_expr.arguments[0]

            if (!selector) {
                return null;
            }

            const initer = selector.initializer;

            if (ts.isStringLiteralLike(initer)) {
                const value = initer.getText(src);
                return value.substring(1, value.length - 1);
            }
            else if (ts.isObjectLiteralExpression(initer)) {

                let result: any = {};
                initer.properties.forEach(p => {
                    if (ts.isPropertyAssignment(p)) {

                        result[(p.name as any).text] = (p.initializer as any).text;
                    }


                    //result[p.name.getText(src)] = p.
                });

                return result;
            }
            else if (ts.isArrayLiteralExpression(initer)) {
                return initer;
            }
            else {
                return null;
            }


        }

    }

    return null;

}

function CreateSelectorDTSVariable(factory: ts.NodeFactory, className: string, prefix: string, type: string) {

    const s2 = factory.createVariableStatement(
        [factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
        factory.createVariableDeclarationList(
            [
                factory.createVariableDeclaration(
                    `${prefix}${className}`, undefined,
                    factory.createLiteralTypeNode(factory.createStringLiteral(type)),
                ),
            ],
            ts.NodeFlags.Const,
        ),
    );
    return s2;
}

function CreateInputDTSVariable(className: string, prefix: string, types: string[]) {

    const s2 = ts.createVariableStatement(
        [ts.createModifier(ts.SyntaxKind.DeclareKeyword)],
        ts.createVariableDeclarationList(
            [
                ts.createVariableDeclaration(
                    `${prefix}${className}`,
                    ts.createUnionTypeNode(types.map(s => ts.createLiteralTypeNode(ts.createLiteral(s)))),
                ),
            ],
            ts.NodeFlags.Const,
        ),
    );
    return s2;
}



function GetViewTemplateString(node: ts.ClassDeclaration, decoratorName: string) {

    let path = FindDecoratorValue(node, decoratorName, 'templateUrl');

    let template_str: string = null;
    if (path) {

        let from_path = _path.dirname(node.getSourceFile().fileName);
        let rel_path = _path.resolve(from_path, path);
        template_str = fs.readFileSync(rel_path, 'utf8');

    }
    else {
        template_str = FindDecoratorValue(node, decoratorName, 'template');
    }

    return template_str;

}

async function FindPackageName(p: string) {

    let pkg_path = FindPackageJsonFilePath(_path.dirname(p));

    if (!pkg_path) {
        return null;
    }

    let buffer = await ReadFile(pkg_path);
    let pkg = JSON.parse(buffer.toString('utf8'));

    return pkg.name as string;

}