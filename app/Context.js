'use strict';
exports.__esModule = true;
var path = require("path");
var fsutils = require("./Utilities/FsUtils");
var os = require("os");
var dns = require("dns");
var IConfig_1 = require("./IConfig");
var yargs_1 = require("yargs");
exports.config = undefined;
var configFilePath = path.resolve('./config.json');
function initConfig() {
    exports.config = fsutils.readJsonFile(configFilePath);
    exports.config.testContext = {
        testName: yargs_1.argv['teststorun'],
        testConfigName: yargs_1.argv['testconfig'],
        browser: yargs_1.argv['browser'],
        thresholdInMilliseconds: exports.config.testContext.thresholdInMilliseconds,
        testLogRoot: exports.config.testContext.testLogRoot,
        testRunOptions: yargs_1.argv['testrunoptions'],
        timeoutInMinutes: yargs_1.argv['timeoutinminutes'],
        reportMailFrom: exports.config.testContext.reportMailFrom,
        reportMailcc: exports.config.testContext.reportMailcc
    };
    if (exports.config.runContext.mode.toString() === 'full') {
        exports.config.runContext.mode = IConfig_1.RunMode.full;
    }
    else if (exports.config.runContext.mode.toString() === 'generateLoad') {
        exports.config.runContext.mode = IConfig_1.RunMode.generateLoad;
    }
    var hostName = os.hostname();
    dns.lookup(hostName, function (err, ip) {
        console.log('IP: ' + ip);
        dns.lookupService(ip, 0, function (err, hostname, service) {
            if (err) {
                console.log('dns lookupService error: ', err);
            }
            else {
                exports.config.enviroment.testRunEnviroment = hostname;
            }
        });
    });
}
initConfig();
