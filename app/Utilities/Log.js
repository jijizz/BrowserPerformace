"use strict";
exports.__esModule = true;
var winston = require("winston");
var moment = require("moment");
var path = require("path");
var Context_1 = require("../Context");
var filename_date = moment().format("YYYY-MM-DD_HH_mm_ss");
var logFileName = path.join(Context_1.config.enviroment.logFolder, "Perf_" + filename_date + "_.log");
var exceptionLogFileName = path.join(Context_1.config.enviroment.logFolder, "Exceptions_" + filename_date + "_.log");
exports.logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            json: false,
            timestamp: true
        }),
        new winston.transports.File({
            filename: logFileName,
            json: false
        })
    ],
    exceptionHandlers: [
        new (winston.transports.Console)({
            json: false,
            timestamp: true
        }),
        new winston.transports.File({
            filename: exceptionLogFileName,
            json: false
        })
    ],
    exitOnError: false
});
