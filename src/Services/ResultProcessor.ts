import * as fsUtils from '../Utilities/FsUtils';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../Context';
import TestResultDataSource from '../DataSource/TestResultDataSource';
import { IQueryTestResultsSprocResult, IQueryTestResultsSprocResultset, ISaveTestResultQueryData } from '../DataSource/ITestResultDataSource';

interface resultLogFileMetaData {
    fileName: string;
    filePath: string;
    content: string;
    stats: fs.Stats;
}

const TAB_LOG_FILE_REGEX = /^TAB_([^_]*_?)+\.\w*$/;
const PERF_DATA_REGEX = /SPListPerf\s?result:(.*)<\/td>/;
const BUILD_REGEX = /SPListPerf\s?build:(.*)<\/td>/;
const TIME_TAKEN_REGEX = /Time\s?taken:\s?(\d+)\s?ms<\/div>/;
const logFolderPath = path.join(config.enviroment.repoRoot, config.testContext.testLogRoot);

export default class ResultProcessor {
    private _testResultDataSource: TestResultDataSource;

    constructor() {
        this._testResultDataSource = new TestResultDataSource();
    }

    public ProcessResults(): void {
        let unprocessedFiles: resultLogFileMetaData[];
        this._getUnprocessedTestLogs().then((_unprocessedFiles: resultLogFileMetaData[]) => {
            unprocessedFiles = _unprocessedFiles;
            const saveResultPromises: Promise<boolean>[] = [];
            for (let unprocessedFile of unprocessedFiles) {
                const saveTestResultQueryData = this._parseLogFile(unprocessedFile);
                if (saveTestResultQueryData) {
                    saveResultPromises.push(this._testResultDataSource.saveTestResult(saveTestResultQueryData));
                }
            }
            return Promise.all(saveResultPromises);
        }).then((saveResultQueryReturn: boolean[]) => {
            console.log(`save test results: ${saveResultQueryReturn.join()}`);
            return this._archieve(unprocessedFiles);
        }).then(() => {
            console.log(`Successfully archieved log files.`);
        }).catch((error) => {
            console.log(`ProcessResults failure: `, error);
        })
    }

    private _archieve(unprocessedFiles: resultLogFileMetaData[]): Promise<void[]> {
        const archieveFolderPath = path.join(logFolderPath, 'archieve');
        if (!fs.existsSync(archieveFolderPath)) {
            fs.mkdirSync(archieveFolderPath);
        }
        const archivePromises: Promise<void>[] = [];
        for (let file of unprocessedFiles) {
            const archieveFilePath = path.join(archieveFolderPath, file.fileName);
            archivePromises.push(fsUtils.move(file.filePath, archieveFilePath));
        }
        return Promise.all(archivePromises);
    }

    private _parseLogFile(file: resultLogFileMetaData): ISaveTestResultQueryData {
        if (file &&
            TAB_LOG_FILE_REGEX.test(file.fileName) &&
            file.content &&
            PERF_DATA_REGEX.test(file.content)) {
            const perfResult = JSON.parse(file.content.match(PERF_DATA_REGEX)[1]);
            const build = BUILD_REGEX.test(file.content) ? file.content.match(BUILD_REGEX)[1] : undefined;
            const duration = TIME_TAKEN_REGEX.test(file.content) ? Number(file.content.match(TIME_TAKEN_REGEX)[1]) : NaN;
            return {
                testRunEnviroment: config.enviroment.testRunEnviroment,
                runStartTime: new Date(file.stats.ctime.getTime() - duration),
                runEndTime: file.stats.ctime,
                runDuration: duration,
                build: build,
                browser: config.testContext.browser,
                testName: config.testContext.testName,
                testConfigName: config.testContext.testConfigName,
                tabResultLogName: file.fileName,
                rawLog: file.content,
                render: perfResult.render.p75,
                eupl: perfResult.eupl.p75,
                appStart: perfResult.appStart.p75,
                setTimeoutCost: perfResult.setTimeoutCost.p75,
                glamor: perfResult.glamor.p75,
                serverDuration: perfResult.serverDuration.p75,
                iterationCount: perfResult.eupl.count
            }
        }
        return undefined;
    }

    private _getLatestProcessedLogFile(): Promise<resultLogFileMetaData> {
        return this._testResultDataSource.queryTestResults({
            testRunEnviroment: config.enviroment.testRunEnviroment,
            testConfigName: config.testContext.testConfigName,
            testName: config.testContext.testName,
            browser: config.testContext.browser,
            numberOfRuns: 10
        }).then((results: IQueryTestResultsSprocResultset) => {
            let lastLogFileName: string;
            const sorted = results.sort((a: IQueryTestResultsSprocResult, b: IQueryTestResultsSprocResult) => b.runId - a.runId);
            for (let result of sorted) {
                if (result.eupl && result.render && result.tabResultLogName) {
                    lastLogFileName = result.tabResultLogName;
                    break;
                } else {
                    console.log(`some result data is missing, this is not expected, eupl: ${result.eupl}, render: ${result.render}, TabResultLogFileName: ${result.tabResultLogName}`)
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

    private _getUnprocessedTestLogs(): Promise<resultLogFileMetaData[]> {
        return this._getLatestProcessedLogFile().then((lastLog: resultLogFileMetaData) => {
            const lastLogTime = lastLog.stats && lastLog.stats.ctime;
            const files = fs.readdirSync(logFolderPath);
            return files.filter((fileName: string) => {
                const filePath = path.join(logFolderPath, fileName);
                const stats = fs.statSync(filePath);
                return !stats.isDirectory() &&
                    (!lastLogTime || stats.ctime > lastLogTime) &&
                    (!lastLog.fileName || fileName != lastLog.fileName);
            }).map((fileName: string) => {
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