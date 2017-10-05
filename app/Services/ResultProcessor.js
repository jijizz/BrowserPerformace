"use strict";
exports.__esModule = true;
var fsUtils = require("../Utilities/FsUtils");
var fs = require("fs");
var path = require("path");
var Context_1 = require("../Context");
var TestResultDataSource_1 = require("../DataSource/TestResultDataSource");
var Log_1 = require("../Utilities/Log");
var TAB_LOG_FILE_REGEX = /^TAB_([^_]*_?)+\.\w*$/;
var PERF_DATA_REGEX = /SPListPerf\s?result:(.*?)<\/td>/;
var BUILD_REGEX = /SPListPerf\s?build:\s?(.*?)<\/td>/;
var TIME_TAKEN_REGEX = /Time\s?taken:\s?(\d+)\s?ms<\/div>/;
var logFolderPath = path.join(Context_1.config.enviroment.repoRoot, Context_1.config.testContext.testLogRoot);
var excludedFiles = ['combine.cmd', 'combinefiles.cmd', 'reportFileName.txt'];
var ResultProcessor = (function () {
    function ResultProcessor() {
        this._testResultDataSource = new TestResultDataSource_1["default"]();
    }
    ResultProcessor.prototype.ProcessResults = function () {
        var _this = this;
        Log_1.logger.info('start ProcessResults');
        var unprocessedFiles;
        return this._getUnprocessedTestLogs().then(function (_unprocessedFiles) {
            Log_1.logger.info('found _unprocessedFiles: ', unprocessedFiles);
            unprocessedFiles = _unprocessedFiles.sort(function (a, b) { return a.stats.ctime.getTime() - b.stats.ctime.getTime(); });
            return unprocessedFiles.reduce(function (currentPromise, currentFile, currentIndex, array) {
                var saveTestResultQueryData = _this._parseLogFile(currentFile);
                return currentPromise.then(function (result) {
                    if (!result) {
                        Log_1.logger.error("Failed to save results for file: " + array[currentIndex - 1].filePath);
                    }
                    return _this._testResultDataSource.saveTestResult(saveTestResultQueryData);
                })["catch"](function (err) {
                    Log_1.logger.error("Failed to save results for file: " + array[currentIndex - 1].filePath + ", error: " + err.message);
                    return _this._testResultDataSource.saveTestResult(saveTestResultQueryData);
                });
            }, Promise.resolve(true));
        }).then(function (saveResultQueryReturn) {
            Log_1.logger.info("saved all test results");
            return _this._archieve(unprocessedFiles);
        }).then(function () {
            Log_1.logger.info("Successfully archieved log files.");
            return undefined;
        })["catch"](function (err) {
            Log_1.logger.error("ProcessResults failure: " + err.message);
            return undefined;
        });
    };
    ResultProcessor.prototype._archieve = function (unprocessedFiles) {
        var archieveFolderPath = path.join(logFolderPath, 'archieve');
        if (!fs.existsSync(archieveFolderPath)) {
            fs.mkdirSync(archieveFolderPath);
        }
        var archivePromises = [];
        for (var _i = 0, unprocessedFiles_1 = unprocessedFiles; _i < unprocessedFiles_1.length; _i++) {
            var file = unprocessedFiles_1[_i];
            var archieveFilePath = path.join(archieveFolderPath, file.fileName);
            archivePromises.push(fsUtils.move(file.filePath, archieveFilePath));
        }
        return Promise.all(archivePromises);
    };
    ResultProcessor.prototype._parseLogFile = function (file) {
        if (file &&
            TAB_LOG_FILE_REGEX.test(file.fileName) &&
            file.content &&
            PERF_DATA_REGEX.test(file.content)) {
            var perfResult = JSON.parse(file.content.match(PERF_DATA_REGEX)[1]);
            var build = BUILD_REGEX.test(file.content) ? file.content.match(BUILD_REGEX)[1] : undefined;
            var duration = TIME_TAKEN_REGEX.test(file.content) ? Number(file.content.match(TIME_TAKEN_REGEX)[1]) : NaN;
            return {
                testRunEnviroment: Context_1.config.enviroment.testRunEnviroment,
                runStartTime: new Date(file.stats.mtime.getTime() - duration),
                runEndTime: file.stats.mtime,
                runDuration: duration,
                build: build,
                browser: Context_1.config.testContext.browser,
                testName: Context_1.config.testContext.testName,
                testConfigName: Context_1.config.testContext.testConfigName,
                tabResultLogName: file.fileName,
                rawLog: file.content,
                render: perfResult.render.p75,
                eupl: perfResult.eupl.p75,
                appStart: perfResult.appStart.p75,
                setTimeoutCost: perfResult.setTimeoutCost.p75,
                glamor: perfResult.glamor.p75,
                serverDuration: perfResult.serverDuration.p75,
                iterationCount: perfResult.eupl.count
            };
        }
        return undefined;
    };
    ResultProcessor.prototype._getLatestProcessedLogFile = function () {
        return this._testResultDataSource.queryTestResults({
            testRunEnviroment: Context_1.config.enviroment.testRunEnviroment,
            testConfigName: Context_1.config.testContext.testConfigName,
            testName: Context_1.config.testContext.testName,
            browser: Context_1.config.testContext.browser,
            numberOfRuns: 100
        }).then(function (results) {
            var lastLogFileName;
            var sorted = results.sort(function (a, b) { return b.runId - a.runId; });
            for (var _i = 0, sorted_1 = sorted; _i < sorted_1.length; _i++) {
                var result = sorted_1[_i];
                if (result.eupl && result.render && result.tabResultLogName) {
                    lastLogFileName = result.tabResultLogName;
                    break;
                }
                else {
                    Log_1.logger.error("some result data is missing, this is not expected, eupl: " + result.eupl + ", render: " + result.render + ", TabResultLogFileName: " + result.tabResultLogName);
                }
            }
            var logFilePath = lastLogFileName && path.join(logFolderPath, lastLogFileName);
            return {
                fileName: lastLogFileName,
                filePath: lastLogFileName && logFilePath,
                content: undefined,
                stats: lastLogFileName && fs.existsSync(logFilePath) && fs.statSync(logFilePath)
            };
        });
    };
    ResultProcessor.prototype._getUnprocessedTestLogs = function () {
        return this._getLatestProcessedLogFile().then(function (lastLog) {
            var lastLogTime = lastLog.stats && lastLog.stats.mtime;
            var files = fs.readdirSync(logFolderPath);
            return files.filter(function (fileName) {
                var filePath = path.join(logFolderPath, fileName);
                var stats = fs.statSync(filePath);
                return !stats.isDirectory() &&
                    excludedFiles.indexOf(fileName) === -1 &&
                    (!lastLogTime || stats.mtime > lastLogTime) &&
                    (!lastLog.fileName || fileName != lastLog.fileName);
            }).map(function (fileName) {
                var filePath = path.join(logFolderPath, fileName);
                return {
                    fileName: fileName,
                    filePath: filePath,
                    content: fs.readFileSync(filePath, 'utf8'),
                    stats: fs.statSync(filePath)
                };
            });
        });
    };
    return ResultProcessor;
}());
exports["default"] = ResultProcessor;
