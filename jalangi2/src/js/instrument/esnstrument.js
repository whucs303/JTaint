/*
 * Copyright 2013 Samsung Information Systems America, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Koushik Sen

// do not remove the following comment
// JALANGI DO NOT INSTRUMENT

/*jslint node: true browser: true */
/*global astUtil acorn esotope J$ */

//var StatCollector = require('../utils/StatCollector');
if (typeof J$ === 'undefined') {
    J$ = {};
}

// classTag = false;

(function (sandbox) {
    if (typeof sandbox.instrumentCode !== 'undefined') {
        return;
    }

    try {
        escodegen = require("escodegen");
    } catch(err){
        ;
    }

    var global = this;
    var JSON = {parse: global.JSON.parse, stringify: global.JSON.stringify};

    var astUtil = sandbox.astUtil;

    var Config = sandbox.Config;
    var Constants = sandbox.Constants;

    var JALANGI_VAR = Constants.JALANGI_VAR;
    var RP = JALANGI_VAR + "_";

//    var N_LOG_LOAD = 0,
//    var N_LOG_FUN_CALL = 1,
//        N_LOG_METHOD_CALL = 2,
    var N_LOG_FUNCTION_ENTER = 4,
//        N_LOG_FUNCTION_RETURN = 5,
        N_LOG_SCRIPT_ENTER = 6,
//        N_LOG_SCRIPT_EXIT = 7,
        N_LOG_GETFIELD = 8,
//        N_LOG_GLOBAL = 9,
        N_LOG_ARRAY_LIT = 10,
        N_LOG_OBJECT_LIT = 11,
        N_LOG_FUNCTION_LIT = 12,
        N_LOG_RETURN = 13,
        N_LOG_REGEXP_LIT = 14,
//        N_LOG_LOCAL = 15,
//        N_LOG_OBJECT_NEW = 16,
        N_LOG_READ = 17,
//        N_LOG_FUNCTION_ENTER_NORMAL = 18,
        N_LOG_HASH = 19,
        N_LOG_SPECIAL = 20,
        N_LOG_STRING_LIT = 21,
        N_LOG_NUMBER_LIT = 22,
        N_LOG_BOOLEAN_LIT = 23,
        N_LOG_UNDEFINED_LIT = 24,
        N_LOG_NULL_LIT = 25;

    //有一些配置了自己的触发函数，需要插装
    //有一些是memory要用，如declare的J$.N
    //有一些是单独去掉后会导致运行出错的，如_return
    //有一些是没必要去的，如throw、scriptEnter
    //最后去掉的只有那些出现频率高又没有用的  R read\T literal\X1 endExpression\C conditional
    //Fe的引入会使用arguments.callee，这在严格模式下会报错，所以需要去掉。
    var logFunctionEnterFunName = JALANGI_VAR + ".Fe"; //functionEnter
    var logFunctionReturnFunName = JALANGI_VAR + ".Fr";  //functionExit
    var logFunCallFunName = JALANGI_VAR + ".F"; //invokeFun
    var logMethodCallFunName = JALANGI_VAR + ".M";  //invokeFun
    var logAssignFunName = JALANGI_VAR + ".A"; //
    var logPutFieldFunName = JALANGI_VAR + ".P"; //putField
    var logGetFieldFunName = JALANGI_VAR + ".G"; //getField
    var logScriptEntryFunName = JALANGI_VAR + ".Se"; //scriptEnter
    var logScriptExitFunName = JALANGI_VAR + ".Sr"; //scriptExit
    var logReadFunName = JALANGI_VAR + ".R"; //read xxxxx
    var logWriteFunName = JALANGI_VAR + ".W"; //write
    var logIFunName = JALANGI_VAR + ".I"; // None
    var logHashFunName = JALANGI_VAR + ".H"; //forinObject
    var logLitFunName = JALANGI_VAR + ".T"; //literal xxxxx
    var logInitFunName = JALANGI_VAR + ".N"; //declare
    var logReturnFunName = JALANGI_VAR + ".Rt"; //_return
    var logThrowFunName = JALANGI_VAR + ".Th"; //_throw
    var logReturnAggrFunName = JALANGI_VAR + ".Ra"; //None
    var logUncaughtExceptionFunName = JALANGI_VAR + ".Ex"; //None
    var logLastComputedFunName = JALANGI_VAR + ".L"; //None
    var logTmpVarName = JALANGI_VAR + "._tm_p";
    var logSampleFunName = JALANGI_VAR + ".S"; //runInstrumentedFunctionBody

    var logWithFunName = JALANGI_VAR + ".Wi";
    var logBinaryOpFunName = JALANGI_VAR + ".B"; //binary
    var logUnaryOpFunName = JALANGI_VAR + ".U"; //Unary
    var logConditionalFunName = JALANGI_VAR + ".C"; //conditional xxxxx
    var logSwitchLeftFunName = JALANGI_VAR + ".C1"; //None
    var logSwitchRightFunName = JALANGI_VAR + ".C2"; //None
    var logLastFunName = JALANGI_VAR + "._";
    var logX1FunName = JALANGI_VAR + ".X1"; //endExpression xxxxx

    var instrumentCodeFunName = JALANGI_VAR + ".instrumentEvalCode";

    var yiruma_temp_userd_flag = false;

    var Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };


    function createBitPattern() {
        var ret = 0;
        var i;
        for (i =0; i< arguments.length; i++) {
            ret = (ret << 1)+(arguments[i]?1:0);
        }
        return ret;
    }

    function HOP(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }


    function isArr(val) {
        return Object.prototype.toString.call(val) === '[object Array]';
    }

    function MAP(arr, fun) {
        var len = arr.length;
        if (!isArr(arr)) {
            throw new TypeError();
        }
        if (typeof fun !== "function") {
            throw new TypeError();
        }

        var res = new Array(len);
        for (var i = 0; i < len; i++) {
            if (i in arr) {
                res[i] = fun(arr[i]);
            }
        }
        return res;
    }

    function regex_escape(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }


    // name of the file containing the instrumented code

    var IID_INC_STEP = 8;
    // current static identifier for each conditional expression
    var condIid;
    var memIid;
    var opIid;
    var hasInitializedIIDs = false;
    var origCodeFileName;
    var instCodeFileName;
    var iidSourceInfo;


    function getIid() {
        var tmpIid = memIid;
        memIid = memIid + IID_INC_STEP;
        return createLiteralAst(tmpIid+"|"+origCodeFileName);
    }

    function getPrevIidNoInc() {
        return createLiteralAst(memIid - IID_INC_STEP);
    }

    function getCondIid() {
        var tmpIid = condIid;
        condIid = condIid + IID_INC_STEP;
        return createLiteralAst(tmpIid+"|"+origCodeFileName);
    }

    function getOpIid() {
        var tmpIid = opIid;
        opIid = opIid + IID_INC_STEP;
        return createLiteralAst(tmpIid+"|"+origCodeFileName);
    }


    function printLineInfoAux(i, ast) {
        if (ast && ast.loc) {
            iidSourceInfo[i] = [ast.loc.start.line, ast.loc.start.column + 1, ast.loc.end.line, ast.loc.end.column + 1];
        }
    }

    // iid+2 is usually unallocated
    // we are using iid+2 for the sub-getField operation of a method call
    // see analysis.M
    function printSpecialIidToLoc(ast0) {
        printLineInfoAux(memIid + 2, ast0);
    }

    function printIidToLoc(ast0) {
        printLineInfoAux(memIid, ast0);
    }

    function printModIidToLoc(ast0) {
        printLineInfoAux(memIid, ast0);
        printLineInfoAux(memIid+2, ast0);
    }

    function printOpIidToLoc(ast0) {
        printLineInfoAux(opIid, ast0);
    }

    function printCondIidToLoc(ast0) {
        printLineInfoAux(condIid, ast0);
    }

// J$_i in expression context will replace it by an AST
// {J$_i} will replace the body of the block statement with an array of statements passed as argument

    function replaceInStatement(code) {
        var asts = arguments;
        var visitorReplaceInExpr = {
            'Identifier': function (node) {
                if (node.name.indexOf(RP) === 0) {
                    var i = parseInt(node.name.substring(RP.length));
                    return asts[i];
                } else {
                    return node;
                }
            },
            'BlockStatement': function (node) {
                if (node.body[0].type === 'ExpressionStatement' && isArr(node.body[0].expression)) {
                    node.body = node.body[0].expression;
                }
                return node;
            }
        };
//        StatCollector.resumeTimer("internalParse");
        var ast = acorn.parse(code, {locations: true});
//        StatCollector.suspendTimer("internalParse");
//        StatCollector.resumeTimer("replace");
        var newAst = astUtil.transformAst(ast, visitorReplaceInExpr, undefined, undefined, true);
        //console.log(newAst);
//        StatCollector.suspendTimer("replace");
        return newAst.body;
    }

    function replaceInExpr(code) {
        var ret = replaceInStatement.apply(this, arguments);
        return ret[0].expression;
    }

    function createLiteralAst(name) {
        return {type: Syntax.Literal, value: name};
    }

    function createIdentifierAst(name) {
        return {type: Syntax.Identifier, name: name};
    }

    function transferLoc(toNode, fromNode) {
        if (fromNode.loc)
            toNode.loc = fromNode.loc;
        if (fromNode.raw)
            toNode.raw = fromNode.loc;
    }

    function idsOfGetterSetter(node) {
        var ret = {}, isEmpty = true;
        if (node.type === "ObjectExpression") {
            var kind, len = node.properties.length;
            for (var i = 0; i < len; i++) {
                if ((kind = node.properties[i].kind) === 'get' || kind === 'set') {
                    ret[kind + node.properties[i].key.name] = node.properties[i].value.funId;
                    isEmpty = false;
                }
            }
        }
        return isEmpty ? undefined : ret;
    }

    function checkAndGetIid(funId, sid, funName) {
        var id = getIid();
        if (!Config.requiresInstrumentation || Config.requiresInstrumentation(id, funId, sid, funName)) {
            return id;
        } else {
            return undefined;
        }
    }

    function modifyAst(ast, modifier, term) {
        var ret;
        var i = 3; // no. of formal parameters
        while (term.indexOf('$$') >= 0) {
            term = term.replace(/\$\$/, arguments[i]);
            i++;
        }
        var args = [];
        args.push(term);
        for (; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        printIidToLoc(ast);
        ret = modifier.apply(this, args);
        transferLoc(ret, ast);
        return ret;
    }

    //P
    function wrapPutField(node, base, offset, rvalue, isComputed) {
        if (!Config.INSTR_PUTFIELD || Config.INSTR_PUTFIELD(isComputed ? null : offset.value, node)) {
            printIidToLoc(node);
            var ret = replaceInExpr(
                logPutFieldFunName +
                "(" + RP + "1, " + RP + "2, " + RP + "3, " + RP + "4," + (createBitPattern(isComputed, false)) + ")",
                getIid(),
                base,
                offset,
                rvalue
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapModAssign(node, base, offset, op, rvalue, isComputed) {
        //return node;

        if (!Config.INSTR_PROPERTY_BINARY_ASSIGNMENT || Config.INSTR_PROPERTY_BINARY_ASSIGNMENT(op, node.computed ? null : offset.value, node)) {
            printModIidToLoc(node);
            var ret = replaceInExpr(
                logAssignFunName + "(" + RP + "1," + RP + "2," + RP + "3," + RP + "4," + (createBitPattern(isComputed)) + ")(" + RP + "5)",
                getIid(),
                base,
                offset,
                createLiteralAst(op),
                rvalue
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    //M
    function wrapMethodCall(node, base, offset, isCtor, isComputed) {
        printIidToLoc(node);
        printSpecialIidToLoc(node.callee);
        var ret = replaceInExpr(
            logMethodCallFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + (createBitPattern(isCtor, isComputed)) + ")",
            getIid(),
            base,
            offset
        );
        transferLoc(ret, node.callee);
        return ret;
    }

    //F
    function wrapFunCall(node, func, funcName, base, isCtor) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logFunCallFunName + "(" + RP + "1, " + RP + "2, " +  RP + "3, "+ RP + "4, " + (createBitPattern(isCtor)) + ")",
            getIid(),
            func,
            createLiteralAst(funcName),
            base===undefined ? createIdentifierAst("undefined"):base
        );
        transferLoc(ret, node.callee);
        return ret;
    }

    //G
    function wrapGetField(node, base, baseStr, offset, isComputed) {

        if (baseStr === "J$")
            return node;

        if (baseStr.startsWith("super"))
            return node;

        if (!Config.INSTR_GETFIELD || Config.INSTR_GETFIELD(node.computed ? null : offset.value, node)) {
            printIidToLoc(node);
            var ret = replaceInExpr(
                logGetFieldFunName + "(" + RP + "1, " + RP + "2, " + RP + "3," + RP + "4," + (createBitPattern(isComputed,false, false)) + ")",
                getIid(),
                base,
                createLiteralAst(baseStr),
                offset
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapRead(node, name, val, isReUseIid, isGlobal, isScriptLocal) {
        return node;

        // if (!Config.INSTR_READ || Config.INSTR_READ(name, node)) {
        //     printIidToLoc(node);
        //     var ret = replaceInExpr(
        //         logReadFunName + "(" + RP + "1, " + RP + "2, " + RP + "3," + (createBitPattern(isGlobal,isScriptLocal)) + ")",
        //         isReUseIid ? getPrevIidNoInc() : getIid(),
        //         name,
        //         val
        //     );
        //     transferLoc(ret, node);
        //     return ret;
        // } else {
        //     return val;
        // }
    }

//    function wrapReadWithUndefinedCheck(node, name) {
//        var ret = replaceInExpr(
//            "("+logIFunName+"(typeof ("+name+") === 'undefined'? "+RP+"2 : "+RP+"3))",
//            createIdentifierAst(name),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst("undefined")),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst(name), true)
//        );
//        transferLoc(ret, node);
//        return ret;
//    }

    function wrapReadWithUndefinedCheck(node, name) {
        return node;
        var ret;

        //if (name !== 'location') {
        //    ret = replaceInExpr(
        //        "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + name + "=" + RP + "2) : (" + name + "=" + RP + "3)))",
        //        createIdentifierAst(name),
        //        wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true, true),
        //        wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true, true)
        //    );
        //} else {
            ret = replaceInExpr(
                "(" + logIFunName + "(typeof (" + name + ") === 'undefined'? (" + RP + "2) : (" + RP + "3)))",
                createIdentifierAst(name),
                wrapRead(node, createLiteralAst(name), createIdentifierAst("undefined"), false, true, false),
                wrapRead(node, createLiteralAst(name), createIdentifierAst(name), true, true, false)
            );
//        }
        transferLoc(ret, node);
        return ret;
    }

    //W
    function wrapWrite(node, name, val, lhs, isGlobal, isScriptLocal, isDeclaration) {

        if (!Config.INSTR_WRITE || Config.INSTR_WRITE(name, node)) {
            printIidToLoc(node);
            var ret = replaceInExpr(
                logWriteFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + RP + "4," + (createBitPattern(isGlobal,isScriptLocal,isDeclaration)) + ")",
                getIid(),
                name,
                val,
                lhs
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return val;
        }
    }

    function wrapWriteWithUndefinedCheck(node, name, val, lhs) {
        if (!Config.INSTR_WRITE || Config.INSTR_WRITE(name, node)) {
            printIidToLoc(node);
//        var ret2 = replaceInExpr(
//            "("+logIFunName+"(typeof ("+name+") === 'undefined'? "+RP+"2 : "+RP+"3))",
//            createIdentifierAst(name),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst("undefined")),
//            wrapRead(node, createLiteralAst(name),createIdentifierAst(name), true)
//        );
            var ret = replaceInExpr(
                logWriteFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + logIFunName + "(typeof(" + lhs.name + ")==='undefined'?undefined:" + lhs.name + ")," + createBitPattern(true, false, false) +")",
                getIid(),
                name,
                val
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return val;
        }
    }

    function wrapRHSOfModStore(node, left, right, op) {
        var ret = replaceInExpr(RP + "1 " + op + " " + RP + "2",
            left, right);
        transferLoc(ret, node);
        return ret;
    }

    function makeNumber(node, left) {
        var ret = replaceInExpr(" + " + RP + "1 ", left);
        transferLoc(ret, node);
        return ret;
    }

    function wrapLHSOfModStore(node, left, right) {
        var ret = replaceInExpr(RP + "1 = " + RP + "2",
            left, right);
        transferLoc(ret, node);
        return ret;
    }

    function wrapObject(node){

        if (node["properties"].length === 0)
            return node;

        yiruma_temp_userd_flag = true;
        printIidToLoc(node);
        var iid = getIid();

        var object = null;
        var code = "var yiruma_temp = {};";
        for (var i in node["properties"]){
            object = node["properties"][i];
            if (object["key"].type === "Identifier")
                object["key"] = createLiteralAst(object["key"].name);
            code += "J$.P("+escodegen.generate(iid)+", yiruma_temp, "+ escodegen.generate(object["key"])
                +", " + escodegen.generate(object["value"])+ ", 2);";
        }

        code = "(function(){" + code + "return yiruma_temp;})()";
        var retu = createIdentifierAst(code);
        //console.log(code);
        transferLoc(retu, node);

        return retu;
    }

    function wrapArray(node){

        if (node["elements"].length === 0)
            return node;

        yiruma_temp_userd_flag = true;
        printIidToLoc(node);
        var iid = getIid();

        var object = null;
        var code = "var yiruma_temp = [];";
        for (let i in node["elements"]){
            object = node["elements"][i];

            //对于var list = [,,1,2]的，空位为null，在esotope转化为code时，ast为null，将会引起报错
            if (object == null){
                code += "J$.F(" + escodegen.generate(iid) + " , [].push, 'push', yiruma_temp, 0)(null)";
            }else {
                code += "J$.F(" + escodegen.generate(iid) + " , [].push, 'push', yiruma_temp, 0)(" + escodegen.generate(object) + ");";
            }
        }

        code = "(function(){" + code + "return yiruma_temp;})()";
        var retu = createIdentifierAst(code);
        //.log(code);
        transferLoc(retu, node);

        return retu;
    }


    function wrapNewExpression(node){

        printIidToLoc(node);
        var iid = getIid();

        var nodeTostr = escodegen.generate(node);
        var nodeArgs = [nodeTostr];
        for (let i in node.arguments)
            nodeArgs.push(escodegen.generate(node.arguments[i]));
        var str = "J$.N(" + escodegen.generate(iid) + ")(" + nodeArgs.join(",")+")";

        return createIdentifierAst(str);
    }



    function ifObjectExpressionHasGetterSetter(node) {
        if (node.type === "ObjectExpression") {
            var kind, len = node.properties.length;
            for (var i = 0; i < len; i++) {
                if ((kind = node.properties[i].kind) === 'get' || kind === 'set') {
                    return true;
                }
            }
        }
        return false;
    }

    var dummyFun = function () {
    };
    var dummyObject = {};
    var dummyArray = [];

    function getLiteralValue(funId, node) {
        if (node.name === "undefined") {
            return undefined;
        } else if (node.name === "NaN") {
            return NaN;
        } else if (node.name === "Infinity") {
            return Infinity;
        }
        switch (funId) {
            case N_LOG_NUMBER_LIT:
            case N_LOG_STRING_LIT:
            case N_LOG_NULL_LIT:
            case N_LOG_REGEXP_LIT:
            case N_LOG_BOOLEAN_LIT:
                return node.value;
            case N_LOG_ARRAY_LIT:
                return dummyArray;
            case N_LOG_FUNCTION_LIT:
                return dummyFun;
            case N_LOG_OBJECT_LIT:
                return dummyObject;
        }
        throw new Error(funId + " not known");
    }

    function getFnIdFromAst(ast) {
        var entryExpr = ast.body.body[0];
        if (entryExpr.type != 'ExpressionStatement') {
            console.log(JSON.stringify(entryExpr));
            throw new Error("IllegalStateException");
        }
        entryExpr = entryExpr.expression;
        if (entryExpr.type != 'CallExpression') {
            throw new Error("IllegalStateException");
        }
        if (entryExpr.callee.type != 'MemberExpression') {
            throw new Error("IllegalStateException");
        }
        if (entryExpr.callee.object.name != JALANGI_VAR) {
            throw new Error("IllegalStateException");
        }
        if (entryExpr.callee.property.name != 'Fe') {
            throw new Error("IllegalStateException");
        }
        return entryExpr['arguments'][0].value;
    }

    function wrapLiteral(node, ast, funId) {

        return node;

        if (!Config.INSTR_LITERAL || Config.INSTR_LITERAL(getLiteralValue(funId, node), node)) {
            printIidToLoc(node);
            var hasGetterSetter = ifObjectExpressionHasGetterSetter(node);

            var ret;
            if (funId == N_LOG_FUNCTION_LIT) {
                var internalFunId = null;
                if (node.type == 'FunctionExpression') {
                    internalFunId = getFnIdFromAst(node);
                } else {
                    if (node.type != 'Identifier') {
                        throw new Error("IllegalStateException");
                    }
                    internalFunId = getFnIdFromAst(scope.funNodes[node.name]);
                }
                ret = replaceInExpr(
                    logLitFunName + "(" + RP + "1, " + RP + "2, " + RP + "3," + hasGetterSetter + ", " + internalFunId + ")",
                    getIid(),
                    ast,
                    createLiteralAst(funId),
                    internalFunId
                );
            } else {
                ret = replaceInExpr(
                    logLitFunName + "(" + RP + "1, " + RP + "2, " + RP + "3," + hasGetterSetter + ")",
                    getIid(),
                    ast,
                    createLiteralAst(funId)
                );
            }
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapReturn(node, expr) {
        return node;

        var lid = (expr === null) ? node : expr;
        printIidToLoc(lid);
        if (expr === null) {
            expr = createIdentifierAst("undefined");
        }
        var ret = replaceInExpr(
            logReturnFunName + "(" + RP + "1, " + RP + "2)",
            getIid(),
            expr
        );
        transferLoc(ret, lid);
        return ret;
    }

    function wrapThrow(node, expr) {
        return node;

        printIidToLoc(expr);
        var ret = replaceInExpr(
            logThrowFunName + "(" + RP + "1, " + RP + "2)",
            getIid(),
            expr
        );
        transferLoc(ret, expr);
        return ret;
    }

    function wrapWithX1(node, ast) {

        return ast;

        if (!Config.INSTR_END_EXPRESSION || Config.INSTR_END_EXPRESSION(node)) {

            if (!ast || ast.type.indexOf("Expression") <= 0) return ast;
            printIidToLoc(node);
            var ret = replaceInExpr(
                logX1FunName + "(" + RP + "1," + RP + "2)", getIid(), ast);
            transferLoc(ret, node);
            return ret;
        } else {
            return ast;
        }
    }

    function wrapHash(node, ast) {
        printIidToLoc(node);
        var ret = replaceInExpr(
            logHashFunName + "(" + RP + "1, " + RP + "2)",
            getIid(),
            ast
        );
        transferLoc(ret, node);
        return ret;
    }

    function wrapEvalArg(ast) {
        printIidToLoc(ast);
        var ret = replaceInExpr(
            instrumentCodeFunName + "(" + RP + "1, " + RP + "2, true)",
            ast,
            getIid()
        );
        transferLoc(ret, ast);
        return ret;
    }

    function wrapUnaryOp(node, argument, operator) {
        if (!Config.INSTR_UNARY || Config.INSTR_UNARY(operator, node)) {
            printOpIidToLoc(node);
            var ret = replaceInExpr(
                logUnaryOpFunName + "(" + RP + "1," + RP + "2," + RP + "3)",
                getOpIid(),
                createLiteralAst(operator),
                argument
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapBinaryOp(node, left, right, operator, isComputed) {
        if (!Config.INSTR_BINARY || Config.INSTR_BINARY(operator, operator)) {
            printOpIidToLoc(node);
            var ret = replaceInExpr(
                logBinaryOpFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + RP + "4," + (createBitPattern(isComputed, false, false)) + ")",
                getOpIid(),
                createLiteralAst(operator),
                left,
                right
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapLogicalAnd(node, left, right) {

        return node;

        if (!Config.INSTR_CONDITIONAL || Config.INSTR_CONDITIONAL("&&", node)) {
            printCondIidToLoc(node);
            var ret = replaceInExpr(
                logConditionalFunName + "(" + RP + "1, " + RP + "2)?" + RP + "3:" + logLastFunName + "()",
                getCondIid(),
                left,
                right
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapLogicalOr(node, left, right) {

        return node;

        if (!Config.INSTR_CONDITIONAL || Config.INSTR_CONDITIONAL("||", node)) {
            printCondIidToLoc(node);
            var ret = replaceInExpr(
                logConditionalFunName + "(" + RP + "1, " + RP + "2)?" + logLastFunName + "():" + RP + "3",
                getCondIid(),
                left,
                right
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapSwitchDiscriminant(node, discriminant) {
        return node;

        if (!Config.INSTR_CONDITIONAL || Config.INSTR_CONDITIONAL("switch", node)) {
            printCondIidToLoc(node);
            var ret = replaceInExpr(
                logSwitchLeftFunName + "(" + RP + "1, " + RP + "2)",
                getCondIid(),
                discriminant
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapSwitchTest(node, test) {
        return node;

        if (!Config.INSTR_CONDITIONAL || Config.INSTR_CONDITIONAL("switch", node)) {
            printCondIidToLoc(node);
            var ret = replaceInExpr(
                logSwitchRightFunName + "(" + RP + "1, " + RP + "2)",
                getCondIid(),
                test
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapWith(node) {


        if (!Config.INSTR_CONDITIONAL || Config.INSTR_CONDITIONAL("with", node)) {
            printIidToLoc(node);
            var ret = replaceInExpr(
                logWithFunName + "(" + RP + "1, " + RP + "2)",
                getIid(),
                node
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }
    }

    function wrapConditional(node, test) {

        return node;

        if (node === null) {
            return node;
        } // to handle for(;;) ;

        if (!Config.INSTR_CONDITIONAL || Config.INSTR_CONDITIONAL("other", node)) {
            printCondIidToLoc(node);
            var ret = replaceInExpr(
                logConditionalFunName + "(" + RP + "1, " + RP + "2)",
                getCondIid(),
                test
            );
            transferLoc(ret, node);
            return ret;
        } else {
            return node;
        }

    }

//    function createCallWriteAsStatement(node, name, val) {
//        printIidToLoc(node);
//        var ret = replaceInStatement(
//            logWriteFunName + "(" + RP + "1, " + RP + "2, " + RP + "3)",
//            getIid(),
//            name,
//            val
//        );
//        transferLoc(ret[0].expression, node);
//        return ret;
//    }

    function createExpressionStatement(lhs, node) {
        var ret;
        ret = replaceInStatement(
            RP + "1 = " + RP + "2", lhs, node
        );
        transferLoc(ret[0].expression, node);
        return ret;
    }

    function createCallInitAsStatement(node, name, val, isArgumentSync, lhs, isCatchParam, isAssign) {
        printIidToLoc(node);
        var ret;

        if (isAssign)
            ret = replaceInStatement(
                RP + "1 = " + logInitFunName + "(" + RP + "2, " + RP + "3, " + RP + "4, " + createBitPattern(isArgumentSync, false, isCatchParam) + ")",
                lhs,
                getIid(),
                name,
                val
            );
        else
            ret = replaceInStatement(
                logInitFunName + "(" + RP + "1, " + RP + "2, " + RP + "3, " + createBitPattern(isArgumentSync, false, isCatchParam) + ")",
                getIid(),
                name,
                val
            );

        transferLoc(ret[0].expression, node);
        return ret;
    }

    function createCallAsFunEnterStatement(node) {
        printIidToLoc(node);
        var ret = replaceInStatement(
            logFunctionEnterFunName + "(" + RP + "1,arguments.callee, this, arguments)",
            getIid()
        );
        transferLoc(ret[0].expression, node);
        return ret;
    }

    function createCallAsScriptEnterStatement(node) {
        printIidToLoc(node);
        var ret = replaceInStatement(logScriptEntryFunName + "(" + RP + "1," + RP + "2, " + RP + "3)",
            getIid(),
            createLiteralAst(instCodeFileName), createLiteralAst(origCodeFileName));
        transferLoc(ret[0].expression, node);
        return ret;
    }

    var labelCounter = 0;

    function wrapForIn(node, left, right, body) {
        printIidToLoc(node);
        var tmp, extra, isDeclaration = (left.type === 'VariableDeclaration');
        if (isDeclaration) {
            var name = node.left.declarations[0].id.name;
            tmp = replaceInExpr(name + " = " + logTmpVarName);
        } else {
            tmp = replaceInExpr(RP + "1 = " + logTmpVarName, left);
        }
        transferLoc(tmp, node);
        extra = instrumentStore(tmp, isDeclaration);

        var ret;

        if (body.type === 'BlockExpression') {
            body = body.body;
        } else {
            body = [body];
        }
        if (isDeclaration) {
            ret = replaceInStatement(
                "function n() {  for(" + logTmpVarName + " in " + RP + "1) {var " + name + " = " + RP + "2;\n {" + RP + "3}}}", right, wrapWithX1(node, extra.right), body);
        } else {
            ret = replaceInStatement(
                "function n() {  for(" + logTmpVarName + " in " + RP + "1) {" + RP + "2;\n {" + RP + "3}}}", right, wrapWithX1(node, extra), body);
        }
        ret = ret[0].body.body[0];
        transferLoc(ret, node);
        return ret;
    }


    function wrapForInBody(node, body, name) {
        printIidToLoc(node);
        var ret = replaceInStatement(
            "function n() { " + logInitFunName + "(" + RP + "1, '" + name + "'," + name + ","+createBitPattern(false, true, false)+");\n {" + RP + "2}}", getIid(), [body]);

        ret = ret[0].body;
        transferLoc(ret, node);
        return ret;
    }

    function wrapCatchClause(node, body, name) {
        var ret;
        if (!Config.INSTR_INIT || Config.INSTR_INIT(node)) {
            body.unshift(createCallInitAsStatement(node,
                createLiteralAst(name),
                createIdentifierAst(name),
                false, createIdentifierAst(name), true, true)[0]);
        }
    }

    function wrapScriptBodyWithTryCatch(node, body) {
        if (!Config.INSTR_TRY_CATCH_ARGUMENTS || Config.INSTR_TRY_CATCH_ARGUMENTS(node)) {
            printIidToLoc(node);
            var iid1 = getIid();
            printIidToLoc(node);
            var l = labelCounter++;


            var ret = replaceInStatement(
                "function n() { jalangiLabel" + l + ": while(true) { try {" + RP + "1} catch(" + JALANGI_VAR +
                "e) { //console.log(" + JALANGI_VAR + "e); console.log(" +
                JALANGI_VAR + "e.stack);\n  " + logUncaughtExceptionFunName + "(" + RP + "2," + JALANGI_VAR +
                "e); } finally { if (" + logScriptExitFunName + "(" +
                RP + "3)) { " + logLastComputedFunName + "(); continue jalangiLabel" + l + ";\n } else {\n  " + logLastComputedFunName + "(); break jalangiLabel" + l + ";\n }}\n }}", body,
                iid1,
                getIid()
            );

            ret = ret[0].body.body;
            transferLoc(ret[0], node);
            return ret;
        } else {
            return body;
        }
    }

    function wrapFunBodyWithTryCatch(node, body) {
        if (!Config.INSTR_TRY_CATCH_ARGUMENTS || Config.INSTR_TRY_CATCH_ARGUMENTS(node)) {
            printIidToLoc(node);
            var iid1 = getIid();
            printIidToLoc(node);
            var l = labelCounter++;

            if (classTag ===  true) {
                var ret = replaceInStatement(
                    "function n() { jalangiLabel" + l + ": while(true) { try {" + RP + "1} catch(" + JALANGI_VAR +
                    "e) { //console.log(" + JALANGI_VAR + "e); console.log(" +
                    JALANGI_VAR + "e.stack);\n " + logUncaughtExceptionFunName + "(" + RP + "2," + JALANGI_VAR +
                    "e); } finally { return " + logReturnAggrFunName + "();\n }\n }}", body,
                    iid1,
                    getIid()
                );

            }else{

                var ret = replaceInStatement(
                    "function n() { jalangiLabel" + l + ": while(true) { try {" + RP + "1} catch(" + JALANGI_VAR +
                    "e) { //console.log(" + JALANGI_VAR + "e); console.log(" +
                    JALANGI_VAR + "e.stack);\n " + logUncaughtExceptionFunName + "(" + RP + "2," + JALANGI_VAR +
                    "e); } finally { if (" + logFunctionReturnFunName + "(" +
                    RP + "3)) continue jalangiLabel" + l + ";\n else \n  return " + logReturnAggrFunName + "();\n }\n }}", body,
                    iid1,
                    getIid()
                );
            }
            //console.log(JSON.stringify(ret));

            ret = ret[0].body.body;
            transferLoc(ret[0], node);
            return ret;
        } else {
            return body;
        }
    }

    function syncDefuns(node, scope, isScript) {
        var ret = [], ident;
        if (!isScript) {
            if (!Config.INSTR_TRY_CATCH_ARGUMENTS || Config.INSTR_TRY_CATCH_ARGUMENTS(node)) {
                if (!Config.INSTR_INIT || Config.INSTR_INIT(node)) {
                    printIidToLoc(node);
                    var code = "J$.N(" + getIid().value + ", 'arguments', arguments, 4);";
                    var arguments_node = createIdentifierAst(code);
                    ret = ret.concat(arguments_node);
                    transferLoc(arguments_node, node)
                }
            }
        }
        if (scope) {
                for (var name in scope.vars) {
                    if (HOP(scope.vars, name)) {
                        if (scope.vars[name] === "defun") {
                            if (!Config.INSTR_INIT || Config.INSTR_INIT(node)) {
                                ident = createIdentifierAst(name);
                                ident.loc = scope.funLocs[name];
                                ret = ret.concat(createCallInitAsStatement(node,
                                    createLiteralAst(name),
                                    wrapLiteral(ident, ident, N_LOG_FUNCTION_LIT),
                                    false,
                                    ident, false, true));
                            } else {
                                ident = createIdentifierAst(name);
                                ident.loc = scope.funLocs[name];
                                ret = ret.concat(
                                    createExpressionStatement(ident,
                                        wrapLiteral(ident, ident, N_LOG_FUNCTION_LIT)));
                            }
                        }
                        if (scope.vars[name] === "lambda") {
                            if (!Config.INSTR_INIT || Config.INSTR_INIT(node)) {
                                ident = createIdentifierAst(name);
                                ident.loc = scope.funLocs[name];
                                ret = ret.concat(createCallInitAsStatement(node,
                                    createLiteralAst(name), ident,
                                    false,
                                    ident, false, true));
                            }
                        }
                        if (scope.vars[name] === "arg") {
                            if (!Config.INSTR_INIT || Config.INSTR_INIT(node)) {
                                ident = createIdentifierAst(name);
                                ret = ret.concat(createCallInitAsStatement(node,
                                    createLiteralAst(name),
                                    ident,
                                    true,
                                    ident, false, true));
                            }
                        }
                        if (scope.vars[name] === "var") {
                            if (!Config.INSTR_INIT || Config.INSTR_INIT(node)) {
                                ret = ret.concat(createCallInitAsStatement(node,
                                    createLiteralAst(name),
                                    createIdentifierAst(name),
                                    false, undefined, false, false));
                            }
                        }
                    }
                }
        }

        // if (yiruma_temp_userd_flag === true){
        //     ret = ret.concat(createCallInitAsStatement(node,
        //         createLiteralAst("yiruma_temp"),
        //         createIdentifierAst("yiruma_temp"),
        //         false, undefined, false, false));
        // }

        return ret;
    }


    var scope;


    function instrumentFunctionEntryExit(node, ast) {
        return ast;
        var body;
        if (!Config.INSTR_TRY_CATCH_ARGUMENTS || Config.INSTR_TRY_CATCH_ARGUMENTS(node)) {
            body = createCallAsFunEnterStatement(node);
        } else {
            body = [];
        }
        // 如果在class内，则去掉J$.Fe(17, arguments.callee, this, arguments);这句话
        console.log(classTag);
        if (classTag === true) {
            body = [];
        }
        /*
        body即createCallAsFunEnterStatement(node): J$.Fe(17, arguments.callee, this, arguments);
        syncDefuns(): arguments = J$.N(25, 'arguments', arguments, 4);
                      arg1 = J$.N(49, 'arg1', arg1, 4);
        ast即函数体：   J$.M(9, console, 'log', 0)(arg1);
        * */

        body = body.concat(syncDefuns(node, scope, false)).concat(ast);
        return body;
    }

//    function instrumentFunctionEntryExit(node, ast) {
//        return wrapFunBodyWithTryCatch(node, ast);
//    }

    /**
     * instruments entry of a script.  Adds the script entry (J$.Se) callback,
     * and the J$.N init callbacks for locals.
     *
     */
    function instrumentScriptEntryExit(node, body0) {

        var body;
        if (!Config.INSTR_TRY_CATCH_ARGUMENTS || Config.INSTR_TRY_CATCH_ARGUMENTS(node)) {
            body = createCallAsScriptEnterStatement(node)
        } else {
            body = [];
        }
        body = body.concat(syncDefuns(node, scope, true)).
            concat(body0);
        return body;
    }


    function getPropertyAsAst(ast) {
        return ast.computed ? ast.property : createLiteralAst(ast.property.name);
    }

    /*
    找一种统一的方式, 我需要一下几个参数
    1. 函数。也就是callAst.callee这一部分。
    2. 函数完整名字。 也就是callAst.callee这部分转化为字符串后的。
    3. base。 也就是在MemberExpression下，callAst.callee.object对应的这部分。
    J$.F(iid, chrome.storage.local.set, 'chrome.storage.local.set', chrome.storage.local);
    J$.F(iid, test, 'test', undefined);
    这样的话，xhr.send()使用函数名func.name，配合base的类型来筛选
    console.log()直接使用函数完整名字来判断。
    * */
    function instrumentCall(callAst, isCtor) {
        let ast = callAst.callee; //处理的部分是Expression的callee部分，最后返回的也是这部分。也就是test()的test,console.log()的console.log。
        let ret;
        if (ast.type === 'MemberExpression')
            ret = wrapFunCall(callAst, ast, escodegen.generate(ast), ast.object, isCtor);
        else
            ret = wrapFunCall(callAst, ast, escodegen.generate(ast), undefined, isCtor);
        return ret;
    }

    function instrumentStore(node, isDeclaration) {
        if (node.left.type !== 'Identifier') {
            return wrapPutField(node, node.left.object, getPropertyAsAst(node.left), node.right, node.left.computed);
        }
        return node;
    }

    function instrumentLoad(ast, isTypeof) {
        var ret;
        if (ast.type === 'Identifier') {
            if (ast.name === "undefined") {
                ret = wrapLiteral(ast, ast, N_LOG_UNDEFINED_LIT);
                return ret;
            } else if (ast.name === "NaN" || ast.name === "Infinity") {
                ret = wrapLiteral(ast, ast, N_LOG_NUMBER_LIT);
                return ret;
            }
            if (ast.name === JALANGI_VAR) {
                return ast;
            } else {
                ret = wrapRead(ast, createLiteralAst(ast.name), ast, false, true, false)
                return ret;
            }

        } else if (ast.type === 'MemberExpression') {
            return wrapGetField(ast, ast.object, getPropertyAsAst(ast), ast.computed);
        } else {
            return ast;
        }
    }

    function instrumentLoadModStore(node, isNumber) {
        if (node.left.type === 'Identifier') {
            var tmp0 = instrumentLoad(node.left, false);
            if (isNumber) {
                tmp0 = makeNumber(node, instrumentLoad(tmp0, false));
            }
            var tmp1 = wrapRHSOfModStore(node.right, tmp0, node.right, node.operator.substring(0, node.operator.length - 1));

            var tmp2;

            tmp2 = wrapWrite(node, createLiteralAst(node.left.name), tmp1, node.left, false, false, false);

            tmp2 = wrapLHSOfModStore(node, node.left, tmp2);
            return tmp2;
        } else {
            var ret = wrapModAssign(node, node.left.object,
                getPropertyAsAst(node.left),
                node.operator.substring(0, node.operator.length - 1),
                node.right, node.left.computed);
            return ret;
        }
    }

    function instrumentPreIncDec(node) {
        var right = createLiteralAst(1);
        right = wrapLiteral(right, right, N_LOG_NUMBER_LIT);
        var ret = wrapRHSOfModStore(node, node.argument, right, node.operator.substring(0, 1) + "=");
        return instrumentLoadModStore(ret, true);
    }

    function adjustIncDec(op, ast) {
        if (op === '++') {
            op = '-';
        } else {
            op = '+';
        }
        var right = createLiteralAst(1);
        right = wrapLiteral(right, right, N_LOG_NUMBER_LIT);
        var ret = wrapRHSOfModStore(ast, ast, right, op);
        return ret;
    }
	
    // Should 'Program' nodes in the AST be wrapped with prefix code to load libraries,
    // code to indicate script entry and exit, etc.?
    // we need this flag since when we're instrumenting eval'd code, the code is parsed
    // as a top-level 'Program', but the wrapping code may not be syntactically valid in
    // the surrounding context, e.g.:
    //    var y = eval("x + 1");

    function setScope(node) {
        scope = node.scope;
    }

    function funCond0(node) {
        node.test = wrapWithX1(node, node.test);
        node.init = wrapWithX1(node, node.init);
        node.update = wrapWithX1(node, node.update);
        return node;
    }

    function mergeBodies(node) {
        printIidToLoc(node);
        var ret = replaceInStatement(
            "function n() { if (!" + logSampleFunName + "(" + RP + "1, arguments.callee)){" + RP + "2} else {" + RP + "3}}",
            getIid(),
            node.bodyOrig.body,
            node.body.body
        );

        node.body.body = ret[0].body.body;
        delete node.bodyOrig;
        return node;
    }

    function regExpToJSON() {
        var str = this.source;
        var glb = this.global;
        var ignoreCase = this.ignoreCase;
        var multiline = this.multiline;
        var obj = {
            type: 'J$.AST.REGEXP',
            value: str,
            glb: glb,
            ignoreCase: ignoreCase,
            multiline: multiline
        }
        return obj;
    }

    function JSONStringifyHandler(key, value) {
        if (key === 'scope') {
            return undefined;
        } if (value instanceof RegExp) {
            return regExpToJSON.call(value);
        } else {
            return value;
        }
    }

    function JSONParseHandler(key, value) {
        var ret = value, flags = '';
        if (typeof value === 'object' && value && value.type === 'J$.AST.REGEXP') {
            if (value.glb)
                flags += 'g';
            if (value.ignoreCase)
                flags += 'i';
            if (value.multiline)
                flags += 'm';
            ret = RegExp(value.value, flags);
        }
        return ret;
    }

    function clone(src) {
        var ret = JSON.parse(JSON.stringify(src, JSONStringifyHandler), JSONParseHandler);
        return ret;
    }


    var visitorCloneBodyPre = {
        "FunctionExpression": function (node) {
            node.bodyOrig = clone(node.body);
            return node;
        },
        "FunctionDeclaration": function (node) {
            node.bodyOrig = clone(node.body);
            return node;
        }
    };

    var visitorMergeBodyPre = {
        "FunctionExpression": mergeBodies,
        "FunctionDeclaration": mergeBodies
    };

    var visitorRRPre = {
        'MemberExpression': function (node, context) {
            return wrapGetField(node, node.object, escodegen.generate(node.object), getPropertyAsAst(node), node.computed);
        },
        "CallExpression": function (node) {
            if (escodegen.generate(node).startsWith("J$") ||
                escodegen.generate(node).startsWith("super"))
                return node;

            node.callee = instrumentCall(node, false); //非构造函数，因为已经针对New表达式做处理了
            return node;
        },
        "AssignmentExpression": function (node) {
            if (escodegen.generate(node).startsWith("J$"))
                return node;

            var ret1;
            if (node.operator === "=") {
                ret1 = instrumentStore(node, false);
            } else {
                ret1 = instrumentLoadModStore(node);
            }
            return ret1;
        }
    };

    var visitorRRPost = {
        "ObjectExpression": function(node){
            return wrapObject(node);
        },
        "ArrayExpression": function (node) {

            return wrapArray(node);
        },
        "NewExpression": function(node){

            return wrapNewExpression(node);
        }
    };

    function funCond(node) {
        var ret = wrapConditional(node.test, node.test);
        node.test = ret;
        node.test = wrapWithX1(node, node.test);
        node.init = wrapWithX1(node, node.init);
        node.update = wrapWithX1(node, node.update);
        return node;
    }


    var visitorOps = {
        'BinaryExpression': function (node) {
            var ret = wrapBinaryOp(node, node.left, node.right, node.operator);
            return ret;
        },
        'LogicalExpression': function (node) {
            var ret;
            if (node.operator === "&&") {
                ret = wrapLogicalAnd(node, node.left, node.right);
            } else if (node.operator === "||") {
                ret = wrapLogicalOr(node, node.left, node.right);
            }
            return ret;
        },
        'UnaryExpression': function (node) {
            var ret;
            if (node.operator === "void" || node.operator === "typeof") {
                return node;
            } else if (node.operator === "delete") {
                if (node.argument.object) {
                    ret = wrapBinaryOp(node, node.argument.object, getPropertyAsAst(node.argument), node.operator, node.argument.computed);
                } else {
                    return node;
                }
            } else {
                ret = wrapUnaryOp(node, node.argument, node.operator);
            }
            return ret;
        },
        "SwitchStatement": function (node) {
            var dis = wrapSwitchDiscriminant(node.discriminant, node.discriminant);
            dis = wrapWithX1(node.discriminant, dis);
            var cases = MAP(node.cases, function (acase) {
                var test;
                if (acase.test) {
                    test = wrapSwitchTest(acase.test, acase.test);
                    acase.test = wrapWithX1(acase.test, test);
                }
                return acase;
            });
            node.discriminant = dis;
            node.cases = cases;
            return node;
        }
    };

    function addScopes(ast) {

        function Scope(parent, isCatch) {
            this.vars = {};
            this.funLocs = {};
            this.funNodes = {};
            this.hasEval = false;
            this.hasArguments = false;
            this.parent = parent;
            this.isCatch = isCatch;
        }

        Scope.prototype.addVar = function (name, type, loc, node) {
            var tmpScope = this;
            if (this.isCatch && type !== 'catch') {
                tmpScope = this.parent;
            }

            if (tmpScope.vars[name] !== 'arg') {
                tmpScope.vars[name] = type;
            }
            if (type === 'defun') {
                tmpScope.funLocs[name] = loc;
                tmpScope.funNodes[name] = node;
            }
        };

        Scope.prototype.hasOwnVar = function (name) {
            var s = this;
            if (s && HOP(s.vars, name))
                return s.vars[name];
            return null;
        };

        Scope.prototype.hasVar = function (name) {
            var s = this;
            while (s !== null) {
                if (HOP(s.vars, name))
                    return s.vars[name];
                s = s.parent;
            }
            return null;
        };

        Scope.prototype.isGlobal = function (name) {
            var s = this;
            while (s !== null) {
                if (HOP(s.vars, name) && s.parent !== null) {
                    return false;
                }
                s = s.parent;
            }
            return true;
        };

        Scope.prototype.addEval = function () {
            var s = this;
            while (s !== null) {
                s.hasEval = true;
                s = s.parent;
            }
        };

        Scope.prototype.addArguments = function () {
            var s = this;
            while (s !== null) {
                s.hasArguments = true;
                s = s.parent;
            }
        };

        Scope.prototype.usesEval = function () {
            return this.hasEval;
        };

        Scope.prototype.usesArguments = function () {
            return this.hasArguments;
        };


        var currentScope = null;

        // rename arguments to J$_arguments
        var fromName = 'arguments';
        var toName = JALANGI_VAR + "_arguments";

        function handleFun(node) {
            var oldScope = currentScope;
            currentScope = new Scope(currentScope);
            node.scope = currentScope;
            if (node.type === 'FunctionDeclaration') {
                oldScope.addVar(node.id.name, "defun", node.loc, node);
                MAP(node.params, function (param) {
                    if (param.name === fromName) {         // rename arguments to J$_arguments
                        param.name = toName;
                    }
                    currentScope.addVar(param.name, "arg");
                });
            } else if (node.type === 'FunctionExpression') {
                if (node.id !== null) {
                    currentScope.addVar(node.id.name, "lambda");
                }
                MAP(node.params, function (param) {
                    if (param.name === fromName) {         // rename arguments to J$_arguments
                        param.name = toName;
                    }
                    currentScope.addVar(param.name, "arg");
                });
            }
        }

        function handleVar(node) {
            currentScope.addVar(node.id.name, "var");
        }

        function handleCatch(node) {
            var oldScope = currentScope;
            currentScope = new Scope(currentScope, true);
            node.scope = currentScope;
            currentScope.addVar(node.param.name, "catch");
        }

        function popScope(node) {
            currentScope = currentScope.parent;
            return node;
        }

        var visitorPre = {
            'Program': handleFun,
            'FunctionDeclaration': handleFun,
            'FunctionExpression': handleFun,
            'VariableDeclarator': handleVar,
            'CatchClause': handleCatch
        };

        var visitorPost = {
            'Program': popScope,
            'FunctionDeclaration': popScope,
            'FunctionExpression': popScope,
            'CatchClause': popScope,
            'Identifier': function (node, context) {         // rename arguments to J$_arguments
                if (context === astUtil.CONTEXT.RHS && node.name === fromName && currentScope.hasOwnVar(toName)) {
                    node.name = toName;
                }
                return node;
            },
            "UpdateExpression": function (node) {         // rename arguments to J$_arguments
                if (node.argument.type === 'Identifier' && node.argument.name === fromName && currentScope.hasOwnVar(toName)) {
                    node.argument.name = toName;
                }
                return node;
            },
            "AssignmentExpression": function (node) {         // rename arguments to J$_arguments
                if (node.left.type === 'Identifier' && node.left.name === fromName && currentScope.hasOwnVar(toName)) {
                    node.left.name = toName;
                }
                return node;
            }

        };
        astUtil.transformAst(ast, visitorPost, visitorPre);
    }


    // START of Liang Gong's AST post-processor
    function hoistFunctionDeclaration(ast, hoisteredFunctions) {
        var key, child, startIndex = 0;
        if (ast.body) {
            var newBody = [];
            if (ast.body.length > 0) { // do not hoister function declaration before J$.Fe or J$.Se
                if (ast.body[0].type === 'ExpressionStatement') {
                    if (ast.body[0].expression.type === 'CallExpression') {
                        if (ast.body[0].expression.callee.object &&
                            ast.body[0].expression.callee.object.name === 'J$'
                            && ast.body[0].expression.callee.property
                            &&
                            (ast.body[0].expression.callee.property.name === 'Se' || ast.body[0].
                                expression.callee.property.name === 'Fe')) {

                            newBody.push(ast.body[0]);
                            startIndex = 1;
                        }
                    }
                }
            }
            for (var i = startIndex; i < ast.body.length; i++) {

                if (ast.body[i].type === 'FunctionDeclaration') {
                    newBody.push(ast.body[i]);
                    if (newBody.length !== i + 1) {
                        hoisteredFunctions.push(ast.body[i].id.name);
                    }
                }
            }
            for (var i = startIndex; i < ast.body.length; i++) {
                if (ast.body[i].type !== 'FunctionDeclaration') {
                    newBody.push(ast.body[i]);
                }
            }
            while (ast.body.length > 0) {
                ast.body.pop();
            }
            for (var i = 0; i < newBody.length; i++) {
                ast.body.push(newBody[i]);
            }
        } else {
            //console.log(typeof ast.body);
        }
        for (key in ast) {
            if (ast.hasOwnProperty(key)) {
                child = ast[key];
                if (typeof child === 'object' && child !== null && key !==
                    "scope") {
                    hoistFunctionDeclaration(child, hoisteredFunctions);
                }

            }
        }

        return ast;
    }

    // END of Liang Gong's AST post-processor

    function transformString(code, visitorsPost, visitorsPre) {
//         StatCollector.resumeTimer("parse");
//        console.time("parse")
//        var newAst = esprima.parse(code, {loc:true, range:true});
        var newAst = acorn.parse(code, {locations: true});
//        console.timeEnd("parse")
//        StatCollector.suspendTimer("parse");
//        StatCollector.resumeTimer("transform");
//        console.time("transform")
        addScopes(newAst);
        var len = visitorsPost.length;
        // console.log(JSON.stringify(newAst,null,4));
        // console.log(esotope.generate(newAst,{comment:true,parse:acorn.parse})+"\n");

        for (var i = 0; i < len; i++) {
            newAst = astUtil.transformAst(newAst, visitorsPost[i], visitorsPre[i], astUtil.CONTEXT.RHS, false);
        }
//        console.timeEnd("transform")
//        StatCollector.suspendTimer("transform");
//        console.log(JSON.stringify(newAst,null,"  "));
        return newAst;
    }

    // if this string is discovered inside code passed to instrumentCode(),
    // the code will not be instrumented
    var noInstr = "// JALANGI DO NOT INSTRUMENT";

    function initializeIIDCounters(forEval) {
        var adj = forEval ? IID_INC_STEP / 2 : 0;
        condIid = IID_INC_STEP + adj + 0;
        memIid = IID_INC_STEP + adj + 1;
        opIid = IID_INC_STEP + adj + 2;
    }


    function instrumentEvalCode(code, iid, isDirect) {
        return instrumentCode({
            code: code,
            thisIid: iid,
            isEval: true,
            inlineSourceMap: true,
            inlineSource: true,
            isDirect: isDirect
        }).code;
    }

    function removeShebang(code) {
        if (code.indexOf("#!") == 0) {
            return code.substring(code.indexOf("\n") + 1);
        }
        return code;
    }

    /**
     * Instruments the provided code.
     *
     * @param {{isEval: boolean, code: string, thisIid: int, origCodeFileName: string, instCodeFileName: string, inlineSourceMap: boolean, inlineSource: boolean, url: string, isDirect: boolean }} options
     * @return {{code:string, instAST: object, sourceMapObject: object, sourceMapString: string}}
     *
     */
    function instrumentCode(options) {
        var aret, skip = false;
        var isEval = options.isEval,
            code = options.code, thisIid = options.thisIid, inlineSource = options.inlineSource, url = options.url;

        iidSourceInfo = {};
        initializeIIDCounters(isEval);
        instCodeFileName = options.instCodeFileName ? options.instCodeFileName : (options.isDirect?"eval":"evalIndirect");
        origCodeFileName = options.origCodeFileName ? options.origCodeFileName : (options.isDirect?"eval":"evalIndirect");


        if (sandbox.analysis && sandbox.analysis.instrumentCodePre) {
            aret = sandbox.analysis.instrumentCodePre(thisIid, code, options.isDirect);
            if (aret) {
                code = aret.code;
                skip = aret.skip;
            }
        }

        if (!skip && typeof code === 'string' && code.indexOf(noInstr) < 0) {
            try {
                code = removeShebang(code);
                // code = "class RealTimeStrategy {\n" +
                //     "    constructor() {\n" +
                //     "    \tvar a;\n" +
                //     "    }\n" +
                //     "}";
                iidSourceInfo = {};
                var newAst;
                if (Config.ENABLE_SAMPLING) {
                    newAst = transformString(code, [visitorCloneBodyPre, visitorRRPost, visitorOps, visitorMergeBodyPre], [undefined, visitorRRPre, undefined, undefined]);
                } else {
                    newAst = transformString(code, [visitorRRPost, visitorOps], [visitorRRPre, undefined]);
                }
                // post-process AST to hoist function declarations (required for Firefox)
                var hoistedFcts = [];
                newAst = hoistFunctionDeclaration(newAst, hoistedFcts);
                // newAst = acorn.parse("class RealTimeStrategy {\n" +
                //     "    constructor() {\n" +
                //     "    \tvar a;\n" +
                //     "    }\n" +
                //     "}");
                var newCode = escodegen.generate(newAst);
                code = newCode + "\n" + noInstr + "\n";

                // code = code.replace(/'whu\(function/g, "(function");
                // code = code.replace(/\(\)whu'/g, "()");

            } catch(ex) {
                console.log("Failed to instrument", code);
                throw ex;
            }
        }

        var tmp = {};

        tmp.nBranches = iidSourceInfo.nBranches = (condIid / IID_INC_STEP - 1) * 2;
        tmp.originalCodeFileName = iidSourceInfo.originalCodeFileName = origCodeFileName;
        tmp.instrumentedCodeFileName = iidSourceInfo.instrumentedCodeFileName = instCodeFileName;
        if (url) {
            tmp.url = iidSourceInfo.url = url;
        }
        if (isEval) {
            tmp.evalSid = iidSourceInfo.evalSid = sandbox.sid;
            tmp.evalIid = iidSourceInfo.evalIid = thisIid;
        }
        if (inlineSource) {
            tmp.code = iidSourceInfo.code = options.code;
        }

        var prepend = JSON.stringify(iidSourceInfo);
        var instCode;
        if (options.inlineSourceMap) {
            instCode = "if (J$.iids===undefined) {J$.iids={}};\n" + "J$.iids["+ escodegen.generate(createLiteralAst(origCodeFileName)) +"] = " + prepend + ";\n" + code;
        } else {
            instCode = "if (J$.iids===undefined) {J$.iids={}};\n" + "J$.iids["+ escodegen.generate(createLiteralAst(origCodeFileName)) +"] = " + JSON.stringify(tmp) + ";\n" + code;
        }

        if (isEval && sandbox.analysis && sandbox.analysis.instrumentCode) {
            aret = sandbox.analysis.instrumentCode(thisIid, instCode, newAst, options.isDirect);
            if (aret) {
                instCode = aret.result;
            }
        }

        return {code: instCode, instAST: newAst, sourceMapObject: iidSourceInfo, sourceMapString: prepend};

    }

    sandbox.instrumentCode = instrumentCode;
    sandbox.instrumentEvalCode = instrumentEvalCode;

}(J$));


// exports J$.instrumentCode
// exports J$.instrumentEvalCode
// depends on acorn
// depends on esotope
// depends on J$.Constants
// depends on J$.Config
// depends on J$.astUtil
