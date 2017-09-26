import { IQueryTestResultsSprocResultset, IQueryTestResultQueryOptions, ISaveTestResultQueryData } from './ITestResultDataSource';
export default class TestResultDataSource {
    constructor();
    saveTestResult(testResult: ISaveTestResultQueryData): Promise<boolean>;
    queryTestResults(option: IQueryTestResultQueryOptions): Promise<IQueryTestResultsSprocResultset>;
    private _convertTestResultQueryOptionsToInput(option);
    private _convertSaveTestResultDataToInput(testResult);
}
