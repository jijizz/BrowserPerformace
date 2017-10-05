import * as winston from 'winston';
import * as moment from 'moment';
import * as path from 'path';
import { config } from '../Context';

const filename_date: string = moment().format("YYYY-MM-DD_HH_mm_ss");
const logFileName = path.join(config.enviroment.logFolder, `Perf_${filename_date}_.log`);
const exceptionLogFileName = path.join(config.enviroment.logFolder, `Exceptions_${filename_date}_.log`);

export const logger = new (winston.Logger)({
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