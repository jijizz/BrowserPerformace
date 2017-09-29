export default class ResultProcessor {
    private _testResultDataSource;
    constructor();
    ProcessResults(): Promise<void>;
    private _archieve(unprocessedFiles);
    private _parseLogFile(file);
    private _getLatestProcessedLogFile();
    private _getUnprocessedTestLogs();
}
