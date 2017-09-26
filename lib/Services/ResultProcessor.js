"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fsUtils = require("../Utilities/FsUtils");
const fs = require("fs");
const path = require("path");
const Context_1 = require("../Context");
const TestResultDataSource_1 = require("../DataSource/TestResultDataSource");
const TAB_LOG_FILE_REGEX = /^TAB_([^_]*_?)+\.\w*$/;
const PERF_DATA_REGEX = /SPListPerf\s?result:(.*)<\/td>/;
const BUILD_REGEX = /SPListPerf\s?build:(.*)<\/td>/;
const TIME_TAKEN_REGEX = /Time\s?taken:\s?(\d+)\s?ms<\/div>/;
const logFolderPath = path.join(Context_1.config.enviroment.repoRoot, Context_1.config.testContext.testLogRoot);
class ResultProcessor {
    constructor() {
        this._testResultDataSource = new TestResultDataSource_1.default();
    }
    ProcessResults() {
        let unprocessedFiles;
        this._getUnprocessedTestLogs().then((_unprocessedFiles) => {
            unprocessedFiles = _unprocessedFiles;
            const saveResultPromises = [];
            for (let unprocessedFile of unprocessedFiles) {
                const saveTestResultQueryData = this._parseLogFile(unprocessedFile);
                if (saveTestResultQueryData) {
                    saveResultPromises.push(this._testResultDataSource.saveTestResult(saveTestResultQueryData));
                }
            }
            return Promise.all(saveResultPromises);
        }).then((saveResultQueryReturn) => {
            console.log(`save test results: ${saveResultQueryReturn.join()}`);
            return this._archieve(unprocessedFiles);
        }).then(() => {
            console.log(`Successfully archieved log files.`);
        }).catch((error) => {
            console.log(`ProcessResults failure: `, error);
        });
    }
    _archieve(unprocessedFiles) {
        const archieveFolderPath = path.join(logFolderPath, 'archieve');
        if (!fs.existsSync(archieveFolderPath)) {
            fs.mkdirSync(archieveFolderPath);
        }
        const archivePromises = [];
        for (let file of unprocessedFiles) {
            const archieveFilePath = path.join(archieveFolderPath, file.fileName);
            archivePromises.push(fsUtils.move(file.filePath, archieveFilePath));
        }
        return Promise.all(archivePromises);
    }
    _parseLogFile(file) {
        if (file &&
            TAB_LOG_FILE_REGEX.test(file.fileName) &&
            file.content &&
            PERF_DATA_REGEX.test(file.content)) {
            const perfResult = JSON.parse(file.content.match(PERF_DATA_REGEX)[1]);
            const build = BUILD_REGEX.test(file.content) ? file.content.match(BUILD_REGEX)[1] : undefined;
            const duration = TIME_TAKEN_REGEX.test(file.content) ? Number(file.content.match(TIME_TAKEN_REGEX)[1]) : NaN;
            return {
                testRunEnviroment: Context_1.config.enviroment.testRunEnviroment,
                runStartTime: new Date(file.stats.ctime.getTime() - duration),
                runEndTime: file.stats.ctime,
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
    }
    _getLatestProcessedLogFile() {
        return this._testResultDataSource.queryTestResults({
            testRunEnviroment: Context_1.config.enviroment.testRunEnviroment,
            testConfigName: Context_1.config.testContext.testConfigName,
            testName: Context_1.config.testContext.testName,
            browser: Context_1.config.testContext.browser,
            numberOfRuns: 10
        }).then((results) => {
            let lastLogFileName;
            const sorted = results.sort((a, b) => b.runId - a.runId);
            for (let result of sorted) {
                if (result.eupl && result.render && result.tabResultLogName) {
                    lastLogFileName = result.tabResultLogName;
                    break;
                }
                else {
                    console.log(`some result data is missing, this is not expected, eupl: ${result.eupl}, render: ${result.render}, TabResultLogFileName: ${result.tabResultLogName}`);
                }
            }
            const logFilePath = path.join(logFolderPath, lastLogFileName);
            return {
                fileName: lastLogFileName,
                filePath: lastLogFileName && logFilePath,
                content: undefined,
                stats: lastLogFileName && fs.existsSync(logFilePath) && fs.statSync(logFilePath)
            };
        });
    }
    _getUnprocessedTestLogs() {
        return this._getLatestProcessedLogFile().then((lastLog) => {
            const lastLogTime = lastLog.stats && lastLog.stats.ctime;
            const files = fs.readdirSync(logFolderPath);
            return files.filter((fileName) => {
                const filePath = path.join(logFolderPath, fileName);
                const stats = fs.statSync(filePath);
                return !stats.isDirectory() &&
                    (!lastLogTime || stats.ctime > lastLogTime) &&
                    (!lastLog.fileName || fileName != lastLog.fileName);
            }).map((fileName) => {
                const filePath = path.join(logFolderPath, fileName);
                return {
                    fileName: fileName,
                    filePath: filePath,
                    content: fs.readFileSync(filePath, 'utf8'),
                    stats: fs.statSync(filePath)
                };
            });
        });
    }
}
exports.default = ResultProcessor;
//# sourceMappingURL=ResultProcessor.js.map