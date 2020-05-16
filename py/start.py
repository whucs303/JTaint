#coding=utf-8
import os
import zipfile
import json
from selenium import webdriver
import time

import zipfile
from config import *
import sys


def intrument_ext(ext_path):

    def instrument_js(js_path):
        command = instrument_js_command + os.path.dirname(js_path) + " " + js_path
        print command
        retu =  os.popen(command).read()

        if "Failed" in retu:  # 在插装失败后，使用未插装文件
            print "instrument failed:  " + js_path
            if os.path.exists(js_path): os.remove(js_path)
            if os.path.exists(js_path + "_jalangi_.json"): os.remove(js_path + "_jalangi_.json")
            os.rename(js_path[:-3] + "_orig_.js", js_path)
        else:  # 如果插装成功，则js文件的开头插入jalangi依赖环境代码
            fw = open(js_path, "r+")
            content = fw.read()
            fw.seek(0, 0)
            fw.write(jalangi_envi_code + content)
            fw.flush()
            fw.close()

    for root, dirs, files in os.walk(ext_path):
        for file in files:

            if len(file) >= 3:
                if file[-3:] == ".js":  # 要是js文件
                    js_path = root + "/" + file  # js文件大小要小于限制值
                    if os.path.getsize(js_path) < max_js_size:

                        # tag用来决定是否要对其进行插装
                        tag = True
                        for i in black_list:  # 不要黑名单内的js文件
                            if i in file.lower():
                                tag = False
                        if tag == True:
                            instrument_js(js_path)


def gen_zip(ext_path):
    source_dir = ext_path + "/"
    ext_zippath =  ext_path + "/ext.zip"

    zipf = zipfile.ZipFile(ext_zippath, 'w')
    pre_len = len(os.path.dirname(source_dir))
    for parent, dirnames, filenames in os.walk(source_dir):
        for filename in filenames:
            pathfile = os.path.join(parent, filename)
            if filename != "ext.zip":
                arcname = pathfile[pre_len:].strip(os.path.sep)  # 相对路径
                zipf.write(pathfile, arcname)
    zipf.close()


def modify_manifest(ext_path):
    if not os.path.exists(ext_path + "/manifest.json"):
        raise Exception("not find manifest.json!!!!   ext_path:" + ext_path)

    manifest = json.loads(open(ext_path + "/manifest.json", "r").read())

    def modify_csp():
        if "content_security_policy" in manifest:
            if "script-src" in manifest["content_security_policy"]:
                manifest["content_security_policy"] = manifest["content_security_policy"].replace("script-src", "script-src 'unsafe-eval'")
            else:
                manifest["content_security_policy"] += "; script-src 'self' 'unsafe-eval'"
        else:
            manifest["content_security_policy"] = "script-src 'self' 'unsafe-eval'; object-src 'self'"

    modify_csp()

    fw = open(ext_path + "/manifest.json", "w")
    fw.write(json.dumps(manifest, indent=4))
    fw.flush()
    fw.close()


def analysis(ext_path):

    options = webdriver.ChromeOptions()
    options.add_extension(ext_path + "/ext.zip")
    driver = webdriver.Chrome(chrome_options=options)

    try:
        handles = driver.window_handles
        driver.switch_to_window(handles[len(handles) - 1])
        driver.get("http://127.0.0.1/honey.html")

        inputs = driver.find_elements_by_tag_name("input")
        for input in inputs:
            input.send_keys("click")
        input = driver.find_element_by_id("login_button")
        input.click()
        time.sleep(10)
    except Exception as e:
        pass


def handle_file(ext_path):
    intrument_ext(ext_path)

    modify_manifest(ext_path)

    gen_zip(ext_path)

    analysis(ext_path)



if __name__ == '__main__':

    if len(sys.argv) != 2:
        print "Usage: python start.py extension_path"

    # 自己生成依赖环境
    fr_idanalysis = open(analysis_js_path, "r")
    fr_envi = open("jalangi_envi.js", "r")
    jalangi_envi_code = fr_envi.read() + fr_idanalysis.read() + "\n}\n\n\n"
    fr_idanalysis.close()
    fr_envi.close()

    #ext_path = "../gnamdgilanlgeeljfnckhboobddoahbl"
    handle_file(sys.argv[1])

