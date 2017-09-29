'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
const DeployTestService_1 = require("./Deployment/DeployTestService");
const TestExecutor_1 = require("./Services/TestExecutor");
const ResultProcessor_1 = require("./Services/ResultProcessor");
console.log("config: ", Context_1.config);
DeployTestService_1.runDeployment().then((ret) => {
    console.log('start running tab test');
    const executor = new TestExecutor_1.default();
    return executor.runPerfTest();
}).then(() => {
    console.log('start result processing');
    const resultProcessor = new ResultProcessor_1.default();
    return resultProcessor.ProcessResults();
}).then(() => {
    console.log('sucessfully fishined result processing.');
    process.exit(0);
}).catch((err) => {
    console.log(`Perf test failed with error: ${err.message}`);
    process.exit(1);
});
//# sourceMappingURL=Index.js.map