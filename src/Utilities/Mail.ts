'use strict';

import * as path from "path";
import { config } from '../Context';
import { logger } from './Log';
import { argv as clArgs } from 'yargs';
import * as GitInterfaces from 'vso-node-api/interfaces/GitInterfaces';

const nodemailer = require('nodemailer');
const EmailTemplate = require('email-templates').EmailTemplate

const templateDir = path.join(__dirname, 'EmailTemplate');
const baseTemplate = path.join(templateDir, 'base.html');
const macronjk = path.join(templateDir, 'table_macro.nunjucks');

const smtpUser = clArgs['smtpUser'];
const smtpPass = clArgs['smtpPass'];

export enum ReportDataType {
  regression,
  improvement
}

export interface IPerfReportMetricDataWithMetaData {
  content: string;
  warning?: string;
  cssClass?: string;
}

export type IPerfReportMetricData = string | IPerfReportMetricDataWithMetaData

export interface IPerfReportData {
  type: ReportDataType
  data: IPerfReportMetricData[][];
  targetBuild: string;
  baselineBuild: string;
}

export interface IChange {
  commit: GitInterfaces.GitCommit;
  pr: GitInterfaces.GitPullRequest;
  author: GitInterfaces.GitUserDate;
  commitUrl?: string;
  prUrl?: string;
}

export interface IGroupedChanges {
  [name: string]: IChange[];
}

export interface IMailContext {
  baseTemplate: string;
  macronjk: string;
  perfData: IPerfReportData;
  changes: IGroupedChanges;
}

function getMailTemplate(templateName) {
  return new EmailTemplate(path.join(templateDir, templateName));
}

export function sendPerfRegressionMail(
  perfReportData: IPerfReportData,
  changes: IGroupedChanges
): Promise<void> {
  let deferred;
  const sendPerfRegressionMailPromise = new Promise<void>((resolve, reject) => {
    deferred = {
      resolve: resolve,
      reject: reject
    };
  });

  if (!smtpUser || !smtpPass) {
    deferred.reject(new Error(`test result reporting failure, no smtp credentials are provided`));
  }

  const mailTransport = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    tls: { ciphers: 'SSLv3' },
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  const mailTemplate = getMailTemplate('PerfTestRegression');

  const mailContext: IMailContext = {
    baseTemplate: baseTemplate,
    macronjk: macronjk,
    perfData: perfReportData,
    changes: changes
  };

  mailTemplate.render(mailContext, (err, results) => {
    if (err) {
      logger.error('Error rendering mail template: ' + err);
      return; // early return
    }

    const mailData = {
      from: config.testContext.reportMailFrom,
      to: 'zhiliu@microsoft.com',
      cc: config.testContext.reportMailcc.join(','),
      subject: `Perferformance ${perfReportData.type === ReportDataType.regression ? 'regression' : 'improvement'} detected in ${perfReportData.targetBuild}`,
      html: results.html
    };

    mailTransport.sendMail(mailData, (error, responseStatus) => {
      if (error) {
        logger.error('Send mail error: ' + error);
        deferred.reject(error);
      } else {
        console.log(responseStatus.message)
        deferred.resolve();
      }
    });
  });
  return sendPerfRegressionMailPromise;
}