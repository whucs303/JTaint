if (typeof J$ === 'undefined') {
    J$ = {};
    J$.initParams = {};

    // 设置J$.Constants
    var Constants = J$.Constants = {};

    Constants.isBrowser = !(typeof exports !== 'undefined' && this.exports !== exports);

    var APPLY = Constants.APPLY = Function.prototype.apply;
    var CALL = Constants.CALL = Function.prototype.call;
    APPLY.apply = APPLY;
    APPLY.call = CALL;
    CALL.apply = APPLY;
    CALL.call = CALL;

    var HAS_OWN_PROPERTY = Constants.HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty;
    Constants.HAS_OWN_PROPERTY_CALL = Object.prototype.hasOwnProperty.call;

    var PREFIX1 = Constants.JALANGI_VAR = "J$";
    Constants.SPECIAL_PROP = "*" + PREFIX1 + "*";
    Constants.SPECIAL_PROP2 = "*" + PREFIX1 + "I*";
    Constants.SPECIAL_PROP3 = "*" + PREFIX1 + "C*";
    Constants.SPECIAL_PROP4 = "*" + PREFIX1 + "W*";
    Constants.SPECIAL_PROP_SID = "*" + PREFIX1 + "SID*";
    Constants.SPECIAL_PROP_IID = "*" + PREFIX1 + "IID*";

    Constants.UNKNOWN = -1;

    var HOP = Constants.HOP = function (obj, prop) {
        return (prop + "" === '__proto__') || CALL.call(HAS_OWN_PROPERTY, obj, prop); //Constants.HAS_OWN_PROPERTY_CALL.apply(Constants.HAS_OWN_PROPERTY, [obj, prop]);
    };

    Constants.hasGetterSetter = function (obj, prop, isGetter) {
        if (typeof Object.getOwnPropertyDescriptor !== 'function') {
            return true;
        }
        while (obj !== null) {
            if (typeof obj !== 'object' && typeof obj !== 'function') {
                return false;
            }
            var desc = Object.getOwnPropertyDescriptor(obj, prop);
            if (desc !== undefined) {
                if (isGetter && typeof desc.get === 'function') {
                    return true;
                }
                if (!isGetter && typeof desc.set === 'function') {
                    return true;
                }
            } else if (HOP(obj, prop)) {
                return false;
            }
            obj = obj.__proto__;
        }
        return false;
    };


    // J$的一些函数
    // iid样式: '121|C:\\Users\\Yiruma\\Desktop\\instru_js.js\\postback_orig_.js'
    J$.iidToLocation = function (sid, iid) {

        iid = iid.split("|");
        var tag = iid[1];
        var id = iid[0];
        var iidLocation = undefined;
        if (J$.iids[tag] !== undefined) {
            if (J$.iids[tag][id] !== undefined) {
                iidLocation = J$.iids[tag][id];
                iidLocation = iidLocation[0] + ":" + iidLocation[1] + ":" + iidLocation[2] + ":" + iidLocation[3];
            }
        }
        if (iidLocation === undefined) {
            iidLocation = 0 + ":" + 0 + ":" + 0 + ":" + 1;
        }

        var js_path = J$.iids[tag].originalCodeFileName;
        js_path = js_path.replace("orig_.js", "jalangi_.json");
        var new_js_path = btoa(js_path);
        // for (i = 0; i < js_path.length; i++) {
        //     if (js_path[i] === "\\") {
        //         new_js_path += "\\\\";
        //     } else {
        //         new_js_path += js_path[i];
        //     }
        // }

        return "<li><a href=\"javascript:iidToDisplayCodeLocation('" + new_js_path + ":" + iidLocation + "')\">iidToLocation</a></li><br>";
    };

    J$.getGlobalIID = function (iid) {
        return J$.sid + ":" + iid;
    };


    // 插入J$.F等触发函数
    (function (sandbox) {

        var global = this;
        var Function = global.Function;
        var switchLeft;
        var switchKeyStack = [];
        var EVAL_ORG = eval;
        var lastComputedValue;
        var SPECIAL_PROP_SID = sandbox.Constants.SPECIAL_PROP_SID;
        var SPECIAL_PROP_IID = sandbox.Constants.SPECIAL_PROP_IID;


        function getPropSafe(base, prop) {
            if (base === null || base === undefined) {
                return undefined;
            }
            return base[prop];
        }

        function decodeBitPattern(i, len) {
            var ret = new Array(len);
            for (var j = 0; j < len; j++) {
                var val = (i & 1) ? true : false;
                ret[len - j - 1] = val;
                i = i >> 1;
            }
            return ret;
        }

        function createBitPattern() {
            var ret = 0;
            var i;
            for (i = 0; i < arguments.length; i++) {
                ret = (ret << 1) + (arguments[i] ? 1 : 0);
            }
            return ret;
        }


        function pushSwitchKey() {
            switchKeyStack.push(switchLeft);
        }

        function popSwitchKey() {
            switchLeft = switchKeyStack.pop();
        }


        function callAsNativeConstructorWithEval(Constructor, args) {
            var a = [];
            for (var i = 0; i < args.length; i++)
                a[i] = 'args[' + i + ']';
            var eval = EVAL_ORG;
            return eval('new Constructor(' + a.join() + ')');
        }

        function callAsNativeConstructor(Constructor, args) {
            if (args.length === 0) {
                return new Constructor();
            }
            if (args.length === 1) {
                return new Constructor(args[0]);
            }
            if (args.length === 2) {
                return new Constructor(args[0], args[1]);
            }
            if (args.length === 3) {
                return new Constructor(args[0], args[1], args[2]);
            }
            if (args.length === 4) {
                return new Constructor(args[0], args[1], args[2], args[3]);
            }
            if (args.length === 5) {
                return new Constructor(args[0], args[1], args[2], args[3], args[4]);
            }
            return callAsNativeConstructorWithEval(Constructor, args);
        }

        function callAsConstructor(Constructor, args) {
            var ret;
            if (true) {
                ret = callAsNativeConstructor(Constructor, args);
                return ret;
            } else { // else branch is a more elegant to call a constructor reflectively, but it leads to memory leak in v8.
                var Temp = function () {
                }, inst;
                Temp.prototype = Constructor.prototype;
                inst = new Temp;
                ret = Constructor.apply(inst, args);
                return Object(ret) === ret ? ret : inst;
            }
        }

        function invokeEval(base, f, args, iid) {
            return f(sandbox.instrumentEvalCode(args[0], iid, false));
        }

        function invokeFunctionDecl(base, f, args, iid) {
            // Invoke with the original parameters to preserve exceptional behavior if input is invalid
            f.apply(base, args);
            // Otherwise input is valid, so instrument and invoke via eval
            var newArgs = [];
            for (var i = 0; i < args.length - 1; i++) {
                newArgs[i] = args[i];
            }
            var code = '(function(' + newArgs.join(', ') + ') { ' + args[args.length - 1] + ' })';
            var code = sandbox.instrumentEvalCode(code, iid, false);
            // Using EVAL_ORG instead of eval() is important as it preserves the scoping semantics of Function()
            var out = EVAL_ORG(code);
            return out;
        }

        function callFun(f, base, args, isConstructor, iid) {
            var result;
            pushSwitchKey();
            try {
                if (f === Function) {
                    result = invokeFunctionDecl(base, f, args, iid);
                } else if (isConstructor) {
                    result = callAsConstructor(f, args);
                } else {
                    result = Function.prototype.apply.call(f, base, args);
                }
                return result;
            } finally {
                popSwitchKey();
            }
        }

        function invokeFun(iid, f, funcName, base, args, isConstructor, isMethod) {
            var aret, skip = false, result;

            if (sandbox.analysis && sandbox.analysis.invokeFunPre) {
                aret = sandbox.analysis.invokeFunPre(iid, f, funcName, base, args, isConstructor, isMethod, getPropSafe(f, SPECIAL_PROP_IID), getPropSafe(f, SPECIAL_PROP_SID));
                if (aret) {
                    f = aret.f;
                    base = aret.base;
                    args = aret.args;
                    skip = aret.skip;
                }
            }


            if (!skip) {
                result = callFun(f, base, args, isConstructor, iid);
            }
            if (sandbox.analysis && sandbox.analysis.invokeFun) {
                aret = sandbox.analysis.invokeFun(iid, f,funcName, base, args, result, isConstructor, isMethod, getPropSafe(f, SPECIAL_PROP_IID), getPropSafe(f, SPECIAL_PROP_SID));
                if (aret) {
                    result = aret.result;
                }
            }
            return result;
        }


        function F(iid, f, funcName, base, flags) {
            var bFlags = decodeBitPattern(flags, 1); // [isConstructor]
            return function () {
                return (lastComputedValue = invokeFun(iid, f, funcName, base, arguments, bFlags[0], false));
            }
        }


        function N(iid){
	        return function(){
		        return sandbox.analysis.invokeNew(iid, arguments);
	        }
        }



        function G(iid, base, baseStr, offset, flags) {
            var bFlags = decodeBitPattern(flags, 3); // [isComputed, isOpAssign, isMethodCall]

            var aret, skip = false, val;

            val = base[offset];

            if (sandbox.analysis && sandbox.analysis.getField) {
                aret = sandbox.analysis.getField(iid, base, baseStr, offset, val, bFlags[0], bFlags[1], bFlags[2]);
                if (aret) {
                    val = aret.result;
                }
            }
            return (lastComputedValue = val);
        }


        function P(iid, base, offset, val, flags) {
            var bFlags = decodeBitPattern(flags, 2); // [isComputed, isOpAssign]

            var aret, skip = false;

            base[offset] = val;

            if (sandbox.analysis && sandbox.analysis.putField) {
                aret = sandbox.analysis.putField(iid, base, offset, val, bFlags[0], !!bFlags[1]);
                if (aret) {
                    val = aret.result;
                }
            }
            return (lastComputedValue = val);
        }


        function W(iid, name, val, lhs, flags) {
            var bFlags = decodeBitPattern(flags, 3); //[isGlobal, isScriptLocal, isDeclaration]
            var aret;
            if (sandbox.analysis && sandbox.analysis.write) {
                aret = sandbox.analysis.write(iid, name, val, lhs, bFlags[0], bFlags[1]);
                if (aret) {
                    val = aret.result;
                }
            }
            if (!bFlags[2]) {
                return (lastComputedValue = val);
            } else {
                lastComputedValue = undefined;
                return val;
            }
        }


        // Modify and assign +=, -= ...
        function A(iid, base, offset, op, flags) {
            var bFlags = decodeBitPattern(flags, 1); // [isComputed]

            return function (oprnd2) {
                // still possible to get iid collision with a mem operation
                var val = B(iid, op, oprnd1, oprnd2, createBitPattern(false, true, false));
                return P(iid, base, offset, val, createBitPattern(bFlags[0], true));
            };
        }


        function B(iid, op, left, right, flags) {
            var bFlags = decodeBitPattern(flags, 3); // [isComputed, isOpAssign, isSwitchCaseComparison]
            var result, aret, skip = false;

            if (sandbox.analysis && sandbox.analysis.binaryPre) {
                aret = sandbox.analysis.binaryPre(iid, op, left, right, bFlags[1], bFlags[2], bFlags[0]);
                if (aret) {
                    op = aret.op;
                    left = aret.left;
                    right = aret.right;
                    skip = aret.skip;
                }
            }


            if (!skip) {
                switch (op) {
                    case "+":
                        result = left + right;
                        break;
                    case "-":
                        result = left - right;
                        break;
                    case "*":
                        result = left * right;
                        break;
                    case "/":
                        result = left / right;
                        break;
                    case "%":
                        result = left % right;
                        break;
                    case "<<":
                        result = left << right;
                        break;
                    case ">>":
                        result = left >> right;
                        break;
                    case ">>>":
                        result = left >>> right;
                        break;
                    case "<":
                        result = left < right;
                        break;
                    case ">":
                        result = left > right;
                        break;
                    case "<=":
                        result = left <= right;
                        break;
                    case ">=":
                        result = left >= right;
                        break;
                    case "==":
                        result = left == right;
                        break;
                    case "!=":
                        result = left != right;
                        break;
                    case "===":
                        result = left === right;
                        break;
                    case "!==":
                        result = left !== right;
                        break;
                    case "&":
                        result = left & right;
                        break;
                    case "|":
                        result = left | right;
                        break;
                    case "^":
                        result = left ^ right;
                        break;
                    case "delete":
                        result = delete left[right];
                        break;
                    case "instanceof":
                        result = left instanceof right;
                        break;
                    case "in":
                        result = left in right;
                        break;
                    default:
                        throw new Error(op + " at " + iid + " not found");
                        break;
                }
            }

            if (sandbox.analysis && sandbox.analysis.binary) {
                aret = sandbox.analysis.binary(iid, op, left, right, result, bFlags[1], bFlags[2], bFlags[0]);
                if (aret) {
                    result = aret.result;
                }
            }
            return (lastComputedValue = result);
        }


        function U(iid, op, left) {
            var result, aret, skip = false;

            if (sandbox.analysis && sandbox.analysis.unaryPre) {
                aret = sandbox.analysis.unaryPre(iid, op, left);
                if (aret) {
                    op = aret.op;
                    left = aret.left;
                    skip = aret.skip
                }
            }

            if (!skip) {
                switch (op) {
                    case "+":
                        result = +left;
                        break;
                    case "-":
                        result = -left;
                        break;
                    case "~":
                        result = ~left;
                        break;
                    case "!":
                        result = !left;
                        break;
                    case "typeof":
                        result = typeof left;
                        break;
                    case "void":
                        result = void (left);
                        break;
                    default:
                        throw new Error(op + " at " + iid + " not found");
                        break;
                }
            }

            if (sandbox.analysis && sandbox.analysis.unary) {
                aret = sandbox.analysis.unary(iid, op, left, result);
                if (aret) {
                    result = aret.result;
                }
            }
            return (lastComputedValue = result);
        }


        function endExecution() {
            if (sandbox.analysis && sandbox.analysis.endExecution) {
                return sandbox.analysis.endExecution();
            }
        }


        function log(str) {
            if (sandbox.Results && sandbox.Results.execute) {
                sandbox.Results.execute(function (div, jquery, editor) {
                    div.append(str + "<br>");
                });
            } else {
                console.log(str);
            }
        }


        //----------------------------------- End Jalangi Library backend ---------------------------------

        sandbox.U = U; // Unary operation
        sandbox.B = B; // Binary operation
        sandbox.G = G; // getField
        sandbox.P = P; // putField
        sandbox.W = W; // Write
        sandbox.F = F; // Function call
        sandbox.A = A; // Method call
        sandbox.N = N; // new expression

        sandbox.endExecution = endExecution;
        sandbox.EVAL_ORG = EVAL_ORG;
        sandbox.log = log;
    })(J$);



