'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
const DeployTestService_1 = require("./Deployment/DeployTestService");
const ResultProcessor_1 = require("./Services/ResultProcessor");
console.log("config: ", Context_1.config);
DeployTestService_1.runDeployment().then((ret) => {
    console.log('start result processing');
    const resultProcessor = new ResultProcessor_1.default();
    resultProcessor.ProcessResults();
});
//# sourceMappingURL=Index.js.map