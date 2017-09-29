'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fsutils = require("./Utilities/FsUtils");
const os = require("os");
const dns = require("dns");
const yargs_1 = require("yargs");
exports.config = undefined;
const configFilePath = path.resolve('./config.json');
function initConfig() {
    exports.config = fsutils.readJsonFile(configFilePath);
    exports.config.testContext = {
        testName: yargs_1.argv['teststorun'],
        testConfigName: yargs_1.argv['testconfig'],
        browser: yargs_1.argv['browser'],
        testLogRoot: exports.config.testContext.testLogRoot,
        testRunOptions: yargs_1.argv['testrunoptions'],
        timeoutInMinutes: yargs_1.argv['timeoutinminutes']
    };
    const hostName = os.hostname();
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
//# sourceMappingURL=Context.js.map