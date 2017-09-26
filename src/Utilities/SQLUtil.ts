import { ConnectionPool, Request, config as ISQLConnectionConfig, Table, IRecordSet, ISqlType, IProcedureResult } from 'mssql';
import { config } from '../Context';
import { ITable, IColumn } from '../IConfig';
import * as path from 'path';
import * as fsutils from '../Utilities/FsUtils';

export interface IConnectionPoolConfig {
    max: number;
    min: number;
    idleTimeoutMillis: number;
}

export interface IConnectionPoolCache {
    pool: ConnectionPool;
    connectPromise: Promise<ConnectionPool>;
}

export interface ISprocInput {
    name: string;
    value: any;
    type?: ISqlType
}

export interface ISprocOutput {
    name: string;
    type?: ISqlType
}

export interface ISprocResult<RET, OUT> {
    recordset: RET[];
    output: OUT;
}

interface ISQLConnectionPools {
    [dbName: string]: IConnectionPoolCache;
}

const sqlConnectionPools: ISQLConnectionPools = {};
export const MASTER_DB: string = 'master';

function sqlErrorHandling(error) {
    console.log('sql error: ', error);
}

function connect(dbName: string): Promise<ConnectionPool> {
    let pool: ConnectionPool = undefined;
    if (dbName) {
        const sqlConfig = getSqlConnectionConfig(dbName);
        sqlConnectionPools[dbName] = sqlConnectionPools[dbName] || {
            pool: new ConnectionPool(sqlConfig),
            connectPromise: undefined
        };
        pool = sqlConnectionPools[dbName].pool;
        if (pool && pool.connected) {
            return Promise.resolve(pool);
        } else {
            pool.on('error', (error) => {
                sqlErrorHandling(error);
            });
            const connectPromise = sqlConnectionPools[dbName].connectPromise = sqlConnectionPools[dbName].connectPromise || pool.connect();
            return connectPromise;
        }
    }
    return Promise.reject('Connection failure: database name is not provided.');
}

export function closeConnection(dbName: string): Promise<void> {
    if (dbName) {
        const pool = sqlConnectionPools[dbName].pool;
        if (pool) {
            return pool.close();
        }
    }
    return Promise.resolve();
}

export function closeAllConnections(): Promise<void> {
    const closeJobs: Promise<void>[] = [];
    for (let db in sqlConnectionPools) {
        closeJobs.push(sqlConnectionPools[db].pool.close());
    }
    return Promise.all(closeJobs).then(() => {
        Promise.resolve();
    });
}

function getSqlConnectionConfig(dbName: string): ISQLConnectionConfig {
    return {
        user: config.database.connection.user,
        password: config.database.connection.password,
        server: config.database.connection.server,
        database: dbName,
        pool: {
            max: 50,
            min: 0,
            idleTimeoutMillis: 30000
        }
    }
}

export function query(command: string, dbName: string): Promise<Table[]> {
    return connect(dbName).then((connection: ConnectionPool) => {
        const request = new Request(connection);
        return request.query(command);
    }).then((result) => {
        console.log('sql query success: ', result);
        return !!result.recordsets ? result.recordsets.map((recordset: IRecordSet<any>) => recordset.toTable()) : undefined;
    }).catch((error) => {
        console.log('sql query error', error);
        return undefined;
    });
}

export function batch(command: string, dbName: string): Promise<Table[]> {
    return connect(dbName).then((connection: ConnectionPool) => {
        const request = new Request(connection);
        return request.batch(command);
    }).then((result) => {
        console.log('sql query success: ', result);
        return !!result.recordsets ? result.recordsets.map((recordset: IRecordSet<any>) => recordset.toTable()) : undefined;
    }).catch((error) => {
        console.log('sql query error', error);
        return undefined;
    });
}

