'use strict';
import { config } from './Context';
import { runDeployment } from './Deployment/DeployTestService';
import ResultProcessor from './Services/ResultProcessor';

console.log("config: ", config);
runDeployment().then((ret: boolean) => {
    console.log('start result processing');
    const resultProcessor = new ResultProcessor();
    resultProcessor.ProcessResults();
});

