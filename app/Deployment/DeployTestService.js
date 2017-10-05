"use strict";
exports.__esModule = true;
var SQLUtil_1 = require("../Utilities/SQLUtil");
var Context_1 = require("../Context");
var Log_1 = require("../Utilities/Log");
function runDeployment() {
    var createDBRet;
    return SQLUtil_1.createDB().then(function (createDBResult) {
        createDBRet = createDBResult;
        return SQLUtil_1.closeConnection(SQLUtil_1.MASTER_DB);
    }).then(function () {
        if (createDBRet) {
            var createTableTasks = Context_1.config.database.tables.map(function (table) { return SQLUtil_1.createTable(table); });
            return Promise.all(createTableTasks).then(function (result) {
                Log_1.logger.info('all table created successfully: ', [].reduce(function (pv, cv) { return pv && cv; }, true));
                return;
            });
        }
        else {
            return;
        }
    }).then(function () {
        return SQLUtil_1.createStoredProcedures();
    })["catch"](function (err) {
        if (err.message.indexOf('already exists') >= 0) {
            Log_1.logger.info('DB already exists');
            return true;
        }
        else {
            Log_1.logger.error("DeplyTestService failure: " + err.message);
            throw err;
        }
    });
}
exports.runDeployment = runDeployment;
