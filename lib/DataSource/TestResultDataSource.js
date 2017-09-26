"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQLUtil_1 = require("../Utilities/SQLUtil");
const mssql = require("mssql");
const Context_1 = require("../Context");
class TestResultDataSource {
    constructor() {
    }
    saveTestResult(testResult) {
        const inputs = this._convertSaveTestResultDataToInput(testResult);
        const outputs = [{
                name: 'rowsInserted',
                type: {
                    type: mssql.Int
                }
            }];
        return SQLUtil_1.execSproc(inputs, outputs, 'proc_SaveTestResult', Context_1.config.database.name).then((result) => {
            return result.output && result.output.rowsInserted > 0;
        }).catch((error) => {
            console.log('proc_SaveTestResult query error: ', error);
            throw error;
        });
    }
    queryTestResults(option) {
        const inputs = this._convertTestResultQueryOptionsToInput(option);
        const outputs = [{
                name: 'resultsFound',
                type: {
                    type: mssql.Int
                }
            }];
        return SQLUtil_1.execSproc(inputs, outputs, 'proc_QueryTestResults', Context_1.config.database.name).then((result) => {
            return result.recordset;
        }).catch((error) => {
            console.log('proc_QueryTestResults query error: ', error);
            throw error;
        });
    }
    _convertTestResultQueryOptionsToInput(option) {
        const input = [
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
    }
    _convertSaveTestResultDataToInput(testResult) {
        const input = [
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
    }
}
exports.default = TestResultDataSource;
//# sourceMappingURL=TestResultDataSource.js.map