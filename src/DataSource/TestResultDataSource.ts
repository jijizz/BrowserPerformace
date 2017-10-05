import { execSproc, ISprocInput, ISprocOutput, ISprocResult } from '../Utilities/SQLUtil';
import * as mssql from 'mssql';
import {
    IQueryTestResultsSprocOutput,
    IQueryTestResultQueryOptions,
    IQueryTestResultsSprocResult,
    IQueryTestResultsSprocResultset,
    IQueryTestResultsForLatestBuildsSprocResultset,
    IQueryTestResultsForLatestBuildsQueryOptions,
    IQueryTestResultsForLatestBuildsSprocResult,
    ISaveTestResultQueryData,
    ISaveTestResultSprocOutput,
    IAnalyseTestResultsSprocResultset,
    IAnalyseTestResultsSprocResult,
    IAnalyseTestResultsQueryOptions
} from './ITestResultDataSource';
import { config } from '../Context';
import { logger } from '../Utilities/Log';

export default class TestResultDataSource {
    constructor() {
    }

    public saveTestResult(testResult: ISaveTestResultQueryData): Promise<boolean> {
        const inputs = this._convertSaveTestResultDataToInput(testResult);
        const outputs: ISprocOutput[] = [{
            name: 'rowsInserted',
            type: {
                type: mssql.Int
            }
        }];
        return execSproc<any, ISaveTestResultSprocOutput>(inputs, outputs, 'proc_SaveTestResult', config.database.name).then((result: ISprocResult<any, ISaveTestResultSprocOutput>) => {
            return result.output && result.output.rowsInserted > 0;
        }).catch((error: any) => {
            logger.error('proc_SaveTestResult query error: ', error);
            throw error;
        });
    }

    public queryTestResults(option: IQueryTestResultQueryOptions): Promise<IQueryTestResultsSprocResultset> {
        const inputs = this._convertTestResultQueryOptionsToInput(option);
        const outputs: ISprocOutput[] = [{
            name: 'resultsFound',
            type: {
                type: mssql.Int
            }
        }];
        return execSproc<IQueryTestResultsSprocResult, IQueryTestResultsSprocOutput>(inputs, outputs, 'proc_QueryTestResults', config.database.name).then((result: ISprocResult<IQueryTestResultsSprocResult, IQueryTestResultsSprocOutput>) => {
            return result.recordset;
        }).catch((error: any) => {
            logger.error('proc_QueryTestResults query error: ', error);
            throw error;
        });
    }

    public queryTestResultsForLatestBuilds(option: IQueryTestResultsForLatestBuildsQueryOptions): Promise<IQueryTestResultsForLatestBuildsSprocResultset> {
        const inputs = this._convertTestResultsForLatestBuildsQueryOptionsToInput(option);
        const outputs: ISprocOutput[] = [{
            name: 'resultsFound',
            type: {
                type: mssql.Int
            }
        }];
        return execSproc<IQueryTestResultsForLatestBuildsSprocResult, IQueryTestResultsSprocOutput>(inputs, outputs, 'proc_QueryTestResultsForLatestBuilds', config.database.name).then((result: ISprocResult<IQueryTestResultsForLatestBuildsSprocResult, IQueryTestResultsSprocOutput>) => {
            return result.recordset;
        }).catch((error: any) => {
            logger.error('proc_QueryTestResultsForLatestBuilds query error: ', error);
            throw error;
        });
    }

    public analyseTestResults(option: IAnalyseTestResultsQueryOptions): Promise<IAnalyseTestResultsSprocResultset> {
        const inputs = this._convertAnalyseTestResultsQueryOptionsToInput(option);
        return execSproc<IAnalyseTestResultsSprocResult, {}>(inputs, undefined, 'proc_AnalyseTestResults', config.database.name).then((result: ISprocResult<IAnalyseTestResultsSprocResult, {}>) => {
            return result.recordset;
        }).catch((error: any) => {
            logger.error('proc_AnalyseTestResults query error: ', error);
            throw error;
        });
    }

    private _convertAnalyseTestResultsQueryOptionsToInput(option: IAnalyseTestResultsQueryOptions): ISprocInput[] {
        return this._convertTestResultsForLatestBuildsQueryOptionsToInput(option);
    }

    private _convertTestResultsForLatestBuildsQueryOptionsToInput(option: IQueryTestResultsForLatestBuildsQueryOptions): ISprocInput[] {
        const input: ISprocInput[] = [
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
            }];
        return input;
    }

    private _convertTestResultQueryOptionsToInput(option: IQueryTestResultQueryOptions): ISprocInput[] {
        const input: ISprocInput[] = [
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
            }];
        return input;
    }

    private _convertSaveTestResultDataToInput(testResult: ISaveTestResultQueryData): ISprocInput[] {
        const input: ISprocInput[] = [
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
            }];
        return input;
    }
}