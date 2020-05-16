acorn = require("acorn");
esotope = require("esotope");
fs = require("fs");
escodegen = require('escodegen');

var ArgumentParser = require('argparse').ArgumentParser;






function run(filePath) {
    let code;
    fs.readFile(filePath,{encoding:"utf-8"}, function (err, fr) {
        //readFile回调函数
        if (err) {
            console.log(err);
        }else {
            code = fr;
            //console.log(code);
            code = "function test(){super.test();}";

            var ast = acorn.parse(code);

            //JSON.stringify(ast, null, 4);
            //console.log(JSON.stringify(ast, null, 4));
            console.log(esotope.generate(ast));



        }
    });
}

var filePath = "C:\\Users\\Yiruma\\Desktop\\failed\\69shuParser.js";

run(filePath);