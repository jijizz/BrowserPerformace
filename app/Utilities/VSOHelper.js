"use strict";
exports.__esModule = true;
var webApi = require("vso-node-api/WebApi");
var GitInterfaces = require("vso-node-api/interfaces/GitInterfaces");
var yargs_1 = require("yargs");
var Log_1 = require("./Log");
var Context_1 = require("../Context");
var PROJECT = Context_1.config.gitContext.project || "OneDriveWeb";
var SERVERURL = Context_1.config.gitContext.serverUrl || "https://onedrive.visualstudio.com/DefaultCollection";
var REPO = Context_1.config.gitContext.repo || 'c1f4c3d2-1889-49e0-8cde-7984b2d88e2f';
var DEFAULT_RETRIES = 5;
var VSOHelper = (function () {
    function VSOHelper() {
    }
    VSOHelper.prototype.getPullRequests = function (params) {
        var _this = this;
        return this.retryPromise(function () {
            return _this.getWebApi().getGitApi().getPullRequests(REPO, {
                creatorId: params.creatorId,
                includeLinks: params.includeLinks,
                repositoryId: REPO,
                reviewerId: params.reviewerId,
                sourceRefName: params.sourceRefName,
                targetRefName: params.targetRefName,
                status: params.status
            }, PROJECT, params.maxCommentLength, params.skip, params.top);
        }, DEFAULT_RETRIES);
    };
    VSOHelper.prototype.getCommitsFromMasterBranch = function (limit) {
        return this.getWebApi().getGitApi().getCommits(REPO, {
            itemVersion: {
                version: 'master',
                versionOptions: undefined,
                versionType: GitInterfaces.GitVersionType.Branch
            }
        }, PROJECT, 0, limit || 100);
    };
    VSOHelper.prototype.getCommit = function (commitId) {
        return this.getWebApi().getGitApi().getCommit(commitId, REPO, PROJECT);
    };
    VSOHelper.prototype.retryPromise = function (createPromise, retriesLeft) {
        var _this = this;
        return createPromise().then(function (value) {
            return value;
        }, function (error) {
            if (retriesLeft > 0) {
                Log_1.logger.info("Retrying promise - " + retriesLeft);
                return _this.retryPromise(createPromise, retriesLeft - 1);
            }
            else {
                throw error;
            }
        });
    };
    VSOHelper.prototype.getBuildFromBuildNumber = function (buildNumber) {
        var _this = this;
        return this.retryPromise(function () {
            return _this.getBuildApi().getBuilds(PROJECT, null, null, buildNumber);
        }, DEFAULT_RETRIES).then(function (builds) {
            return builds && builds[0];
        });
    };
    VSOHelper.prototype.getBuildAccountAccessToken = function () {
        if (!this._vsoToken) {
            var buildAccountSecret = yargs_1.argv['buildaccounttoken'];
            if (buildAccountSecret) {
                this._vsoToken = buildAccountSecret;
            }
        }
        return this._vsoToken;
    };
    VSOHelper.prototype.getWebApi = function () {
        if (!this._api) {
            var authHandler = void 0;
            if (this.getBuildAccountAccessToken()) {
                Log_1.logger.info('Using build account access token');
                authHandler = webApi.getPersonalAccessTokenHandler(this.getBuildAccountAccessToken());
            }
            this._api = new webApi.WebApi(SERVERURL, authHandler);
        }
        return this._api;
    };
    VSOHelper.prototype.getGitApi = function () {
        return this.getWebApi().getGitApi();
    };
    VSOHelper.prototype.getBuildApi = function () {
        return this.getWebApi().getBuildApi();
    };
    VSOHelper.prototype.stringToBase64 = function (str) {
        return new Buffer(str, 'binary').toString('base64');
    };
    return VSOHelper;
}());
exports["default"] = VSOHelper;
