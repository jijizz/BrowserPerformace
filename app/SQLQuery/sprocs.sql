CREATE PROCEDURE dbo.proc_SaveTestResult(
    @testRunEnviroment NVARCHAR(4000), 
    @runStartTime DATETIME, 
    @runEndTime DATETIME, 
    @runDuration INT, 
    @build NVARCHAR(4000), 
    @browser NVARCHAR(4000), 
    @testName NVARCHAR(4000), 
    @testConfigName NVARCHAR(4000),
    @tabResultLogName NVARCHAR(500),
    @rawLog NVARCHAR(MAX),
    @render INT,
    @eupl INT,
    @appStart INT,
    @setTimeoutCost INT,
    @glamor INT,
    @serverDuration INT,
    @iterationCount INT,
    @rowsInserted INT OUTPUT)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @newlyAddedRunId INT

    -- Insert statements for procedure here
    IF(@testName IS NULL OR @testConfigName IS NULL)
        RETURN 1
        
    SELECT testId
    FROM dbo.AllTests
    WHERE testName = @testName AND
          testConfigName = @testConfigName
    
    IF @@ROWCOUNT = 0
    BEGIN
        INSERT INTO dbo.AllTests (
            testName,
            testConfigName
        )
        VALUES (
            @testName,
            @testConfigName
        )
    END
    
    INSERT INTO dbo.AllRuns(
        startTime,
        endTime,
        duration,
        testId,
        build,
        enviroment,
        browser)
    SELECT TOP 1 
        @runStartTime,
        @runEndTime,
        @runDuration,
        t.testId,
        @build,
        @testRunEnviroment,
        @browser
        FROM dbo.AllTests AS t
    WHERE t.testName = @testName AND
        t.testConfigName = @testConfigName

    SELECT @newlyAddedRunId = SCOPE_IDENTITY()
    
    INSERT INTO dbo.AllResults_P75(
        runId,
        testId,
        tabResultLogName,
        rawLog,
        render,
        eupl,
        appStart,
        setTimeoutCost,
        glamor,
        serverDuration,
        iterationCount)
    SELECT TOP 1
        r.runId,
        r.testId,
        @tabResultLogName,
        @rawLog,
        @render,
        @eupl,
        @appStart,
        @setTimeoutCost,
        @glamor,
        @serverDuration,
        @iterationCount
    FROM dbo.AllRuns AS r
        INNER JOIN dbo.AllTests AS t
        ON r.testId = t.testId
    WHERE t.testName = @testName AND
        t.testConfigName = @testConfigName AND
        r.browser = @browser AND
        r.build = @build AND
        r.enviroment = @testRunEnviroment AND
        r.runId = @newlyAddedRunId 

    SET @rowsInserted = @@ROWCOUNT
        
    RETURN 0
END

CREATE PROCEDURE dbo.proc_QueryTestResults(
    @testRunEnviroment NVARCHAR(4000),
    @testConfigName NVARCHAR(4000),
    @testName NVARCHAR(4000),
    @browser NVARCHAR(4000),
    @numberOfRuns INT,
    @startTime DATETIME,
    @endTme DATETIME,
    @build NVARCHAR(4000),
    @resultsFound INT OUTPUT)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @newlyAddedRunId INT

    -- Insert statements for procedure here
    IF(@testRunEnviroment IS NULL OR @testName IS NULL OR @testConfigName IS NULL OR @browser IS NULL)
        RETURN 1
    
    IF(@numberOfRuns IS NULL)
        SET @numberOfRuns = 0x7fffffff
        
    IF(@startTime IS NULL)
        SET @startTime = -53690
        
    IF(@endTme IS NULL)
        SET @endTme = 2958463
    
    IF(@build IS NULL)
    BEGIN
        SELECT 
            runId,
            startTime,
            endTime,
            duration,
            build,
            testId,
            testName,
            tabResultLogName,
            render,
            eupl,
            appStart,
            setTimeoutCost,
            glamor,
            serverDuration,
            iterationCount
        FROM (
            SELECT
                r.runId,
                r.startTime,
                r.endTime,
                r.duration,
                r.build,
                t.testId,
                t.testName,
                ret.tabResultLogName,
                ret.render,
                ret.eupl,
                ret.appStart,
                ret.setTimeoutCost,
                ret.glamor,
                ret.serverDuration,
                ret.iterationCount,
                ROW_NUMBER() OVER(ORDER BY r.runId DESC) AS rowNumber
            FROM dbo.AllTests AS t
            INNER JOIN dbo.AllRuns AS r
            ON t.testId = r.testId
            INNER JOIN dbo.AllResults_P75 AS ret
            ON r.runId = ret.runId
            WHERE r.enviroment = @testRunEnviroment AND
                t.testConfigName = @testConfigName AND
                t.testName = @testName AND
                r.browser = @browser AND
                r.startTime >= @startTime AND
                r.endTime <= @endTme) data
        WHERE data.rowNumber <= @numberOfRuns
        ORDER BY data.rowNumber DESC
    END
    ELSE 
    BEGIN
        SELECT 
            runId,
            startTime,
            endTime,
            duration,
            build,
            testId,
            testName,
            tabResultLogName,
            render,
            eupl,
            appStart,
            setTimeoutCost,
            glamor,
            serverDuration,
            iterationCount
        FROM (
            SELECT
                r.runId,
                r.startTime,
                r.endTime,
                r.duration,
                r.build,
                t.testId,
                t.testName,
                ret.tabResultLogName,
                ret.render,
                ret.eupl,
                ret.appStart,
                ret.setTimeoutCost,
                ret.glamor,
                ret.serverDuration,
                ret.iterationCount,
                ROW_NUMBER() OVER(ORDER BY r.runId DESC) AS rowNumber
            FROM dbo.AllTests AS t
            INNER JOIN dbo.AllRuns AS r
            ON t.testId = r.testId
            INNER JOIN dbo.AllResults_P75 AS ret
            ON r.runId = ret.runId
            WHERE r.enviroment = @testRunEnviroment AND
                t.testConfigName = @testConfigName AND
                t.testName = @testName AND
                r.browser = @browser AND
                r.startTime >= @startTime AND
                r.endTime <= @endTme AND
                r.build = @build) data
        WHERE data.rowNumber <= @numberOfRuns
        ORDER BY data.rowNumber DESC
    END
    
    SET @resultsFound = @@ROWCOUNT
        
    RETURN 0
