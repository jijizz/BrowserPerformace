"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = require("child_process");
const path = require("path");
const Context_1 = require("../Context");
class ResultReporter {
    constructor() {
    }
    runPerfTest() {
        return this._doGulpRunTab();
    }
    _doGulpRunTab() {
        let deferred;
        const runTabPromise = new Promise((resolve, reject) => {
            deferred = { resolve: resolve, reject: reject };
        });
        const gulpPath = path.join(Context_1.config.enviroment.repoRoot, 'node_modules', 'gulp', 'bin', 'gulp.js');
        const args = [];
        args.push(gulpPath);
        args.push('runtab');
        args.push('--noautorun');
        args.push('--nodeploy');
        args.push(`--config=${Context_1.config.testContext.testConfigName}`);
        args.push(`--teststorun=*${Context_1.config.testContext.testName}`);
        args.push(`--browser=${Context_1.config.testContext.browser}`);
        args.push('--closeonexit');
        args.push('--allowinsecurecontent');
        if (Context_1.config.testContext.testRunOptions) {
            args.push(`--testrunoptions=${Context_1.config.testContext.testRunOptions}`);
        }
        if (Context_1.config.testContext.timeoutInMinutes) {
            args.push(`--timeoutinminutes=${Context_1.config.testContext.timeoutInMinutes}`);
        }
        // Tells the process that its in child process mode
        args.push('--childprocess');
        console.log(`doGulpRunTab: Starting ${process.execPath} ${args.join(' ')}`);
        var gulpProcess = childProcess.spawn(process.execPath, args, {
            cwd: Context_1.config.enviroment.repoRoot,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        gulpProcess.on('exit', (code) => {
            if (!code) {
                console.log(`Successfully finished gulp runtab ${args.join(' ')}`);
                deferred.resolve(null);
            }
            else {
                deferred.reject(new Error(`gulp runtab ${args.join(' ')}' exited with code ${code}`));
            }
        });
        return runTabPromise;
    }
}
exports.default = ResultReporter;
//# sourceMappingURL=TestExecutor.js.map