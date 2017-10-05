import { createDB, createTable, closeConnection, MASTER_DB, createStoredProcedures } from '../Utilities/SQLUtil';
import { config } from '../Context';
import { ITable } from '../IConfig';
import { logger } from '../Utilities/Log';

export function runDeployment(): Promise<boolean> {
    let createDBRet: boolean;
    return createDB().then((createDBResult: boolean) => {
        createDBRet = createDBResult;
        return closeConnection(MASTER_DB);
    }).then(() => {
        if (createDBRet) {
            const createTableTasks: Promise<boolean>[] = config.database.tables.map((table: ITable) => createTable(table));
            return Promise.all(createTableTasks).then((result: boolean[]) => {
                logger.info('all table created successfully: ', [].reduce((pv, cv) => pv && cv, true));
                return;
            });
        } else {
            return;
        }
    }).then(() => {
        return createStoredProcedures();
    }).catch((err: Error) => {
        if (err.message.indexOf('already exists') >= 0) {
            logger.info('DB already exists');
            return true;
        } else {
            logger.error(`DeplyTestService failure: ${err.message}`);
            throw err;
        }
    });
}