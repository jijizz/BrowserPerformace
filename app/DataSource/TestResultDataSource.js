"use strict";
exports.__esModule = true;
var SQLUtil_1 = require("../Utilities/SQLUtil");
var mssql = require("mssql");
var Context_1 = require("../Context");
var Log_1 = require("../Utilities/Log");
var TestResultDataSource = (function () {
    function TestResultDataSource() {
    }
    TestResultDataSource.prototype.saveTestResult = function (testResult) {
        var inputs = this._convertSaveTestResultDataToInput(testResult);
        var outputs = [{
                name: 'rowsInserted',
                type: {
                    type: mssql.Int
                }
            }];
        return SQLUtil_1.execSproc(inputs, outputs, 'proc_SaveTestResult', Context_1.config.database.name).then(function (result) {
            return result.output && result.output.rowsInserted > 0;
        })["catch"](function (error) {
            Log_1.logger.error('proc_SaveTestResult query error: ', error);
            throw error;
        });
    };
    TestResultDataSource.prototype.queryTestResults = function (option) {
        var inputs = this._convertTestResultQueryOptionsToInput(option);
        var outputs = [{
                name: 'resultsFound',
                type: {
                    type: mssql.Int
                }
            }];
        return SQLUtil_1.execSproc(inputs, outputs, 'proc_QueryTestResults', Context_1.config.database.name).then(function (result) {
            return result.recordset;
        })["catch"](function (error) {
            Log_1.logger.error('proc_QueryTestResults query error: ', error);
            throw error;
        });
    };
    TestResultDataSource.prototype.queryTestResultsForLatestBuilds = function (option) {
        var inputs = this._convertTestResultsForLatestBuildsQueryOptionsToInput(option);
        var outputs = [{
                name: 'resultsFound',
                type: {
                    type: mssql.Int
                }
            }];
        return SQLUtil_1.execSproc(inputs, outputs, 'proc_QueryTestResultsForLatestBuilds', Context_1.config.database.name).then(function (result) {
            return result.recordset;
        })["catch"](function (error) {
            Log_1.logger.error('proc_QueryTestResultsForLatestBuilds query error: ', error);
            throw error;
        });
    };
    TestResultDataSource.prototype.analyseTestResults = function (option) {
        var inputs = this._convertAnalyseTestResultsQueryOptionsToInput(option);
        return SQLUtil_1.execSproc(inputs, undefined, 'proc_AnalyseTestResults', Context_1.config.database.name).then(function (result) {
            return result.recordset;
        })["catch"](function (error) {
            Log_1.logger.error('proc_AnalyseTestResults query error: ', error);
            throw error;
        });
    };
    TestResultDataSource.prototype._convertAnalyseTestResultsQueryOptionsToInput = function (option) {
        return this._convertTestResultsForLatestBuildsQueryOptionsToInput(option);
    };
    TestResultDataSource.prototype._convertTestResultsForLatestBuildsQueryOptionsToInput = function (option) {
        var input = [
            {
                name: 'testRunEnviroment',
                value: option && option.testRunEnviroment,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'testConfigName',
                value: option && option.testConfigName,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'testName',
                value: option && option.testName,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'browser',
                value: option && option.browser,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'numberOfBuilds',
                value: option && option.numberOfBuilds,
                type: {
                    type: mssql.Int
                }
            }
        ];
        return input;
    };
    TestResultDataSource.prototype._convertTestResultQueryOptionsToInput = function (option) {
        var input = [
            {
                name: 'testRunEnviroment',
                value: option && option.testRunEnviroment,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'testConfigName',
                value: option && option.testConfigName,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'testName',
                value: option && option.testName,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'browser',
                value: option && option.browser,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'numberOfRuns',
                value: option && option.numberOfRuns,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'startTime',
                value: option && option.startTime,
                type: {
                    type: mssql.DateTime
                }
            },
            {
                name: 'endTme',
                value: option && option.endTme,
                type: {
                    type: mssql.DateTime
                }
            },
            {
                name: 'build',
                value: option && option.build,
                type: {
                    type: mssql.NVarChar
                }
            }
        ];
        return input;
    };
    TestResultDataSource.prototype._convertSaveTestResultDataToInput = function (testResult) {
        var input = [
            {
                name: 'testRunEnviroment',
                value: testResult && testResult.testRunEnviroment,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'runStartTime',
                value: testResult && testResult.runStartTime,
                type: {
                    type: mssql.DateTime
                }
            },
            {
                name: 'runEndTime',
                value: testResult && testResult.runEndTime,
                type: {
                    type: mssql.DateTime
                }
            },
            {
                name: 'runDuration',
                value: testResult && testResult.runDuration,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'build',
                value: testResult && testResult.build,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'browser',
                value: testResult && testResult.browser,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'testName',
                value: testResult && testResult.testName,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'testConfigName',
                value: testResult && testResult.testConfigName,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'tabResultLogName',
                value: testResult && testResult.tabResultLogName,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'rawLog',
                value: testResult && testResult.rawLog,
                type: {
                    type: mssql.NVarChar
                }
            },
            {
                name: 'render',
                value: testResult && testResult.render,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'eupl',
                value: testResult && testResult.eupl,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'appStart',
                value: testResult && testResult.appStart,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'setTimeoutCost',
                value: testResult && testResult.setTimeoutCost,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'glamor',
                value: testResult && testResult.glamor,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'serverDuration',
                value: testResult && testResult.serverDuration,
                type: {
                    type: mssql.Int
                }
            },
            {
                name: 'iterationCount',
                value: testResult && testResult.iterationCount,
                type: {
                    type: mssql.Int
                }
            }
        ];
        return input;
    };
    return TestResultDataSource;
}());
exports["default"] = TestResultDataSource;
