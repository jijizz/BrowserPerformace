'use strict';
exports.__esModule = true;
var Context_1 = require("./Context");
var DeployTestService_1 = require("./Deployment/DeployTestService");
var TestExecutor_1 = require("./Services/TestExecutor");
var ResultProcessor_1 = require("./Services/ResultProcessor");
var ResultReporter_1 = require("./Services/ResultReporter");
var Log_1 = require("./Utilities/Log");
Log_1.logger.info("config: ", Context_1.config);
DeployTestService_1.runDeployment().then(function (ret) {
    Log_1.logger.info('start running tab test');
    var executor = new TestExecutor_1["default"]();
    return executor.runPerfTest();
}).then(function () {
    Log_1.logger.info('start result processing');
    var resultProcessor = new ResultProcessor_1["default"]();
    return resultProcessor.ProcessResults();
}).then(function () {
    Log_1.logger.info('sucessfully fishined result processing.');
    var reporter = new ResultReporter_1["default"]();
    return reporter.report();
}).then(function () {
    Log_1.logger.info('sucessfully fishined result reporting.');
    process.exit(0);
})["catch"](function (err) {
    Log_1.logger.error("Perf test failed with error: " + err.message);
    process.exit(1);
});
