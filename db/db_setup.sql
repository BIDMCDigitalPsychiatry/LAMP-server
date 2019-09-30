CREATE DATABASE LAMP;
GO
CREATE DATABASE LAMP_Aux;
GO

IF OBJECT_ID('LAMP.dbo.Admin', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin;
GO
CREATE TABLE LAMP.dbo.Admin (
	AdminID bigint NOT NULL IDENTITY(1,1),
	AdminType tinyint NULL,
	Email nvarchar(max) NULL,
	Password nvarchar(max) NULL,
	FirstName nvarchar(max) NULL,
	LastName nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	CONSTRAINT PK_Admin PRIMARY KEY (AdminID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_BatchSchedule', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_BatchSchedule;
GO
CREATE TABLE LAMP.dbo.Admin_BatchSchedule (
	AdminBatchSchID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NULL,
	BatchName nvarchar(max) NULL,
	ScheduleDate datetime NULL,
	SlotID bigint NULL,
	Time datetime NULL,
	RepeatID bigint NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	CONSTRAINT PK_Admin_BatchSchedule PRIMARY KEY (AdminBatchSchID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_BatchScheduleCTest', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_BatchScheduleCTest;
GO
CREATE TABLE LAMP.dbo.Admin_BatchScheduleCTest (
	AdminBatchSchCTestID bigint NOT NULL IDENTITY(1,1),
	AdminBatchSchID bigint NULL,
	CTestID bigint NULL,
	Version int NULL,
	[Order] int NULL,
	[Type] smallint NULL,
	CONSTRAINT PK_Admin_BatchScheduleCTest PRIMARY KEY (AdminBatchSchCTestID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_BatchScheduleCustomTime', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_BatchScheduleCustomTime;
GO
CREATE TABLE LAMP.dbo.Admin_BatchScheduleCustomTime (
	AdminBatchSchCustTimID bigint NOT NULL IDENTITY(1,1),
	AdminBatchSchID bigint NULL,
	Time datetime NULL,
	CONSTRAINT PK_Admin_BatchScheduleCustomTime PRIMARY KEY (AdminBatchSchCustTimID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_BatchScheduleSurvey', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_BatchScheduleSurvey;
GO
CREATE TABLE LAMP.dbo.Admin_BatchScheduleSurvey (
	AdminBatchSchSurveyID bigint NOT NULL IDENTITY(1,1),
	AdminBatchSchID bigint NULL,
	SurveyID bigint NULL,
	[Order] int NULL,
	CONSTRAINT PK_Admin_BatchScheduleSurvey PRIMARY KEY (AdminBatchSchSurveyID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_CTestSchedule', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_CTestSchedule;
GO
CREATE TABLE LAMP.dbo.Admin_CTestSchedule (
	AdminCTestSchID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NULL,
	CTestID bigint NULL,
	Version int NULL,
	ScheduleDate datetime NULL,
	SlotID bigint NULL,
	Time datetime NULL,
	RepeatID bigint NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	[Type] smallint NULL,
	CONSTRAINT PK_Admin_CTestSchedule PRIMARY KEY (AdminCTestSchID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_CTestScheduleCustomTime', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_CTestScheduleCustomTime;
GO
CREATE TABLE LAMP.dbo.Admin_CTestScheduleCustomTime (
	AdminCTstSchCustTimID bigint NOT NULL IDENTITY(1,1),
	AdminCTestSchID bigint NOT NULL,
	Time datetime NULL,
	CONSTRAINT PK_Admin_CTestScheduleCustomTime PRIMARY KEY (AdminCTstSchCustTimID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_CTestSettings', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_CTestSettings;
GO
CREATE TABLE LAMP.dbo.Admin_CTestSettings (
	AdminCTestSettingID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NOT NULL,
	CTestID bigint NOT NULL,
	Status bit NULL DEFAULT ((0)),
	Notification bit NULL DEFAULT ((0)),
	IconBlob varbinary(max) NULL,
	CONSTRAINT PK_Admin_CTestSettings PRIMARY KEY (AdminCTestSettingID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_CTestSurveySettings', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_CTestSurveySettings;
GO
CREATE TABLE LAMP.dbo.Admin_CTestSurveySettings (
	AdminCTestSurveySettingID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NULL,
	CTestID bigint NULL,
	SurveyID bigint NULL,
	CONSTRAINT PK_Admin_CTestSurveySettings PRIMARY KEY (AdminCTestSurveySettingID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_JewelsTrailsASettings', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_JewelsTrailsASettings;
GO
CREATE TABLE LAMP.dbo.Admin_JewelsTrailsASettings (
	AdminJTASettingID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NULL,
	NoOfSeconds_Beg int NULL,
	NoOfSeconds_Int int NULL,
	NoOfSeconds_Adv int NULL,
	NoOfSeconds_Exp int NULL,
	NoOfDiamonds int NULL,
	NoOfShapes int NULL,
	NoOfBonusPoints int NULL,
	X_NoOfChangesInLevel int NULL,
	X_NoOfDiamonds int NULL,
	Y_NoOfChangesInLevel int NULL,
	Y_NoOfShapes int NULL,
	CONSTRAINT PK_Admin_JewelsTrailsASettings PRIMARY KEY (AdminJTASettingID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_JewelsTrailsBSettings', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_JewelsTrailsBSettings;
GO
CREATE TABLE LAMP.dbo.Admin_JewelsTrailsBSettings (
	AdminJTBSettingID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NULL,
	NoOfSeconds_Beg int NULL,
	NoOfSeconds_Int int NULL,
	NoOfSeconds_Adv int NULL,
	NoOfSeconds_Exp int NULL,
	NoOfDiamonds int NULL,
	NoOfShapes int NULL,
	NoOfBonusPoints int NULL,
	X_NoOfChangesInLevel int NULL,
	X_NoOfDiamonds int NULL,
	Y_NoOfChangesInLevel int NULL,
	Y_NoOfShapes int NULL,
	CONSTRAINT PK_Admin_JewelsTrailsBSettings PRIMARY KEY (AdminJTBSettingID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_Settings', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_Settings;
GO
CREATE TABLE LAMP.dbo.Admin_Settings (
	AdminSettingID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NULL,
	ReminderClearInterval bigint NULL,
	WelcomeMessage nvarchar(max) NULL,
	CONSTRAINT PK_Admin_Settings PRIMARY KEY (AdminSettingID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_SurveySchedule', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_SurveySchedule;
GO
CREATE TABLE LAMP.dbo.Admin_SurveySchedule (
	AdminSurveySchID bigint NOT NULL IDENTITY(1,1),
	AdminID bigint NULL,
	SurveyID bigint NULL,
	ScheduleDate datetime NULL,
	SlotID bigint NULL,
	Time datetime NULL,
	RepeatID bigint NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	CONSTRAINT PK_Admin_SurveySchedule PRIMARY KEY (AdminSurveySchID)
);
GO

IF OBJECT_ID('LAMP.dbo.Admin_SurveyScheduleCustomTime', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Admin_SurveyScheduleCustomTime;
GO
CREATE TABLE LAMP.dbo.Admin_SurveyScheduleCustomTime (
	AdminSurvSchCustTimID bigint NOT NULL IDENTITY(1,1),
	AdminSurveySchID bigint NOT NULL,
	Time datetime NULL,
	CONSTRAINT PK_Admin_SurveyScheduleCustomTime PRIMARY KEY (AdminSurvSchCustTimID)
);
GO

IF OBJECT_ID('LAMP.dbo.AppHelp', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.AppHelp;
GO
CREATE TABLE LAMP.dbo.AppHelp (
	HelpID bigint NOT NULL IDENTITY(1,1),
	HelpTitle nvarchar(max) NULL,
	HelpText nvarchar(max) NULL,
	Content nvarchar(max) NULL,
	ImageURL nvarchar(250) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	AdminID bigint NULL,
	CONSTRAINT PK_AppHelp PRIMARY KEY (HelpID)
);
GO

IF OBJECT_ID('LAMP.dbo.Blogs', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Blogs;
GO
CREATE TABLE LAMP.dbo.Blogs (
	BlogID bigint NOT NULL IDENTITY(1,1),
	BlogTitle nvarchar(max) NULL,
	BlogText nvarchar(max) NULL,
	Content nvarchar(max) NULL,
	ImageURL nvarchar(250) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	AdminID bigint NULL,
	CONSTRAINT PK_Blogs PRIMARY KEY (BlogID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest;
GO
CREATE TABLE LAMP.dbo.CTest (
	CTestID bigint NOT NULL,
	CTestName nvarchar(100) NULL,
	IsDistractionSurveyRequired bit NULL DEFAULT ((0)),
	IsDeleted bit NULL DEFAULT ((0)),
	SortOrder int NULL,
	MaxVersions int NULL,
	CONSTRAINT PK_CTest PRIMARY KEY (CTestID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_3DFigure', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_3DFigure;
GO
CREATE TABLE LAMP.dbo.CTest_3DFigure (
	[3DFigureID] bigint NOT NULL IDENTITY(1,1),
	FigureName nvarchar(max) NULL,
	FileName nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_3DFigure PRIMARY KEY ([3DFigureID])
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_3DFigureResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_3DFigureResult;
GO
CREATE TABLE LAMP.dbo.CTest_3DFigureResult (
	[3DFigureResultID] bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	[3DFigureID] bigint NOT NULL,
	DrawnFigFileName nvarchar(max) NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	GameName nvarchar(max) NULL,
	Point numeric(9) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_3DFigureResult PRIMARY KEY ([3DFigureResultID])
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_CatAndDogNewResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_CatAndDogNewResult;
GO
CREATE TABLE LAMP.dbo.CTest_CatAndDogNewResult (
	CatAndDogNewResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_CatAndDogNewResult PRIMARY KEY (CatAndDogNewResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_CatAndDogNewResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_CatAndDogNewResultDtl;
GO
CREATE TABLE LAMP.dbo.CTest_CatAndDogNewResultDtl (
	CatAndDogNewResultDtlID bigint NOT NULL IDENTITY(1,1),
	CatAndDogNewResultID bigint NOT NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	TimeTaken nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_CatAndDogNewResultDtl PRIMARY KEY (CatAndDogNewResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_CatAndDogResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_CatAndDogResult;
GO
CREATE TABLE LAMP.dbo.CTest_CatAndDogResult (
	CatAndDogResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalQuestions int NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_CatAndDogResult PRIMARY KEY (CatAndDogResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_DigitSpanResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_DigitSpanResult;
GO
CREATE TABLE LAMP.dbo.CTest_DigitSpanResult (
	DigitSpanResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	[Type] tinyint NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_DigitSpanResult PRIMARY KEY (DigitSpanResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_JewelsTrailsAResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_JewelsTrailsAResult;
GO
CREATE TABLE LAMP.dbo.CTest_JewelsTrailsAResult (
	JewelsTrailsAResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalAttempts int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	TotalJewelsCollected nvarchar(max) NULL,
	TotalBonusCollected nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Score nvarchar(max) NULL,
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_JewelsTrailsAResult PRIMARY KEY (JewelsTrailsAResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_JewelsTrailsAResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_JewelsTrailsAResultDtl;
GO
CREATE TABLE LAMP.dbo.CTest_JewelsTrailsAResultDtl (
	JewelsTrailsAResultDtlID bigint NOT NULL IDENTITY(1,1),
	JewelsTrailsAResultID bigint NOT NULL,
	Alphabet nvarchar(max) NULL,
	TimeTaken nvarchar(max) NULL,
	Status bit NULL,
	Sequence int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_JewelsTrailsAResultDtl PRIMARY KEY (JewelsTrailsAResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_JewelsTrailsBResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_JewelsTrailsBResult;
GO
CREATE TABLE LAMP.dbo.CTest_JewelsTrailsBResult (
	JewelsTrailsBResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalAttempts int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	TotalJewelsCollected nvarchar(max) NULL,
	TotalBonusCollected nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Score nvarchar(max) NULL,
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_JewelsTrailsBResult PRIMARY KEY (JewelsTrailsBResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_JewelsTrailsBResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_JewelsTrailsBResultDtl;
GO
CREATE TABLE LAMP.dbo.CTest_JewelsTrailsBResultDtl (
	JewelsTrailsBResultDtlID bigint NOT NULL IDENTITY(1,1),
	JewelsTrailsBResultID bigint NOT NULL,
	Alphabet nvarchar(max) NULL,
	TimeTaken nvarchar(max) NULL,
	Status bit NULL,
	Sequence int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_JewelsTrailsBResultDtl PRIMARY KEY (JewelsTrailsBResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_NBackNewResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_NBackNewResult;
GO
CREATE TABLE LAMP.dbo.CTest_NBackNewResult (
	NBackNewResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalQuestions int NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_NBackNewResult PRIMARY KEY (NBackNewResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_NBackResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_NBackResult;
GO
CREATE TABLE LAMP.dbo.CTest_NBackResult (
	NBackResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalQuestions int NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	Version int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_NBackResult PRIMARY KEY (NBackResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_ScratchImage', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_ScratchImage;
GO
CREATE TABLE LAMP.dbo.CTest_ScratchImage (
	ScratchImageID bigint NOT NULL IDENTITY(1,1),
	FigureName nvarchar(max) NULL,
	FileName nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_ScratchImage PRIMARY KEY (ScratchImageID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_ScratchImageResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_ScratchImageResult;
GO
CREATE TABLE LAMP.dbo.CTest_ScratchImageResult (
	ScratchImageResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	ScratchImageID bigint NOT NULL,
	DrawnFigFileName nvarchar(max) NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	GameName nvarchar(max) NULL,
	Point numeric(9) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_ScratchImageResult PRIMARY KEY (ScratchImageResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_Serial7Result', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_Serial7Result;
GO
CREATE TABLE LAMP.dbo.CTest_Serial7Result (
	Serial7ResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalQuestions int NULL,
	TotalAttempts int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	Version int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_Serial7Result PRIMARY KEY (Serial7ResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_SimpleMemoryResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_SimpleMemoryResult;
GO
CREATE TABLE LAMP.dbo.CTest_SimpleMemoryResult (
	SimpleMemoryResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalQuestions int NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	Version int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_SimpleMemoryResult PRIMARY KEY (SimpleMemoryResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_SpatialResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_SpatialResult;
GO
CREATE TABLE LAMP.dbo.CTest_SpatialResult (
	SpatialResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	[Type] tinyint NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_SpatialResult PRIMARY KEY (SpatialResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_SpatialResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_SpatialResultDtl;
GO
CREATE TABLE LAMP.dbo.CTest_SpatialResultDtl (
	SpatialResultDtlID bigint NOT NULL IDENTITY(1,1),
	SpatialResultID bigint NOT NULL,
	GameIndex tinyint NULL,
	TimeTaken nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status bit NULL,
	[Level] int NULL,
	Sequence int NULL,
	CONSTRAINT PK_CTest_SpatialResultDtl PRIMARY KEY (SpatialResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_SpinWheelResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_SpinWheelResult;
GO
CREATE TABLE LAMP.dbo.CTest_SpinWheelResult (
	SpinWheelResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	CollectedStars nvarchar(max) NULL,
	DayStreak int NULL,
	GameDate datetime NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	StrakSpin tinyint NULL,
	CONSTRAINT PK_CTest_SpinWheelResult PRIMARY KEY (SpinWheelResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_TemporalOrderResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_TemporalOrderResult;
GO
CREATE TABLE LAMP.dbo.CTest_TemporalOrderResult (
	TemporalOrderResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	CorrectAnswers int NULL,
	WrongAnswers int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	Version int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_TemporalOrderResult PRIMARY KEY (TemporalOrderResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_TrailsBDotTouchResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_TrailsBDotTouchResult;
GO
CREATE TABLE LAMP.dbo.CTest_TrailsBDotTouchResult (
	TrailsBDotTouchResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalAttempts int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Score nvarchar(max) NULL,
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_TrailsBDotTouchResult PRIMARY KEY (TrailsBDotTouchResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_TrailsBDotTouchResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_TrailsBDotTouchResultDtl;
GO
CREATE TABLE LAMP.dbo.CTest_TrailsBDotTouchResultDtl (
	TrailsBDotTouchResultDtlID bigint NOT NULL IDENTITY(1,1),
	TrailsBDotTouchResultID bigint NOT NULL,
	Alphabet nvarchar(max) NULL,
	TimeTaken nvarchar(max) NULL,
	Status bit NULL,
	Sequence int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_TrailsBDotTouchResultDtl PRIMARY KEY (TrailsBDotTouchResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_TrailsBNewResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_TrailsBNewResult;
GO
CREATE TABLE LAMP.dbo.CTest_TrailsBNewResult (
	TrailsBNewResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalAttempts int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	Version int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_TrailsBNewResult PRIMARY KEY (TrailsBNewResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_TrailsBNewResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_TrailsBNewResultDtl;
GO
CREATE TABLE LAMP.dbo.CTest_TrailsBNewResultDtl (
	TrailsBNewResultDtlID bigint NOT NULL IDENTITY(1,1),
	TrailsBNewResultID bigint NOT NULL,
	Alphabet nvarchar(max) NULL,
	TimeTaken nvarchar(max) NULL,
	Status bit NULL,
	Sequence int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_TrailsBNewResultDtl PRIMARY KEY (TrailsBNewResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_TrailsBResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_TrailsBResult;
GO
CREATE TABLE LAMP.dbo.CTest_TrailsBResult (
	TrailsBResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalAttempts int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_TrailsBResult PRIMARY KEY (TrailsBResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_TrailsBResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_TrailsBResultDtl;
GO
CREATE TABLE LAMP.dbo.CTest_TrailsBResultDtl (
	TrailsBResultDtlID bigint NOT NULL IDENTITY(1,1),
	TrailsBResultID bigint NOT NULL,
	Alphabet nvarchar(1) NULL,
	TimeTaken nvarchar(10) NULL,
	Status bit NULL,
	Sequence int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_CTest_TrailsBResultDtl PRIMARY KEY (TrailsBResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.CTest_VisualAssociationResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.CTest_VisualAssociationResult;
GO
CREATE TABLE LAMP.dbo.CTest_VisualAssociationResult (
	VisualAssocResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	TotalQuestions int NULL,
	TotalAttempts int NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating tinyint NULL,
	Point numeric(9) NULL,
	Score nvarchar(max) NULL,
	Version int NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	CONSTRAINT PK_CTest_VisualAssociationResult PRIMARY KEY (VisualAssocResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.HealthKit_BasicInfo', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.HealthKit_BasicInfo;
GO
CREATE TABLE LAMP.dbo.HealthKit_BasicInfo (
	HKBasicInfoID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	DateOfBirth date NULL,
	Sex nvarchar(max) NULL,
	BloodType nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	CONSTRAINT PK_HealthKit_BasicInfo PRIMARY KEY (HKBasicInfoID)
);
GO

IF OBJECT_ID('LAMP.dbo.HealthKit_DailyValues', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.HealthKit_DailyValues;
GO
CREATE TABLE LAMP.dbo.HealthKit_DailyValues (
	HKDailyValueID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	Height nvarchar(max) NULL,
	Weight nvarchar(max) NULL,
	HeartRate nvarchar(max) NULL,
	BloodPressure nvarchar(max) NULL,
	RespiratoryRate nvarchar(max) NULL,
	Sleep nvarchar(max) NULL,
	Steps nvarchar(max) NULL,
	FlightClimbed nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	Segment nvarchar(max) NULL,
	Distance nvarchar(max) NULL,
	CONSTRAINT PK_HealthKit_DailyValues PRIMARY KEY (HKDailyValueID)
);
GO

IF OBJECT_ID('LAMP.dbo.HealthKit_Parameters', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.HealthKit_Parameters;
GO
CREATE TABLE LAMP.dbo.HealthKit_Parameters (
	HKParamID bigint NOT NULL,
	HKParamName nvarchar(max) NULL,
	CONSTRAINT PK_HealthKit_Parameters PRIMARY KEY (HKParamID)
);
GO

IF OBJECT_ID('LAMP.dbo.HealthKit_ParamValues', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.HealthKit_ParamValues;
GO
CREATE TABLE LAMP.dbo.HealthKit_ParamValues (
	HKParamValueID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	HKParamID bigint NOT NULL,
	Value nvarchar(max) NULL,
	[DateTime] datetime NULL,
	CONSTRAINT PK_HealthKit_ParamValues PRIMARY KEY (HKParamValueID)
);
GO

IF OBJECT_ID('LAMP.dbo.HelpCalls', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.HelpCalls;
GO
CREATE TABLE LAMP.dbo.HelpCalls (
	HelpCallID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	CalledNumber nvarchar(max) NULL,
	CallDateTime datetime NULL,
	CallDuraion bigint NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	[Type] tinyint NULL,
	CONSTRAINT PK_HelpCalls PRIMARY KEY (HelpCallID)
);
GO

IF OBJECT_ID('LAMP.dbo.Locations', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Locations;
GO
CREATE TABLE LAMP.dbo.Locations (
	LocationID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	LocationName nvarchar(max) NULL,
	Address nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	[Type] tinyint NULL,
	Latitude nvarchar(max) NULL,
	Longitude nvarchar(max) NULL,
	CONSTRAINT PK_Locations PRIMARY KEY (LocationID)
);
GO

IF OBJECT_ID('LAMP.dbo.Repeat', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Repeat;
GO
CREATE TABLE LAMP.dbo.Repeat (
	RepeatID bigint NOT NULL,
	RepeatInterval nvarchar(max) NULL,
	IsDefault bit NULL DEFAULT ((0)),
	SortOrder int NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	CONSTRAINT PK_Repeat PRIMARY KEY (RepeatID)
);
GO

IF OBJECT_ID('LAMP.dbo.Slot', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Slot;
GO
CREATE TABLE LAMP.dbo.Slot (
	SlotID bigint NOT NULL,
	SlotName nvarchar(max) NULL,
	IsDefault bit NULL DEFAULT ((0)),
	CONSTRAINT PK_Slot PRIMARY KEY (SlotID)
);
GO

IF OBJECT_ID('LAMP.dbo.Survey', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Survey;
GO
CREATE TABLE LAMP.dbo.Survey (
	SurveyID bigint NOT NULL IDENTITY(1,1),
	SurveyName nvarchar(100) NULL,
	AdminID bigint NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	Language nvarchar(10) NULL,
	Instructions nvarchar(max) NULL,
	IconBlob varbinary(max) NULL,
	CONSTRAINT PK_Survey PRIMARY KEY (SurveyID)
);
GO

IF OBJECT_ID('LAMP.dbo.SurveyQuestionOptions', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.SurveyQuestionOptions;
GO
CREATE TABLE LAMP.dbo.SurveyQuestionOptions (
	OptionID bigint NOT NULL IDENTITY(1,1),
	QuestionID bigint NOT NULL,
	OptionText nvarchar(100) NULL,
	CONSTRAINT PK_SurveyQuestionOptions PRIMARY KEY (OptionID)
);
GO

IF OBJECT_ID('LAMP.dbo.SurveyQuestions', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.SurveyQuestions;
GO
CREATE TABLE LAMP.dbo.SurveyQuestions (
	QuestionID bigint NOT NULL IDENTITY(1,1),
	SurveyID bigint NOT NULL,
	QuestionText nvarchar(max) NULL,
	AnswerType tinyint NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	Threshold tinyint NULL,
	Operator nvarchar(5) NULL,
	Message nvarchar(max) NULL,
	CONSTRAINT PK_SurveyQuestions PRIMARY KEY (QuestionID)
);
GO

IF OBJECT_ID('LAMP.dbo.SurveyResult', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.SurveyResult;
GO
CREATE TABLE LAMP.dbo.SurveyResult (
	SurveyResultID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	SurveyType tinyint NOT NULL,
	SurveyName nvarchar(max) NULL,
	StartTime datetime NULL,
	EndTime datetime NULL,
	Rating nvarchar(max) NULL,
	Comment nvarchar(max) NULL,
	Point numeric(9) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	Status tinyint NULL,
	IsDistraction bit NULL DEFAULT ((0)),
	IsNotificationGame bit NULL DEFAULT ((0)),
	AdminBatchSchID bigint NULL,
	SpinWheelScore nvarchar(max) NULL,
	SurveyID bigint NULL,
	CONSTRAINT PK_SurveyResult PRIMARY KEY (SurveyResultID)
);
GO

IF OBJECT_ID('LAMP.dbo.SurveyResultDtl', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.SurveyResultDtl;
GO
CREATE TABLE LAMP.dbo.SurveyResultDtl (
	SurveyResultDtlID bigint NOT NULL IDENTITY(1,1),
	SurveyResultID bigint NOT NULL,
	Question nvarchar(max) NULL,
	CorrectAnswer nvarchar(max) NULL,
	EnteredAnswer nvarchar(max) NULL,
	TimeTaken int NULL,
	ClickRange nvarchar(100) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	CONSTRAINT PK_SurveyResultDtl PRIMARY KEY (SurveyResultDtlID)
);
GO

IF OBJECT_ID('LAMP.dbo.Tips', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Tips;
GO
CREATE TABLE LAMP.dbo.Tips (
	TipID bigint NOT NULL IDENTITY(1,1),
	TipText nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	AdminID bigint NULL,
	CONSTRAINT PK_Tips PRIMARY KEY (TipID)
);
GO

IF OBJECT_ID('LAMP.dbo.UserDevices', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.UserDevices;
GO
CREATE TABLE LAMP.dbo.UserDevices (
	UserDeviceID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	DeviceType tinyint NOT NULL,
	DeviceID varchar(max) NULL,
	DeviceToken varchar(max) NULL,
	LastLoginOn datetime NULL,
	CONSTRAINT PK_UserDevices PRIMARY KEY (UserDeviceID)
);
GO

IF OBJECT_ID('LAMP.dbo.UserFavouriteCTests', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.UserFavouriteCTests;
GO
CREATE TABLE LAMP.dbo.UserFavouriteCTests (
	UserFavCTestID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	CTestID bigint NULL,
	FavType tinyint NULL,
	CONSTRAINT PK_UserFavouriteCTests PRIMARY KEY (UserFavCTestID)
);
GO

IF OBJECT_ID('LAMP.dbo.Users', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.Users;
GO
CREATE TABLE LAMP.dbo.Users (
	UserID bigint NOT NULL IDENTITY(1,1),
	Email nvarchar(max) NULL,
	Password nvarchar(max) NULL,
	FirstName nvarchar(max) NULL,
	LastName nvarchar(max) NULL,
	Phone nvarchar(max) NULL,
	ZipCode nvarchar(max) NULL,
	City nvarchar(max) NULL,
	State nvarchar(max) NULL,
	Gender tinyint NULL,
	Age tinyint NULL,
	BirthDate date NULL,
	ClinicalProfileURL nvarchar(max) NULL,
	IsGuestUser bit NULL DEFAULT ((0)),
	PhysicianFirstName nvarchar(max) NULL,
	PhysicianLastName nvarchar(max) NULL,
	StudyCode nvarchar(max) NULL,
	StudyId nvarchar(max) NULL,
	MR nvarchar(max) NULL,
	Education nvarchar(max) NULL,
	Race nvarchar(max) NULL,
	Ethucity nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	RegisteredOn datetime NULL,
	IsDeleted bit NULL DEFAULT ((0)),
	DeletedOn datetime NULL,
	Status bit NULL DEFAULT ((1)),
	StatusEditedOn datetime NULL,
	SessionToken nvarchar(max) NULL,
	APPVersion nvarchar(max) NULL,
	AdminID bigint NULL,
	CONSTRAINT PK_Users PRIMARY KEY (UserID)
);
GO

IF OBJECT_ID('LAMP.dbo.UserSettings', 'U') IS NOT NULL
	DROP TABLE LAMP.dbo.UserSettings;
GO
CREATE TABLE LAMP.dbo.UserSettings (
	UserSettingID bigint NOT NULL IDENTITY(1,1),
	UserID bigint NOT NULL,
	AppColor nvarchar(max) NULL,
	SympSurvey_SlotID bigint NULL,
	SympSurvey_Time datetime NULL,
	SympSurvey_RepeatID bigint NULL,
	CognTest_SlotID bigint NULL,
	CognTest_Time datetime NULL,
	CognTest_RepeatID bigint NULL,
	[24By7ContactNo] nvarchar(max) NULL,
	PersonalHelpline nvarchar(max) NULL,
	PrefferedSurveys nvarchar(max) NULL,
	PrefferedCognitions nvarchar(max) NULL,
	CreatedOn datetime NULL DEFAULT (getutcdate()),
	EditedOn datetime NULL,
	Protocol bit NULL DEFAULT ((0)),
	BlogsViewedOn datetime NULL,
	TipsViewedOn datetime NULL,
	ProtocolDate datetime NULL,
	Language nvarchar(10) NULL,
	CONSTRAINT PK_UserSettings PRIMARY KEY (UserSettingID)
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.ActivityIndex', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.ActivityIndex;
GO
CREATE TABLE LAMP_Aux.dbo.ActivityIndex (
	ActivityIndexID bigint NOT NULL IDENTITY(1,1),
	Name nvarchar(255) NULL,
	TableName nvarchar(255) NULL,
	IndexColumnName nvarchar(255) NULL,
	StartTimeColumnName nvarchar(255) NULL,
	EndTimeColumnName nvarchar(255) NULL,
	Slot1Name nvarchar(255) NULL,
	Slot1ColumnName nvarchar(255) NULL,
	Slot2Name nvarchar(255) NULL,
	Slot2ColumnName nvarchar(255) NULL,
	Slot3Name nvarchar(255) NULL,
	Slot3ColumnName nvarchar(255) NULL,
	Slot4Name nvarchar(255) NULL,
	Slot4ColumnName nvarchar(255) NULL,
	Slot5Name nvarchar(255) NULL,
	Slot5ColumnName nvarchar(255) NULL,
	TemporalTableName nvarchar(255) NULL,
	TemporalIndexColumnName nvarchar(255) NULL,
	Temporal1ColumnName nvarchar(255) NULL,
	Temporal2ColumnName nvarchar(255) NULL,
	Temporal3ColumnName nvarchar(255) NULL,
	Temporal4ColumnName nvarchar(255) NULL,
	Temporal5ColumnName nvarchar(255) NULL,
	SettingsSlots nvarchar(2048) NULL,
	SettingsDefaults nvarchar(2048) NULL,
	LegacyCTestID int NULL,
	CONSTRAINT PK__Activity__FEE04948FDDA950F PRIMARY KEY (ActivityIndexID)
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.AdminGroup', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.AdminGroup;
GO
CREATE TABLE LAMP_Aux.dbo.AdminGroup (
	Parent bigint NOT NULL,
	Child bigint NOT NULL
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.Credential', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.Credential;
GO
CREATE TABLE LAMP_Aux.dbo.Credential (
	Origin nvarchar(256) NOT NULL,
	PublicKey nvarchar(2048) NOT NULL,
	PrivateKey nvarchar(2048) NOT NULL,
	Description nvarchar(max) NOT NULL
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.CustomResultEvent', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.CustomResultEvent;
GO
CREATE TABLE LAMP_Aux.dbo.CustomResultEvent (
	UserID bigint NOT NULL,
	[timestamp] bigint NOT NULL,
	duration bigint NOT NULL,
	activity nvarchar(2048) NOT NULL,
	static_data nvarchar(max) NOT NULL,
	temporal_events nvarchar(max) NOT NULL
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.CustomSensorEvent', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.CustomSensorEvent;
GO
CREATE TABLE LAMP_Aux.dbo.CustomSensorEvent (
	UserID bigint NULL DEFAULT (NULL),
	[timestamp] bigint NOT NULL,
	sensor_name nvarchar(2048) NOT NULL,
	data nvarchar(max) NOT NULL
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.GPSLookup', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.GPSLookup;
GO
CREATE TABLE LAMP_Aux.dbo.GPSLookup (
	LookupID bigint NOT NULL IDENTITY(1,1),
	Address nvarchar(max) NULL,
	Coordinates nvarchar(max) NULL,
	Latitude nvarchar(max) NULL,
	Longitude nvarchar(max) NULL,
	CONSTRAINT PK__GPSLooku__6D8B9C6B4727BBCB PRIMARY KEY (LookupID)
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.OOLAttachment', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.OOLAttachment;
GO
CREATE TABLE LAMP_Aux.dbo.OOLAttachment (
	AttachmentID bigint NOT NULL IDENTITY(1,1),
	ObjectType nvarchar(max) NULL,
	ObjectID nvarchar(max) NULL,
	[Key] nvarchar(max) NULL,
	Value nvarchar(max) NULL,
	CONSTRAINT PK__OOLAttac__442C64DE01B25B7F PRIMARY KEY (AttachmentID)
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.OOLAttachmentLinker', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.OOLAttachmentLinker;
GO
CREATE TABLE LAMP_Aux.dbo.OOLAttachmentLinker (
	AttachmentLinkerID bigint NOT NULL IDENTITY(1,1),
	ObjectID nvarchar(max) NULL,
	ChildObjectType nvarchar(max) NULL,
	AttachmentKey nvarchar(max) NULL,
	ScriptType nvarchar(max) NULL,
	ScriptContents nvarchar(max) NULL,
	ReqPackages nvarchar(max) NULL,
	CONSTRAINT PK__OOLAttac__66A4EF9812B8C392 PRIMARY KEY (AttachmentLinkerID)
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.OOLTriggerSet', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.OOLTriggerSet;
GO
CREATE TABLE LAMP_Aux.dbo.OOLTriggerSet (
	ObjectID nvarchar(1024) NOT NULL,
	ChildType nvarchar(1024) NOT NULL,
	AttachmentKey nvarchar(1024) NOT NULL,
	TriggerType nvarchar(1024) NOT NULL
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.SurveyNameIDMap', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.SurveyNameIDMap;
GO
CREATE TABLE LAMP_Aux.dbo.SurveyNameIDMap (
	Decrypted nvarchar(4000) NOT NULL,
	Encrypted nvarchar(4000) NOT NULL
);
GO

IF OBJECT_ID('LAMP_Aux.dbo.UpdateCounter', 'U') IS NOT NULL
	DROP TABLE LAMP_Aux.dbo.UpdateCounter;
GO
CREATE TABLE LAMP_Aux.dbo.UpdateCounter (
	[Type] nvarchar(64) NOT NULL,
	ID bigint NOT NULL,
	Subtype nvarchar(64) NOT NULL,
	LastUpdate datetime NULL DEFAULT (getdate())
);
GO

SET IDENTITY_INSERT LAMP_Aux.dbo.ActivityIndex ON;
GO
INSERT INTO LAMP_Aux.dbo.ActivityIndex (ActivityIndexID, Name, TableName, IndexColumnName, StartTimeColumnName, EndTimeColumnName, Slot1Name, Slot1ColumnName, Slot2Name, Slot2ColumnName, Slot3Name, Slot3ColumnName, Slot4Name, Slot4ColumnName, Slot5Name, Slot5ColumnName, TemporalTableName, TemporalIndexColumnName, Temporal1ColumnName, Temporal2ColumnName, Temporal3ColumnName, Temporal4ColumnName, Temporal5ColumnName, SettingsSlots, SettingsDefaults, LegacyCTestID) VALUES
(1, 'lamp.survey', 'SurveyResult', 'SurveyResultID', 'StartTime', 'EndTime', 'survey_name', 'SurveyName', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SurveyResultDtl', 'SurveyResultDtlID', 'Question', 'CorrectAnswer', 'ClickRange', 'TimeTaken', NULL, '', NULL, NULL),
(2, 'lamp.nback', 'CTest_NBackResult', 'NBackResultID', 'StartTime', 'EndTime', 'score', 'Score', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', 'total_questions', 'TotalQuestions', 'version', 'Version', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 1),
(3, 'lamp.trails_b', 'CTest_TrailsBResult', 'TrailsBResultID', 'StartTime', 'EndTime', 'point', 'Point', 'rating', 'Rating', 'score', 'Score', 'total_attempts', 'TotalAttempts', NULL, NULL, 'CTest_TrailsBResultDtl', 'TrailsBResultDtlID', 'Alphabet', NULL, 'Status', 'TimeTaken', 'Sequence', '', NULL, 2),
(4, 'lamp.spatial_span', 'CTest_SpatialResult', 'SpatialResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', 'type', 'Type', 'CTest_SpatialResultDtl', 'SpatialResultDtlID', 'GameIndex', 'Sequence', 'Status', 'TimeTaken', 'Level', '', NULL, 3),
(5, 'lamp.simple_memory', 'CTest_SimpleMemoryResult', 'SimpleMemoryResultID', 'StartTime', 'EndTime', 'score', 'Score', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', 'total_questions', 'TotalQuestions', 'version', 'Version', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 5),
(6, 'lamp.serial7s', 'CTest_Serial7Result', 'Serial7ResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'total_attempts', 'TotalAttempts', 'total_questions', 'TotalQuestions', 'version', 'Version', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 6),
(7, 'lamp.cats_and_dogs', 'CTest_CatAndDogResult', 'CatAndDogResultID', 'StartTime', 'EndTime', 'point', 'Point', 'rating', 'Rating', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', 'total_questions', 'TotalQuestions', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 7),
(8, 'lamp.3d_figure_copy', 'CTest_3DFigureResult', '3DFigureResultID', 'StartTime', 'EndTime', 'point', 'Point', 'drawn_fig_file_name', 'DrawnFigFileName', 'game_name', 'GameName', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 8),
(9, 'lamp.visual_association', 'CTest_VisualAssociationResult', 'VisualAssocResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'total_attempts', 'TotalAttempts', 'total_questions', 'TotalQuestions', 'version', 'Version', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 9),
(10, 'lamp.digit_span', 'CTest_DigitSpanResult', 'DigitSpanResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', 'type', 'Type', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 10),
(11, 'lamp.cats_and_dogs_new', 'CTest_CatAndDogNewResult', 'CatAndDogNewResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 11),
(12, 'lamp.temporal_order', 'CTest_TemporalOrderResult', 'TemporalOrderResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', 'version', 'Version', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 12),
(13, 'lamp.nback_new', 'CTest_NBackNewResult', 'NBackNewResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'correct_answers', 'CorrectAnswers', 'wrong_answers', 'WrongAnswers', 'total_questions', 'TotalQuestions', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, 14),
(14, 'lamp.trails_b_new', 'CTest_TrailsBNewResult', 'TrailsBNewResultID', 'StartTime', 'EndTime', 'point', 'Point', 'rating', 'Rating', 'score', 'Score', 'total_attempts', 'TotalAttempts', 'version', 'Version', 'CTest_TrailsBNewResultDtl', 'TrailsBNewResultDtlID', 'Alphabet', NULL, 'Status', 'TimeTaken', 'Sequence', '', NULL, 15),
(15, 'lamp.trails_b_dot_touch', 'CTest_TrailsBDotTouchResult', 'TrailsBDotTouchResultID', 'StartTime', 'EndTime', 'point', 'Point', 'rating', 'Rating', 'score', 'Score', 'total_attempts', 'TotalAttempts', NULL, NULL, 'CTest_TrailsBDotTouchResultDtl', 'TrailsBDotTouchResultDtlID', 'Alphabet', NULL, 'Status', 'TimeTaken', 'Sequence', '', NULL, 16),
(16, 'lamp.jewels_a', 'CTest_JewelsTrailsAResult', 'JewelsTrailsAResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'total_attempts', 'TotalAttempts', 'total_bonus_collected', 'TotalBonusCollected', 'total_jewels_collected', 'TotalJewelsCollected', 'CTest_JewelsTrailsAResultDtl', 'JewelsTrailsAResultDtlID', 'Alphabet', NULL, 'Status', 'TimeTaken', 'Sequence', '', NULL, 17),
(17, 'lamp.jewels_b', 'CTest_JewelsTrailsBResult', 'JewelsTrailsBResultID', 'StartTime', 'EndTime', 'point', 'Point', 'score', 'Score', 'total_attempts', 'TotalAttempts', 'total_bonus_collected', 'TotalBonusCollected', 'total_jewels_collected', 'TotalJewelsCollected', 'CTest_JewelsTrailsBResultDtl', 'JewelsTrailsBResultDtlID', 'Alphabet', NULL, 'Status', 'TimeTaken', 'Sequence', '', NULL, 18),
(18, 'lamp.scratch_image', 'CTest_ScratchImageResult', 'ScratchImageResultID', 'StartTime', 'EndTime', 'point', 'Point', 'scratch_file_name', 'DrawnFigFileName', 'game_name', 'GameName', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 19),
(19, 'lamp.spin_wheel', 'CTest_SpinWheelResult', 'SpinWheelResultID', 'StartTime', 'GameDate', 'collected_stars', 'CollectedStars', 'day_streak', 'DayStreak', 'streak_spin', 'StrakSpin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 20);
SET IDENTITY_INSERT LAMP_Aux.dbo.ActivityIndex OFF;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.UNWRAP_JSON') AND type in (N'FN', N'IF',N'TF', N'FS', N'FT'))
	DROP FUNCTION dbo.UNWRAP_JSON
GO
SET QUOTED_IDENTIFIER OFF
GO
SET ANSI_NULLS ON
GO
CREATE FUNCTION dbo.UNWRAP_JSON(@json nvarchar(max), @key nvarchar(400)) RETURNS nvarchar(max)
AS BEGIN
	RETURN REPLACE(REPLACE(@json, FORMATMESSAGE('{"%s":', @key),''), '}','')
END;
GO
USE DATABASE master;
GO