END

CREATE PROCEDURE dbo.proc_QueryTestResultsForLatestBuilds(
    @testRunEnviroment NVARCHAR(4000),
    @testConfigName NVARCHAR(4000),
    @testName NVARCHAR(4000),
    @browser NVARCHAR(4000),
    @numberOfBuilds INT,
    @resultsFound INT OUTPUT)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * 
	FROM TVF_GetTestResultsForLatestBuilds(@testRunEnviroment, @testConfigName, @testName, @browser, @numberOfBuilds)
    ORDER BY buildIndex, runId DESC
    SET @resultsFound = @@ROWCOUNT

    RETURN 0
END

CREATE PROCEDURE dbo.proc_AnalyseTestResults(
    @testRunEnviroment NVARCHAR(4000),
    @testConfigName NVARCHAR(4000),
    @testName NVARCHAR(4000),
    @browser NVARCHAR(4000),
    @numberOfBuilds INT)
AS
BEGIN
    SET NOCOUNT ON;
	SELECT 
		build,
		AVG(render) AS render,
		AVG(eupl) AS eupl,
		AVG(appStart) AS appStart,
		AVG(setTimeoutCost) AS setTimeoutCost,
		AVG(glamor) AS glamor,
		AVG(serverDuration) AS serverDuration,
		AVG(iterationCount) AS iterationCount,
		COUNT(distinct(runId)) AS numberOfRuns
	FROM dbo.TVF_GetTestResultsForLatestBuilds(@testRunEnviroment, @testConfigName, @testName, @browser, @numberOfBuilds)
	GROUP BY build, buildIndex
	ORDER BY buildIndex DESC

    RETURN 0
END

CREATE FUNCTION TVF_GetTestResultsForLatestBuilds(
    @testRunEnviroment NVARCHAR(4000),
    @testConfigName NVARCHAR(4000),
    @testName NVARCHAR(4000),
    @browser NVARCHAR(4000),
    @numberOfBuilds INT
) RETURNS TABLE
AS
RETURN   
(  
    WITH builds AS
    (
        SELECT  
            r.enviroment,
            t.testConfigName,
            t.testName,
            r.browser,
            r.build,
            MAX(r.runId) as maxRunId,
            COUNT(distinct(r.runId)) as runs
        FROM dbo.AllTests AS t
        INNER JOIN dbo.AllRuns AS r
        ON t.testId = r.testId
        INNER JOIN dbo.AllResults_P75 AS ret
        ON r.runId = ret.runId
        WHERE r.enviroment = @testRunEnviroment AND
            t.testConfigName = @testConfigName AND
            t.testName = @testName AND
            r.browser = @browser
        GROUP BY r.enviroment, t.testConfigName, t.testName, r.browser, r.build
    )
    ,recentBuilds AS
    (
        SELECT * 
        FROM (
            SELECT
				build,
				enviroment,
				testConfigName,
				testName,
				browser,
				maxRunId,
				runs,
				ROW_NUMBER() OVER(PARTITION BY enviroment, testConfigName, testName, browser ORDER BY maxRunId DESC) AS rowNumber
            FROM builds
        ) buildsWithRowNumbers
        WHERE buildsWithRowNumbers.rowNumber <= @numberOfBuilds
    )
    ,runData AS
    (
        SELECT
            r.runId,
            r.startTime,
            r.endTime,
            r.duration,
            r.build,
            recentBuilds.rowNumber AS buildIndex, 
            t.testId,
            t.testName,
            ret.tabResultLogName,
            ret.render,
            ret.eupl,
            ret.appStart,
            ret.setTimeoutCost,
            ret.glamor,
            ret.serverDuration,
            ret.iterationCount
        FROM dbo.AllTests AS t
        INNER JOIN dbo.AllRuns AS r
        ON t.testId = r.testId
        INNER JOIN dbo.AllResults_P75 AS ret
        ON r.runId = ret.runId
        INNER JOIN recentBuilds
        ON r.build = recentBuilds.build 
    )
    SELECT * FROM runData
); 