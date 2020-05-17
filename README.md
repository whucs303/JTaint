## JTaint

### Overview

JTaint is a tool for finding privacy leakage in Chrome Extension, it uses the modified Jalangi2 to instrument extensions and perform dynamic taint analysis.

### How to run JTaint

JTaint consists of three parts, corresponding to the three folders in the directory. The nodejs code in `jalangi` directory is used to instrument extensions and perform analysis; The php code in `www` directory is used to write analysis results to the local file; The python code in `py` directory is used to control the overall process.

You need to install a web server and copy the two files in `www` directory to the server directory. JTaint uses webdriver to control the browser to install extensions and simulate operation, so you need to download the chromedriver corresponding to your Chrome version at https://chromedriver.chromium.org.

Finally, you can start JTaint in start.py. We provide a privacy-leaking extension in `example` folder, which is reported at https://securitywithsam.com/2019/07/dataspii-leak-via-browser-extensions/.

### Example

```shell
E:\JTaint\py>python start.py ./../gnamdgilanlgeeljfnckhboobddoahbl
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/apis.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/background.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/common.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/options.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/plugins.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/plugins_list.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/postback.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/superZoom.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js ./../gnamdgilanlgeeljfnckhboobddoahbl\js/tools.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js\libs ./../gnamdgilanlgeeljfnckhboobddoahbl\js\libs/gumby.min.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js\libs ./../gnamdgilanlgeeljfnckhboobddoahbl\js\libs/modernizr-2.7.1.min.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies/StrategiesInitializer.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\passive ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\passive/PassiveRules.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\passive ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\passive/PassiveStrategy.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\realTime ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\realTime/RealTimeRulesRetriever.js
node ./../jalangi2/src/js/commands/instrument.js --inlineIID --inlineSource --analysis ./../jalangi2/hytaint_idanalysis.js --out ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\realTime ./../gnamdgilanlgeeljfnckhboobddoahbl\js\strategies\realTime/RealTimeStrategy.js

DevTools listening on ws://127.0.0.1:51397/devtools/browser/0bedb2d3-e022-4084-a838-f6bec3886445
[19128:5476:0516/214313.353:ERROR:browser_switcher_service.cc(238)] XXX Init()
```

If JTaint finds extension's problems through taint analysis, it will write the result to html file in the web server directory. You can use browser to view them and retrieve whether there is a privacy leakage through the **sink** keyword.

![1589637068362](https://s1.ax1x.com/2020/05/16/YgAfSS.png)







