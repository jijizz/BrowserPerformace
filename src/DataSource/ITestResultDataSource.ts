export interface ISaveTestResultQueryData {
    testRunEnviroment: string;
    runStartTime: Date;
    runEndTime: Date;
    runDuration: number;
    build: string;
    browser: string;
    testName: string;
    testConfigName: string;
    tabResultLogName: string;
    rawLog: string;
    render: number;
    eupl: number;
    appStart: number;
    setTimeoutCost: number;
    glamor: number;
    serverDuration: number;
    iterationCount: number;
}

export interface ISaveTestResultSprocOutput {
    rowsInserted: number;
}

export interface IQueryTestResultsSprocResult {
    runId: number;
    runStartTime: Date;
    runEndTime: Date;
    runDuration: number;
    build: string;
    testId: string;
    testName: string;
    tabResultLogName: string;
    render: number;
    eupl: number;
    appStart: number;
    setTimeoutCost: number;
    serverDuration: number;
    iterationCount: number;
}

export interface IQueryTestResultsForLatestBuildsSprocResult extends IQueryTestResultsSprocResult {
    buildIndex: number
}

export type IQueryTestResultsForLatestBuildsSprocResultset = IQueryTestResultsForLatestBuildsSprocResult[];

export type IQueryTestResultsSprocResultset = IQueryTestResultsSprocResult[];

export interface IQueryTestResultsSprocOutput {
    resultsFound: number;
}

export interface IQueryTestResultQueryOptions {
    testRunEnviroment: string;
    testConfigName: string;
    testName: string;
    browser: string;
    numberOfRuns?: number;
    startTime?: Date;
    endTme?: Date;
    build?: string;
}

export interface IQueryTestResultsForLatestBuildsQueryOptions {
    testRunEnviroment: string;
    testConfigName: string;
    testName: string;
    browser: string;
    numberOfBuilds: number;
}

export interface IAnalyseTestResultsQueryOptions extends IQueryTestResultsForLatestBuildsQueryOptions {

}

export interface IAnalyseTestResultsSprocResult {
    build: string;
    render: number;
    eupl: number;
    appStart: number;
    setTimeoutCost: number;
    serverDuration: number;
    iterationCount: number;
    numberOfRuns: number;
}

export type IAnalyseTestResultsSprocResultset = IAnalyseTestResultsSprocResult[];

