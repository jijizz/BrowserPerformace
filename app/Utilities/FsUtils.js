'use strict';
exports.__esModule = true;
var fs = require("fs");
var rimraf = require("rimraf");
var execSync = require('child_process').execSync;
function fileExists(path) {
    var exists = false;
    try {
        var lstat = fs.lstatSync(path);
        exists = lstat.isFile();
    }
    catch (e) { }
    return exists;
}
exports.fileExists = fileExists;
function directoryExists(path) {
    var exists = false;
    try {
        var lstat = fs.lstatSync(path);
        exists = lstat.isDirectory();
    }
    catch (e) { }
    return exists;
}
exports.directoryExists = directoryExists;
function deleteFile(filePath) {
    if (fileExists(filePath)) {
        console.log("Deleting: " + filePath);
        fs.unlinkSync(filePath);
    }
    return Promise.resolve();
}
exports.deleteFile = deleteFile;
function deleteDirectory(directoryPath) {
    return new Promise(function (done) {
        if (directoryExists(directoryPath)) {
            console.log("Deleting: " + directoryPath);
            rimraf(directoryPath, done);
        }
        else {
            done();
        }
    });
}
exports.deleteDirectory = deleteDirectory;
function execCommand(commandLine, workingPath) {
    workingPath = workingPath || process.cwd();
    return execSync(commandLine, {
        cwd: workingPath
    });
}
exports.execCommand = execCommand;
function readJsonFile(path) {
    if (fs.existsSync(path)) {
        var data = fs.readFileSync(path, 'utf8');
        return JSON.parse(data);
    }
    return undefined;
}
exports.readJsonFile = readJsonFile;
function readTextFile(path) {
    if (fs.existsSync(path)) {
        var data = fs.readFileSync(path, 'utf8');
        return data;
    }
    return undefined;
}
exports.readTextFile = readTextFile;
function copy(oldPath, newPath) {
    return new Promise(function (resolve, reject) {
        var readStream = fs.createReadStream(oldPath);
        var writeStream = fs.createWriteStream(newPath);
        readStream.on('error', function (err) {
            reject(err);
        });
        writeStream.on('error', function (err) {
            reject(err);
        });
        readStream.on('close', function () {
            fs.unlink(oldPath, function () {
                resolve();
            });
        });
        readStream.pipe(writeStream);
    });
}
exports.copy = copy;
function move(oldPath, newPath) {
    return new Promise(function (resolve, reject) {
        fs.rename(oldPath, newPath, function (err) {
            if (err) {
                if (err.code === 'EXDEV') {
                    return copy(oldPath, newPath);
                }
                else {
                    reject(err);
                }
                return;
            }
            resolve();
        });
    });
}
exports.move = move;
