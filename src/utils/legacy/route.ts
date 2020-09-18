/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SQL, Database, Encrypt, Decrypt, S3, AWSBucketName } from "../../app"
import { _migrator_lookup_table, Activity_pack_id, ActivityIndex } from "../../repository/migrate"
import sql from "mssql"
import { Request, Response, Router } from "express"
import { v4 as uuidv4 } from "uuid"
import { customAlphabet } from "nanoid"
import { ActivityRepository } from "../../repository/ActivityRepository"
import { TypeRepository } from "../../repository/TypeRepository"
import { CredentialRepository } from "../../repository/CredentialRepository"
const uuid = customAlphabet("1234567890abcdefghjkmnpqrstvwxyz", 20) // crockford-32

export const LegacyAPI = Router()

export const SurveyAnswerType = (type: string) => {
  let AnswerType = ""
  switch (type) {
    case "likert":
      AnswerType = "LikertResponse"
      break
    case "list":
      AnswerType = "ScrollWheels"
      break
    case "boolean":
      AnswerType = "YesNO"
      break
    case "clock":
      AnswerType = "Clock"
      break
    case "years":
      AnswerType = "Years"
      break
    case "months":
      AnswerType = "Months"
      break
    case "days":
      AnswerType = "Days"
      break
    case "text":
      AnswerType = "Textbox"
      break
  }

  return AnswerType
}

/**
 * To convert string from v1 to v2 https://github.com/darkskyapp/string-hash/blob/master/index.js
 * @param id string
 */

export const ConvertIdFromV1ToV2 = (str: any) => {
  let hash = 5381,
    i = str.length
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }
  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0
}

// Authenticate against legacy Bearer session tokens.
const _authorize = async (req: Request, res: Response, next: any): Promise<void> => {
  const token = (req.headers["authorization"] ?? "").split(" ")
  if (!req.headers.hasOwnProperty("authorization") || token.length != 2 || token[0] != "Bearer") {
    res.status(404).json({
      ErrorCode: 2037,
      ErrorMessage: "Your session has expired.",
    })
  }
  // SessionToken Format:
  // [OLD] Encrypt('UserID|Email|Password')
  // [NEW] Encrypt('Email:Password')
  const result = await SQL!.request().query(`
        SELECT 
            UserID, StudyId, Email, FirstName, LastName
        FROM Users 
        WHERE SessionToken = '${token[1]}'
    ;`)
  if (result.recordset.length == 0) {
    res.status(404).json({
      ErrorCode: 2037,
      ErrorMessage: "Your session has expired.",
    })
  } else {
    ;(req as any).AuthUser = result.recordset[0]
    ;(req as any).AuthUser.StudyId = Decrypt((req as any).AuthUser.StudyId)?.replace(/^G/, "")
    next()
  }
}

// To convert legacy SQL IDs -> legacy API IDs -> new IDs
async function _lookup_migrator_id(legacyID: string): Promise<string> {
  const _lookup_table = await _migrator_lookup_table()
  let match = _lookup_table[legacyID]
  if (match === undefined) {
    match = uuid() // 20-char id for non-Participant objects
    _lookup_table[legacyID] = match
    console.log(`inserting migrator link: ${legacyID} => ${match}`)
    Database.use("root").insert({ _id: `_local/${legacyID}`, value: match } as any)
  }
  return match
}

