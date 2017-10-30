import { sendPerfRegressionMail, IPerfReportData, IPerfReportMetricData, IChange, IGroupedChanges, ReportDataType } from '../Utilities/Mail';
import TestResultDataSource from '../DataSource/TestResultDataSource';
import {
    IAnalyseTestResultsSprocResultset,
    IAnalyseTestResultsSprocResult,
    IAnalyseTestResultsQueryOptions
} from '../DataSource/ITestResultDataSource';
import { config } from '../Context';
import { logger } from '../Utilities/Log';
import VSOHelper from '../Utilities/VSOHelper';
import * as GitInterfaces from 'vso-node-api/interfaces/GitInterfaces';
import * as BuildInterfaces from 'vso-node-api/interfaces/BuildInterfaces';

const RENDER_THRESHOULD = config.testContext.thresholdInMilliseconds; // report when greater than 50 ms render time change is detected
const NO_NEED_TO_REPORT = 'no need to report';
export default class ResultReporter {
    private _testResultDataSource: TestResultDataSource;
    private _vsoHelper: VSOHelper;

    constructor() {
        this._testResultDataSource = new TestResultDataSource();
        this._vsoHelper = new VSOHelper();
    }

    public report(): Promise<void> {
        logger.info('start test result reporting');
        let perfData: IPerfReportData;
        return this._testResultDataSource.analyseTestResults({
            testRunEnviroment: config.enviroment.testRunEnviroment,
            testConfigName: config.testContext.testConfigName,
            testName: config.testContext.testName,
            browser: config.testContext.browser,
            numberOfBuilds: 5
        }).then((recentBuildResults: IAnalyseTestResultsSprocResultset) => {
            logger.info('successfully processed build results');
            const perfReportData = this._processRecentBuildResults(recentBuildResults);
            if (perfReportData) {
                logger.info(`found perf ${perfReportData.type === ReportDataType.improvement ? 'improvement' : 'regression'}`);
            } else {
                logger.info(`no obvious perf regression or improvements found, no need to send perf report`);
                throw NO_NEED_TO_REPORT;
            }
            return perfReportData;
        }).then((perfReportData: IPerfReportData) => {
            perfData = perfReportData;
            return this._getRecentChanges(perfData);
        }).then((changes: IChange[]) => {
            const groupedChanges = this._getGroupedChanges(changes);
            return sendPerfRegressionMail(perfData, groupedChanges);
        }).then(() => {
            logger.info('successfully sent notification email');
            return;
        }).catch((err: Error) => {
            logger.error('test result reporting encouters error: ', err);
            if (err.message === NO_NEED_TO_REPORT) {
                return;  // no a real error, just need to return early in this case
            } else {
                throw err;
            }
        });
    }

    private _getGroupedChanges(changes: IChange[]): IGroupedChanges {
        const groupedChanges = {};
        changes.forEach((change: IChange) => {
            const email = change.author.email;
            if (email != 'orfserv@microsoft.com') {
                const gChanges: IChange[] = groupedChanges[email] = groupedChanges[email] || [];
                gChanges.push(change);
            }
        });
        return groupedChanges;
    }

    private _getRecentChanges(perfReportData: IPerfReportData): Promise<IChange[]> {
        let targetCommitId;
        let baselineCommitId;
        let prs: GitInterfaces.GitPullRequest[] = [];        
        logger.info('call _getRecentChanges');

        return Promise.all(
            [
                this._vsoHelper.getBuildFromBuildNumber(perfReportData.targetBuild),
                this._vsoHelper.getBuildFromBuildNumber(perfReportData.baselineBuild)
            ]).then((builds: BuildInterfaces.Build[]) => {
                targetCommitId = builds[0].sourceVersion;
                baselineCommitId = builds[1].sourceVersion;
                logger.info(`targetCommitId: ${targetCommitId}, baselineCommitId: ${baselineCommitId}`);
                return this._vsoHelper.getPullRequests({
                    status: GitInterfaces.PullRequestStatus.Completed,
                    maxCommentLength: 100,
                    top: 100,
                    skip: 0
                });
            }).then((_prs: GitInterfaces.GitPullRequest[]) => {
                logger.info(`get ${prs ? prs.length : 0} prs`);
                prs = _prs;
                return this._processChanges(targetCommitId, baselineCommitId, prs);
            });
    }

    private _getCommitUrl(commit: GitInterfaces.GitCommit): string {
        const ret = `${config.gitContext.serverUrl}/_git/${config.gitContext.repo}/commit/${commit.commitId}`;
        return ret;
    }

    private _getPRUrl(pr: GitInterfaces.GitPullRequest): string {
        const ret = `${config.gitContext.serverUrl}/_git/${config.gitContext.repo}/pullrequest/${pr.pullRequestId}`;
        return ret;
    }