export function execSproc<RET, OUT>(inputs: ISprocInput[], outputs: ISprocOutput[], sproc: string, dbName: string): Promise<ISprocResult<RET, OUT>> {
    return connect(dbName).then((connection: ConnectionPool) => {
        let request = new Request(connection);
        if (inputs) {
            inputs.forEach((input: ISprocInput) => {
                request = request.input(input.name, input.type, input.value);
            });
        }
        if (outputs) {
            outputs.forEach((output: ISprocOutput) => {
                request = request.output(output.name, output.type);
            });
        }
        return request.execute(sproc);
    }).then((result: IProcedureResult<RET>) => {
        console.log('sql query success: ', result);
        return processProcedureResult<RET, OUT>(result);
    }).catch((error) => {
        console.log('sql query error', error);
        return undefined;
    });
}

function processProcedureResult<RET, OUT>(result: IProcedureResult<RET>): ISprocResult<RET, OUT> {
    const rets: RET[] = [];
    const out: OUT = result.output as OUT;
    if (result.recordset) {
        result.recordset.forEach((row: RET) => {
            rets.push(row);
        });
    }
    return {
        recordset: rets,
        output: out
    };
}

export function createDB(): Promise<boolean> {
    const queryTxt = `create database ${config.database.name}`;
    return query(queryTxt, MASTER_DB).then((result: Table[]) => {
        console.log('sql query succeeds: ', result);
        return true;
    }).catch((err) => {
        console.log('sql query error: ', err);
        return false;
    });
}

export function createTable(tableConfig: ITable): Promise<boolean> {
    const queryTxt = buildCreateTableQuery(tableConfig);
    return query(queryTxt, config.database.name).then((result: Table[]) => {
        console.log('sql query succeeds: ', result);
        return true;
    }).catch((err) => {
        console.log('sql query error: ', err);
        return false;
    });
}

export function createStoredProcedures(): Promise<boolean> {
    const sprocFilePath: string = path.resolve("./sprocs.sql");
    const sprocTxt: string = fsutils.readTextFile(sprocFilePath);
    const sprocs: string[] = getSprocScripts(sprocTxt);
    const createSprocWorkers: Promise<Table[]>[] = sprocs.map((sproc: string) => batch(sproc, config.database.name));
    return Promise.all(createSprocWorkers).then((data: Table[][]) => {
        return true;
    }).catch((err) => {
        console.log('fail to create stored procedures: ', err);
        return false;
    });
}

function getSprocScripts(all: string): string[] {
    const ret: string[] = [];
    do {
        const startMatch = all.match(/CREATE\s?PROCEDURE\s?dbo\.proc_/);
        if (startMatch) {
            const substr = all.substring(startMatch[0].length);
            const endMatch = substr.match(/CREATE\s?PROCEDURE\s?dbo\.proc_/);
            if (endMatch) {
                const sproc = startMatch[0] + substr.substring(0, endMatch.index);
                ret.push(sproc);
                all = substr.substring(endMatch.index);
            } else {
                ret.push()
                const sproc = all.substring(startMatch.index);
                ret.push(sproc);
                all = undefined;
            }
        } else {
            all = undefined;
        }
    }
    while (!!all);
    return ret;
}

function buildCreateTableQuery(tableConfig: ITable): string {
    let query: string = `CREATE TABLE ${tableConfig.name} ( `;
    const primaryKeyStatement: (column: IColumn) => string = (column: IColumn) => {
        if (!!column.identity) {
            return column.type === 'int' ? 'IDENTITY(0,1) PRIMARY KEY' : 'DEFAULT NEWID() PRIMARY KEY';
        }
        return '';
    };
    const foreignKeyStatement: (column: IColumn) => string = (column: IColumn) => {
        if (!!column.foreign) {
            return `FOREIGN KEY REFERENCES ${column.foreign}(${column.name})`;
        }
        return '';
    };
    let columns: string = tableConfig.schema.map((column: IColumn) => `${column.name} ${column.type} ${column.nullable ? '' : 'NOT'} NULL ${primaryKeyStatement(column)} ${foreignKeyStatement(column)}`).join();
    query = query + columns + ' )';
    return query;
}