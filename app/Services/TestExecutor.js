"use strict";
exports.__esModule = true;
var childProcess = require("child_process");
var path = require("path");
var Context_1 = require("../Context");
var Log_1 = require("../Utilities/Log");
var TABSERVICE_TIMEOUT_CODE = 8888;
var ResultReporter = (function () {
    function ResultReporter() {
    }
    ResultReporter.prototype.runPerfTest = function () {
        var _this = this;
        return this._beforeRunTab().then(function () {
            return _this._doGulpRunTab();
        });
    };
    ResultReporter.prototype._beforeRunTab = function () {
        Log_1.logger.info('before gulp run tab.');
        return this._killRunningTabService();
    };
    ResultReporter.prototype._killRunningTabService = function () {
        var _this = this;
        return this._getRunningTabServiceProcesses().then(function (pids) {
            Log_1.logger.info("Kill orphan tab service, pids: " + pids.join(','));
            pids.forEach(function (pid) {
                process.kill(pid);
            });
            return _this._checkTabServiceKilled();
        });
    };
    ResultReporter.prototype._getRunningTabServiceProcesses = function () {
        return new Promise(function (resolve, reject) {
            childProcess.exec('TASKLIST /FI "IMAGENAME eq TabService.exe" /NH', function (err, stdout, stderr) {
                if (err) {
                    reject(err);
                }
                var lines = stdout.toString().split('\n');
                var pids = [];
                lines.forEach(function (line) {
                    var parts = line.replace(/\s+/g, ',').split(',');
                    if (parts && parts.length > 1) {
                        var name_1 = parts[0];
                        var pid = parts[1];
                        if (name_1 && !isNaN(Number(pid))) {
                            pids.push(Number(pid));
                        }
                    }
                });
                resolve(pids);
            });
        });
    };
    ResultReporter.prototype._checkTabServiceKilled = function () {
        var _this = this;
        Log_1.logger.info('checking orphan tab services are killed');
        return new Promise(function (resolve, reject) {
            _this._getRunningTabServiceProcesses().then(function (pids) {
                if (pids.length > 0) {
                    setTimeout(function () {
                        _this._checkTabServiceKilled();
                    }, 1000);
                }
                else {
                    Log_1.logger.info('confirmed orphan tab services are killed');
                    resolve();
                }
            })["catch"](function (err) {
                setTimeout(function () {
                    _this._checkTabServiceKilled();
                }, 1000);
            });
        });
    };
    ResultReporter.prototype._doGulpRunTab = function () {
        var deferred;
        var runTabPromise = new Promise(function (resolve, reject) {
            deferred = { resolve: resolve, reject: reject };
        });
        var gulpPath = path.join(Context_1.config.enviroment.repoRoot, 'node_modules', 'gulp', 'bin', 'gulp.js');
        var args = [];
        args.push(gulpPath);
        args.push('runtab');
        args.push('--noautorun');
        args.push('--nodeploy');
        args.push("--config=" + Context_1.config.testContext.testConfigName);
        args.push("--teststorun=*" + Context_1.config.testContext.testName);
        args.push("--browser=" + Context_1.config.testContext.browser);
        args.push('--closeonexit');
        args.push('--useexitcode');
        args.push('--allowinsecurecontent');
        if (Context_1.config.testContext.testRunOptions) {
            args.push("--testrunoptions=" + Context_1.config.testContext.testRunOptions);
        }
        if (Context_1.config.testContext.timeoutInMinutes) {
            args.push("--timeoutinminutes=" + Context_1.config.testContext.timeoutInMinutes);
        }
        // Tells the process that its in child process mode
        args.push('--childprocess');
        Log_1.logger.info("doGulpRunTab: Starting " + process.execPath + " " + args.join(' '));
        var gulpProcess = childProcess.spawn(process.execPath, args, {
            cwd: Context_1.config.enviroment.repoRoot,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        gulpProcess.on('exit', function (code) {
            if (!code) {
                Log_1.logger.info("Successfully finished gulp runtab " + args.join(' '));
                deferred.resolve(null);
            }
            else {
                if (code === TABSERVICE_TIMEOUT_CODE) {
                    Log_1.logger.error("Perf test did not finish in allowed time, tab service timed out, there will be no test results for this run");
                }
                Log_1.logger.error('Perf test run finished with error, error code: ', code);
                deferred.resolve(null);
                // deferred.reject(new Error(`gulp runtab ${args.join(' ')}' exited with code ${code}`));
            }
        });
        return runTabPromise;
    };
    return ResultReporter;
}());
exports["default"] = ResultReporter;
