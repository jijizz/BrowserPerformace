"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SQLUtil_1 = require("../Utilities/SQLUtil");
const Context_1 = require("../Context");
function runDeployment() {
    let createDBRet;
    return SQLUtil_1.createDB().then((createDBResult) => {
        createDBRet = createDBResult;
        return SQLUtil_1.closeConnection(SQLUtil_1.MASTER_DB);
    }).then(() => {
        if (createDBRet) {
            const createTableTasks = Context_1.config.database.tables.map((table) => SQLUtil_1.createTable(table));
            return Promise.all(createTableTasks).then((result) => {
                console.log('all table created successfully: ', [].reduce((pv, cv) => pv && cv, true));
                return;
            });
        }
        else {
            return;
        }
    }).then(() => {
        return SQLUtil_1.createStoredProcedures();
    });
}
exports.runDeployment = runDeployment;
//# sourceMappingURL=DeployTestService.js.map