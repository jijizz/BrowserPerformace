"use strict";
exports.__esModule = true;
var Mail_1 = require("../Utilities/Mail");
var TestResultDataSource_1 = require("../DataSource/TestResultDataSource");
var Context_1 = require("../Context");
var Log_1 = require("../Utilities/Log");
var VSOHelper_1 = require("../Utilities/VSOHelper");
var GitInterfaces = require("vso-node-api/interfaces/GitInterfaces");
var RENDER_THRESHOULD = Context_1.config.testContext.thresholdInMilliseconds; // report when greater than 50 ms render time change is detected
var NO_NEED_TO_REPORT = 'no need to report';
var ResultReporter = (function () {
    function ResultReporter() {
        this._testResultDataSource = new TestResultDataSource_1["default"]();
        this._vsoHelper = new VSOHelper_1["default"]();
    }
    ResultReporter.prototype.report = function () {
        var _this = this;
        Log_1.logger.info('start test result reporting');
        var perfData;
        return this._testResultDataSource.analyseTestResults({
            testRunEnviroment: Context_1.config.enviroment.testRunEnviroment,
            testConfigName: Context_1.config.testContext.testConfigName,
            testName: Context_1.config.testContext.testName,
            browser: Context_1.config.testContext.browser,
            numberOfBuilds: 5
        }).then(function (recentBuildResults) {
            Log_1.logger.info('successfully processed build results');
            var perfReportData = _this._processRecentBuildResults(recentBuildResults);
            if (perfReportData) {
                Log_1.logger.info("found perf " + (perfReportData.type === Mail_1.ReportDataType.improvement ? 'improvement' : 'regression'));
            }
            else {
                Log_1.logger.info("no obvious perf regression or improvements found, no need to send perf report");
                throw NO_NEED_TO_REPORT;
            }
            return perfReportData;
        }).then(function (perfReportData) {
            perfData = perfReportData;
            return _this._getRecentChanges(perfData);
        }).then(function (changes) {
            var groupedChanges = _this._getGroupedChanges(changes);
            return Mail_1.sendPerfRegressionMail(perfData, groupedChanges);
        }).then(function () {
            Log_1.logger.info('successfully sent notification email');
            return;
        })["catch"](function (err) {
            Log_1.logger.error('test result reporting encouters error: ', err);
            if (err.message === NO_NEED_TO_REPORT) {
                return; // no a real error, just need to return early in this case
            }
            else {
                throw err;
            }
        });
    };
    ResultReporter.prototype._getGroupedChanges = function (changes) {
        var groupedChanges = {};
        changes.forEach(function (change) {
            var email = change.author.email;
            if (email != 'orfserv@microsoft.com') {
                var gChanges = groupedChanges[email] = groupedChanges[email] || [];
                gChanges.push(change);
            }
        });
        return groupedChanges;
    };
    ResultReporter.prototype._getRecentChanges = function (perfReportData) {
        var _this = this;
        var targetCommitId;
        var baselineCommitId;
        var prs = [];
        Log_1.logger.info('call _getRecentChanges');
        return Promise.all([
            this._vsoHelper.getBuildFromBuildNumber(perfReportData.targetBuild),
            this._vsoHelper.getBuildFromBuildNumber(perfReportData.baselineBuild)
        ]).then(function (builds) {
            targetCommitId = builds[0].sourceVersion;
            baselineCommitId = builds[1].sourceVersion;
            Log_1.logger.info("targetCommitId: " + targetCommitId + ", baselineCommitId: " + baselineCommitId);
            return _this._vsoHelper.getPullRequests({
                status: GitInterfaces.PullRequestStatus.Completed,
                maxCommentLength: 100,
                top: 100,
                skip: 0
            });
        }).then(function (_prs) {
            Log_1.logger.info("get " + (prs ? prs.length : 0) + " prs");
            prs = _prs;
            return _this._processChanges(targetCommitId, baselineCommitId, prs);
        });
    };
    ResultReporter.prototype._processChanges = function (currentCommitId, baselineCommitId, prs) {
        var _this = this;
        Log_1.logger.info("check " + currentCommitId);
        return this._vsoHelper.getCommit(currentCommitId).then(function (commit) {
            if (commit && commit.commitId != baselineCommitId) {
                var pr = _this._getPRByCommitId(commit.commitId, prs);
                var change_1 = {
                    commit: commit,
                    pr: pr,
                    author: commit.committer
                };
                if (commit.parents.length === 1) {
                    return _this._processChanges(commit.parents[0], baselineCommitId, prs).then(function (changes) {
                        changes.unshift(change_1);
                        return changes;
                    });
                }
                else if (commit.parents.length === 2) {
                    if (pr) {
                        var index = commit.parents.indexOf(pr.lastMergeSourceCommit.commitId);
                        if (index < 0) {
                            Log_1.logger.error("this should not happen: commit(" + commit.commitId + ").parents does not have pr " + pr.pullRequestId + ".lastMergeSourceCommit " + pr.lastMergeSourceCommit.commitId);
                            throw ('commit.parents.indexOf(pr.lastMergeSourceCommit.commitId)');
                        }
                        else {
                            return _this._processChanges(commit.parents[1 - index], baselineCommitId, prs).then(function (changes) {
                                changes.unshift(change_1);
                                return changes;
                            });
                        }
                    }
                    else {
                        var errorMSG = "this should not happen: commit(" + commit.commitId + ").parents has 2 commits but there is no matching RP";
                        Log_1.logger.error(errorMSG);
                        throw (errorMSG);
                    }
                }
                else {
                    Log_1.logger.error("this should not happen: commit(" + commit.commitId + ").parents has " + commit.parents.length + " commits");
                    throw ('commit.parents has more than 2 commits');
                }
            }
            else {
                return [];
            }
        });
    };
    ResultReporter.prototype._getPRByCommitId = function (commitId, prs) {
        return prs.filter(function (pr) { return pr.lastMergeCommit.commitId === commitId; })[0];
    };
    ResultReporter.prototype._processRecentBuildResults = function (recentBuildResults) {
        var _this = this;
        var ret = undefined;
        if (recentBuildResults && recentBuildResults.length > 1) {
            var latest = recentBuildResults[recentBuildResults.length - 1];
            var secondLatest = recentBuildResults[recentBuildResults.length - 2];
            if (latest.render && secondLatest.render && Math.abs(latest.render - secondLatest.render) > RENDER_THRESHOULD) {
                var reportDataType = latest.render > secondLatest.render ? Mail_1.ReportDataType.regression : Mail_1.ReportDataType.improvement;
                ret = {
                    type: reportDataType,
                    data: [],
                    targetBuild: latest.build.trim(),
                    baselineBuild: secondLatest.build.trim()
                };
                ret.data = recentBuildResults.map(function (result, index, arr) {
                    return _this._resultToArray(result, index, arr);
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
                var eupl = (latest.eupl === null || secondLatest.eupl === null) ? NaN : latest.eupl - secondLatest.eupl;
                var render = (latest.render === null || secondLatest.render === null) ? NaN : latest.render - secondLatest.render;
                var appStart = (latest.appStart === null || secondLatest.appStart === null) ? NaN : latest.appStart - secondLatest.appStart;
                var setTimeoutCost = (latest.setTimeoutCost === null || secondLatest.setTimeoutCost === null) ? NaN : latest.setTimeoutCost - secondLatest.setTimeoutCost;
                var serverDuration = (latest.serverDuration === null || secondLatest.serverDuration === null) ? NaN : latest.serverDuration - secondLatest.serverDuration;
                var outputMetrics_1 = function (metric) {
                    if (isNaN(metric) || metric === null) {
                        return '';
                    }
                    else {
                        var prefix = void 0;
                        if (metric > 0) {
                            prefix = '+';
                        }
                        else if (metric < 0) {
                            prefix = '-';
                        }
                        else {
                            prefix = '';
                        }
                        return "" + prefix + Math.abs(metric);
                    }
                };
                var outputMetricsPercent = function (metric) {
                    var out = outputMetrics_1(metric);
                    return !!out ? out + "%" : out;
                };
                ret.data.push([
                    "" + (reportDataType === Mail_1.ReportDataType.improvement ? 'improvement' : 'regression'),
                    {
                        content: "" + outputMetrics_1(render),
                        warning: reportDataType === Mail_1.ReportDataType.improvement ? 'improvement' : 'regression'
                    },
                    "" + outputMetrics_1(eupl),
                    "" + outputMetrics_1(appStart),
                    "" + outputMetrics_1(setTimeoutCost),
                    "" + outputMetrics_1(serverDuration),
                    "----",
                    "----"
                ]);
                ret.data.push([
                    (reportDataType === Mail_1.ReportDataType.improvement ? 'improvement' : 'regression') + " Percent",
                    {
                        content: "" + outputMetricsPercent(Math.round(render / latest.render * 100)),
                        warning: reportDataType === Mail_1.ReportDataType.improvement ? 'improvement' : 'regression'
                    },
                    "" + outputMetricsPercent(Math.round(eupl / latest.eupl * 100)),
                    "" + outputMetricsPercent(Math.round(appStart / latest.appStart * 100)),
                    "" + outputMetricsPercent(Math.round(setTimeoutCost / latest.setTimeoutCost * 100)),
                    "" + outputMetricsPercent(Math.round(serverDuration / latest.serverDuration * 100)),
                    "----",
                    "----"
                ]);
            }
        }
        return ret;
    };
    ResultReporter.prototype._resultToArray = function (result, index, arr) {
        var ret = [];
        for (var key in result) {
            var data = result[key];
            var content = !!data ? data.toString() : '';
            if (key === 'render' && index >= arr.length - 2) {
                ret.push({
                    content: content,
                    cssClass: 'warning'
                });
            }
            else {
                ret.push(content);
            }
        }
        return ret;
    };
    return ResultReporter;
}());
exports["default"] = ResultReporter;
