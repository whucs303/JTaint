acorn = require("acorn");
esotope = require("esotope");
fs = require("fs");
escodegen = require('escodegen');

var ArgumentParser = require('argparse').ArgumentParser;


var parser = new ArgumentParser({
    addHelp: true,
    description: "Utility to apply Jalangi instrumentation to files or a folder."
});
parser.addArgument(['--file'], {help: "666666888888"});

var filePath = parser.parseArgs().file;



function run(filePath) {
    let code;
    fs.readFile(filePath,{encoding:"utf-8"}, function (err, fr) {
        //readFile回调函数
        if (err) {
            console.log(err);
        }else {
            code = fr;
            //console.log(code);

            var ast = acorn.parse(code);
            console.log(filePath);
            try {
                JSON.stringify(ast, null, 4);
                escodegen.generate(ast);
            }catch (e) {
                console.log(e)

            }




        }
    });
}

run(filePath);