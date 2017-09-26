import { ConnectionPool, Table, ISqlType } from 'mssql';
import { ITable } from '../IConfig';
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
    type?: ISqlType;
}
export interface ISprocOutput {
    name: string;
    type?: ISqlType;
}
export interface ISprocResult<RET, OUT> {
    recordset: RET[];
    output: OUT;
}
export declare const MASTER_DB: string;
export declare function closeConnection(dbName: string): Promise<void>;
export declare function closeAllConnections(): Promise<void>;
export declare function query(command: string, dbName: string): Promise<Table[]>;
export declare function batch(command: string, dbName: string): Promise<Table[]>;
export declare function execSproc<RET, OUT>(inputs: ISprocInput[], outputs: ISprocOutput[], sproc: string, dbName: string): Promise<ISprocResult<RET, OUT>>;
export declare function createDB(): Promise<boolean>;
export declare function createTable(tableConfig: ITable): Promise<boolean>;
export declare function createStoredProcedures(): Promise<boolean>;
