"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = require("mssql");
const Context_1 = require("../Context");
const path = require("path");
const fsutils = require("../Utilities/FsUtils");
const sqlConnectionPools = {};
exports.MASTER_DB = 'master';
function sqlErrorHandling(error) {
    console.log('sql error: ', error);
}
function connect(dbName) {
    let pool = undefined;
    if (dbName) {
        const sqlConfig = getSqlConnectionConfig(dbName);
        sqlConnectionPools[dbName] = sqlConnectionPools[dbName] || {
            pool: new mssql_1.ConnectionPool(sqlConfig),
            connectPromise: undefined
        };
        pool = sqlConnectionPools[dbName].pool;
        if (pool && pool.connected) {
            return Promise.resolve(pool);
        }
        else {
            pool.on('error', (error) => {
                sqlErrorHandling(error);
            });
            const connectPromise = sqlConnectionPools[dbName].connectPromise = sqlConnectionPools[dbName].connectPromise || pool.connect();
            return connectPromise;
        }
    }
    return Promise.reject('Connection failure: database name is not provided.');
}
function closeConnection(dbName) {
    if (dbName) {
        const pool = sqlConnectionPools[dbName].pool;
        if (pool) {
            return pool.close();
        }
    }
    return Promise.resolve();
}
exports.closeConnection = closeConnection;
function closeAllConnections() {
    const closeJobs = [];
    for (let db in sqlConnectionPools) {
        closeJobs.push(sqlConnectionPools[db].pool.close());
    }
    return Promise.all(closeJobs).then(() => {
        Promise.resolve();
    });
}
exports.closeAllConnections = closeAllConnections;
function getSqlConnectionConfig(dbName) {
    return {
        user: Context_1.config.database.connection.user,
        password: Context_1.config.database.connection.password,
        server: Context_1.config.database.connection.server,
        database: dbName,
        pool: {
            max: 50,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };
}
function query(command, dbName) {
    return connect(dbName).then((connection) => {
        const request = new mssql_1.Request(connection);
        return request.query(command);
    }).then((result) => {
        console.log('sql query success: ', result);
        return !!result.recordsets ? result.recordsets.map((recordset) => recordset.toTable()) : undefined;
    }).catch((error) => {
        console.log('sql query error', error);
        return undefined;
    });
}
exports.query = query;
function batch(command, dbName) {
    return connect(dbName).then((connection) => {
        const request = new mssql_1.Request(connection);
        return request.batch(command);
    }).then((result) => {
        console.log('sql query success: ', result);
        return !!result.recordsets ? result.recordsets.map((recordset) => recordset.toTable()) : undefined;
    }).catch((error) => {
        console.log('sql query error', error);
        return undefined;
    });
}
exports.batch = batch;
function execSproc(inputs, outputs, sproc, dbName) {
    return connect(dbName).then((connection) => {
        let request = new mssql_1.Request(connection);
        if (inputs) {
            inputs.forEach((input) => {
                request = request.input(input.name, input.type, input.value);
            });
        }
        if (outputs) {
            outputs.forEach((output) => {
                request = request.output(output.name, output.type);
            });
        }
        return request.execute(sproc);
    }).then((result) => {
        console.log('sql query success: ', result);
        return processProcedureResult(result);
    }).catch((error) => {
        console.log('sql query error', error);
        return undefined;
    });
}
exports.execSproc = execSproc;
function processProcedureResult(result) {
    const rets = [];
    const out = result.output;
    if (result.recordset) {
        result.recordset.forEach((row) => {
            rets.push(row);
        });
    }
    return {
        recordset: rets,
        output: out
    };
}
function createDB() {
    const queryTxt = `create database ${Context_1.config.database.name}`;
    return query(queryTxt, exports.MASTER_DB).then((result) => {
        console.log('sql query succeeds: ', result);
        return true;
    }).catch((err) => {
        console.log('sql query error: ', err);
        return false;
    });
}
exports.createDB = createDB;
function createTable(tableConfig) {
    const queryTxt = buildCreateTableQuery(tableConfig);
    return query(queryTxt, Context_1.config.database.name).then((result) => {
        console.log('sql query succeeds: ', result);
        return true;
    }).catch((err) => {
        console.log('sql query error: ', err);
        return false;
    });
}
exports.createTable = createTable;
function createStoredProcedures() {
    const sprocFilePath = path.resolve("./sprocs.sql");
    const sprocTxt = fsutils.readTextFile(sprocFilePath);
    const sprocs = getSprocScripts(sprocTxt);
    const createSprocWorkers = sprocs.map((sproc) => batch(sproc, Context_1.config.database.name));
    return Promise.all(createSprocWorkers).then((data) => {
        return true;
    }).catch((err) => {
        console.log('fail to create stored procedures: ', err);
        return false;
    });
}
exports.createStoredProcedures = createStoredProcedures;
function getSprocScripts(all) {
    const ret = [];
    do {
        const startMatch = all.match(/CREATE\s?PROCEDURE\s?dbo\.proc_/);
        if (startMatch) {
            const substr = all.substring(startMatch[0].length);
            const endMatch = substr.match(/CREATE\s?PROCEDURE\s?dbo\.proc_/);
            if (endMatch) {
                const sproc = startMatch[0] + substr.substring(0, endMatch.index);
                ret.push(sproc);
                all = substr.substring(endMatch.index);
            }
            else {
                ret.push();
                const sproc = all.substring(startMatch.index);
                ret.push(sproc);
                all = undefined;
            }
        }
        else {
            all = undefined;
        }
    } while (!!all);
    return ret;
}
function buildCreateTableQuery(tableConfig) {
    let query = `CREATE TABLE ${tableConfig.name} ( `;
    const primaryKeyStatement = (column) => {
        if (!!column.identity) {
            return column.type === 'int' ? 'IDENTITY(0,1) PRIMARY KEY' : 'DEFAULT NEWID() PRIMARY KEY';
        }
        return '';
    };
    const foreignKeyStatement = (column) => {
        if (!!column.foreign) {
            return `FOREIGN KEY REFERENCES ${column.foreign}(${column.name})`;
        }
        return '';
    };
    let columns = tableConfig.schema.map((column) => `${column.name} ${column.type} ${column.nullable ? '' : 'NOT'} NULL ${primaryKeyStatement(column)} ${foreignKeyStatement(column)}`).join();
    query = query + columns + ' )';
    return query;
}
//# sourceMappingURL=SQLUtil.js.map