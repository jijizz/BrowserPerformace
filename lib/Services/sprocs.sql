CREATE PROCEDURE dbo.proc_SaveTestResult(
	@testRunEnviroment nvarchar(4000), 
	@runStartTime datetime, 
	@runEndTime datetime, 
	@runDuration int, 
	@build nvarchar(4000), 
	@browser nvarchar(4000), 
	@testName nvarchar(4000), 
	@testConfigName nvarchar(4000),
	@tabResultLogName nvarchar(500),
	@rawLog nvarchar(MAX),
	@render int,
	@eupl int,
	@appStart int,
	@setTimeoutCost int,
	@glamor int,
	@serverDuration int,
	@iterationCount int,
	@rowInserted int OUTPUT)
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

    SET @rowInserted = @@ROWCOUNT
		
	RETURN 0
END