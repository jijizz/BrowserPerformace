'use strict';

import * as fs from 'fs';
import * as rimraf from 'rimraf';

const execSync = require('child_process').execSync;

export function fileExists(path) {
  let exists = false;
  try {
    let lstat = fs.lstatSync(path);
    exists = lstat.isFile();
  } catch (e) { }

  return exists;
}

export function directoryExists(path) {
  let exists = false;
  try {
    let lstat = fs.lstatSync(path);
    exists = lstat.isDirectory();
  } catch (e) { }

  return exists;
}

export function deleteFile(filePath) {
  if (fileExists(filePath)) {
    console.log(`Deleting: ${filePath}`);
    fs.unlinkSync(filePath);
  }
  return Promise.resolve();
}

export function deleteDirectory(directoryPath) {
  return new Promise(done => {
    if (directoryExists(directoryPath)) {
      console.log(`Deleting: ${directoryPath}`);
      rimraf(directoryPath, done);
    } else {
      done();
    }
  });
}

export function execCommand(commandLine, workingPath) {
  workingPath = workingPath || process.cwd();
  return execSync(commandLine, {
    cwd: workingPath
  });
}

export function readJsonFile(path) {
  if (fs.existsSync(path)) {
    let data = fs.readFileSync(path, 'utf8');
    return JSON.parse(data);
  }

  return undefined;
}

export function readTextFile(path) {
  if (fs.existsSync(path)) {
    let data = fs.readFileSync(path, 'utf8');
    return data;
  }

  return undefined;
}

export function copy(oldPath: string, newPath: string): Promise<void> {
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

export function move(oldPath: string, newPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, function (err) {
      if (err) {
        if (err.code === 'EXDEV') {
          return copy(oldPath, newPath);
        } else {
          reject(err);
        }
        return;
      }
      resolve();
    });
  });
}