    private _processChanges(
        currentCommitId: string,
        baselineCommitId: string,
        prs: GitInterfaces.GitPullRequest[]
    ): Promise<IChange[]> {
        logger.info(`check ${currentCommitId}`);
        return this._vsoHelper.getCommit(currentCommitId).then((commit: GitInterfaces.GitCommit) => {
            if (commit && commit.commitId != baselineCommitId) {
                const pr = this._getPRByCommitId(commit.commitId, prs);
                const change: IChange = {
                    commit: commit,
                    pr: pr,
                    author: commit.committer,
                    prUrl: this._getPRUrl(pr),
                    commitUrl: this._getCommitUrl(commit)
                };
                if (commit.parents.length === 1) { // this commit has only 1 parent, it must be a merge commit in master
                    return this._processChanges(commit.parents[0], baselineCommitId, prs).then((changes: IChange[]) => {
                        changes.unshift(change);
                        return changes;
                    });
                } else if (commit.parents.length === 2) {
                    if (pr) {
                        const index = commit.parents.indexOf(pr.lastMergeSourceCommit.commitId);
                        if (index < 0) {
                            logger.error(`this should not happen: commit(${commit.commitId}).parents does not have pr ${pr.pullRequestId}.lastMergeSourceCommit ${pr.lastMergeSourceCommit.commitId}`);
                            throw ('commit.parents.indexOf(pr.lastMergeSourceCommit.commitId)');
                        } else {
                            return this._processChanges(commit.parents[1 - index], baselineCommitId, prs).then((changes: IChange[]) => {
                                changes.unshift(change);
                                return changes;
                            });
                        }
                    } else {
                        const errorMSG = `this should not happen: commit(${commit.commitId}).parents has 2 commits but there is no matching RP`;
                        logger.error(errorMSG);
                        throw (errorMSG);
                    }
                } else {
                    logger.error(`this should not happen: commit(${commit.commitId}).parents has ${commit.parents.length} commits`);
                    throw ('commit.parents has more than 2 commits');
                }
            } else {
                return [];
            }
        });
    }

    private _getPRByCommitId(commitId: string, prs: GitInterfaces.GitPullRequest[]): GitInterfaces.GitPullRequest {
        return prs.filter((pr: GitInterfaces.GitPullRequest) => pr.lastMergeCommit.commitId === commitId)[0];
    }

    private _processRecentBuildResults(recentBuildResults: IAnalyseTestResultsSprocResultset): IPerfReportData {
        let ret: IPerfReportData = undefined;
        if (recentBuildResults && recentBuildResults.length > 1) {
            const latest = recentBuildResults[recentBuildResults.length - 1];
            const secondLatest = recentBuildResults[recentBuildResults.length - 2];
            if (latest.render && secondLatest.render && Math.abs(latest.render - secondLatest.render) > RENDER_THRESHOULD) {
                const reportDataType: ReportDataType = latest.render > secondLatest.render ? ReportDataType.regression : ReportDataType.improvement;
                ret = {
                    type: reportDataType,
                    data: [],
                    targetBuild: latest.build.trim(),
                    baselineBuild: secondLatest.build.trim()
                }
                ret.data = recentBuildResults.map((result: IAnalyseTestResultsSprocResult, index: number, arr: IAnalyseTestResultsSprocResultset) => {
                    return this._resultToArray(result, index, arr);
                });
                ret.data.unshift([
                    'Builds',
                    'render',
                    'eupl',
                    'appStart',
                    'setTimeout cost',
                    'server duration',
                    'iteration count per run',
                    'number of runs'
                ]);
                const eupl = (latest.eupl === null || secondLatest.eupl === null) ? NaN : latest.eupl - secondLatest.eupl;
                const render = (latest.render === null || secondLatest.render === null) ? NaN : latest.render - secondLatest.render;
                const appStart = (latest.appStart === null || secondLatest.appStart === null) ? NaN : latest.appStart - secondLatest.appStart;
                const setTimeoutCost = (latest.setTimeoutCost === null || secondLatest.setTimeoutCost === null) ? NaN : latest.setTimeoutCost - secondLatest.setTimeoutCost;
                const serverDuration = (latest.serverDuration === null || secondLatest.serverDuration === null) ? NaN : latest.serverDuration - secondLatest.serverDuration;
                const outputMetrics = (metric: number) => {
                    if (isNaN(metric) || metric === null) {
                        return '';
                    } else {
                        let prefix;
                        if (metric > 0) {
                            prefix = '+';
                        } else if (metric < 0) {
                            prefix = '-';
                        } else {
                            prefix = '';
                        }
                        return `${prefix}${Math.abs(metric)}`
                    }
                };
                const outputMetricsPercent = (metric: number) => {
                    const out: string = outputMetrics(metric);
                    return !!out ? `${out}%` : out;
                };
                ret.data.push([
                    `${reportDataType === ReportDataType.improvement ? 'improvement' : 'regression'}`,
                    {
                        content: `${outputMetrics(render)}`,
                        warning: reportDataType === ReportDataType.improvement ? 'improvement' : 'regression',
                    },
                    `${outputMetrics(eupl)}`,
                    `${outputMetrics(appStart)}`,
                    `${outputMetrics(setTimeoutCost)}`,
                    `${outputMetrics(serverDuration)}`,
                    `----`,
                    `----`
                ]);
                ret.data.push([
                    `${reportDataType === ReportDataType.improvement ? 'improvement' : 'regression'} Percent`,
                    {
                        content: `${outputMetricsPercent(Math.round(render / latest.render * 100))}`,
                        warning: reportDataType === ReportDataType.improvement ? 'improvement' : 'regression'
                    },
                    `${outputMetricsPercent(Math.round(eupl / latest.eupl * 100))}`,
                    `${outputMetricsPercent(Math.round(appStart / latest.appStart * 100))}`,
                    `${outputMetricsPercent(Math.round(setTimeoutCost / latest.setTimeoutCost * 100))}`,
                    `${outputMetricsPercent(Math.round(serverDuration / latest.serverDuration * 100))}`,
                    `----`,
                    `----`
                ]);
            }
        }
        return ret;
    }

    private _resultToArray(
        result: IAnalyseTestResultsSprocResult,
        index: number,
        arr: IAnalyseTestResultsSprocResultset
    ): IPerfReportMetricData[] {
        const ret = [];
        for (const key in result) {
            const data = result[key];
            const content = !!data ? data.toString() : '';
            if (key === 'render' && index >= arr.length - 2) {
                ret.push({
                    content: content,
                    cssClass: 'warning'
                });
            } else {
                ret.push(content);
            }
        }
        return ret;
    }
}