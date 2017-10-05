import * as fsUtils from '../Utilities/FsUtils';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../Context';
import TestResultDataSource from '../DataSource/TestResultDataSource';
import { IQueryTestResultsSprocResult, IQueryTestResultsSprocResultset, ISaveTestResultQueryData } from '../DataSource/ITestResultDataSource';
import { logger } from '../Utilities/Log';

interface resultLogFileMetaData {
    fileName: string;
    filePath: string;
    content: string;
    stats: fs.Stats;
}

const TAB_LOG_FILE_REGEX = /^TAB_([^_]*_?)+\.\w*$/;
const PERF_DATA_REGEX = /SPListPerf\s?result:(.*?)<\/td>/;
const BUILD_REGEX = /SPListPerf\s?build:\s?(.*?)<\/td>/;
const TIME_TAKEN_REGEX = /Time\s?taken:\s?(\d+)\s?ms<\/div>/;
const logFolderPath = path.join(config.enviroment.repoRoot, config.testContext.testLogRoot);
const excludedFiles = ['combine.cmd', 'combinefiles.cmd', 'reportFileName.txt'];

export default class ResultProcessor {
    private _testResultDataSource: TestResultDataSource;

    constructor() {
        this._testResultDataSource = new TestResultDataSource();
    }

    public ProcessResults(): Promise<void> {
        logger.info('start ProcessResults');
        let unprocessedFiles: resultLogFileMetaData[];
        return this._getUnprocessedTestLogs().then((_unprocessedFiles: resultLogFileMetaData[]) => {
            logger.info('found _unprocessedFiles: ', unprocessedFiles);
            unprocessedFiles = _unprocessedFiles.sort((a: resultLogFileMetaData, b: resultLogFileMetaData) => a.stats.ctime.getTime() - b.stats.ctime.getTime());

            return unprocessedFiles.reduce((currentPromise: Promise<boolean>, currentFile: resultLogFileMetaData, currentIndex: number, array: resultLogFileMetaData[]) => {
                const saveTestResultQueryData = this._parseLogFile(currentFile);
                return currentPromise.then((result: boolean) => {
                    if (!result) {
                        logger.error(`Failed to save results for file: ${array[currentIndex - 1].filePath}`);
                    }
                    return this._testResultDataSource.saveTestResult(saveTestResultQueryData);
                }).catch((err: Error) => {
                    logger.error(`Failed to save results for file: ${array[currentIndex - 1].filePath}, error: ${err.message}`);
                    return this._testResultDataSource.saveTestResult(saveTestResultQueryData);
                });
            }, Promise.resolve(true));
        }).then((saveResultQueryReturn: boolean) => {
            logger.info(`saved all test results`);
            return this._archieve(unprocessedFiles);
        }).then(() => {
            logger.info(`Successfully archieved log files.`);
            return undefined;
        }).catch((err: Error) => {
            logger.error(`ProcessResults failure: ${err.message}`);
            return undefined;
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
                runStartTime: new Date(file.stats.mtime.getTime() - duration),
                runEndTime: file.stats.mtime,
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
            numberOfRuns: 100
        }).then((results: IQueryTestResultsSprocResultset) => {
            let lastLogFileName: string;
            const sorted = results.sort((a: IQueryTestResultsSprocResult, b: IQueryTestResultsSprocResult) => b.runId - a.runId);
            for (let result of sorted) {
                if (result.eupl && result.render && result.tabResultLogName) {
                    lastLogFileName = result.tabResultLogName;
                    break;
                } else {
                    logger.error(`some result data is missing, this is not expected, eupl: ${result.eupl}, render: ${result.render}, TabResultLogFileName: ${result.tabResultLogName}`)
                }
            }
            const logFilePath = lastLogFileName && path.join(logFolderPath, lastLogFileName);
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
            const lastLogTime = lastLog.stats && lastLog.stats.mtime;
            const files = fs.readdirSync(logFolderPath);
            return files.filter((fileName: string) => {
                const filePath = path.join(logFolderPath, fileName);
                const stats = fs.statSync(filePath);
                return !stats.isDirectory() &&
                    excludedFiles.indexOf(fileName) === -1 &&
                    (!lastLogTime || stats.mtime > lastLogTime) &&
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