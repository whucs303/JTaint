#coding=utf-8

instrument_js = "./../jalangi2/src/js/commands/instrument.js"  # instrument.js
analysis_js_path = "./../jalangi2/hytaint_idanalysis.js"  # hytiant_revision.js的位置


instrument_js_command = "node {} --inlineIID " \
                        "--inlineSource --analysis {} " \
                        "--out ".format(instrument_js, analysis_js_path)


# 对于一些常见js文件，以及大小大于50KB的文件进行限制
max_js_size = 5000000
black_list = ['jquery', 'angular', 'fontawesome', 'bootstrap', "react-dom", "socker.io", "vue", "jsencrypt", "mathjs",
              "sugar", "react"]

