# BrowserPerformace
framework to run browser performance tests to guard client performance regressions.

# How does it work:
framework runs in 2 mode:
* full
* generateLoad

### when running in full mode, it will do result repository (sql) deployment, run tab test, save test results into repository and do test result analysis and do reporting (email notification based on results).

### when running in generateLoad mode, framework will only do test execution to generate load.

## [Example performance tab test](https://onedrive.visualstudio.com/DefaultCollection/OneDriveWeb/_git/odsp-next?path=%2Fsrc%2Ftest%2Ftab%2FSPListPerf.ts&version=GBmaster&_a=contents)

# how to deploy and run:
Prerequisite:
* dedicated window 10 machine to run test. chrome browser installed. Physical machine is preferred to produce more consistent results
* MS SQLSERVER instance as test result repository

Clone these repos:
* `git clone https://github.com/jijizz/BrowserPerformace.git`
* `git clone https://onedrive.visualstudio.com/DefaultCollection/OneDriveWeb/_git/odsp-next`

Change `config.json` under `BrowserPerformace\src\config.json`:
* when running in full mode, change database section of `config.json` to provide information of your repository database
* change `enviroment`, `testContext`, `gitContext` and `runContext` sections to match your execution context. The properties in `config.json` are self explained.

Change `perftest.cmd` under `BrowserPerformace\bin`:
* change `teststorun` and `testconfig` parameters in `perftest.cmd`, example: `--teststorun=SPListPerf --testconfig=SPDFPERFConfig`

Create windows scheduled job to run tests in schedule:
- run `Taskschd.msc` in command window to start windows task scheduler UI
- Create a new task with these following configurations:
    - configure `security options` to be `Run only when user logged on`, since the framework needs windows desktop interactive mode.
    - trigger can be hourly or every N hours depending on the time needs for test to execute
    - configure Actions to be these following settings (you should change drive letter to be your config):
        - change program/script to be `D:\GIT\BrowserPerformace\app\bin\perftest.cmd`
        - change `add arguments (optional)` to be `--testrunoptions=500,3,1800,1000 --smtpUser=zhiliu@microsoft.com --smtpPass=<your smtp password> --buildaccounttoken=<access token used to access VSO services, get it from your repo admin> --timeoutinminutes=119`.
            - testrunoptions will be passed into tab test and it is formatted as this: `<number of formal iterations>,<number of warmup iterations>,<waiting time before navigating to about:blank>,<waiting time before starting next iteration>.
            - [test example, click me]((https://onedrive.visualstudio.com/DefaultCollection/OneDriveWeb/_git/odsp-next?path=%2Fsrc%2Ftest%2Ftab%2FSPListPerf.ts&version=GBmaster&_a=contents))
            - timeoutinminutes: when reaching, tab service will abort autometically, this will make sure tab test will not stuck forever. It will kill the currently running test when it is hang or running too slow.
        - change `start in (optional)` to be `D:\GIT\BrowserPerformace\app`

Configure autologon:
- run `BrowserPerformace\bin\Autologon.exe` to configure autologon, we need this to make sure the machine running test will always run in windows desktop interactive mode with current logged in user.

Patch tab service binaries:
- We need some patch on top of the released tab service binaries. Copy dlls under `BrowserPerformace\bin\tab_patch` and replace them inside `<your repo root>\node_modules\@ms\onedrive-buildtools-binaries\tab\bin\service`

# How to build:
From the root of the BrowserPerformance repo:

`npm i`

`gulp clean`

`gulp build`


# How to run:
Start the created windows schuled task.