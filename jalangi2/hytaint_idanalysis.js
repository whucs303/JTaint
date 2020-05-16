(function (sandbox) {

    if (sandbox.Constants.isBrowser) {
        sandbox.Results = {};
    }

    var printDetail = true;

    //==================一些需要用到的工具函数================================================================================

    function sleep(delay) {
        var start = (new Date()).getTime();
        while ((new Date()).getTime() - start < delay) {
            continue;
        }
    }


    function addcolor(str, obj){

        if(isPartTaint(obj)){
            return "<label style=\"color:#ff7600\">"+ str + "</label>";
        }

        if(isTaint(obj)){
            return "<label style=\"color:#ff0000\">"+ str + "</label>";
        }

        return "<label style=\"color:#22c200\">"+ str + "</label>";
    }


    function instruDynamic(code, tag){
        var letter32 = /[a-z]{32}/.exec(J$.iids[tag].originalCodeFileName);
        if (letter32 !== null)
            letter32 = letter32[0];
        else
            letter32 = "temp";

        var instruCode = "";
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "http://127.0.0.1/instruDynamic.php?filename="+letter32, false);
        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
        xhr.onload = function(e){
            if (this.status === 200){
                instruCode = this.responseText;
            }else{
                return "";
            }
        };
        try {
            xhr.send("code=" + encodeURI(code));
        } catch(error) {}

        return instruCode;
    }


    function senddata(data, tag){

        var extension_path = /[a-z]{32}/.exec(J$.iids[tag].originalCodeFileName);
        if (extension_path !== null){
            extension_path = extension_path[0];
        }

        var path = "./"+ extension_path + ".html";

        var xhr = new XMLHttpRequest();
        xhr.open('POST','http://127.0.0.1/send1.php?path='+path);
        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
        xhr.send("data=" + encodeURI(data));

    }


    function log_i(str, tag, count){ // 另外count作为每一个被记录的边的编号
        senddata(count + " " + str + "\n<br><br>", tag);
        //console.log(str);
        //document.body.innerHTML += "<br><br>"+count + " " + str;
        //sleep(100);  //1s发送20个，避免同时发送过多请求造成乱序，这个睡眠值后面还需要再调整
    }


    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var meta = {    // table of character substitutions
        "\b": "\\b",
        "\t": "\\t",
        "\n": "\\n",
        "\f": "\\f",
        "\r": "\\r",
        "\"": "\\\"",
        "\\": "\\\\"
    };



    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
            var c = meta[a];
            return typeof c === "string"
                ? c
                : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        }) + "\""
            : "\"" + string + "\"";
    }


    function _stringify(value) {
        var value_temp;
        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var partial;
        var taintTag = false;
        var taintValue;

        // If the value has a toJSON method, call it to obtain a replacement value.
        if (value && typeof value === "object" && typeof value.toJSON === "function")
            value = value.toJSON(key);

        switch (typeof value) {
            case "string":
                return quote(value);
            case "number":
                return (isFinite(value)) ? String(value) : "null";
            case "boolean":
            case "null":
                return String(value);
            case "object":
                if (!value) {
                    return "null";
                }

                if (value[TAINT_PROP] !== undefined) {
                    value_temp = {TAINT_PROP: value[TAINT_PROP], ID_PROP: value[ID_PROP], "data": value};
                    taintTag = true;
                    taintValue = value[TAINT_PROP];
                    value[TAINT_PROP] = undefined;
                }else{
                    value_temp = value;
                }

                partial = [];
                if (Object.prototype.toString.apply(value_temp) === "[object Array]") {
                    length = value_temp.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = _stringify(value_temp[i]) || "null";
                    }

                    v = partial.length === 0 ? "[]" : "[" + partial.join(",") + "]";
                } else {
                    for (k in value_temp) {
                        if (Object.prototype.hasOwnProperty.call(value_temp, k)) {
                            v = _stringify(value_temp[k]);
                            if (v) {
                                partial.push(quote(k) + ":" + v);
                            }
                        }
                    }

                    v = partial.length === 0 ? "{}" : "{" + partial.join(",") + "}";
                }
                if (taintTag)
                    value[TAINT_PROP] = taintValue;
                return v;
        }
    }

    function encode(value){
        return _stringify({"taintConstants": sandbox.taintConstants, "data":value});
    }


    function _parse(value) {
        var j;

        value = String(value);
        rx_dangerous.lastIndex = 0;
        if (rx_dangerous.test(value)) {
            value = value.replace(rx_dangerous, function (a) {
                return ("\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4));
            });
        }

        if (rx_one.test(value
            .replace(rx_two, "@")
            .replace(rx_three, "]")
            .replace(rx_four, ""))) {

            j = eval("(" + value + ")");
            return j;
        }
        throw new SyntaxError("JSON.parse");
    }

    function decode(value){
        var handleObj = function handleObj(obj) {
            var i;
            var taintProp;
            var idProp;

            if (Object.prototype.toString.apply(obj) === "[object Object]" &&
                obj["TAINT_PROP"] !== undefined &&
                obj["ID_PROP"] !== undefined) {

                taintProp = obj["TAINT_PROP"];
                idProp = obj["ID_PROP"];
                delete obj["TAINT_PROP"];
                delete obj["ID_PROP"];
                obj = obj["data"];
                Object.defineProperty(obj, TAINT_PROP, {
                    enumerable: false,
                    writable: true
                });
                obj[TAINT_PROP] = taintProp;
                Object.defineProperty(obj, ID_PROP, {
                    enumerable: false,
                    writable: true
                });
                obj[ID_PROP] = idProp;
            }

            // 对array结构和dict结构进行递归处理
            if (Object.prototype.toString.apply(obj) === "[object Array]") {
                for (i = 0; i < obj.length; i += 1) {
                    obj[i] = handleObj(obj[i]);
                }
            }
            if (Object.prototype.toString.apply(obj) === "[object Object]") {
                for (i in obj) {
                    obj[i] = handleObj(obj[i]);
                }
            }

            return obj;
        };

        var obj = _parse(value);
        obj = handleObj(obj);

        var taintConstants = obj["taintConstants"];
        for (let i in taintConstants){ // 将传过来的常量污染值与本页面的进行交集处理
            if (!sandbox.taintConstants.indexOf(taintConstants[i]) > -1)
                sandbox.taintConstants.push(taintConstants[i])
        }

        return obj["data"];
    }





    //==================一些常量定义================================================================================




    var n = "<br>";  //换行符

    // 关于一直提的基于打标记的方案检测污点，目前只是做了与污点的完全匹配，也就是直接将这些常量作为污点。
    // 如果要做更为准确的检测，则需要对所有涉及到的obj做筛查。
    sandbox.taintConstants = [
        "http://127.0.0.1/honey.html",
        "http://cse.whu.edu.cn/login.php?username=flag1&password=flag2",
        "yiruma",
        "yirumaclick",
    ];    //存储运行过程中收集到的污点常量
    var getFieldFuncs = {};     //存储运行过程中从getField中收集到的base.offset()函数，以便于invokeFunc遇到无名函数时做检索

    var TAINT_PROP = "*J$taint*";
    //var FATHER_TAINT_PROP = "*J$father*";
    var ID_PROP = "*J$id*";

    var count = 0; // 每个涉及到污点处理的触发点都会被记录下来上传，因此也都会得到自己的编号

    function initObject(obj){
        if (obj === null)
            return;
        if (typeof obj === "object" || typeof obj === "function") {
            if (obj[ID_PROP] === undefined) {
                Object.defineProperty(obj, ID_PROP, {
                    enumerable: false,
                    writable: true
                });
                obj[ID_PROP] = Math.random();
            }
            if (obj[TAINT_PROP] === undefined) {
                Object.defineProperty(obj, TAINT_PROP, {
                    enumerable: false,
                    writable: true
                });
            }
        }
    }


    function addTaint(obj){
        if (obj === null)
            return;
        // 初始化obj
        initObject(obj);

        //设置taint
        if (typeof obj === "object" || typeof obj === "function") {
            obj[TAINT_PROP] = 2;
        }else if (typeof obj === "string" || typeof obj === "number"){
            if (obj !== "")
                sandbox.taintConstants[sandbox.taintConstants.length] = obj;
        }
    }


    function addPartTaint(obj){
        if (obj === null)
            return;
        // 初始化obj
        initObject(obj);

        //设置taint
        if (typeof obj === "object" || typeof obj === "function") {
            obj[TAINT_PROP] = 1;
        }else if (typeof obj === "string" || typeof obj === "number"){
            if (obj !== "")
                sandbox.taintConstants[sandbox.taintConstants.length] = obj;
        }
    }


    function isTaint(obj){
        if (obj === null)
            return false;
        if (typeof obj === "object" || typeof obj === "function") {
            if (obj[TAINT_PROP] === undefined) {
                return false;
            } else
                return obj[TAINT_PROP] === 1 || obj[TAINT_PROP] === 2;
        }else if (typeof obj === "string" || typeof obj === "number"){
            return sandbox.taintConstants.indexOf(obj) > -1;
        }else{
            return false;
        }
    }


    function isPartTaint(obj){
        if (obj === null)
            return false;
        if (typeof obj === "object" || typeof obj === "function") {
            if (obj[TAINT_PROP] === undefined) {
                return false;
            } else
                return obj[TAINT_PROP] === 1;
        }else{
            return false;
        }
    }


    function getIID(obj){
        if (obj === null)
            return undefined;
        if (typeof obj === "object" || typeof obj === "function") {
            initObject(obj);
            return obj[ID_PROP];
        }else{
            return undefined;
        }
    }


    function getValue(obj) {
        if (obj === null)
            return "null";

        var type = typeof obj;

        //打印object类型---toString和shadowObject的ID
        if (type === 'object') {
            try {
                return "object(" + JSON.stringify(obj) + ")(ID=" + getIID(obj) + ")";
            }
            catch(e){
                return "object(" + obj.toString() + ")(ID=" + getIID(obj) + ")";
            }
        }
        //打印function类型---shadowObject的ID
        else if (type ==='function') {
            var word = "function";
            word += "(name=" + obj.name + ")";
            word += "(ID=" + getIID(obj) + ")";
            return word;
        }
        //打印string类型
        else if (type === 'string') {
            return "string(" + JSON.stringify(obj) + ")";
        }
        //打印number类型
        else if (type === 'number'){
            return "number(" + obj.toString() + ")";
        }
        //打印bool类型
        else if(type === 'boolean'){
            return "boolean(" + obj.toString() + ")";
        }
        //剩下的undefined类型，直接打印值即可
        else{
            return JSON.stringify(obj);
        }
    }



    function splitStr(str) { // 将Source的字符串参数分割为以字母或数字为单位的部分，使用/(\w)+/来实现。
        newStr = str.toString().replace(/_/g," ").toLowerCase();
        var reg=/(\w)+/g;
        res=newStr.match(reg);
        return res;
    }

    function isKeyInDict(dict, key){
        for(let i in dict){
            if (i === key)
                return true;
        }
        return false;
    }



    //==================触发函数的具体实现================================================================================
    // Name只要匹配结尾部分就可以了，即str.endsWith()

    //=========Source==========
    // invokeFun触发点检查
    var sourceFunc_checkFuncName = [
        "$",  //jQuery选择器$("name")  $的原型为Object，因此无法做类型判断
        "jQuery"
    ];
    var sourceFunc_checkBaseObject = {
        "getElementById" : HTMLDocument,
        "getElementsByName" : HTMLDocument,
        "getElementsByClassName" : HTMLDocument,
        "getElementsByTagName" : HTMLDocument,
        "querySelector" : HTMLDocument,
        "querySelectorAll" : HTMLDocument,
    };

    // getField触发点检查
    var sourceField_checkBaseName = {
        "url": "tab"    // tab.url中的tab没有原型链定义，因此只能检查名字
    };
    var sourceField_checkBaseObject = {
        "href" : Location, // https://www.jianshu.com/p/5eabe9e2a3a9?a=1
        "pathname" : Location, // /p/5eabe9e2a3a9
        "search" : Location, // ?a=1
        "cookie" : HTMLDocument,
        "URL" : HTMLDocument,
        "origin" : MessageEvent
    };

    function isExist(){

    }


    //=========Sink==========
    //invokeFun触发点检查
    var sinkFunc_checkFuncName = [
        "chrome.storage.local.set",
        "chrome.storage.sync.set",
        "$.ajax",
        "$.get",
        "$.post",
        "$.getJSON",
        "$.getScript",
        "$.load",
        "jQuery.ajax",
        "jQuery.get",
        "jQuery.post",
        "jQuery.getJSON",
        "jQuery.getScript",
        "jQuery.load",
    ];
    var sinkFunc_checkBaseObject = {
        //原生js发送请求的方式
        "send": XMLHttpRequest,
        "open": XMLHttpRequest,
        "setItem" : Storage,
        "fetch" : Window,
        "setAttribute" : HTMLElement  //第一个参数为src或href，并且第二个参数为污点变量
    };

    //putField触发点检查
    var sinkField_checkBaseName = {
    };
    var sinkField_checkBaseObject = {
        "src" : HTMLElement,
        "href" : HTMLElement
    };



    this.sensitiveKeys = ['name', 'text', 'info', 'link', 'elements', 'form','forms', 'card', 'content', 'share', 'price', 'city', 'comment', 'input',
        'search', 'login', 'time', 'user', 'tag', 'url', 'type', 'code', 'captcha', 'news', 'post', 'header', 'select', 'label',
        'count', 'id', 'area', 'msg', 'reply', 'agent', 'detail', 'inner', 'product', 'button', 'recommend', 'article', 'phone',
        'scope', 'data', 'author', 'statistics', 'submit', 'password', 'pos', 'weixin', 'message', 'company', 'logo', 'panel',
        'station', 'mobile', 'username', 'details', 'number', 'word', 'address', 'textarea', 'score', 'province', 'agentform',
        'job', 'verify', 'rank', 'centent', 'tel', 'keywords', 'member', 'wname', 'sign', 'position', 'sina', 'place', 'works',
        'date', 'usernick', 'email', 'qq', 'activity', 'interact', 'confirm', 'home', 'telephone', 'pwd', 'weibo', 'status',
        'country', 'flag', 'field', 'feedback', 'value', 'passport', 'account', 'editor', 'background', 'private', 'register',
        'cityid', 'introduction', 'state', 'contact', 'yzm', 'addr', 'keyword', 'question', 'reason', 'validate', 'switch',
        'entry', 'result', 'token', 'placeholder', 'areaid', 'prompt', 'region', 'datalist', 'remember', 'forget', 'origin',
        'nick', 'ask', 'display', 'download', 'signup', 'tooltips', 'pid', 'evaluation', 'signin', 'save', 'verification',
        'ranking', 'uid', 'answer', 'zixun', 'uname', 'desktop', 'ct', 'sc', 'caption', 'mail', 'zhuce', 'val', 'param',
        'direction', 'screen', 'agentcityid', 'query', 'realname', 'denglu', 'subwaystation', 'numeral', 'kaptchafield',
        'year', 'userinfo', 'searchsubmit', 'person', 'consult', 'searchjt', 'conect', 'handlekey', 'viewport', 'settings',
        'searchbtn', 'attribution', 'coment', 'liuyan', 'verifycode', 'yijian', 'nickname', 'seach', 'target', 'response', 'seed',
        'guide', 'logout', 'inform', 'cookie', 'sinput', 'format', 'repassword', 'hotword', 'checkcode', 'searchbox', 'sousuo',
        'gender', 'loginbtn', 'cite', 'kaptcha', 'modifyphone', 'inputarea', 'searchkey', 'passwd', 'finance', 'loging', 'textbox',
        'privacy', 'suggestion', 'userid', 'iphone', 'postmessage', 'searchform', 'signature', 'domain', 'sgname', 'loginform',
        'phonenum', 'loginanswer', 'logging', 'showboxtxt', 'titlebox', 'verifying', 'inputbox', 'textinput', 'userdefine',
        'yanzhengma', 'xinlang', 'onlycode', 'reginster', 'saytext', 'loginsubmit', 'searchbutton', 'adress', 'seccode', 'notification',
        'questionid', 'userlogin', 'phoneline', 'credit', 'massage', 'callback', 'diqu', 'wexin', 'searchinput', 'mobilecode',
        'mobiledl', 'emaildl', 'mobilezc', 'emailzc', 'userbox', 'userlink', 'loginquestionid', 'bannername', 'loginfield',
        'zhaiyao', 'seacrh', 'lostpwd', 'checkin', 'appkey', 'unauthenticated', 'confirmcode', 'findpassword', 'emailmsg', 'fieldset',
        'nocaptcha', 'confirmation', 'sessionid', 'validator', 'forgetpassword', 'mincount', 'fontname', 'accredit', 'audnickname',
        'usephone', 'phonelocal', 'loginframe', 'searchbar', 'keyfrom', 'loginname', 'phonecall', 'loginbox', 'askmessage','serviceinfo',
        'submitarea', 'mobilelogin', 'street', 'newname', 'newmobile', 'weixinimg', 'newcode', 'messageholder', 'newweixin', 'twitter',
        'logintitle', 'forgetpwd', 'countrycode', 'photos', 'loginprocxy', 'captchaimg', 'agentcatid', 'newlogin', 'usercard', 'pasword',
        'loginyzm', 'emailnumber', 'weichat', 'authcode', 'authorization', 'codemar', 'passwdbox', 'weixinstr', 'telcode', 'addrstr',
        'yzmtc', 'rolename', 'showkeycode', 'weizhi', 'phonetype', 'mobilephone', 'phonecode', 'messagetxt', 'verificode', 'searchhistory',
        'keywordtype', 'mobilename', 'randcode', 'userpwd', 'backurl', 'showpwd', 'idcard', 'supported', 'developer', 'txtkeyword',
        'userphone', 'txtsearch', 'inputstyle', 'submiter', 'submitbutton', 'getdata', 'loginformlist', 'sidename', 'areacode',
        'updatepwd', 'miner', 'weixintop', 'pwbox', 'telphone', 'last_name', 'family_name', 'phone_number', 'first_name', 'surname',
        'forename', 'telephone_number', 'postcode', 'e-mail', 'Mobile', 'computer_code', 'codification', 'telephone_set', 'bring_up',
        'Education_Department', 'identify', 'line_of_latitude', 'account_statement', 'ZIP_code', 'calculate', 'list', 'latitude',
        'answer_for', 'countersign', 'electronic_mail', 'item', 'postal_code', 'Education', 'call_up', 'bill', 'latissimus_dorsi',
        'grammatical_gender', 'sex', 'constitute', 'invoice', 'write_in_code', 'cognomen', 'educational_activity', 'nominal',
        'exploiter', 'netmail', 'refer', 'urban_center', 'key', 'key_out', 'write_up', 'gens', 'public_figure', 'watchword',
        'call', 'breeding', 'encipher', 'relic', 'substance_abuser', 'Department_of_Education', 'parallel_of_latitude', 'cypher',
        'instruction', 'longitude', 'figure', 'accounting', 'education', 'encrypt', 'given_name', 'keepsake', 'epithet', 'credit_card',
        'business_relationship', 'cipher', 'lat', 'tokenish', 'parole'];


    var messageFunc = {
        "addEventListener":"",  //("message", handleFunc(message*decode), false)
        "sendMessage":"",   //(sendData*encode, "orig");
        "chrome.runtime.onMessage.addListener":"",  //(handleFunc(message*decode, sender, sendResponse(response*encode)))
        "chrome.runtime.sendMessage":"", //(data*encode, receiveResponse(data.decode))
        "chrome.tabs.sendMessage":"",  //(id, data.encode, receiveResponse(data.decode))
        "chrome.runtime.sendNativeMessage":"", //(appName, message*encode, receiveResponse(data.decode))
    };



    function MyAnalysis() {

        this.invokeNew = function(iid, args){

            for (let i=1; i<args.length; i+=1){
                if (isTaint(args[i])){
                    // taint spread!!!!!
                    addTaint(args[0]);
                    if (printDetail) {
                        let str= "[spread][arg=" + getValue(args[i]) + "]-->[result=" + getValue(args[0]) + "]";
                        let ret = "New" + n;
                        ret += "iid = " + iid + n;
                        ret += J$.iidToLocation(J$.sid, iid);
                        log_i(ret + "<br>" +str, iid.split("|")[1], count++);
                    }
                    break;
                }
            }
            return args[0];
        };

        //主要是针对几种特定函数，在运行前修改其参数
        this.invokeFunPre = function (iid, f, funcName, base, args, isConstructor, isMethod, functionIid, functionSid) {

            if(funcName === "addEventListener" || funcName === "window.addEventListener"){ //window间交|互信息方式("message", handleFunc(message), false) 处理第二个参数，检查第一个
                if (args.length >= 2 && args[0] === "message") { // 第二个参数handleMessage(message)的第一个参数的decode
                    let args1_orig = args[1];
                    args[1] = function(message){
                        Object.defineProperty(
                            message,   //目标对象
                            "data",       //属性名
                            {               //属性描述符
                                value: decode(message["data"]),
                            }
                        );
                        args1_orig(message);
                    };
                }

            }else if ((base === undefined && f.name === "postMessage") ||
                (base !== undefined && base instanceof Window && f.name === "postMessage")){ //window间交互信息方式(message, targetOrigin, [transfer]); 处理第一个参数
                if (args.length >= 1) // 第一个参数message的encode
                    args[0] = encode(args[0]);

            }else if (funcName === "chrome.runtime.onMessage.addListener"){ //content和background接受mess(handleFunc(message, [sender], [sendResponse])) 处理第一、二个参数
                if (args.length >= 1){
                    let args0_orig = args[0];
                    args[0] = function(message, sender, sendResponse){ // 接口提供的func一定是三个，但可以提供的比传入func多，因此这里对这三个都做处理
                        message = decode(message);
                        let sendResponse_orig = sendResponse;
                        sendResponse = function(data){
                            data = encode(data);
                            sendResponse_orig(data);
                        };
                        args0_orig(message, sender, sendResponse); // 调用时提供的参数可以比被调函数可接受的参数多
                    }
                }

            }else if (funcName === "chrome.runtime.sendMessage"){ //从content向background发送message([extensionID], message, [options], [handleResponse(data)]) 处理第二、四个参数
                if(typeof args[args.length-1] === "function"){ //先处理最后一个参数，一定是func
                    let func_arg = args[args.length-1];
                    args[args.length-1] = function(data){
                        data = decode(data);
                        func_arg(data);
                    }
                }

                if (args.length >= 1){
                    if (typeof(args[0]) === "string") {
                        if (args[0].length !== 32)
                            args[0] = encode(args[0]);
                        else {
                            if (args.length >= 2 && typeof args[1] !== "function")
                                args[1] = encode(args[1]);
                        }
                    }else{
                        args[0] = encode(args[0]);
                    }
                }
            }else if (funcName === "chrome.tabs.sendMessage") { //从background向指定tab的content发送mess(tabID, message, [handleResponse(data)])
                if (args.length >= 2) // 第二个参数message的encode
                    args[1] = encode(args[1]);

                if (args.length >= 3){ // 第三个参数handleResponse(data)中data的解码
                    let args2_orig = args[2];
                    args[2] = function(data){
                        data = decode(data);
                        args2_orig(data);
                    }
                }
            }else if (funcName === "chrome.runtime.sendNativeMessage"){

            }else if (f.name === "eval"){
                if (args.length >= 1){
                    let code = instruDynamic(args[0], iid.split("|")[1]);
                    if (code !== "")
                        args[0] = code;
                }
            }
            return {f: f, base: base, args: args, skip: false};
        };

        // 检查sink source点,并处理spread过程
        this.invokeFun = function (iid, f, funcName, base, args, result, isConstructor, isMethod, functionIid, functionSid) {

            let str = [];
            let sendTag = false;

            //sources标记
            let isSourceFunc = false;
            if (isKeyInDict(sourceFunc_checkBaseObject, f.name) &&
                base !== undefined &&
                base instanceof sourceFunc_checkBaseObject[f.name]){  // sourceFunc_checkBaseObject部分
                isSourceFunc = true;
            }
            if (isSourceFunc === false) {
                for (let i in sourceFunc_checkFuncName) { // sourceFunc_checkFuncName部分
                    if (funcName.endsWith(sourceFunc_checkFuncName[i])) {
                        isSourceFunc = true;
                        break;
                    }
                }
            }
            if (isSourceFunc === true){
                for (let index in args){  //确定为source函数，遍历检查参数是否含有sensitiveKeys中定义的敏感字段
                    let newarg = splitStr(args[index]);
                    for(let j in newarg) {
                        if (sensitiveKeys.indexOf(newarg[j]) > -1) {

                            //find sources!!!!!
                            if (result !== undefined && result !== null) {
                                str[str.length] = "[source][func="+funcName+"]" +
                                    "[arg="+getValue(args[index])+"]" +
                                    "[result=" + getValue(result) + "]";
                                addTaint(result);  //添加污点
                                sendTag = true;
                                break;
                            }
                        }
                    }
                }
            }


            //处理函数调用过程中的污点传播
            //对于用户函数不做处理，在执行过程中会自动将return的变量标记为污点
            //对于内置函数[native code],base在污染且非部分污染下，或者默认参数有污点情况下，会导致result为污点;在参数有污点下；
            //另外可能导致base被污染（少见，不考虑）。如str.concat('a')不会导致str被污染。而str = str.concat(taint)会标记return，并最终传递到str中.
            if(f.toString().indexOf("[native code]") > -1){

                // 参数中发现污点，则在base上标记部分污染，另外有result的话在result上标记污染
                for (let index in args){  //遍历参数以检查是否为污点变量

                    if(isTaint(args[index])) {
                        let readyBreak = false;
                        //taint spread!!!!!  如果base之前是干净的话，在base上标记部分污染
                        if(!isTaint(base) && base !== undefined) {
                            addPartTaint(base);
                            readyBreak = true;
                            if (printDetail) {
                                str[str.length] = "[spread-Part][arg=" + getValue(args[index]) + "]-->[base=" + getValue(base) + "]";
                                sendTag = true;
                            }
                        }

                        //taint spread!!!!!  有result的话在result上标记污染
                        if (result !== undefined && result !== null) {
                            addTaint(result);
                            readyBreak = true;
                            if (printDetail) {
                                str[str.length] = "[spread][arg=" + getValue(args[index]) + "]-->[result=" + getValue(result) + "]";
                                sendTag = true;
                            }
                        }

                        if (readyBreak)
                            break;
                    }
                }

                // 另外还要考虑在base为污点时，对result的污染。如result = taint.split("|")或者taint.toLower()产生的result
                if(isTaint(base)){
                    //taint spread!!!!!
                    if (result !== undefined && result !== null) {
                        addTaint(result);
                        if (printDetail) {
                            str[str.length] = "[spread][base=" + getValue(base) + "]-->[result=" + getValue(result) + "]";
                            sendTag = true;
                        }
                    }
                }
            }


            //sinks标记，sinkFuncs_checkFuncName部分
            let isSinkFunc = false;
            if(isKeyInDict(sinkFunc_checkBaseObject, f.name) &&
                base !== undefined &&
                base instanceof sinkFunc_checkBaseObject[f.name]) {
                isSinkFunc = true;
            }
            if (isSinkFunc === false){
                for (let i in sinkFunc_checkFuncName) {
                    if (funcName.endsWith(sinkFunc_checkFuncName[i])) {
                        isSinkFunc = true;
                        break;
                    }
                }
            }
            if (isSinkFunc === true){ //确定为sink函数，遍历检查参数是否含有敏感参数
                if(f.name === "setAttribute"){ //setAttribute函数做特别处理
                    if(args[0] === "src" || args[0] === "href"){
                        if(args.length > 2 && isTaint(args[1])) {

                            //find sinks!!!!!
                            str[str.length] = "[sink][func=setAttribute][taint=" + getValue(args[1])+"]";
                            sendTag = true;
                        }
                    }
                }else{
                    for (let index in args){
                        if(isTaint(args[index])){

                            //find sinks!!!!!
                            str[str.length] = "[sink][func=" + funcName + "][taint=" + getValue(args[index])+"]";
                            sendTag = true;
                            break;
                        }
                    }
                }
            }



            if (sendTag) {
                let ret = "invokeFun" + n;
                ret += "file_path = " + iid.split("|")[1] + n;
                ret += "iid = " + iid.split("|")[0] + n;
                ret += addcolor("f = " + getValue(f) + "(" + f.name + ")", f) + n;
                ret += addcolor("base = "+getValue(base), base) + n;
                ret += addcolor("result = " + getValue(result), result) + n;
                for(let i=0; i<args.length; i++) {
                    ret += addcolor("args["+i+"] = "+getValue(args[i]), args[i]) + n;
                }
                ret += J$.iidToLocation(J$.sid, iid);
                for (let i in str) {
                    log_i(ret+"<br>"+str[i], iid.split("|")[1], count++);
                }
            }

            return {result: result};
        };

        //检查source点, 并处理spread过程---val是由已知的base和offset来生成的新对象，所以需要对val这个新变量的污点情况进行标记
        this.getField = function (iid, base, baseStr, offsetStr, val, isComputed, isOpAssign, isMethodCall) {

            let str = [];
            let sendTag = false;

            // source标记   location.href   document.cookie这些
            var baseAndOffset = baseStr + "." + offsetStr;
            if(isKeyInDict(sourceField_checkBaseObject, offsetStr) &&
                base !== undefined &&
                base instanceof sourceField_checkBaseObject[offsetStr]){

                //find sources!!!!!
                if (val !== undefined && val !== null) {
                    str[str.length] = "[source][func=" + baseAndOffset + "][result=" + getValue(val) + "]";
                    addTaint(val);  //添加污点
                    sendTag = true;
                }
            }else if (isKeyInDict(sourceField_checkBaseName, offsetStr) &&
                baseAndOffset.endsWith(sourceField_checkBaseName[offsetStr])) {

                //find sources!!!!!
                if (val !== undefined && val !== null) {
                    str[str.length] = "[source][func=" + baseAndOffset + "][result=" + getValue(val) + "]";
                    addTaint(val);  //添加污点
                    sendTag = true;
                }
            }


            // base为非部分污点标记，且val不是function时，对val进行污点标记
            // taint.var1 这种造成的val的污点
            if(isTaint(base) && !isPartTaint(base) && typeof val !== "function") {
                //taint spread!!!!!
                if (val !== undefined && val !== null) {
                    addTaint(val);
                    if (printDetail) {
                        str[str.length] = "[spread][base=" + getValue(base) + "]-->[val=" + getValue(val) + "]";
                        sendTag = true;
                    }
                }
            }


            if (sendTag) {
                let ret = "getField" + n;
                ret += "iid = "+iid+n;
                ret += addcolor("base = " + getValue(base), base) + n;
                ret += addcolor("offset = " + getValue(offsetStr), offsetStr) + n;
                ret += addcolor("val = " + getValue(val), val) + n;
                ret += J$.iidToLocation(J$.sid, iid);
                for (let i in str) {
                    log_i(ret+"<br>"+str[i], iid.split("|")[1], count++);
                }
            }

            return {result: val};
        };

        // 检查sink点,并处理spread过程
        this.putField = function (iid, base, offset, val, isComputed, isOpAssign) {

            let str = [];
            let sendTag = false;

            // 是write的一种特殊情况，只是被写者是a.b形式的。如myClass.memberField = taint;
            // 因此也是不用进行污点传递的，但是需要考虑成员变量被污染后，base需要标记为部分污染的问题
            // check，第一种情况：如果数组被标记为未污染，数组被send出去，就找不到这个sink点了
            // check，第二种情况，如果提前数组被标记为了污染，在作为base去getField的时候，会导致其他的val出现问题
            // 结论：base没有污点，且val存在污点的情况下，将base标记为部分污染
            if(isTaint(val)===true && isTaint(base)===false){
                //taint spread!!!!!
                addPartTaint(base);
                if (printDetail) {
                    str[str.length] = "[spread-Part][val="+getValue(val)+"]-->[base="+getValue(base)+"]";
                    sendTag = true;
                }
            }


            //sinks标记  img.src=taint
            if (isKeyInDict(sinkField_checkBaseObject, offset) &&
                base instanceof sinkField_checkBaseObject[offset]){

                //find sinks!!!!!
                str[str.length] = "[sink][func=.src][taint="+getValue(val)+"]";
                sendTag = true;
            }

            if (sendTag) {
                let ret = "putField" + n;
                ret += "iid = " + iid + n;
                ret += addcolor("base = " + getValue(base), base) + n;
                ret += addcolor("offset = " + getValue(offset), offset) + n;
                ret += addcolor("val = " + getValue(val), val) + n;
                ret += J$.iidToLocation(J$.sid, iid);
                for (let i in str) {
                    log_i(ret+"<br>"+str[i], iid.split("|")[1], count++);
                }
            }

            return {result: val};
        };

        //二元操作
        //汇聚左右污点值，记录到result中去
        this.binary = function (iid, op, left, right, result, isOpAssign, isSwitchCaseComparison, isComputed) {

            let str;
            let sendTag = false;

            let taintTag = isTaint(right) || isTaint(left);
            if (op === "^" && left === right) //异或且左右相等时，为0）
                taintTag = false;
            if (op === "&" && ((isTaint(right) && !left) || (isTaint(left) && !right))) //与 在其中一个操作数全0下，会将污点变量置为0
                taintTag = false;
            if(taintTag) {
                //taint spread!!!!!
                if (isTaint(right) && isTaint(left)) {
                    if (printDetail) {
                        str = "[spread][left=" + getValue(left) + "][right=" + getValue(right) + "]-->[result=" + getIID(result) + "]";
                        sendTag = true;
                    }
                }
                else if (isTaint(right)) {
                    if (printDetail) {
                        str = "[spread][right=" + getValue(right) + "]-->[result=" + getValue(result) + "]";
                        sendTag = true;
                    }
                }
                else if (isTaint(left)) {
                    if (printDetail) {
                        str = "[spread][left=" + getValue(left) + "]-->[result=" + getValue(result) + "]";
                        sendTag = true;
                    }
                }
                addTaint(result);
            }


            if (sendTag) {
                let ret = "binary" + n;
                ret += "iid = " + iid + n;
                ret += "op = " + op + n;
                ret += addcolor("left = " + getValue(left), left) + n;
                ret += addcolor("right = " + getValue(right), right) + n;
                ret += addcolor("result = " + getValue(result), result) + n;
                ret += J$.iidToLocation(J$.sid, iid);
                log_i(ret + "<br>" + str, iid.split("|")[1], count++);
            }

            return {result: result};
        };

        //一元操作
        //将污点变量传递到新内存值result中去
        this.unary = function (iid, op, left, result) {

            let str;
            let sendTag = false;

            if(isTaint(left)) {
                //taint spread!!!!!
                addTaint(result);
                if (printDetail) {
                    str = "[spread][left="+getValue(left)+"]-->[result="+getValue(result)+"]";
                    sendTag = true;
                }
            }


            if (sendTag) {
                let ret = "unary" + n;
                ret += "iid = " + iid + n;
                ret += "op = " + op + n;
                ret += addcolor("left = " + getValue(left), left) + n;
                ret += addcolor("result = " + getValue(result), result) + n;
                ret += J$.iidToLocation(J$.sid, iid);
                log_i(ret + "<br>" + str, iid.split("|")[1], count++);
            }

            return {result: result};
        };
    }

    sandbox.analysis = new MyAnalysis();
})(J$);