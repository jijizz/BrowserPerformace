"use strict";
exports.__esModule = true;
var mssql_1 = require("mssql");
var Context_1 = require("../Context");
var path = require("path");
var fsutils = require("../Utilities/FsUtils");
var Log_1 = require("../Utilities/Log");
var sprocsFilePath = path.join(__dirname, '../SQLQuery', 'sprocs.sql');
var sqlConnectionPools = {};
exports.MASTER_DB = 'master';
function sqlErrorHandling(error) {
    Log_1.logger.error('sql error: ', error);
}
function connect(dbName) {
    var pool = undefined;
    if (dbName) {
        var sqlConfig = getSqlConnectionConfig(dbName);
        sqlConnectionPools[dbName] = sqlConnectionPools[dbName] || {
            pool: new mssql_1.ConnectionPool(sqlConfig),
            connectPromise: undefined
        };
        pool = sqlConnectionPools[dbName].pool;
        if (pool && pool.connected) {
            return Promise.resolve(pool);
        }
        else {
            pool.on('error', function (error) {
                sqlErrorHandling(error);
            });
            var connectPromise = sqlConnectionPools[dbName].connectPromise = sqlConnectionPools[dbName].connectPromise || pool.connect();
            return connectPromise;
        }
    }
    return Promise.reject('Connection failure: database name is not provided.');
}
function closeConnection(dbName) {
    if (dbName) {
        var pool = sqlConnectionPools[dbName].pool;
        if (pool) {
            return pool.close();
        }
    }
    return Promise.resolve();
}
exports.closeConnection = closeConnection;
function closeAllConnections() {
    var closeJobs = [];
    for (var db in sqlConnectionPools) {
        closeJobs.push(sqlConnectionPools[db].pool.close());
    }
    return Promise.all(closeJobs).then(function () {
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
    return connect(dbName).then(function (connection) {
        var request = new mssql_1.Request(connection);
        return request.query(command);
    }).then(function (result) {
        Log_1.logger.info('sql query success: ', result);
        return !!result.recordsets ? result.recordsets.map(function (recordset) { return recordset.toTable(); }) : undefined;
    })["catch"](function (error) {
        Log_1.logger.error('sql query error', error);
        return undefined;
    });
}
exports.query = query;
function batch(command, dbName) {
    return connect(dbName).then(function (connection) {
        var request = new mssql_1.Request(connection);
        return request.batch(command);
    }).then(function (result) {
        Log_1.logger.info('sql query success: ', result);
        return !!result.recordsets ? result.recordsets.map(function (recordset) { return recordset.toTable(); }) : undefined;
    })["catch"](function (error) {
        Log_1.logger.error('sql query error', error);
        return undefined;
    });
}
exports.batch = batch;
function execSproc(inputs, outputs, sproc, dbName) {
    return connect(dbName).then(function (connection) {
        var request = new mssql_1.Request(connection);
        if (inputs) {
            inputs.forEach(function (input) {
                request = request.input(input.name, input.type, input.value);
            });
        }
        if (outputs) {
            outputs.forEach(function (output) {
                request = request.output(output.name, output.type);
            });
        }
        return request.execute(sproc);
    }).then(function (result) {
        Log_1.logger.info('sql query success: ', result);
        return processProcedureResult(result);
    })["catch"](function (error) {
        Log_1.logger.error('sql query error', error);
        return undefined;
    });
}
exports.execSproc = execSproc;
function processProcedureResult(result) {
    var rets = [];
    var out = result.output;
    if (result.recordset) {
        result.recordset.forEach(function (row) {
            rets.push(row);
        });
    }
    return {
        recordset: rets,
        output: out
    };
}
function createDB() {
    var queryTxt = "create database " + Context_1.config.database.name;
    return query(queryTxt, exports.MASTER_DB).then(function (result) {
        Log_1.logger.info('sql query succeeds: ', result);
        return true;
    })["catch"](function (err) {
        Log_1.logger.error('sql query error: ', err);
        return false;
    });
}
exports.createDB = createDB;
function createTable(tableConfig) {
    var queryTxt = buildCreateTableQuery(tableConfig);
    return query(queryTxt, Context_1.config.database.name).then(function (result) {
        Log_1.logger.info('sql query succeeds: ', result);
        return true;
    })["catch"](function (err) {
        Log_1.logger.error('sql query error: ', err);
        return false;
    });
}
exports.createTable = createTable;
function createStoredProcedures() {
    var sprocTxt = fsutils.readTextFile(sprocsFilePath);
    var sprocs = getSprocScripts(sprocTxt);
    var createSprocWorkers = sprocs.map(function (sproc) { return batch(sproc, Context_1.config.database.name); });
    return Promise.all(createSprocWorkers).then(function (data) {
        return true;
    })["catch"](function (err) {
        Log_1.logger.error('fail to create stored procedures: ', err);
        return false;
    });
}
exports.createStoredProcedures = createStoredProcedures;
function getSprocScripts(all) {
    var ret = [];
    do {
        var startMatch = all.match(/CREATE\s?(PROCEDURE|FUNCTION)\s?(dbo\.proc_|TVF)/);
        if (startMatch) {
            var substr = all.substring(startMatch[0].length);
            var endMatch = substr.match(/CREATE\s?(PROCEDURE|FUNCTION)\s?(dbo\.proc_|TVF)/);
            if (endMatch) {
                var sproc = startMatch[0] + substr.substring(0, endMatch.index);
                ret.push(sproc);
                all = substr.substring(endMatch.index);
            }
            else {
                ret.push();
                var sproc = all.substring(startMatch.index);
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
    var query = "CREATE TABLE " + tableConfig.name + " ( ";
    var primaryKeyStatement = function (column) {
        if (!!column.identity) {
            return column.type === 'int' ? 'IDENTITY(0,1) PRIMARY KEY' : 'DEFAULT NEWID() PRIMARY KEY';
        }
        return '';
    };
    var foreignKeyStatement = function (column) {
        if (!!column.foreign) {
            return "FOREIGN KEY REFERENCES " + column.foreign + "(" + column.name + ")";
        }
        return '';
    };
    var columns = tableConfig.schema.map(function (column) { return column.name + " " + column.type + " " + (column.nullable ? '' : 'NOT') + " NULL " + primaryKeyStatement(column) + " " + foreignKeyStatement(column); }).join();
    query = query + columns + ' )';
    return query;
}
