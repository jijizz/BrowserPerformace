import { createDB, createTable, closeConnection, MASTER_DB, createStoredProcedures } from '../Utilities/SQLUtil';
import { config } from '../Context';
import { ITable } from '../IConfig';

export function runDeployment(): Promise<boolean> {
    let createDBRet: boolean;
    return createDB().then((createDBResult: boolean) => {
        createDBRet = createDBResult;
        return closeConnection(MASTER_DB);
    }).then(() => {
        if (createDBRet) {
            const createTableTasks: Promise<boolean>[] = config.database.tables.map((table: ITable) => createTable(table));
            return Promise.all(createTableTasks).then((result: boolean[]) => {
                console.log('all table created successfully: ', [].reduce((pv, cv) => pv && cv, true));
                return;
            });
        } else {
            return;
        }
    }).then(() => {
        return createStoredProcedures();
    });
}