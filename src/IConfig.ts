export interface IConnection {
    server: string;
    user: string,
    password: string
}

export interface IColumn {
    name: string;
    type: string;
    nullable: boolean;
    identity?: boolean;
    foreign?: string;
}

export interface ITable {
    name: string;
    schema: IColumn[];
}

export interface IDatabase {
    name: string;
    tables: ITable[];
    connection: IConnection; 
}

export interface IEnviroment {
    repoRoot: string;
    testRunEnviroment: string;
}

export interface ITestContext {
    testName: string;
    testConfigName: string;
    testLogRoot: string;
    browser: string;
    testRunOptions: string;
    timeoutInMinutes: number;
}

export interface IConfig {
    database: IDatabase;
    enviroment: IEnviroment;
    testContext: ITestContext;
}