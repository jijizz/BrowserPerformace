import path = require('path');
import * as webApi from 'vso-node-api/WebApi';
import * as BuildInterfaces from 'vso-node-api/interfaces/BuildInterfaces';
import * as GitInterfaces from 'vso-node-api/interfaces/GitInterfaces';
import { IGitApi } from 'vso-node-api/GitApi';
import * as VsoBaseInterfaces from 'vso-node-api/interfaces/common/VsoBaseInterfaces';
import { IBuildApi } from 'vso-node-api/BuildApi';
import { argv as clArgs } from 'yargs';
import { logger } from './Log';
import { config } from '../Context';

export interface IGetPullRequestsAPIParameters {
    creatorId?: string;
    includeLinks?: boolean;
    reviewerId?: string;
    sourceRefName?: string;
    targetRefName?: string;
    status?: GitInterfaces.PullRequestStatus;
    maxCommentLength?: number;
    skip?: number;
    top?: number;
}

const PROJECT = config.gitContext.project || "OneDriveWeb";
const SERVERURL = config.gitContext.serverUrl || "https://onedrive.visualstudio.com/DefaultCollection";
const REPO = config.gitContext.repo || 'c1f4c3d2-1889-49e0-8cde-7984b2d88e2f'
const DEFAULT_RETRIES = 5

export default class VSOHelper {
    private _repositories: GitInterfaces.GitRepository[];
    private _buildDefinitions: BuildInterfaces.BuildDefinition[];
    private _vsoToken: string;
    private _lookedForVSOToken: boolean;
    private _api: webApi.WebApi;

    constructor() {
    }

    public getPullRequests(params: IGetPullRequestsAPIParameters): Promise<GitInterfaces.GitPullRequest[]> {
        return this.retryPromise<GitInterfaces.GitPullRequest[]>(() => {
            return this.getWebApi().getGitApi().getPullRequests(
                REPO,
                {
                    creatorId: params.creatorId,
                    includeLinks: params.includeLinks,
                    repositoryId: REPO,
                    reviewerId: params.reviewerId,
                    sourceRefName: params.sourceRefName,
                    targetRefName: params.targetRefName,
                    status: params.status
                },
                PROJECT,
                params.maxCommentLength,
                params.skip,
                params.top
            );
        }, DEFAULT_RETRIES);
    }

    public getCommitsFromMasterBranch(limit?: number): Promise<GitInterfaces.GitCommitRef[]> {
        return this.getWebApi().getGitApi().getCommits(
            REPO,
            <any>{
                itemVersion: {
                    version: 'master',
                    versionOptions: undefined,
                    versionType: GitInterfaces.GitVersionType.Branch
                }
            },
            PROJECT,
            0,
            limit || 100);
    }

    public getCommit(commitId: string): Promise<GitInterfaces.GitCommit>{
        return this.getWebApi().getGitApi().getCommit(
            commitId,
            REPO,
            PROJECT);
    }

    public retryPromise<T>(createPromise: () => Promise<T>, retriesLeft: number): Promise<T> {
        return createPromise().then(
            (value: T) => {
                return value;
            },
            (error: any) => {
                if (retriesLeft > 0) {
                    logger.info(`Retrying promise - ${retriesLeft}`);
                    return this.retryPromise<T>(createPromise, retriesLeft - 1);
                } else {
                    throw error;
                }
            });
    }

    public getBuildFromBuildNumber(buildNumber: string): Promise<BuildInterfaces.Build> {
        return this.retryPromise(() => {
            return this.getBuildApi().getBuilds(PROJECT, null, null, buildNumber);
        }, DEFAULT_RETRIES).then((builds: BuildInterfaces.Build[]) => {
            return builds && builds[0];
        });
    }

    protected getBuildAccountAccessToken(): string {
        if (!this._vsoToken) {
            const buildAccountSecret = clArgs['buildaccounttoken'];
            if (buildAccountSecret) {
                this._vsoToken = buildAccountSecret;
            }
        }
        return this._vsoToken;
    }

    protected getWebApi() {
        if (!this._api) {
            let authHandler: VsoBaseInterfaces.IRequestHandler;
            if (this.getBuildAccountAccessToken()) {
                logger.info('Using build account access token');
                authHandler = webApi.getPersonalAccessTokenHandler(this.getBuildAccountAccessToken());
            }
            this._api = new webApi.WebApi(SERVERURL, authHandler);
        }
        return this._api;
    }

    protected getGitApi(): IGitApi {
        return this.getWebApi().getGitApi();
    }

    protected getBuildApi(): IBuildApi {
        return this.getWebApi().getBuildApi();
    }

    protected stringToBase64(str: string) {
        return new Buffer(str, 'binary').toString('base64');
    }
}
