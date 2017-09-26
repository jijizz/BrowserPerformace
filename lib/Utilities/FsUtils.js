'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const rimraf = require("rimraf");
const execSync = require('child_process').execSync;
function fileExists(path) {
    let exists = false;
    try {
        let lstat = fs.lstatSync(path);
        exists = lstat.isFile();
    }
    catch (e) { }
    return exists;
}
exports.fileExists = fileExists;
function directoryExists(path) {
    let exists = false;
    try {
        let lstat = fs.lstatSync(path);
        exists = lstat.isDirectory();
    }
    catch (e) { }
    return exists;
}
exports.directoryExists = directoryExists;
function deleteFile(filePath) {
    if (fileExists(filePath)) {
        console.log(`Deleting: ${filePath}`);
        fs.unlinkSync(filePath);
    }
    return Promise.resolve();
}
exports.deleteFile = deleteFile;
function deleteDirectory(directoryPath) {
    return new Promise(done => {
        if (directoryExists(directoryPath)) {
            console.log(`Deleting: ${directoryPath}`);
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
        let data = fs.readFileSync(path, 'utf8');
        return JSON.parse(data);
    }
    return undefined;
}
exports.readJsonFile = readJsonFile;
function readTextFile(path) {
    if (fs.existsSync(path)) {
        let data = fs.readFileSync(path, 'utf8');
        return data;
    }
    return undefined;
}
exports.readTextFile = readTextFile;
function copy(oldPath, newPath) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(oldPath);
        const writeStream = fs.createWriteStream(newPath);
        readStream.on('error', (err) => {
            reject(err);
        });
        writeStream.on('error', (err) => {
            reject(err);
        });
        readStream.on('close', () => {
            fs.unlink(oldPath, () => {
                resolve();
            });
        });
        readStream.pipe(writeStream);
    });
}
exports.copy = copy;
function move(oldPath, newPath) {
    return new Promise((resolve, reject) => {
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
//# sourceMappingURL=FsUtils.js.map