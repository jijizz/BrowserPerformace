'use strict';
import * as path from 'path';
import * as fsutils from './Utilities/FsUtils';
import * as os from 'os';
import * as dns from 'dns';
import { IConfig } from './IConfig';
import { argv as clArgs } from 'yargs';

export let config: IConfig = undefined;
const configFilePath: string = path.resolve( './config.json' );

function initConfig() {
    config = fsutils.readJsonFile(configFilePath) as IConfig;
    config.testContext = {
        testName: clArgs['tests-to-run'],
        testConfigName: clArgs['test-config'],
        browser: clArgs['browser'],
        testLogRoot: config.testContext.testLogRoot
    };
    const hostName = os.hostname();
    dns.lookup(hostName, function(err, ip) {
        console.log('IP: ' + ip);
        (<any>dns).lookupService(ip, 0, function (err, hostname, service) {
            if (err) {
                console.log('dns lookupService error: ', err);
            } else {
                config.enviroment.testRunEnviroment = hostname;
            }
        });
    });
}
initConfig();