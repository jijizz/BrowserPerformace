'use strict';
exports.__esModule = true;
var path = require("path");
var Context_1 = require("../Context");
var Log_1 = require("./Log");
var yargs_1 = require("yargs");
var nodemailer = require('nodemailer');
var EmailTemplate = require('email-templates').EmailTemplate;
var templateDir = path.join(__dirname, 'EmailTemplate');
var baseTemplate = path.join(templateDir, 'base.html');
var macronjk = path.join(templateDir, 'table_macro.nunjucks');
var smtpUser = yargs_1.argv['smtpUser'];
var smtpPass = yargs_1.argv['smtpPass'];
var ReportDataType;
(function (ReportDataType) {
    ReportDataType[ReportDataType["regression"] = 0] = "regression";
    ReportDataType[ReportDataType["improvement"] = 1] = "improvement";
})(ReportDataType = exports.ReportDataType || (exports.ReportDataType = {}));
function getMailTemplate(templateName) {
    return new EmailTemplate(path.join(templateDir, templateName));
}
function sendPerfRegressionMail(perfReportData, changes) {
    var deferred;
    var sendPerfRegressionMailPromise = new Promise(function (resolve, reject) {
        deferred = {
            resolve: resolve,
            reject: reject
        };
    });
    if (!smtpUser || !smtpPass) {
        deferred.reject(new Error("test result reporting failure, no smtp credentials are provided"));
    }
    var mailTransport = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        tls: { ciphers: 'SSLv3' },
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });
    var mailTemplate = getMailTemplate('PerfTestRegression');
    var mailContext = {
        baseTemplate: baseTemplate,
        macronjk: macronjk,
        perfData: perfReportData,
        changes: changes
    };
    mailTemplate.render(mailContext, function (err, results) {
        if (err) {
            Log_1.logger.error('Error rendering mail template: ' + err);
            return; // early return
        }
        var mailData = {
            from: Context_1.config.testContext.reportMailFrom,
            to: 'zhiliu@microsoft.com',
            cc: Context_1.config.testContext.reportMailcc.join(','),
            subject: "Perferformance " + (perfReportData.type === ReportDataType.regression ? 'regression' : 'improvement') + " detected in " + perfReportData.targetBuild,
            html: results.html
        };
        mailTransport.sendMail(mailData, function (error, responseStatus) {
            if (error) {
                Log_1.logger.error('Send mail error: ' + error);
                deferred.reject(error);
            }
            else {
                console.log(responseStatus.message);
                deferred.resolve();
            }
        });
    });
    return sendPerfRegressionMailPromise;
}
exports.sendPerfRegressionMail = sendPerfRegressionMail;
