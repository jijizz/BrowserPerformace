import * as childProcess from 'child_process';
import * as path from 'path';
import { config } from '../Context';

export default class ResultReporter {
    constructor() {
    }
    public runPerfTest(): Promise<null> {
        return this._doGulpRunTab();
    }

    private _doGulpRunTab(): Promise<null> {
        let deferred;
        const runTabPromise = new Promise<null>((resolve, reject) => {
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
        args.push('--allowinsecurecontent');
        if (config.testContext.testRunOptions) {
            args.push(`--testrunoptions=${config.testContext.testRunOptions}`);
        }
        if (config.testContext.timeoutInMinutes) {
            args.push(`--timeoutinminutes=${config.testContext.timeoutInMinutes}`);
        }
        // Tells the process that its in child process mode
        args.push('--childprocess');

        console.log(`doGulpRunTab: Starting ${process.execPath} ${args.join(' ')}`);

        var gulpProcess = childProcess.spawn(process.execPath, args, {
            cwd: config.enviroment.repoRoot,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        gulpProcess.on('exit', (code: number) => {
            if (!code) {
                console.log(`Successfully finished gulp runtab ${args.join(' ')}`);
                deferred.resolve(null);
            } else {
                deferred.reject(new Error(`gulp runtab ${args.join(' ')}' exited with code ${code}`));
            }
        });
        return runTabPromise;
    }
}