// Route: /LogData
LegacyAPI.post("/LogData", async (req: Request, res: Response) => {
  interface APIRequest {
    Id?: number
    Text?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /SignIn // USES SQL
LegacyAPI.post("/SignIn", async (req: Request, res: Response) => {
  interface APIRequest {
    Username?: string
    Password?: string
    APPVersion?: string
    DeviceType?: number
    DeviceID?: string
    DeviceToken?: string
    Language?: string
    OSVersion?: string
    DeviceModel?: string
  }
  interface APIResponse {
    UserId?: number
    StudyId?: string
    Email?: string
    Type?: number
    SessionToken?: string
    Data?: {
      UserSettingID?: number
      UserID?: number
      AppColor?: string
      SympSurveySlotID?: number
      SympSurveySlotTime?: string
      SympSurveyRepeatID?: number
      CognTestSlotID?: number
      CognTestSlotTime?: string // Date
      CognTestRepeatID?: number
      ContactNo?: string
      PersonalHelpline?: string
      PrefferedSurveys?: string
      PrefferedCognitions?: string
      Protocol?: boolean
      ProtocolDate?: string // Date
      Language?: string
    }
    ActivityPoints?: {
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
    JewelsPoints?: {
      JewelsTrailsATotalBonus?: number
      JewelsTrailsBTotalBonus?: number
      JewelsTrailsATotalJewels?: number
      JewelsTrailsBTotalJewels?: number
    }
    WelcomeText?: string
    InstructionVideoLink?: string
    CognitionSettings?: {
      AdminCTestSettingID?: number
      AdminID?: number
      CTestID?: number
      CTestName?: string
      Status?: boolean
      Notification?: boolean
      IconBlob?: number[] | null
      Version: string | null
      MaxVersion: string | null
    }[]
    CTestsFavouriteList?: {
      UserID?: number
      CTestID?: number
      FavType?: number
    }[]
    SurveyFavouriteList?: {
      UserID?: number
      SurveyID?: number
      FavType?: number
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  try {
    const requestData: APIRequest = req.body
    const Username: APIRequest["Username"] = requestData.Username
    const Email: APIRequest["Username"] = requestData.Username
    const Password: APIRequest["Password"] = requestData.Password
    const Language: APIRequest["Language"] = requestData.Language
    let defaultLanguage = Language != "" ? Language : "en"
    let AppColor = "#359FFE"
    let ParticipantId: any = ""
    let userSettings: any = ""
    if (!Username) {
      return res.status(422).json({
        ErrorCode: 2031,
        ErrorMessage: "Specify Email Address.",
      } as APIResponse)
    }
    if (!Password) {
      return res.status(422).json({
        ErrorCode: 2031,
        ErrorMessage: "Specify Password.",
      } as APIResponse)
    }

    try {
      //get participant id
      ParticipantId = await CredentialRepository._find(Username, Password)
    } catch (error) {
      return res.status(200).json({
        ErrorCode: 2034,
        ErrorMessage: "Login failed. Please check the specified credentials.",
      } as APIResponse)
    }

    try {
      //get usersettings
      userSettings = await TypeRepository._get("a", ParticipantId, "lamp.legacy_adapter")
      if (userSettings.UserSettings !== undefined) {
        AppColor = userSettings.UserSettings.AppColor
        await TypeRepository._set("a", "me", ParticipantId, "lamp.legacy_adapter", {
          ...userSettings,
          UserSettings: {
            AppColor: `${AppColor}`,
            Language: `${defaultLanguage}`,
            SympSurvey_SlotID: userSettings.UserSettings.SympSurvey_SlotID
              ? userSettings.UserSettings.SympSurvey_SlotID
              : 1,
            SympSurvey_RepeatID: userSettings.UserSettings.SympSurvey_RepeatID
              ? userSettings.UserSettings.SympSurvey_RepeatID
              : 1,
            SympSurvey_Time: userSettings.UserSettings.SympSurvey_Time
              ? userSettings.UserSettings.SympSurvey_Time
              : null,
            CognTest_SlotID: userSettings.UserSettings.CognTest_SlotID ? userSettings.UserSettings.CognTest_SlotID : 1,
            CognTest_RepeatID: userSettings.UserSettings.CognTest_RepeatID
              ? userSettings.UserSettings.CognTest_RepeatID
              : 1,
            CognTest_Time: userSettings.UserSettings.CognTest_Time ? userSettings.UserSettings.CognTest_Time : null,
            "24By7ContactNo": userSettings.UserSettings["24By7ContactNo"]
              ? userSettings.UserSettings["24By7ContactNo"]
              : null,
            PersonalHelpline: userSettings.UserSettings.PersonalHelpline
              ? userSettings.UserSettings.PersonalHelpline
              : null,
            PrefferedSurveys: userSettings.UserSettings.PrefferedSurveys
              ? userSettings.UserSettings.PrefferedSurveys
              : null,
            PrefferedCognitions: userSettings.UserSettings.PrefferedCognitions
              ? userSettings.UserSettings.PrefferedCognitions
              : null,
            Protocol: userSettings.UserSettings.Protocol ? userSettings.UserSettings.Protocol : false,
          },
        })
      } else {
        await TypeRepository._set("a", "me", ParticipantId, "lamp.legacy_adapter", {
          ...userSettings,
          UserSettings: {
            AppColor: `${AppColor}`,
            Language: `${defaultLanguage}`,
            SympSurvey_SlotID: 1,
            SympSurvey_RepeatID: 1,
            SympSurvey_Time: null,
            CognTest_SlotID: 1,
            CognTest_RepeatID: 1,
            CognTest_Time: null,
            "24By7ContactNo": "",
            PersonalHelpline: "",
            PrefferedSurveys: "",
            PrefferedCognitions: "",
            Protocol: false,
          },
        })
      }
    } catch (error) {
      //if no user setting present, save it
      await TypeRepository._set("a", "me", ParticipantId, "lamp.legacy_adapter", {
        ...userSettings,
        UserSettings: {
          AppColor: `${AppColor}`,
          Language: `${defaultLanguage}`,
          SympSurvey_SlotID: 1,
          SympSurvey_RepeatID: 1,
          SympSurvey_Time: null,
          CognTest_SlotID: 1,
          CognTest_RepeatID: 1,
          CognTest_Time: null,
          "24By7ContactNo": "",
          PersonalHelpline: "",
          PrefferedSurveys: "",
          PrefferedCognitions: "",
          Protocol: "",
        },
      })
      userSettings = await TypeRepository._get("a", ParticipantId, "lamp.legacy_adapter")
    }

    //take userid from participant id
    const UserId: APIResponse["UserId"] = ParticipantId.match(/\d+/)[0]

    const StudyId: APIResponse["StudyId"] = ParticipantId
    const Type = 0 //non-guest user

    let CTestsFavouriteList: APIResponse["CTestsFavouriteList"] = []
    let WelcomeText: APIResponse["WelcomeText"] = ""
    let InstructionVideoLink: APIResponse["InstructionVideoLink"] = ""
    let SurveyFavouriteList: APIResponse["SurveyFavouriteList"] = []
    let CognitionSettings: APIResponse["CognitionSettings"] = []
    let Data: APIResponse["Data"] = {}
    let SessionToken: APIResponse["SessionToken"] = ""
    const appendedSession = Username + ":" + Password
    SessionToken = Encrypt(appendedSession)
    Data.UserSettingID = Data.UserID = UserId
    Data.AppColor = userSettings.UserSettings.AppColor
    Data.Language = userSettings.UserSettings.Language
    Data.PersonalHelpline =
      userSettings.UserSettings.PersonalHelpline === null ? "" : userSettings.UserSettings.PersonalHelpline
    Data.PrefferedSurveys =
      userSettings.UserSettings.PrefferedSurveys === null ? "" : userSettings.UserSettings.PrefferedSurveys
    Data.PrefferedCognitions =
      userSettings.UserSettings.PrefferedCognitions === null ? "" : userSettings.UserSettings.PrefferedCognitions
    Data.Protocol = userSettings.UserSettings.Protocol
    Data.SympSurveySlotID = userSettings.UserSettings.SympSurvey_SlotID
    Data.SympSurveyRepeatID = userSettings.UserSettings.SympSurvey_RepeatID
    Data.SympSurveySlotTime =
      userSettings.UserSettings.SympSurvey_Time !== null ? userSettings.UserSettings.SympSurvey_Time : null
    Data.CognTestSlotID = userSettings.UserSettings.CognTest_SlotID
    Data.CognTestSlotTime =
      userSettings.UserSettings.CognTest_Time !== null ? userSettings.UserSettings.CognTest_Time : null
    Data.CognTestRepeatID = userSettings.UserSettings.CognTest_RepeatID
    Data.ContactNo =
      userSettings.UserSettings["24By7ContactNo"] !== null ? userSettings.UserSettings["24By7ContactNo"] : ""
    Data.ProtocolDate = new Date(0).toISOString().replace(/T/, " ").replace(/..+/, "")

    //get CTestsFavouriteList
    CTestsFavouriteList = userSettings.UserCTestFavourite ? userSettings.UserCTestFavourite : []
    //get SurveyFavouriteList
    SurveyFavouriteList = userSettings.SurveyFavourite ? userSettings.SurveyFavourite : []
    // Save login as an event.
    const loginEvent = {
      "#parent": StudyId,
      timestamp: new Date().getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: requestData.DeviceType! == 1 ? "iOS" : requestData.DeviceType! == 2 ? "Android" : "Unknown",
        event_type: "login",
        device_id: requestData.DeviceID!,
        device_token: requestData.DeviceToken!,
        os_version: requestData.OSVersion!,
        app_version: requestData.APPVersion!,
        device_model: requestData.DeviceModel!,
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [loginEvent] })
    console.dir(out.filter((x) => !!x.error))
    let CognitionSett = await ActivityRepository._select(StudyId)
    let GameData = CognitionSett.filter((x: any) => x.spec !== "lamp.group" && x.spec !== "lamp.survey")

    if (GameData.length > 0) {
      let DataFiltered: any
      GameData.forEach(async (item: any, index: any) => {
        let specData = [item.spec]
        DataFiltered = ActivityIndex.filter((cls) => {
          return specData.includes(cls.Name)
        })

        CognitionSettings?.push({
          AdminCTestSettingID: ConvertIdFromV1ToV2(item.id),
          AdminID: 0,
          CTestID: DataFiltered[0].LegacyCTestID,
          CTestName: item.name,
          Status: true,
          Notification: false,
          IconBlob: null,
          Version: null,
          MaxVersion: null,
        })
      })
    }
    return res.status(200).json({
      UserId,
      StudyId,
      Email,
      Type,
      SessionToken,
      Data,
      ActivityPoints: {
        SurveyPoint: 0,
        _3DFigurePoint: 0,
        CatAndDogPoint: 0,
        CatAndDogNewPoint: 0,
        DigitSpanForwardPoint: 0,
        DigitSpanBackwardPoint: 0,
        NBackPoint: 0,
        Serial7Point: 0,
        SimpleMemoryPoint: 0,
        SpatialForwardPoint: 0,
        SpatialBackwardPoint: 0,
        TrailsBPoint: 0,
        VisualAssociationPoint: 0,
        TemporalOrderPoint: 0,
        NBackNewPoint: 0,
        TrailsBNewPoint: 0,
        TrailsBDotTouchPoint: 0,
        JewelsTrailsAPoint: 0,
        JewelsTrailsBPoint: 0,
      },
      JewelsPoints: {
        JewelsTrailsATotalBonus: 0,
        JewelsTrailsBTotalBonus: 0,
        JewelsTrailsATotalJewels: 0,
        JewelsTrailsBTotalJewels: 0,
      },
      WelcomeText,
      InstructionVideoLink,
      CognitionSettings,
      CTestsFavouriteList,
      SurveyFavouriteList,
      ErrorCode: 0,
      ErrorMessage: "The user has logged in successfully.",
    } as APIResponse)
  } catch (error) {
    return res.status(200).json({
      ErrorCode: 2030,
      ErrorMessage: error.message,
    } as APIResponse)
  }
})

// Route: /ForgotPassword
LegacyAPI.post("/ForgotPassword", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    Email?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(400).json({
    ErrorCode: 400,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /UserSignUp
LegacyAPI.post("/UserSignUp", async (req: Request, res: Response) => {
  interface APIRequest {
    StudyCode?: string
    StudyId?: string
    Password?: string
    APPVersion?: string
    DeviceType?: number
    DeviceID?: string
    DeviceToken?: string
    Language?: string
    OSVersion?: string
    DeviceModel?: string
  }
  interface APIResponse {
    UserId?: number
    StudyId?: string
    Email?: string
    Type?: number
    SessionToken?: string
    Data?: {
      UserSettingID?: number
      UserID?: number
      AppColor?: string
      SympSurveySlotID?: number
      SympSurveySlotTime?: string
      SympSurveyRepeatID?: number
      CognTestSlotID?: number
      CognTestSlotTime?: string // Date
      CognTestRepeatID?: number
      ContactNo?: string
      PersonalHelpline?: string
      PrefferedSurveys?: string
      PrefferedCognitions?: string
      Protocol?: boolean
      ProtocolDate?: string // Date
      Language?: string
    }
    WelcomeText?: string
    InstructionVideoLink?: string
    CognitionSettings?: {
      AdminCTestSettingID?: number
      AdminID?: number
      CTestID?: number
      CTestName?: string
      Status?: boolean
      Notification?: boolean
      IconBlob?: number[]
    }[]
    CTestsFavouriteList?: {
      UserID?: number
      CTestID?: number
      FavType?: number
    }[]
    SurveyFavouriteList?: {
      UserID?: number
      SurveyID?: number
      FavType?: number
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(400).json({
    ErrorCode: 400,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GuestUserSignUp
LegacyAPI.post("/GuestUserSignUp", async (req: Request, res: Response) => {
  interface APIRequest {
    FirstName?: string
    LastName?: string
    Email?: string
    Password?: string
    APPVersion?: string
    DeviceType?: number
    DeviceID?: string
    DeviceToken?: string
    Language?: string
    OSVersion?: string
    DeviceModel?: string
  }
  interface APIResponse {
    UserId?: number
    StudyId?: string
    Email?: string
    Type?: number
    SessionToken?: string
    Data?: {
      UserSettingID?: number
      UserID?: number
      AppColor?: string
      SympSurveySlotID?: number
      SympSurveySlotTime?: string
      SympSurveyRepeatID?: number
      CognTestSlotID?: number
      CognTestSlotTime?: string // Date
      CognTestRepeatID?: number
      ContactNo?: string
      PersonalHelpline?: string
      PrefferedSurveys?: string
      PrefferedCognitions?: string
      Protocol?: boolean
      ProtocolDate?: string // Date
      Language?: string
    }
    WelcomeText?: string
    InstructionVideoLink?: string
    CognitionSettings?: {
      AdminCTestSettingID?: number
      AdminID?: number
      CTestID?: number
      CTestName?: string
      Status?: boolean
      Notification?: boolean
      IconBlob?: number[]
    }[]
    CTestsFavouriteList?: {
      UserID?: number
      CTestID?: number
      FavType?: number
    }[]
    SurveyFavouriteList?: {
      UserID?: number
      SurveyID?: number
      FavType?: number
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(400).json({
    ErrorCode: 400,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /DeleteUser
LegacyAPI.post("/DeleteUser", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(400).json({
    ErrorCode: 400,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /UpdateUserProfile
LegacyAPI.post("/UpdateUserProfile", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserId?: number
    FirstName?: string
    LastName?: string
    StudyId?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(400).json({
    ErrorCode: 2400,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetUserProfile
LegacyAPI.post("/GetUserProfile", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    Data?: {
      UserId?: number
      FirstName?: string
      LastName?: string
      StudyId?: string
    }
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    Data: {
      UserId: (req as any).AuthUser.UserID,
      FirstName: " ",
      LastName: " ",
      StudyId: (req as any).AuthUser.StudyId,
    },
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetUserReport
LegacyAPI.post("/GetUserReport", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserId?: number
  }
  interface APIResponse {
    JewelsTrialsAList?: {
      CreatedDate?: string // Date
      TotalJewelsCollected?: number
      TotalBonusCollected?: number
      Score?: number
      ScoreAvg?: number
    }[]
    JewelsTrialsBList?: {
      CreatedDate?: string // Date
      TotalJewelsCollected?: number
      TotalBonusCollected?: number
      Score?: number
      ScoreAvg?: number
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    JewelsTrialsAList: [],
    JewelsTrialsBList: [],
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetProtocolDate
LegacyAPI.post("/GetProtocolDate", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserId?: number
  }
  interface APIResponse {
    ProtocolDate?: string // Date
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    ProtocolDate: new Date(0).toISOString().replace(/T/, " ").replace(/\..+/, ""),
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetGameScoresforGraph
LegacyAPI.post("/GetGameScoresforGraph", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    GameScoreList?: {
      Game?: string
      average?: number
      totalAverage?: number
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    GameScoreList: [],
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetGameHighAndLowScoreforGraph
LegacyAPI.post("/GetGameHighAndLowScoreforGraph", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    GameID?: number
  }
  interface APIResponse {
    HighScore?: string
    LowScore?: string
    DayTotalScore?: string[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    HighScore: "0",
    LowScore: "0",
    DayTotalScore: ["0"],
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetAllGameTotalSpinWheelScore
LegacyAPI.post("/GetAllGameTotalSpinWheelScore", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    Date?: string // Date
  }
  interface APIResponse {
    TotalScore?: string
    CollectedStars?: string
    DayStreak?: number
    StrakSpin?: number
    GameDate?: string // Date
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    TotalScore: "0",
    CollectedStars: "0",
    DayStreak: 0,
    StrakSpin: 0,
    GameDate: new Date(0).toISOString().replace(/T/, " ").replace(/\..+/, ""),
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetUserCompletedSurvey
LegacyAPI.post("/GetUserCompletedSurvey", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserId?: number
  }
  interface APIResponse {
    CompletedSurveyList?: {
      SurveyResultID?: number
      SurveyName?: string
      EndTime?: string // Date
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    CompletedSurveyList: [],
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetSurveyQueAndAns
LegacyAPI.post("/GetSurveyQueAndAns", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserId?: number
    SurveyResultID?: number
  }
  interface APIResponse {
    SurveyQueAndAnsList?: {
      Question?: string
      Answer?: string
      TimeTaken?: number
      ClickRange?: string
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    SurveyQueAndAnsList: [],
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /SaveUserSetting // USES SQL
LegacyAPI.post("/SaveUserSetting", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserSettingID?: number
    UserID?: number
    AppColor?: string
    SympSurveySlotID?: number
    SympSurveySlotTime?: string
    SympSurveyRepeatID?: number
    CognTestSlotID?: number
    CognTestSlotTime?: string // Date
    CognTestRepeatID?: number
    ContactNo?: string
    PersonalHelpline?: string
    PrefferedSurveys?: string
    PrefferedCognitions?: string
    Protocol?: boolean
    Language?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserID
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  try {
    let UserData = (req as any).AuthUser
    let UserSettings = await TypeRepository._get("a", UserData.StudyId, "lamp.legacy_adapter")
    let PrefferedCognitions: any = requestData.PrefferedCognitions
    await TypeRepository._set("a", "me", UserData.StudyId, "lamp.legacy_adapter", {
      ...UserSettings,
      UserSettings: {
        AppColor: requestData.AppColor,
        SympSurvey_SlotID: requestData.SympSurveySlotID,
        SympSurvey_Time: requestData.SympSurveySlotTime,
        SympSurvey_RepeatID: requestData.SympSurveyRepeatID,
        CognTest_SlotID: requestData.CognTestSlotID,
        CognTest_Time: requestData.CognTestSlotTime,
        CognTest_RepeatID: requestData.CognTestRepeatID,
        "24By7ContactNo": requestData.ContactNo,
        PersonalHelpline: requestData.PersonalHelpline,
        PrefferedSurveys: requestData.PrefferedSurveys,
        PrefferedCognitions:  (typeof PrefferedCognitions !== 'string' ? PrefferedCognitions.toString() :PrefferedCognitions ),
        Protocol: requestData.Protocol,
        Language: requestData.Language,
      },
    })
    return res.status(200).json({
      ErrorCode: 0,
      ErrorMessage: "The user settings have been saved successfully.",
    } as APIResponse)
  } catch (e) {
    return res.status(500).json({
      ErrorCode: 2030,
      ErrorMessage: "An error occured while updating data.",
    } as APIResponse)
  }
})

// Route: /GetUserSetting // USES SQL
LegacyAPI.post("/GetUserSetting", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    Data?: {
      UserSettingID?: number
      UserID?: number
      AppColor?: string
      SympSurveySlotID?: number
      SympSurveySlotTime?: string
      SympSurveyRepeatID?: number
      CognTestSlotID?: number
      CognTestSlotTime?: string // Date
      CognTestRepeatID?: number
      ContactNo?: string
      PersonalHelpline?: string
      PrefferedSurveys?: string
      PrefferedCognitions?: string
      Protocol?: boolean
      Language?: string
    }
    ErrorCode?: number
    ErrorMessage?: string
  }
  try {
    const requestData: APIRequest = req.body
    const UserID: any = requestData.UserID
    if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
      return res.status(422).json({
        Data: {},
        ErrorCode: 2031,
        ErrorMessage: "Specify valid User Id.",
      } as APIResponse)
    }
    let userData = (req as any).AuthUser
    let output: any = {}
    output = await TypeRepository._get("a", userData.StudyId, "lamp.legacy_adapter")
    return res.status(200).json({
      Data: Object.keys(output).length > 0 ? (output.hasOwnProperty("UserSettings") ? output.UserSettings : {}) : {},
      ErrorCode: 0,
      ErrorMessage: "User Setting Details",
    } as APIResponse)
  } catch (e) {
    return res.status(500).json({
      Data: {},
      ErrorCode: 2030,
      ErrorMessage: "An error occured while fetching data.",
    } as APIResponse)
  }
})

// Route: /SaveUserCTestsFavourite // USES SQL
LegacyAPI.post("/SaveUserCTestsFavourite", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserId?: number
    CTestID?: number
    FavType?: number
    Type?: number
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  try {
    const requestData: APIRequest = req.body
    let UserData = (req as any).AuthUser
    let UserID = UserData.UserID
    if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
      return res.status(422).json({
        ErrorCode: 2031,
        ErrorMessage: "Specify valid User Id.",
      } as APIResponse)
    }
    const CTestID: any = requestData.CTestID
    if (!Number.isInteger(CTestID)) {
      return res.status(422).json({
        ErrorCode: 2031,
        ErrorMessage: "Specify valid CTestID.",
      } as APIResponse)
    }
    const FavType: any = requestData.FavType
    if (!Number.isInteger(FavType)) {
      return res.status(422).json({
        ErrorCode: 2031,
        ErrorMessage: "Specify valid FavType.",
      } as APIResponse)
    }
    const Type: any = requestData.Type
    if (Type != 1 && Type != 2) {
      return res.status(422).json({
        ErrorCode: 2031,
        ErrorMessage: "Specify valid Type.",
      } as APIResponse)
    }
    let UserSettingsData = await TypeRepository._get("a", UserData.StudyId, "lamp.legacy_adapter")
    let CTestFavouriteData =
      Object.keys(UserSettingsData).length > 0
        ? UserSettingsData.hasOwnProperty("UserCTestFavourite")
          ? UserSettingsData.UserCTestFavourite
          : []
        : []

    let SurveyFavouriteData =
      Object.keys(UserSettingsData).length > 0
        ? UserSettingsData.hasOwnProperty("UserSurveyFavourite")
          ? UserSettingsData.UserSurveyFavourite
          : []
        : []

    await TypeRepository._set(
      "a",
      "me",
      UserData.StudyId,
      "lamp.legacy_adapter",
      Type === 1
        ? {
            ...UserSettingsData,
            UserSurveyFavourite: [
              ...SurveyFavouriteData,
              { UserID: UserID, SurveyID: requestData.CTestID, FavType: requestData.FavType },
            ],
          }
        : {
            ...UserSettingsData,
            UserCTestFavourite: [
              ...CTestFavouriteData,
              { UserID: UserID, CTestID: requestData.CTestID, FavType: requestData.FavType },
            ],
          }
    )
    return res.status(200).json({
      ErrorCode: 0,
      ErrorMessage: "User CTests Favourite Saved.",
    } as APIResponse)
  } catch (e) {
    return res.status(500).json({
      ErrorCode: 2030,
      ErrorMessage: "An error occured while saving data.",
    } as APIResponse)
  }
})

// Route: /GetTips // USES SQL
LegacyAPI.post("/GetTips", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    TipText?: string
    ErrorCode?: number
    ErrorMessage?: string
  }
  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserID
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  let resultData: APIResponse["TipText"] = ""
  return res.status(200).json({
    TipText: resultData,
    ErrorCode: 0,
    ErrorMessage: "Listing the Tips List.",
  } as APIResponse)
})

// Route: /GetBlogs // USES SQL
LegacyAPI.post("/GetBlogs", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    BlogList?: {
      BlogTitle?: string
      Content?: string
      ImageURL?: string
      BlogText?: string
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserID
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  const objData: APIResponse["BlogList"] = []
  return res.status(200).json({
    BlogList: objData,
    ErrorCode: 0,
    ErrorMessage: "Listing the Blog details.",
  } as APIResponse)
})

// Route: /GetTipsandBlogsUpdates // USES SQL
LegacyAPI.post("/GetTipsandBlogUpdates", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    BlogsUpdate?: boolean
    TipsUpdate?: boolean
    ErrorCode?: number
    ErrorMessage?: string
  }
  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserID
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  let BlogsUpdate: APIResponse["BlogsUpdate"] = false
  let TipsUpdate: APIResponse["TipsUpdate"] = false
  return res.status(200).json({
    BlogsUpdate,
    TipsUpdate,
    ErrorCode: 0,
    ErrorMessage: "Listing the Tips and Blog Updates Detail.",
  } as APIResponse)
})

// Route: /GetAppHelp
LegacyAPI.post("/GetAppHelp", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
  }
  interface APIResponse {
    HelpText?: string
    Content?: string
    ImageURL?: string
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    HelpText: "",
    Content: "",
    ImageURL: "",
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /GetSurveyAndGameSchedule // USES SQL
LegacyAPI.post("/GetSurveyAndGameSchedule", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    LastUpdatedGameDate?: string // Date
    LastUpdatedSurveyDate?: string // Date
    LastFetchedBatchDate?: string // Date
  }
  interface APIResponse {
    ScheduleSurveyList?: {
      SurveyScheduleID?: number
      SurveyId?: number
      SurveyName?: string
      Time?: string // Date
      SlotTime?: string
      RepeatID?: number
      ScheduleDate?: string // Date
      IsDeleted?: boolean
      SlotTimeOptions?: string[]
    }[]
    ScheduleGameList?: {
      GameScheduleID?: number
      CTestId?: number
      CTestName?: string
      Time?: string // Date
      SlotTime?: string
      RepeatID?: number
      ScheduleDate?: string // Date
      IsDeleted?: boolean
      SlotTimeOptions?: string[]
    }[]
    LastUpdatedSurveyDate?: string // Date
    LastUpdatedGameDate?: string // Date
    JewelsTrailsASettings?: {
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
    JewelsTrailsBSettings?: {
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
    ReminderClearInterval?: number
    BatchScheduleList?: {
      BatchScheduleId?: number
      BatchName?: string
      ScheduleDate?: string // Date
      Time?: string // Date
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
        Type?: string // Date
      }[]
      SlotTime?: string
      IconBlog?: number[]
      IconBlobString?: string
    }[]
    LastUpdatedBatchDate?: string // Date
    ContactNo?: string
    PersonalHelpline?: string
    CognitionOffList?: {
      AdminCTestSettingID?: number
      AdminID?: number
      CTestID?: number
      CTestName?: string
      Status?: boolean
      Notification?: boolean
      IconBlob?: number[]
    }[]
    CognitionIconList?: {
      AdminID?: number
      CTestID?: number
      IconBlob?: number[]
      IconBlobString?: string
    }[]
    CognitionVersionList?: {
      CTestID?: number
      CTestName?: string
      Version?: number
    }[]
    SurveyIconList?: {
      AdminID?: number
      SurveyID?: number
      IconBlob?: number[]
      IconBlobString?: string
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }

  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserID
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  let ReminderClearInterval: APIResponse["ReminderClearInterval"] = 1
  let JewelsTrailsASettings: APIResponse["JewelsTrailsASettings"] = {}
  let JewelsTrailsBSettings: APIResponse["JewelsTrailsASettings"] = {}
  let CognitionOffList: APIResponse["CognitionOffList"] = []
  let CognitionIconList: APIResponse["CognitionIconList"] = []
  let SurveyIconList: APIResponse["SurveyIconList"] = []
  let CognitionVersionList: APIResponse["CognitionVersionList"] = []
  let ScheduleSurveyList: APIResponse["ScheduleSurveyList"] = []
  let ScheduleGameList: APIResponse["ScheduleGameList"] = []
  let BatchScheduleList: APIResponse["BatchScheduleList"] = []
  let ContactNo: APIResponse["ContactNo"] = ""
  let PersonalHelpline: APIResponse["PersonalHelpline"] = ""
  let LastUpdatedSurveyDate: any = ""
  let LastUpdatedGameDate: any = ""
  let LastUpdatedBatchDate: any = ""

  try {
    let UserData = (req as any).AuthUser
    let Output = await ActivityRepository._select(UserData.StudyId)

    // JewelsTrailsASettings
    let JewelsA = Output.filter((x: any) => x.spec === "lamp.jewels_a")
    if (JewelsA.length > 0) {
      let JewelsAData = JewelsA[0].settings
      JewelsTrailsASettings = {
        NoOfSeconds_Beg: JewelsAData.beginner_seconds,
        NoOfSeconds_Int: JewelsAData.intermediate_seconds,
        NoOfSeconds_Adv: JewelsAData.advanced_seconds,
        NoOfSeconds_Exp: JewelsAData.expert_seconds,
        NoOfDiamonds: JewelsAData.diamond_count,
        NoOfShapes: JewelsAData.shape_count,
        NoOfBonusPoints: JewelsAData.bonus_point_count,
        X_NoOfChangesInLevel: JewelsAData.x_changes_in_level_count,
        X_NoOfDiamonds: JewelsAData.x_diamond_count,
        Y_NoOfChangesInLevel: JewelsAData.y_changes_in_level_count,
        Y_NoOfShapes: JewelsAData.y_shape_count,
      }
    } else {
      JewelsTrailsASettings = {
        NoOfSeconds_Beg: 90,
        NoOfSeconds_Int: 30,
        NoOfSeconds_Adv: 25,
        NoOfSeconds_Exp: 15,
        NoOfDiamonds: 25,
        NoOfShapes: 1,
        NoOfBonusPoints: 50,
        X_NoOfChangesInLevel: 1,
        X_NoOfDiamonds: 1,
        Y_NoOfChangesInLevel: 1,
        Y_NoOfShapes: 1,
      }
    }

    // JewelsTrailsBSettings
    let JewelsB = Output.filter((x: any) => x.spec === "lamp.jewels_b")
    if (JewelsB.length > 0) {
      let JewelsBData = JewelsB[0].settings
      JewelsTrailsBSettings = {
        NoOfSeconds_Beg: JewelsBData.beginner_seconds,
        NoOfSeconds_Int: JewelsBData.intermediate_seconds,
        NoOfSeconds_Adv: JewelsBData.advanced_seconds,
        NoOfSeconds_Exp: JewelsBData.expert_seconds,
        NoOfDiamonds: JewelsBData.diamond_count,
        NoOfShapes: JewelsBData.shape_count,
        NoOfBonusPoints: JewelsBData.bonus_point_count,
        X_NoOfChangesInLevel: JewelsBData.x_changes_in_level_count,
        X_NoOfDiamonds: JewelsBData.x_diamond_count,
        Y_NoOfChangesInLevel: JewelsBData.y_changes_in_level_count,
        Y_NoOfShapes: JewelsBData.y_shape_count,
      }
    } else {
      JewelsTrailsBSettings = {
        NoOfSeconds_Beg: 180,
        NoOfSeconds_Int: 90,
        NoOfSeconds_Adv: 60,
        NoOfSeconds_Exp: 45,
        NoOfDiamonds: 25,
        NoOfShapes: 2,
        NoOfBonusPoints: 50,
        X_NoOfChangesInLevel: 1,
        X_NoOfDiamonds: 1,
        Y_NoOfChangesInLevel: 1,
        Y_NoOfShapes: 2,
      }
    }

    // BatchScheduleList
    let BatchData: any = {}
    let arrSetings: any = []
    let groupData = Output.filter((x: any) => x.spec === "lamp.group")
    groupData.map((group: any) => {
      arrSetings.push(group.settings)
    })
    let act: any = []
    let item: any
    let BatchCtestArray = []
    for (let i = 0; i < groupData.length; i++) {
      item = groupData[i]
      BatchData = {
        EncryptId: item.id,
        BatchScheduleId: ConvertIdFromV1ToV2(item.id),
        BatchName: item.name,
        IsDeleted: false, // EDIT THIS
        IconBlob: null,
        IconBlobString: null,
      }
      BatchCtestArray = []
      let specData: any
      let BatchCtestFiltered: any
      let BatchScheduleSurvey_CTestObj: any = {}
      let BatchScheduleSurvey_CTestArray: any = []
      for (let j = 0; j < arrSetings[i].length; j++) {
        act = await ActivityRepository._select(arrSetings[i][j])
        BatchCtestArray.push(act[0])
        specData = [act[0].spec]
        BatchCtestFiltered = ActivityIndex.filter((cls) => {
          return specData.includes(cls.Name)
        })
        BatchScheduleSurvey_CTestObj = {
          EncryptId: act[0].id,
          BatchScheduleId: ConvertIdFromV1ToV2(act[0].id),
          Type: 2,
          //ID: BatchCtestFiltered[0].LegacyCTestID,
          ID: act[0].spec === "lamp.survey" ? 1 : BatchCtestFiltered[0].LegacyCTestID,
          Version: 0, // EDIT THIS
          Order: 0, // EDIT THIS
          GameType: 1, // EDIT THIS
        }
        BatchScheduleSurvey_CTestArray.push(BatchScheduleSurvey_CTestObj)
      }
      let BatchCustomTimeData, BatchScheduleCustomTimeObj
      let BatchScheduleCustomTime: any = []
      if (item.schedule.length > 0) {
        let BatchCustomTime: any = []
        if (item.schedule[0].custom_time !== null) {
          item.schedule[0].custom_time.forEach((itemTime: any) => {
            BatchCustomTimeData =
              itemTime != null ? new Date(itemTime).toISOString().replace(/T/, " ").replace(/\..+/, "") : null
            BatchCustomTime.push(BatchCustomTimeData)
            BatchScheduleCustomTimeObj = {
              BatchScheduleId: ConvertIdFromV1ToV2(act[0].id),
              Time: BatchCustomTimeData,
            }
            BatchScheduleCustomTime.push(BatchScheduleCustomTimeObj)
          })
        }
        BatchData.ScheduleDate = item.schedule[0].start_date
        BatchData.Time = item.schedule[0].time
        BatchData.SlotTime =
          item.schedule[0].time != null
            ? new Date(item.schedule[0].time).toISOString().replace(/T/, " ").replace(/\..+/, "")
            : null
        BatchData.RepeatId =
          [
            "hourly",
            "every3h",
            "every6h",
            "every12h",
            "daily",
            "biweekly",
            "triweekly",
            "weekly",
            "bimonthly",
            "monthly",
            "custom",
            "none",
          ].indexOf(item.schedule[0].repeat_interval) + 1
        BatchData.SlotTimeOptions = BatchCustomTime
        BatchData.BatchScheduleSurvey_CTest = BatchScheduleSurvey_CTestArray
        BatchData.BatchScheduleCustomTime = BatchScheduleCustomTime
      }
      BatchScheduleList?.push(BatchData)
    }

    // CognitionIconList & CognitionOffList
    let GameData = Output.filter((x: any) => x.spec !== "lamp.group" && x.spec !== "lamp.survey")
    let CognitionOffListObj: any = {}
    let CognitionIconListObj: any = {}
    let ScheduleGameListObj: any = {}
    let ScheduleGameCustomTime: any = []
    if (GameData.length > 0) {
      let DataFiltered: any, GameCTestID: any
      GameData.forEach(async (item: any, index: any) => {
        let specData = [item.spec]
        DataFiltered = ActivityIndex.filter((cls) => {
          return specData.includes(cls.Name)
        })
        if (item.spec === "lamp.spatial_span") {
          GameCTestID = item.settings.type === "forward" ? 4 : 3
        } else if (item.spec === "lamp.temporal_order") {
          GameCTestID = item.settings.type === "backward" ? 13 : 12
        } else {
          GameCTestID = DataFiltered[0].LegacyCTestID
        }
        CognitionOffListObj = {
          EncryptId: item.id,
          AdminCTestSettingID: ConvertIdFromV1ToV2(item.id),
          AdminID: 0,
          CTestID: GameCTestID,
          CTestName: item.name,
          Status: true,
          Notification: false,
          IconBlob: null,
          Version: null,
          MaxVersion: null,
        }
        CognitionOffList?.push(CognitionOffListObj)
        CognitionIconListObj = {
          EncryptId: item.id,
          AdminCTestSettingID: ConvertIdFromV1ToV2(item.id),
          AdminID: 0,
          CTestID: GameCTestID,
          IconBlob: null,
          IconBlobString: null,
        }
        CognitionIconList?.push(CognitionIconListObj)
        if (item.schedule.length > 0) {
          item.schedule.forEach((itemSchedule: any, indexSchedule: any) => {
            ScheduleGameListObj = {
              CTestId: DataFiltered[0].LegacyCTestID,
              CTestName: item.name,
              Version: 0,
              GameType: 1,
              Time: itemSchedule.time,
              GameScheduleID: index,
              ScheduleDate: itemSchedule.start_date,
              IsDeleted: false,
            }
            if (itemSchedule.custom_time !== null) {
              itemSchedule.custom_time.forEach((itemTime: any) => {
                ScheduleGameCustomTime.push(
                  itemTime != null ? new Date(itemTime).toISOString().replace(/T/, " ").replace(/\..+/, "") : null
                )
              })
            }
            ScheduleGameListObj.SlotTime =
              itemSchedule.time != null
                ? new Date(itemSchedule.time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                : null
            ScheduleGameListObj.RepeatID =
              [
                "hourly",
                "every3h",
                "every6h",
                "every12h",
                "daily",
                "biweekly",
                "triweekly",
                "weekly",
                "bimonthly",
                "monthly",
                "custom",
                "none",
              ].indexOf(itemSchedule.repeat_interval) + 1
            ScheduleGameListObj.SlotTimeOptions = ScheduleGameCustomTime

            ScheduleGameList?.push(ScheduleGameListObj)
          })
        }
      })
    }

    // ScheduleSurveyList & SurveyIconList
    let SurveyData: any = Output.filter((x: any) => x.spec === "lamp.survey")
    let ScheduleSurveyListObj: any = {}
    let SurveyIconListObj: any = {}
    let SurveyIconList: any = []
    let itemSurvey
    let m=0;
    for (let k = 0; k < SurveyData.length; k++) {
      itemSurvey = SurveyData[k]
      if (itemSurvey.schedule.length > 0) {
        for (let l = 0; l < itemSurvey.schedule.length; l++) {
          ScheduleSurveyListObj = {
            EncryptId: itemSurvey.id,
            SurveyId: ConvertIdFromV1ToV2(itemSurvey.id),
            SurveyScheduleID: m, // EDIT THIS
            SurveyName: itemSurvey.name,
            IsDeleted: false, // EDIT THIS
          }
          ScheduleSurveyListObj.ScheduleDate = SurveyData[k].schedule[l].start_date
          ScheduleSurveyListObj.Time = SurveyData[k].schedule[l].time
          ScheduleSurveyListObj.SlotTime =
            SurveyData[k].schedule[l].time != null
              ? new Date(SurveyData[k].schedule[l].time).toISOString().replace(/T/, " ").replace(/\..+/, "")
              : null
          ScheduleSurveyListObj.RepeatID =
            [
              "hourly",
              "every3h",
              "every6h",
              "every12h",
              "daily",
              "biweekly",
              "triweekly",
              "weekly",
              "bimonthly",
              "monthly",
              "custom",
              "none",
            ].indexOf(SurveyData[k].schedule[l].repeat_interval) + 1
          let ScheduleSurveyCustomTime: any = []
          if (SurveyData[k].schedule[l].custom_time !== null) {
            SurveyData[k].schedule[l].custom_time.forEach((itemTime: any) => {
              ScheduleSurveyCustomTime.push(
                itemTime != null ? new Date(itemTime).toISOString().replace(/T/, " ").replace(/\..+/, "") : null
              )
            })
          }
          ScheduleSurveyListObj.SlotTimeOptions = ScheduleSurveyCustomTime
          ScheduleSurveyList?.push(ScheduleSurveyListObj)
          SurveyIconListObj = {
            EncryptId: itemSurvey.id,
            SurveyId: ConvertIdFromV1ToV2(itemSurvey.id),
            AdminID: 0,
            IconBlob: null,
            IconBlobString: null,
          }
          SurveyIconList?.push(SurveyIconListObj)
          m++
        }
      } /*else {  
        ScheduleSurveyListObj = {
          EncryptId: itemSurvey.id,
          SurveyId: ConvertIdFromV1ToV2(itemSurvey.id),
          SurveyScheduleID: k,
          SurveyName: itemSurvey.name,
          IsDeleted: false,
        }
        ScheduleSurveyListObj.ScheduleDate = SurveyData[k].schedule.start_date
        ScheduleSurveyListObj.Time = SurveyData[k].schedule.time
        ScheduleSurveyListObj.SlotTime =
          SurveyData[k].schedule.time != null
            ? new Date(SurveyData[k].schedule.time).toISOString().replace(/T/, " ").replace(/\..+/, "")
            : null
        ScheduleSurveyListObj.RepeatID =
          [
            "hourly",
            "every3h",
            "every6h",
            "every12h",
            "daily",
            "biweekly",
            "triweekly",
            "weekly",
            "bimonthly",
            "monthly",
            "custom",
            "none",
          ].indexOf(SurveyData[k].schedule.repeat_interval) + 1
        ScheduleSurveyListObj.SlotTimeOptions = []
        ScheduleSurveyList?.push(ScheduleSurveyListObj)
      }
      SurveyIconListObj = {
        EncryptId: itemSurvey.id,
        SurveyId: ConvertIdFromV1ToV2(itemSurvey.id),
        AdminID: 0,
        IconBlob: null,
        IconBlobString: null,
      }
      SurveyIconList?.push(SurveyIconListObj)
      */
    }

    return res.status(200).json({
      ContactNo,
      PersonalHelpline,
      ReminderClearInterval,
      JewelsTrailsASettings,
      JewelsTrailsBSettings,
      ScheduleGameList,
      CognitionOffList,
      CognitionIconList,
      CognitionVersionList,
      SurveyIconList,
      ScheduleSurveyList,
      BatchScheduleList,
      LastUpdatedSurveyDate,
      LastUpdatedGameDate,
      LastUpdatedBatchDate,
      ErrorCode: 0,
      ErrorMessage: "Survey And Game Schedule Detail.",
    } as APIResponse)
  } catch (e) {
    return res.status(500).json({
      ContactNo,
      PersonalHelpline,
      ReminderClearInterval,
      JewelsTrailsASettings,
      JewelsTrailsBSettings,
      ScheduleGameList,
      CognitionOffList,
      CognitionIconList,
      SurveyIconList,
      ScheduleSurveyList,
      BatchScheduleList,
      LastUpdatedSurveyDate,
      LastUpdatedGameDate,
      LastUpdatedBatchDate,
      ErrorCode: 2030,
      ErrorMessage: "An error occured while fetching data.",
    } as APIResponse)
  }
})

// Route: /GetDistractionSurveys // USES SQL
LegacyAPI.post("/GetDistractionSurveys", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserId?: number
    CTestId?: number
  }
  interface APIResponse {
    Surveys?: {
      SurveyId?: number
    }[]
    ErrorCode?: number
    ErrorMessage?: string
  }
  const requestData: APIRequest = req.body
  let SurveysList: APIResponse["Surveys"] = []
  const UserID: any = requestData.UserId
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  const CTestId: any = requestData.CTestId
  if (!CTestId || !Number.isInteger(CTestId) || CTestId == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid CTest Id.",
    } as APIResponse)
  }
  return res.status(200).json({
    Surveys: SurveysList,
    ErrorCode: 0,
    ErrorMessage: "Distraction Surveys Detail.",
  } as APIResponse)
})

// Route: /GetSurveys // USES SQL
LegacyAPI.post("/GetSurveys", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    LastUpdatedDate?: string // Date
  }
  interface APIResponse {
    Survey?: {
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
    LastUpdatedDate?: string // Date
    ErrorCode?: number
    ErrorMessage?: string
  }
  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserID
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  let userData = (req as any).AuthUser
  let surveyArray: any = []
  let output = await ActivityRepository._select(userData.StudyId)
  let surveyFiltered = output.filter((x: any) => x.spec === "lamp.survey")
  let surveyObj = {}
  surveyFiltered.forEach((item: any, index: any) => {
    let settingsArray: any = []
    let settingsObj = {}
    if (item.settings.length > 0) {
      item.settings.forEach((settingItem: any, settingIndex: any) => {
        let questionOptions: any = []
        if (settingItem.options !== null) {
          settingItem.options.forEach((optionItem: any, optionIndex: any) => {
            questionOptions.push({ OptionText: optionItem })
          })
        }
        settingsObj = {
          QuestionId: settingIndex,
          QuestionText: settingItem.text,
          AnswerType: SurveyAnswerType(settingItem.type),
          IsDeleted: false,
          QuestionOptions: questionOptions.length > 0 ? questionOptions : null,
          EnableCustomPopup: false,
          ThresholdId: null,
          OperatorId: null,
          CustomPopupMessage: null,
        }
        settingsArray.push(settingsObj)
      })
      surveyObj = {
        EncryptId: item.id,
        SurveyID: ConvertIdFromV1ToV2(item.id),
        SurveyName: item.name,
        Instruction: null,
        LanguageCode: "en",
        IsDeleted: false,
        Questions: settingsArray.length > 0 ? settingsArray : null,
      }
      surveyArray.push(surveyObj)
    }
  })
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "Get surveys detail.",
    Survey: surveyArray.length > 0 ? surveyArray : [],
    LastUpdatedDate: new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""),
  } as APIResponse)
})

// Route: /SaveUserSurvey
LegacyAPI.post("/SaveUserSurvey", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    SurveyType?: number
    SurveyName?: string
    StartTime?: string // Date
    EndTime?: string // Date
    Rating?: string
    Comment?: string
    Point?: number
    StatusType?: number
    IsDistraction?: boolean
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    SurveyID?: number
    QuestAndAnsList?: {
      Question?: string
      Answer?: string
      TimeTaken?: number
      ClickRange?: string
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ survey_id: data.SurveyID! })),
    static_data: {},
    temporal_slices: data.QuestAndAnsList!.map((x) => {
      const temporal_slice = {
        item: x.Question! as string,
        value: x.Answer! as any,
        type: "valid",
        duration: (x.TimeTaken! * 1000) as number,
        level: null,
      }
      // Adjust the Likert scaled values to numbers.
      if (["Not at all", "12:00AM - 06:00AM", "0-3"].indexOf(temporal_slice.value) >= 0) {
        temporal_slice.value = 0
      } else if (["Several Times", "06:00AM - 12:00PM", "3-6"].indexOf(temporal_slice.value) >= 0) {
        temporal_slice.value = 1
      } else if (["More than Half the Time", "12:00PM - 06:00PM", "6-9"].indexOf(temporal_slice.value) >= 0) {
        temporal_slice.value = 2
      } else if (["Nearly All the Time", "06:00PM - 12:00AM", ">9"].indexOf(temporal_slice.value) >= 0) {
        temporal_slice.value = 3
      }
      return temporal_slice
    }),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
            SELECT (CASE DeviceType 
                WHEN 1 THEN 'iOS'
                WHEN 2 THEN 'Android'
            END) AS device_type 
            FROM LAMP.dbo.UserDevices
            WHERE UserID = ${data.UserID!}
        ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "Survey",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveUserHealthKit
LegacyAPI.post("/SaveUserHealthKit", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    DateOfBirth?: string // Date
    Sex?: string
    BloodType?: string
    Height?: string
    Weight?: string
    HeartRate?: string
    BloodPressure?: string
    RespiratoryRate?: string
    Sleep?: string
    Steps?: string
    FlightClimbed?: string
    Segment?: string
    Distance?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const ParamIDLookup: { [key: string]: string } = {
    Height: "lamp.height",
    Weight: "lamp.weight",
    HeartRate: "lamp.heart_rate",
    BloodPressure: "lamp.blood_pressure",
    RespiratoryRate: "lamp.respiratory_rate",
    Sleep: "lamp.sleep",
    Steps: "lamp.steps",
    Flights: "lamp.flights",
    Segment: "lamp.segment",
    Distance: "lamp.distance",
  }
  const data = req.body as APIRequest
  const sensorEvents = Object.entries(data)
    .filter(([key, value]) => Object.keys(ParamIDLookup).includes(key) && (value?.length ?? 0 > 0))
    .map(([key, value]) => ({
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date().getTime(), // use NOW, as no date is provided
      sensor: ParamIDLookup[key],
      data: {
        value: value.split(" ")[0] ?? "",
        units: value.split(" ")[1] ?? "",
      },
    }))
  const out = await Database.use("sensor_event").bulk({ docs: sensorEvents })
  console.dir(out.filter((x) => !!x.error))
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveUserHealthKitV2
LegacyAPI.post("/SaveUserHealthKitV2", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    DateOfBirth?: string // Date
    Gender?: string
    BloodType?: string
    HealthKitParams?: {
      ParamID?: number
      Value?: string
      DateTime?: string // Date
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const ParamIDLookup: { [key: string]: string } = {
    Height: "lamp.height",
    Weight: "lamp.weight",
    HeartRate: "lamp.heart_rate",
    BloodPressure: "lamp.blood_pressure",
    RespiratoryRate: "lamp.respiratory_rate",
    Sleep: "lamp.sleep",
    Steps: "lamp.steps",
    Flights: "lamp.flights",
    Segment: "lamp.segment",
    Distance: "lamp.distance",
  }
  const data = req.body as APIRequest
  const sensorEvents = data.HealthKitParams!.map((param) => ({
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date().getTime(), // use NOW, as no date is provided
    sensor: ParamIDLookup[param.ParamID!],
    data: {
      value: param.Value!.split(" ")[0] ?? "",
      units: param.Value!.split(" ")[1] ?? "",
    },
  }))
  const out = await Database.use("sensor_event").bulk({ docs: sensorEvents })
  console.dir(out.filter((x) => !!x.error))
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveLocation
LegacyAPI.post("/SaveLocation", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    LocationName?: string
    Address?: string
    Type?: number
    Latitude?: string
    Longitude?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const toLAMP = (value?: string): [string?, string?] => {
    if (!value) return []
    const matches =
      (Decrypt(value) || value).toLowerCase().match(/(?:i am )([ \S\/]+)(alone|in [ \S\/]*|with [ \S\/]*)/) || []
    return [
      ({
        home: "home",
        "at home": "home",
        "in school/class": "school",
        "at work": "work",
        "in clinic/hospital": "hospital",
        outside: "outside",
        "shopping/dining": "shopping",
        "in bus/train/car": "transit",
      } as any)[(matches[1] || " ").slice(0, -1)],
      ({
        alone: "alone",
        "with friends": "friends",
        "with family": "family",
        "with peers": "peers",
        "in crowd": "crowd",
      } as any)[matches[2] || ""],
    ]
  }
  const data = req.body as APIRequest
  const x = toLAMP(data.LocationName!)
  const sensorEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date().getTime(), // use NOW, as no date is provided
    sensor: "lamp.gps.contextual",
    data: {
      latitude: parseFloat(Decrypt(data.Latitude ?? "") ?? data.Latitude!),
      longitude: parseFloat(Decrypt(data.Longitude ?? "") ?? data.Longitude!),
      accuracy: -1,
      context: {
        environment: x[0] || null,
        social: x[1] || null,
      },
    },
  }
  const out = await Database.use("sensor_event").bulk({ docs: [sensorEvent] })
  console.dir(out.filter((x) => !!x.error))
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveHelpCall
LegacyAPI.post("/SaveHelpCall", [_authorize], async (req: Request, res: Response) => {
  interface APIRequest {
    UserID?: number
    CalledNumber?: string
    CallDateTime?: string // Date
    CallDuration?: number
    Type?: number
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "Disabled",
  } as APIResponse)
})

// Route: /SaveNBackGame
LegacyAPI.post("/SaveNBackGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 1
  interface APIRequest {
    UserID?: number
    TotalQuestions?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    Version?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      version: data.Version!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "NBack",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveTrailsBGame
LegacyAPI.post("/SaveTrailsBGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 2
  interface APIRequest {
    UserID?: number
    TotalAttempts?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    Version?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    RoutesList?: {
      Routes?: {
        Alphabet?: string
        TimeTaken?: string // Date
        Status?: boolean
      }[]
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      version: data.Version!,
      total_attempts: data.TotalAttempts!,
    },
    temporal_slices: data.RoutesList!.reduce((prev, curr, idx) => {
      return prev.concat(
        curr!.Routes!.map((x) => ({
          item: x.Alphabet!,
          value: x.Status!,
          type: null,
          duration: parseFloat(x.TimeTaken!) * 1000,
          level: idx + 1,
        })) as any[]
      )
    }, [] as any[]),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "TrailsB",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveSpatialSpanGame
LegacyAPI.post("/SaveSpatialSpanGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 3 // [3, 4] = [Backward, Forward] variants
  interface APIRequest {
    UserID?: number
    Type?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    BoxList?: {
      Boxes?: {
        GameIndex?: number
        TimeTaken?: string // Date
        Status?: boolean
        Level?: number
      }[]
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      type: data.Type!,
      point: data.Point!,
      score: data.Score!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: data.BoxList!.reduce((prev, curr, idx) => {
      return prev.concat(
        curr!.Boxes!.map((x) => ({
          item: x.GameIndex!,
          value: idx + 1, // ColumnName = Sequence
          type: x.Status!,
          duration: parseFloat(x.TimeTaken!) * 1000,
          level: x.Level!,
        })) as any[]
      )
    }, [] as any[]),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "SpatialSpan",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveSimpleMemoryGame
LegacyAPI.post("/SaveSimpleMemoryGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 5
  interface APIRequest {
    UserID?: number
    TotalQuestions?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    Version?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      version: data.Version!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "SimpleMemory",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveSerial7Game
LegacyAPI.post("/SaveSerial7Game", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 6
  interface APIRequest {
    UserID?: number
    TotalQuestions?: number
    TotalAttempts?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    Version?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      version: data.Version!,
      total_questions: data.TotalQuestions!,
      total_attempts: data.TotalAttempts!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "Serial7s",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveCatAndDogGame
LegacyAPI.post("/SaveCatAndDogGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 7
  interface APIRequest {
    UserID?: number
    TotalQuestions?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      total_questions: data.TotalQuestions!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "CatAndDog",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /Save3DFigureGame
LegacyAPI.post("/Save3DFigureGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 8
  interface APIRequest {
    UserID?: number
    C3DFigureID?: number
    GameName?: string
    DrawnFig?: string
    DrawnFigFileName?: string
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const new_filename = `${(req as any).AuthUser.UserID}_${uuidv4()}.png`
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      drawn_fig_file_name: new_filename,
      game_name: data.GameName!,
    },
    temporal_slices: [],
  }
  S3.upload(
    {
      Bucket: AWSBucketName,
      Key: `Games/User3DFigures/${new_filename}`,
      Body: data.DrawnFig!,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: "image/png",
    },
    (err: any, data: any) => {
      console.dir({ data, err })
    }
  )
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
            SELECT (CASE DeviceType 
                WHEN 1 THEN 'iOS'
                WHEN 2 THEN 'Android'
            END) AS device_type 
            FROM LAMP.dbo.UserDevices
            WHERE UserID = ${data.UserID!}
        ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "3DFigure",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveVisualAssociationGame
LegacyAPI.post("/SaveVisualAssociationGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 9
  interface APIRequest {
    UserID?: number
    TotalQuestions?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    Version?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      version: data.Version!,
      total_questions: data.TotalQuestions!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "VisualAssociation",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveDigitSpanGame
LegacyAPI.post("/SaveDigitSpanGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 10 // [10, 13] = [Backward, Forward] variants
  interface APIRequest {
    UserID?: number
    Type?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      type: data.Type!,
      point: data.Point!,
      score: data.Score!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "DigitSpan",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveCatAndDogNewGame
LegacyAPI.post("/SaveCatAndDogNewGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 11
  interface APIRequest {
    UserID?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    GameLevelDetailList?: {
      CorrectAnswer?: number
      WrongAnswer?: number
      TimeTaken?: string // Date
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: data.GameLevelDetailList!.map((x) => ({
      item: null,
      value: x.CorrectAnswer!,
      type: x.WrongAnswer!,
      duration: parseFloat(x.TimeTaken!) * 1000,
      level: null,
    })),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "CatAndDogNew",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveTemporalOrderGame
LegacyAPI.post("/SaveTemporalOrderGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 12
  interface APIRequest {
    UserID?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    Version?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      version: data.Version!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "TemporalOrder",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveNBackGameNewGame
LegacyAPI.post("/SaveNBackGameNewGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 14
  interface APIRequest {
    UserID?: number
    TotalQuestions?: number
    CorrectAnswers?: number
    WrongAnswers?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      total_questions: data.TotalQuestions!,
      correct_answers: data.CorrectAnswers!,
      wrong_answers: data.WrongAnswers!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "NBackNew",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveTrailsBGameNew
LegacyAPI.post("/SaveTrailsBGameNew", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 15
  interface APIRequest {
    UserID?: number
    TotalAttempts?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    Version?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    RoutesList?: {
      Routes?: {
        Alphabet?: string
        TimeTaken?: string // Date
        Status?: boolean
      }[]
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      version: data.Version!,
      total_attempts: data.TotalAttempts!,
    },
    temporal_slices: data.RoutesList!.reduce((prev, curr, idx) => {
      return prev.concat(
        curr!.Routes!.map((x) => ({
          item: x.Alphabet!,
          value: x.Status!,
          type: null,
          duration: parseFloat(x.TimeTaken!) * 1000,
          level: idx + 1,
        })) as any[]
      )
    }, [] as any[]),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "TrailsBNew",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveTrailsBDotTouchGame
LegacyAPI.post("/SaveTrailsBDotTouchGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 16
  interface APIRequest {
    UserID?: number
    TotalAttempts?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    RoutesList?: {
      Routes?: {
        Alphabet?: string
        TimeTaken?: string // Date
        Status?: boolean
      }[]
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      total_attempts: data.TotalAttempts!,
    },
    temporal_slices: data.RoutesList!.reduce((prev, curr, idx) => {
      return prev.concat(
        curr!.Routes!.map((x) => ({
          item: x.Alphabet!,
          value: x.Status!,
          type: null,
          duration: parseFloat(x.TimeTaken!) * 1000,
          level: idx + 1,
        })) as any[]
      )
    }, [] as any[]),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "TrailsBDotTouch",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveJewelsTrailsAGame
LegacyAPI.post("/SaveJewelsTrailsAGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 17
  interface APIRequest {
    UserID?: number
    TotalAttempts?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    TotalJewelsCollected?: number
    TotalBonusCollected?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    RoutesList?: {
      Routes?: {
        Alphabet?: string
        TimeTaken?: string // Date
        Status?: boolean
      }[]
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      total_attempts: data.TotalAttempts!,
      total_jewels_collected: data.TotalJewelsCollected!,
      total_bonus_collected: data.TotalBonusCollected!,
    },
    temporal_slices: data.RoutesList!.reduce((prev, curr, idx) => {
      return prev.concat(
        curr!.Routes!.map((x) => ({
          item: x.Alphabet!,
          value: x.Status!,
          type: null,
          duration: parseFloat(x.TimeTaken!) * 1000,
          level: idx + 1,
        })) as any[]
      )
    }, [] as any[]),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "JewelsTrailsA",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveJewelsTrailsBGame
LegacyAPI.post("/SaveJewelsTrailsBGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 18
  interface APIRequest {
    UserID?: number
    TotalAttempts?: number
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    Score?: number
    TotalJewelsCollected?: number
    TotalBonusCollected?: number
    StatusType?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
    RoutesList?: {
      Routes?: {
        Alphabet?: string
        TimeTaken?: string // Date
        Status?: boolean
      }[]
    }[]
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      score: data.Score!,
      total_attempts: data.TotalAttempts!,
      total_jewels_collected: data.TotalJewelsCollected!,
      total_bonus_collected: data.TotalBonusCollected!,
    },
    temporal_slices: data.RoutesList!.reduce((prev, curr, idx) => {
      return prev.concat(
        curr!.Routes!.map((x) => ({
          item: x.Alphabet!,
          value: x.Status!,
          type: null,
          duration: parseFloat(x.TimeTaken!) * 1000,
          level: idx + 1,
        })) as any[]
      )
    }, [] as any[]),
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "JewelsTrailsB",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveScratchImageGame
LegacyAPI.post("/SaveScratchImageGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 19
  interface APIRequest {
    UserID?: number
    ScratchImageID?: number
    GameName?: string
    DrawnImage?: string
    DrawnImageName?: string
    StartTime?: string // Date
    EndTime?: string // Date
    Point?: number
    IsNotificationGame?: boolean
    AdminBatchSchID?: number
    SpinWheelScore?: string
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const new_filename = `${(req as any).AuthUser.UserID}_${uuidv4()}.png`
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.EndTime!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      point: data.Point!,
      scratch_file_name: new_filename,
      game_name: data.GameName!,
    },
    temporal_slices: [],
  }
  S3.upload(
    {
      Bucket: AWSBucketName,
      Key: `Games/UserScratchImages/${new_filename}`,
      Body: data.DrawnImage!,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: "image/png",
    },
    (err: any, data: any) => {
      console.dir({ data, err })
    }
  )
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  if (!!data.IsNotificationGame) {
    const res2 = await SQL!.query(`
             SELECT (CASE DeviceType 
                 WHEN 1 THEN 'iOS'
                 WHEN 2 THEN 'Android'
             END) AS device_type 
             FROM LAMP.dbo.UserDevices
             WHERE UserID = ${data.UserID!}
         ;`)
    const notificationEvent = {
      "#parent": (req as any).AuthUser.StudyId,
      timestamp: new Date(data.StartTime!).getTime(),
      sensor: "lamp.analytics",
      data: {
        device_type: res2.recordset.length > 0 ? res2.recordset[0].device_type : "Unknown",
        event_type: "notification",
        category: "ScratchImage",
      },
    }
    const out = await Database.use("sensor_event").bulk({ docs: [notificationEvent] })
    console.dir(out.filter((x) => !!x.error))
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})

// Route: /SaveSpinWheelGame
LegacyAPI.post("/SaveSpinWheelGame", [_authorize], async (req: Request, res: Response) => {
  const LegacyCTestID = 20
  interface APIRequest {
    UserID?: number
    StartTime?: string // Date
    CollectedStars?: string
    DayStreak?: number
    StrakSpin?: number
    GameDate?: string // Date // use as "EndTime"
  }
  interface APIResponse {
    ErrorCode?: number
    ErrorMessage?: string
  }
  const data = req.body as APIRequest // TODO: StatusType field?
  const settingID = (
    await SQL!.query(`
        SELECT 
            AdminCTestSettingID AS id
          FROM Admin_CTestSettings
          WHERE Admin_CTestSettings.AdminID IN (
            SELECT AdminID
            FROM Users
            WHERE Users.UserID = ${data.UserID}
          ) AND Admin_CTestSettings.CTestID = ${LegacyCTestID}
    ;`)
  ).recordset[0]["id"]
  const activityEvent = {
    "#parent": (req as any).AuthUser.StudyId,
    timestamp: new Date(data.StartTime!).getTime(),
    duration: new Date(data.GameDate!).getTime() - new Date(data.StartTime!).getTime(),
    activity: await _lookup_migrator_id(Activity_pack_id({ ctest_id: settingID })),
    static_data: {
      collected_stars: data.CollectedStars!,
      day_streak: data.DayStreak!,
      streak_spin: data.StrakSpin!,
    },
    temporal_slices: [],
  }
  const out = await Database.use("activity_event").bulk({ docs: [activityEvent] })
  console.dir(out.filter((x) => !!x.error))
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "API Method Auto-Forwarded",
  } as APIResponse)
})
