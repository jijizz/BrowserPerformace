'use strict';
import { config } from './Context';
import { RunMode } from './IConfig';
import { runDeployment } from './Deployment/DeployTestService';
import TestExecutor from './Services/TestExecutor';
import ResultProcessor from './Services/ResultProcessor';
import ResultReporter from './Services/ResultReporter';
import { logger } from './Utilities/Log';
import { sendPerfRegressionMail } from './Utilities/Mail';

logger.info("config: ", config);
logger.info("framework run mode: ", config.runContext.mode);
if (config.runContext.mode === RunMode.full) {
    runDeployment().then((ret: boolean) => {
        logger.info('start running tab test');
        const executor = new TestExecutor();
        return executor.runPerfTest();
    }).then(() => {
        logger.info('start result processing');
        const resultProcessor = new ResultProcessor();
        return resultProcessor.ProcessResults();
    }).then(() => {
        logger.info('sucessfully fishined result processing.');
        const reporter = new ResultReporter();
        return reporter.report();
    }).then(() => {
        logger.info('sucessfully fishined result reporting.');
        process.exit(0);
    }).catch((err: Error) => {
        logger.error(`Perf test failed with error: ${err.message}`);
        process.exit(1);
    });
}

if (config.runContext.mode === RunMode.generateLoad) {
    logger.info('start running tab test');
    const executor = new TestExecutor();
    executor.runPerfTest().then(() => {
        logger.info('start result processing');
        const resultProcessor = new ResultProcessor();
        return resultProcessor.ProcessResults();
    }).then(() => {
        logger.info('sucessfully fishined result reporting.');
        process.exit(0);
    }).catch((err: Error) => {
        logger.error(`Perf test failed with error: ${err.message}`);
        process.exit(1);
    });
}

// sendPerfRegressionMail({
//     type: 0,
//     data: [
//         ['Builds', 'eupl','render','numberOfRuns'],
//         ['odsp-next-master_20170930.001', '1900','1300','5'],
//         ['odsp-next-master_20170930.002', '2000','1400','5'],
//         ['Delta', '100', '100', undefined],
//         ['Delta_Percent', '5', '5', undefined]
//     ],
//     targetBuild: 'odsp-next-master_20170930.002'
// }).then(() => {
//     logger.info('send perf regression mail successfully');
// });