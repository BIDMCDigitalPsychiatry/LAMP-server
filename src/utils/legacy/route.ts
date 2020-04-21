import express, { Request, Response, Router } from "express"
const router = Router()
export default router

export class DeleteUserRequest {
  "UserID"?: number
}

export class DeleteUserResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class ForgotPasswordRequest {
  "Email"?: string
}

export class ForgotPasswordResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetAllGameTotalSpinWheelScoreRequest {
  "UserID"?: number
  "Date"?: Date
}

export class GetAllGameTotalSpinWheelScoreResponse {
  "TotalScore"?: string
  "CollectedStars"?: string
  "DayStreak"?: number
  "StrakSpin"?: number
  "GameDate"?: Date
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetAppHelpRequest {
  "UserId"?: number
}

export class GetAppHelpResponse {
  "HelpText"?: string
  "Content"?: string
  "ImageURL"?: string
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetBlogsRequest {
  "UserId"?: number
}

export class GetBlogsResponse {
  "BlogList"?: {
    BlogTitle?: string
    Content?: string
    ImageURL?: string
    BlogText?: string
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetDistractionSurveysRequest {
  "UserId"?: number
  "CTestId"?: number
}

export class GetDistractionSurveysResponse {
  "Surveys"?: {
    SurveyId?: number
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetGameHighAndLowScoreforGraphRequest {
  "UserID"?: number
  "GameID"?: number
}

export class GetGameHighAndLowScoreforGraphResponse {
  "HighScore"?: string
  "LowScore"?: string
  "DayTotalScore"?: string[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetGameScoresforGraphRequest {
  "UserID"?: number
}

export class GetGameScoresforGraphResponse {
  "GameScoreList"?: {
    Game?: string
    average?: number
    totalAverage?: number
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetProtocolDateRequest {
  "UserId"?: number
}

export class GetProtocolDateResponse {
  "ProtocolDate"?: Date
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetSurveyAndGameScheduleRequest {
  "UserId"?: number
  "LastUpdatedGameDate"?: Date
  "LastUpdatedSurveyDate"?: Date
  "LastFetchedBatchDate"?: Date
}

export class GetSurveyAndGameScheduleResponse {
  "ScheduleSurveyList"?: {
    SurveyScheduleID?: number
    SurveyId?: number
    SurveyName?: string
    Time?: Date
    SlotTime?: string
    RepeatID?: number
    ScheduleDate?: Date
    IsDeleted?: boolean
    SlotTimeOptions?: string[]
  }[]
  "ScheduleGameList"?: {
    GameScheduleID?: number
    CTestId?: number
    CTestName?: string
    Time?: Date
    SlotTime?: string
    RepeatID?: number
    ScheduleDate?: Date
    IsDeleted?: boolean
    SlotTimeOptions?: string[]
  }[]
  "LastUpdatedSurveyDate"?: Date
  "LastUpdatedGameDate"?: Date
  "JewelsTrailsASettings"?: {
    NoOfSeconds_Beg?: number
    NoOfSeconds_Int?: number
    NoOfSeconds_Adv?: number
    NoOfSeconds_Exp?: number
    NoOfDiamonds?: number
    NoOfShapes?: number
    NoOfBonusPoints?: number
    X_NoOfChangesInLevel?: number
    X_NoOfDiamonds?: number
    Y_NoOfChangesInLevel?: number
    Y_NoOfShapes?: number
  }
  "JewelsTrailsBSettings"?: {
    NoOfSeconds_Beg?: number
    NoOfSeconds_Int?: number
    NoOfSeconds_Adv?: number
    NoOfSeconds_Exp?: number
    NoOfDiamonds?: number
    NoOfShapes?: number
    NoOfBonusPoints?: number
    X_NoOfChangesInLevel?: number
    X_NoOfDiamonds?: number
    Y_NoOfChangesInLevel?: number
    Y_NoOfShapes?: number
  }
  "ReminderClearInterval"?: number
  "BatchScheduleList"?: {
    BatchScheduleId?: number
    BatchName?: string
    ScheduleDate?: Date
    Time?: Date
    RepeatId?: number
    IsDeleted?: boolean
    BatchScheduleSurvey_CTest?: {
      BatchScheduleId?: number
      Type?: number
      ID?: number
      Version?: number
      Order?: number
      GameType?: number
    }[]
    BatchScheduleCustomTime?: {
      BatchScheduleId?: number
      Type?: Date
    }[]
    SlotTime?: string
    IconBlog?: number[]
    IconBlobString?: string
  }[]
  "LastUpdatedBatchDate"?: Date
  "ContactNo"?: string
  "PersonalHelpline"?: string
  "CognitionOffList"?: {
    AdminCTestSettingID?: number
    AdminID?: number
    CTestID?: number
    CTestName?: string
    Status?: boolean
    Notification?: boolean
    IconBlob?: number[]
  }[]
  "CognitionIconList"?: {
    AdminID?: number
    CTestID?: number
    IconBlob?: number[]
    IconBlobString?: string
  }[]
  "SurveyIconList"?: {
    AdminID?: number
    SurveyID?: number
    IconBlob?: number[]
    IconBlobString?: string
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetSurveyQueAndAnsRequest {
  "UserId"?: number
  "SurveyResultID"?: number
}

export class GetSurveyQueAndAnsResponse {
  "SurveyQueAndAnsList"?: {
    Question?: string
    Answer?: string
    TimeTaken?: number
    ClickRange?: string
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetSurveysRequest {
  "UserId"?: number
  "LastUpdatedDate"?: Date
}

export class GetSurveysResponse {
  "Survey"?: {
    SurveyID?: number
    SurveyName?: string
    Instruction?: string
    LanguageCode?: string
    IsDeleted?: boolean
    Questions?: {
      QuestionId?: number
      QuestionText?: string
      AnswerType?: string
      IsDeleted?: boolean
      QuestionOptions?: {
        OptionText?: string
      }[]
      EnableCustomPopup?: boolean
      ThresholdId?: string
      OperatorId?: string
      CustomPopupMessage?: string
    }[]
  }[]
  "LastUpdatedDate"?: Date
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetTipsRequest {
  "UserId"?: number
}

export class GetTipsResponse {
  "TipText"?: string
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetTipsandBlogsUpdatesRequest {
  "UserId"?: number
}

export class GetTipsandBlogsUpdatesResponse {
  "BlogsUpdate"?: boolean
  "TipsUpdate"?: boolean
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetUserCompletedSurveyRequest {
  "UserId"?: number
}

export class GetUserCompletedSurveyResponse {
  "CompletedSurveyList"?: {
    SurveyResultID?: number
    SurveyName?: string
    EndTime?: Date
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetUserProfileRequest {
  "UserID"?: number
}

export class GetUserProfileResponse {
  "Data"?: {
    UserId?: number
    FirstName?: string
    LastName?: string
    StudyId?: string
  }
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetUserReportRequest {
  "UserId"?: number
}

export class GetUserReportResponse {
  "JewelsTrialsAList"?: {
    TotalJewelsCollected?: number
    TotalBonusCollected?: number
    Score?: number
    ScoreAvg?: number
    CreatedDate?: Date
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GetUserSettingRequest {
  "UserID"?: number
}

export class GetUserSettingResponse {
  "Data"?: {
    UserSettingID?: number
    UserID?: number
    AppColor?: string
    SympSurveySlotID?: number
    SympSurveySlotTime?: string
    SympSurveyRepeatID?: number
    CognTestSlotID?: number
    CognTestSlotTime?: Date
    CognTestRepeatID?: number
    ContactNo?: string
    PersonalHelpline?: string
    PrefferedSurveys?: string
    PrefferedCognitions?: string
    Protocol?: boolean
    Language?: string
  }
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class GuestUserSignUpRequest {
  "FirstName"?: string
  "LastName"?: string
  "Email"?: string
  "Password"?: string
  "APPVersion"?: string
  "DeviceType"?: number
  "DeviceID"?: string
  "DeviceToken"?: string
  "Language"?: string
  "OSVersion"?: string
  "DeviceModel"?: string
}

export class GuestUserSignUpResponse {
  "UserId"?: number
  "StudyId"?: string
  "Email"?: string
  "Type"?: number
  "SessionToken"?: string
  "Data"?: {
    UserSettingID?: number
    UserID?: number
    AppColor?: string
    SympSurveySlotID?: number
    SympSurveySlotTime?: string
    SympSurveyRepeatID?: number
    CognTestSlotID?: number
    CognTestSlotTime?: Date
    CognTestRepeatID?: number
    ContactNo?: string
    PersonalHelpline?: string
    PrefferedSurveys?: string
    PrefferedCognitions?: string
    Protocol?: boolean
    ProtocolDate?: Date
    Language?: string
  }
  "WelcomeText"?: string
  "InstructionVideoLink"?: string
  "CognitionSettings"?: {
    AdminCTestSettingID?: number
    AdminID?: number
    CTestID?: number
    CTestName?: string
    Status?: boolean
    Notification?: boolean
    IconBlob?: number[]
  }[]
  "CTestsFavouriteList"?: {
    UserID?: number
    CTestID?: number
    FavType?: number
  }[]
  "SurveyFavouriteList"?: {
    UserID?: number
    SurveyID?: number
    FavType?: number
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class LogDataRequest {
  "Id"?: number
  "Text"?: string
}

export class LogDataResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class Save3DFigureGameRequest {
  "UserID"?: number
  "C3DFigureID"?: number
  "GameName"?: string
  "DrawnFig"?: string
  "DrawnFigFileName"?: string
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class Save3DFigureGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveCatAndDogGameRequest {
  "UserID"?: number
  "TotalQuestions"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveCatAndDogGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveCatAndDogNewGameRequest {
  "UserID"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "GameLevelDetailList"?: {
    CorrectAnswer?: number
    WrongAnswer?: number
    TimeTaken?: Date
  }[]
}

export class SaveCatAndDogNewGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveDigitSpanGameRequest {
  "UserID"?: number
  "Type"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveDigitSpanGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveHelpCallRequest {
  "UserID"?: number
  "CalledNumber"?: string
  "CallDateTime"?: Date
  "CallDuration"?: number
  "Type"?: number
}

export class SaveHelpCallResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveJewelsTrailsAGameRequest {
  "UserID"?: number
  "TotalAttempts"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "TotalJewelsCollected"?: number
  "TotalBonusCollected"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "RoutesList"?: {
    Routes?: {
      Alphabet?: string
      TimeTaken?: Date
      Status?: boolean
    }[]
  }[]
}

export class SaveJewelsTrailsAGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveJewelsTrailsBGameRequest {
  "UserID"?: number
  "TotalAttempts"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "TotalJewelsCollected"?: number
  "TotalBonusCollected"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "RoutesList"?: {
    Routes?: {
      Alphabet?: string
      TimeTaken?: Date
      Status?: boolean
    }[]
  }[]
}

export class SaveJewelsTrailsBGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveLocationRequest {
  "UserID"?: number
  "LocationName"?: string
  "Address"?: string
  "Type"?: number
  "Latitude"?: string
  "Longitude"?: string
}

export class SaveLocationResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveNBackGameNewGameRequest {
  "UserID"?: number
  "TotalQuestions"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveNBackGameNewGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveNBackGameRequest {
  "UserID"?: number
  "TotalQuestions"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "Version"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveNBackGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveScratchImageGameRequest {
  "UserID"?: number
  "ScratchImageID"?: number
  "GameName"?: string
  "DrawnImage"?: string
  "DrawnImageName"?: string
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveScratchImageGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveSerial7GameRequest {
  "UserID"?: number
  "TotalQuestions"?: number
  "TotalAttempts"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "Version"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveSerial7GameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveSimpleMemoryGameRequest {
  "UserID"?: number
  "TotalQuestions"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "Version"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveSimpleMemoryGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveSpatialSpanGameRequest {
  "UserID"?: number
  "Type"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "BoxList"?: {
    Boxes?: {
      GameIndex?: number
      TimeTaken?: Date
      Status?: boolean
      Level?: number
    }[]
  }[]
}

export class SaveSpatialSpanGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveSpinWheelGameRequest {
  "UserID"?: number
  "StartTime"?: Date
  "CollectedStars"?: string
  "DayStreak"?: number
  "StrakSpin"?: number
  "GameDate"?: Date
}

export class SaveSpinWheelGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveTemporalOrderGameRequest {
  "UserID"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "Version"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveTemporalOrderGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveTrailsBDotTouchGameRequest {
  "UserID"?: number
  "TotalAttempts"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "RoutesList"?: {
    Routes?: {
      Alphabet?: string
      TimeTaken?: Date
      Status?: boolean
    }[]
  }[]
}

export class SaveTrailsBDotTouchGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveTrailsBGameNewRequest {
  "UserID"?: number
  "TotalAttempts"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "Version"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "RoutesList"?: {
    Routes?: {
      Alphabet?: string
      TimeTaken?: Date
      Status?: boolean
    }[]
  }[]
}

export class SaveTrailsBGameNewResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveTrailsBGameRequest {
  "UserID"?: number
  "TotalAttempts"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "Version"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "RoutesList"?: {
    Routes?: {
      Alphabet?: string
      TimeTaken?: Date
      Status?: boolean
    }[]
  }[]
}

export class SaveTrailsBGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveUserCTestsFavouriteRequest {
  "UserId"?: number
  "CTestID"?: number
  "FavType"?: number
  "Type"?: number
}

export class SaveUserCTestsFavouriteResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveUserHealthKitRequest {
  "UserID"?: number
  "DateOfBirth"?: Date
  "Sex"?: string
  "BloodType"?: string
  "Height"?: string
  "Weight"?: string
  "HeartRate"?: string
  "BloodPressure"?: string
  "RespiratoryRate"?: string
  "Sleep"?: string
  "Steps"?: string
  "FlightClimbed"?: string
  "Segment"?: string
  "Distance"?: string
}

export class SaveUserHealthKitResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveUserHealthKitV2Request {
  "UserID"?: number
  "DateOfBirth"?: Date
  "Gender"?: string
  "BloodType"?: string
  "HealthKitParams"?: {
    ParamID?: number
    Value?: string
    DateTime?: Date
  }[]
}

export class SaveUserHealthKitV2Response {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveUserSettingRequest {
  "UserSettingID"?: number
  "UserID"?: number
  "AppColor"?: string
  "SympSurveySlotID"?: number
  "SympSurveySlotTime"?: string
  "SympSurveyRepeatID"?: number
  "CognTestSlotID"?: number
  "CognTestSlotTime"?: Date
  "CognTestRepeatID"?: number
  "ContactNo"?: string
  "PersonalHelpline"?: string
  "PrefferedSurveys"?: string
  "PrefferedCognitions"?: string
  "Protocol"?: boolean
  "Language"?: string
}

export class SaveUserSettingResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveUserSurveyRequest {
  "UserID"?: number
  "SurveyType"?: number
  "SurveyName"?: string
  "StartTime"?: Date
  "EndTime"?: Date
  "Rating"?: string
  "Comment"?: string
  "Point"?: number
  "StatusType"?: number
  "IsDistraction"?: boolean
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
  "SurveyID"?: number
  "QuestAndAnsList"?: {
    Question?: string
    Answer?: string
    TimeTaken?: number
    ClickRange?: string
  }[]
}

export class SaveUserSurveyResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SaveVisualAssociationGameRequest {
  "UserID"?: number
  "TotalQuestions"?: number
  "CorrectAnswers"?: number
  "WrongAnswers"?: number
  "StartTime"?: Date
  "EndTime"?: Date
  "Point"?: number
  "Score"?: number
  "Version"?: number
  "StatusType"?: number
  "IsNotificationGame"?: boolean
  "AdminBatchSchID"?: number
  "SpinWheelScore"?: string
}

export class SaveVisualAssociationGameResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class SignInRequest {
  "Username"?: string
  "Password"?: string
  "APPVersion"?: string
  "DeviceType"?: number
  "DeviceID"?: string
  "DeviceToken"?: string
  "Language"?: string
  "OSVersion"?: string
  "DeviceModel"?: string
}

export class SignInResponse {
  "UserId"?: number
  "StudyId"?: string
  "Email"?: string
  "Type"?: number
  "SessionToken"?: string
  "Data"?: {
    UserSettingID?: number
    UserID?: number
    AppColor?: string
    SympSurveySlotID?: number
    SympSurveySlotTime?: string
    SympSurveyRepeatID?: number
    CognTestSlotID?: number
    CognTestSlotTime?: Date
    CognTestRepeatID?: number
    ContactNo?: string
    PersonalHelpline?: string
    PrefferedSurveys?: string
    PrefferedCognitions?: string
    Protocol?: boolean
    ProtocolDate?: Date
    Language?: string
  }
  "ActivityPoints"?: {
    SurveyPoint?: number
    _3DFigurePoint?: number
    CatAndDogPoint?: number
    CatAndDogNewPoint?: number
    DigitSpanForwardPoint?: number
    DigitSpanBackwardPoint?: number
    NBackPoint?: number
    Serial7Point?: number
    SimpleMemoryPoint?: number
    SpatialForwardPoint?: number
    SpatialBackwardPoint?: number
    TrailsBPoint?: number
    VisualAssociationPoint?: number
    TemporalOrderPoint?: number
    NBackNewPoint?: number
    TrailsBNewPoint?: number
    TrailsBDotTouchPoint?: number
    JewelsTrailsAPoint?: number
    JewelsTrailsBPoint?: number
  }
  "JewelsPoints"?: {
    JewelsTrailsATotalBonus?: number
    JewelsTrailsBTotalBonus?: number
    JewelsTrailsATotalJewels?: number
    JewelsTrailsBTotalJewels?: number
  }
  "WelcomeText"?: string
  "InstructionVideoLink"?: string
  "CognitionSettings"?: {
    AdminCTestSettingID?: number
    AdminID?: number
    CTestID?: number
    CTestName?: string
    Status?: boolean
    Notification?: boolean
    IconBlob?: number[]
  }[]
  "CTestsFavouriteList"?: {
    UserID?: number
    CTestID?: number
    FavType?: number
  }[]
  "SurveyFavouriteList"?: {
    UserID?: number
    SurveyID?: number
    FavType?: number
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class UpdateUserProfileRequest {
  "UserId"?: number
  "FirstName"?: string
  "LastName"?: string
  "StudyId"?: string
}

export class UpdateUserProfileResponse {
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

export class UserSignUpRequest {
  "StudyCode"?: string
  "StudyId"?: string
  "Password"?: string
  "APPVersion"?: string
  "DeviceType"?: number
  "DeviceID"?: string
  "DeviceToken"?: string
  "Language"?: string
  "OSVersion"?: string
  "DeviceModel"?: string
}

export class UserSignUpResponse {
  "UserId"?: number
  "StudyId"?: string
  "Email"?: string
  "Type"?: number
  "SessionToken"?: string
  "Data"?: {
    UserSettingID?: number
    UserID?: number
    AppColor?: string
    SympSurveySlotID?: number
    SympSurveySlotTime?: string
    SympSurveyRepeatID?: number
    CognTestSlotID?: number
    CognTestSlotTime?: Date
    CognTestRepeatID?: number
    ContactNo?: string
    PersonalHelpline?: string
    PrefferedSurveys?: string
    PrefferedCognitions?: string
    Protocol?: boolean
    ProtocolDate?: Date
    Language?: string
  }
  "WelcomeText"?: string
  "InstructionVideoLink"?: string
  "CognitionSettings"?: {
    AdminCTestSettingID?: number
    AdminID?: number
    CTestID?: number
    CTestName?: string
    Status?: boolean
    Notification?: boolean
    IconBlob?: number[]
  }[]
  "CTestsFavouriteList"?: {
    UserID?: number
    CTestID?: number
    FavType?: number
  }[]
  "SurveyFavouriteList"?: {
    UserID?: number
    SurveyID?: number
    FavType?: number
  }[]
  "ErrorCode"?: number
  "ErrorMessage"?: string
}

router.post("/SignIn", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/ForgotPassword", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/UserSignUp", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GuestUserSignUp", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveUserSetting", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetUserSetting", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/DeleteUser", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/UpdateUserProfile", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetUserProfile", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetUserReport", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveUserHealthKit", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveUserHealthKitV2", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveUserCTestsFavourite", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/LogData", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetTips", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetBlogs", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetTipsandBlogsUpdates", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetAppHelp", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetSurveyAndGameSchedule", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetDistractionSurveys", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetProtocolDate", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveUserSurvey", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetUserCompletedSurvey", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetSurveyQueAndAns", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetSurveys", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveLocation", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveHelpCall", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveCatAndDogGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveDigitSpanGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveNBackGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveSerial7Game", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveSimpleMemoryGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveTrailsBGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveVisualAssociationGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/Save3DFigureGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveSpatialSpanGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveCatAndDogNewGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveNBackGameNewGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveTrailsBGameNew", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveTemporalOrderGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveTrailsBDotTouchGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveJewelsTrailsAGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveJewelsTrailsBGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveScratchImageGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/SaveSpinWheelGame", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetGameScoresforGraph", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetGameHighAndLowScoreforGraph", async (req: Request, res: Response) => {
  res.json({})
})
router.post("/GetAllGameTotalSpinWheelScore", async (req: Request, res: Response) => {
  res.json({})
})
