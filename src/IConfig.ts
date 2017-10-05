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
    logFolder: string;
    testRunEnviroment: string;
}

export interface ITestContext {
    testName: string;
    testConfigName: string;
    testLogRoot: string;
    browser: string;
    thresholdInMilliseconds: number;
    testRunOptions: string;
    timeoutInMinutes: number;
    reportMailFrom: string;
    reportMailcc: string[];
}

export interface IGitContext {
    project: string;
    serverUrl: string;
    repo: string;
}

export interface IConfig {
    database: IDatabase;
    enviroment: IEnviroment;
    testContext: ITestContext;
    gitContext: IGitContext;
}