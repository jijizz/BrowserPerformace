import * as childProcess from 'child_process';
import * as path from 'path';
import { config } from '../Context';
import { logger } from '../Utilities/Log';

const TABSERVICE_TIMEOUT_CODE = 8888;

export default class ResultReporter {
    constructor() {
    }

    public runPerfTest(): Promise<void> {
        return this._beforeRunTab().then(() => {
            return this._doGulpRunTab()
        });
    }

    private _beforeRunTab(): Promise<void> {
        logger.info('before gulp run tab.');
        return this._killRunningTabService();
    }

    private _killRunningTabService(): Promise<void> {
        return this._getRunningTabServiceProcesses().then((pids: number[]) => {
            logger.info(`Kill orphan tab service, pids: ${pids.join(',')}`);
            pids.forEach((pid: number) => {
                process.kill(pid);
            });
            return this._checkTabServiceKilled();
        })
    }

    private _getRunningTabServiceProcesses(): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            childProcess.exec('TASKLIST /FI "IMAGENAME eq TabService.exe" /NH', (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                }
                const lines = stdout.toString().split('\n');
                const pids: number[] = [];
                lines.forEach((line: string) => {
                    const parts = line.replace(/\s+/g, ',').split(',');
                    if (parts && parts.length > 1) {
                        const name = parts[0];
                        const pid = parts[1];
                        if (name && !isNaN(Number(pid))) {
                            pids.push(Number(pid));
                        }
                    }
                });
                resolve(pids);
            });
        });
    }

    private _checkTabServiceKilled(): Promise<void> {
        logger.info('checking orphan tab services are killed');
        return new Promise<void>((resolve, reject) => {
            this._getRunningTabServiceProcesses().then((pids: number[]) => {
                if (pids.length > 0) {
                    setTimeout(() => {
                        this._checkTabServiceKilled();
                    }, 1000);
                } else {
                    logger.info('confirmed orphan tab services are killed');
                    resolve();
                }
            }).catch((err: Error) => {
                setTimeout(() => {
                    this._checkTabServiceKilled();
                }, 1000);
            })
        });
    }

    private _doGulpRunTab(): Promise<void> {
        let deferred;
        const runTabPromise = new Promise<void>((resolve, reject) => {
            deferred = { resolve: resolve, reject: reject };
        });

        const gulpPath = path.join(config.enviroment.repoRoot, 'node_modules', 'gulp', 'bin', 'gulp.js');
        const args = [];
        args.push(gulpPath);
        args.push('runtab');
        args.push('--noautorun');
        args.push('--nodeploy');
        args.push(`--config=${config.testContext.testConfigName}`);
        args.push(`--teststorun=*${config.testContext.testName}`);
        args.push(`--browser=${config.testContext.browser}`);
        args.push('--closeonexit');
        args.push('--useexitcode');
        args.push('--allowinsecurecontent');
        if (config.testContext.testRunOptions) {
            args.push(`--testrunoptions=${config.testContext.testRunOptions}`);
        }
        if (config.testContext.timeoutInMinutes) {
            args.push(`--timeoutinminutes=${config.testContext.timeoutInMinutes}`);
        }
        // Tells the process that its in child process mode
        args.push('--childprocess');

        logger.info(`doGulpRunTab: Starting ${process.execPath} ${args.join(' ')}`);

        var gulpProcess = childProcess.spawn(process.execPath, args, {
            cwd: config.enviroment.repoRoot,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        gulpProcess.on('exit', (code: number) => {
            if (!code) {
                logger.info(`Successfully finished gulp runtab ${args.join(' ')}`);
                deferred.resolve(null);
            } else {
                if (code === TABSERVICE_TIMEOUT_CODE) {
                    logger.error(`Perf test did not finish in allowed time, tab service timed out, there will be no test results for this run`);
                }
                logger.error('Perf test run finished with error, error code: ', code);
                deferred.reject(new Error(`gulp runtab ${args.join(' ')}' exited with code ${code}`));
            }
        });
        return runTabPromise;
    }
}