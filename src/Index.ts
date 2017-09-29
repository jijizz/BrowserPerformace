'use strict';
import { config } from './Context';
import { runDeployment } from './Deployment/DeployTestService';
import TestExecutor from './Services/TestExecutor';
import ResultProcessor from './Services/ResultProcessor';

console.log("config: ", config);
runDeployment().then((ret: boolean) => {
    console.log('start running tab test');
    const executor = new TestExecutor();
    return executor.runPerfTest();
}).then(() => {
    console.log('start result processing');
    const resultProcessor = new ResultProcessor();
    return resultProcessor.ProcessResults();
}).then(() => {
    console.log('sucessfully fishined result processing.');
    process.exit(0);
}).catch((err: Error) => {
    console.log(`Perf test failed with error: ${err.message}`);
    process.exit(1);
});