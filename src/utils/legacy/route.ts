/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SQL, Database, Encrypt, Decrypt, S3, AWSBucketName } from "../../app"
import { _migrator_lookup_table, Activity_pack_id } from "../../repository/migrate"
import sql from "mssql"
import { Request, Response, Router } from "express"
import { v4 as uuidv4 } from "uuid"
import { customAlphabet } from "nanoid"
const uuid = customAlphabet("1234567890abcdefghjkmnpqrstvwxyz", 20) // crockford-32

export const LegacyAPI = Router()

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
  const requestData: APIRequest = req.body
  const Username: APIRequest["Username"] = requestData.Username
  const EncryptEmail: APIRequest["Username"] = Encrypt(requestData.Username!)
  const Email: APIRequest["Username"] = requestData.Username
  const Password: APIRequest["Password"] = requestData.Password
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
  const resultQuery: any = await SQL!.request().query(`
    SELECT UserID, AdminID, StudyId, Status, Password, IsDeleted, IsGuestUser FROM Users WHERE ISNULL(Email, '') = '${EncryptEmail}'
  `)
  const resultLength = resultQuery.recordset.length
  if (resultLength > 0) {
    const userObj = resultQuery.recordset[0]
    if (userObj.Status == null || userObj.Status == 0) {
      return res.status(200).json({
        ErrorCode: 2044,
        ErrorMessage: "This user has been deactivated. Please contact the administrator.",
      } as APIResponse)
    }
    const UserId: APIResponse["UserId"] = userObj.UserID
    const AdminID = userObj.AdminID
    const StudyId: APIResponse["StudyId"] = Decrypt(userObj.StudyId)
    const Language: APIRequest["Language"] = requestData.Language
    const userSettingsData: any = {}
    let CTestsFavouriteList: APIResponse["CTestsFavouriteList"] = []
    let WelcomeText: APIResponse["WelcomeText"] = ""
    let InstructionVideoLink: APIResponse["InstructionVideoLink"] = ""
    let SurveyFavouriteList: APIResponse["SurveyFavouriteList"] = []
    let CognitionSettings: APIResponse["CognitionSettings"] = []
    let Data: APIResponse["Data"] = {}
    let SessionToken: APIResponse["SessionToken"] = ""
    const DecryptedPswd = Decrypt(userObj.Password, "AES256")
    if (DecryptedPswd == Password) {
      // Decrypt password and check
      if (userObj.IsDeleted == 1) {
        return res.status(200).json({
          ErrorCode: 2050,
          ErrorMessage: "User account has been deleted.",
        } as APIResponse)
      } else {
        const appendedSession = Username + ":" + Password
        SessionToken = Encrypt(appendedSession)
        const Type = userObj.IsGuestUser == 1 ? userObj.IsGuestUser : 0
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const updateUserSettings = await SQL!.request().query(`
          UPDATE UserSettings
          SET Language = '${Language}' 
          WHERE UserID = ${UserId}
        `)
        const userSettingsQuery: any = await SQL!.request().query(`
          SELECT
            UserSettingID,
            UserID,
            AppColor,
            SympSurvey_SlotID,
            SympSurvey_Time,
            SympSurvey_RepeatID,
            CognTest_SlotID,
            CognTest_Time,
            CognTest_RepeatID,
            [24By7ContactNo] ContactNo,
            PersonalHelpline,
            PrefferedSurveys,
            PrefferedCognitions,
            Protocol,
            Language,
            ProtocolDate
          FROM UserSettings
          WHERE UserID = ${UserId}
        `)
        const userSettingsLength = userSettingsQuery.recordset.length
        if (userSettingsLength > 0) {
          const userSetting: any = userSettingsQuery.recordset[0]
          userSettingsData.UserSettingID = userSetting.UserSettingID
          userSettingsData.UserID = userSetting.UserID
          userSettingsData.AppColor = Decrypt(userSetting.AppColor)
          if (userSetting.SympSurvey_SlotID != null) userSettingsData.SympSurveySlotID = userSetting.SympSurvey_SlotID
          if (userSetting.SympSurvey_Time == null) userSettingsData.SympSurveySlotTime = null
          else userSettingsData.SympSurveySlotTime = userSetting.SympSurvey_Time
          if (userSetting.SympSurvey_RepeatID != null)
            userSettingsData.SympSurveyRepeatID = userSetting.SympSurvey_RepeatID
          if (userSetting.CognTest_SlotID != null) userSettingsData.CognTestSlotID = userSetting.CognTest_SlotID
          if (userSetting.CognTest_Time == null) userSettingsData.CognTestSlotTime = null
          else userSettingsData.CognTestSlotTime = userSetting.CognTest_Time
          if (userSetting.CognTest_RepeatID != null) userSettingsData.CognTestRepeatID = userSetting.CognTest_RepeatID
          userSettingsData.ContactNo =
            userSetting.ContactNo === null || userSetting.ContactNo === "" ? "" : Decrypt(userSetting.ContactNo)
          userSettingsData.PersonalHelpline =
            userSetting.PersonalHelpline === null || userSetting.PersonalHelpline === ""
              ? ""
              : Decrypt(userSetting.PersonalHelpline)
          userSettingsData.PrefferedSurveys =
            userSetting.PrefferedSurveys === null || userSetting.PrefferedSurveys === ""
              ? ""
              : Decrypt(userSetting.PrefferedSurveys)
          userSettingsData.PrefferedCognitions =
            userSetting.PrefferedCognitions === null || userSetting.PrefferedCognitions === ""
              ? ""
              : Decrypt(userSetting.PrefferedCognitions)
          userSettingsData.Protocol = userSetting.Protocol
          userSettingsData.Language = userSetting.Language
          userSettingsData.ProtocolDate = new Date(0).toISOString().replace(/T/, " ").replace(/\..+/, "")
        } else {
          const defaultLanguage = Language != "" ? Language : "en"
          const AppColor = Encrypt("#359FFE")
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const result = await SQL!
            .request()
            .query(
              "INSERT into UserSettings (UserID, AppColor, SympSurvey_SlotID, SympSurvey_RepeatID, CognTest_SlotID, CognTest_RepeatID, [24By7ContactNo], PersonalHelpline, PrefferedSurveys, PrefferedCognitions, Language) VALUES (" +
                UserId +
                ", '" +
                AppColor +
                "', 1, 1, 1, 1, '', '', '', '', '" +
                defaultLanguage +
                "' ) "
            )
          const userSettingsQuery: any = await SQL!
            .request()
            .query(
              "SELECT UserSettingID, UserID, AppColor, SympSurvey_SlotID, SympSurvey_Time, SympSurvey_RepeatID, " +
                " CognTest_SlotID, CognTest_Time, CognTest_RepeatID, [24By7ContactNo] ContactNo, PersonalHelpline, PrefferedSurveys, " +
                " PrefferedCognitions, Protocol, Language, ProtocolDate " +
                " FROM UserSettings WHERE UserID = " +
                UserId
            )
          const userSettingsLength = userSettingsQuery.recordset.length
          if (userSettingsLength > 0) {
            const userSetting: any = userSettingsQuery.recordset[0]
            userSettingsData.UserSettingID = userSetting.UserSettingID
            userSettingsData.UserID = userSetting.UserID
            userSettingsData.AppColor = Decrypt(userSetting.AppColor)
            if (userSetting.SympSurvey_SlotID != null) userSettingsData.SympSurveySlotID = userSetting.SympSurvey_SlotID
            if (userSetting.SympSurvey_Time == null) userSettingsData.SympSurveySlotTime = null
            else userSettingsData.SympSurveySlotTime = userSetting.SympSurvey_Time.Value
            if (userSetting.SympSurvey_RepeatID != null)
              userSettingsData.SympSurveyRepeatID = userSetting.SympSurvey_RepeatID
            if (userSetting.CognTest_SlotID != null) userSettingsData.CognTestSlotID = userSetting.CognTest_SlotID
            if (userSetting.CognTest_Time == null) userSettingsData.CognTestSlotTime = null
            else userSettingsData.CognTestSlotTime = userSetting.CognTest_Time.Value
            if (userSetting.CognTest_RepeatID != null) userSettingsData.CognTestRepeatID = userSetting.CognTest_RepeatID
            userSettingsData.ContactNo =
              userSetting.ContactNo === null || userSetting.ContactNo === "" ? "" : Decrypt(userSetting.ContactNo)
            userSettingsData.PersonalHelpline =
              userSetting.PersonalHelpline === null || userSetting.PersonalHelpline === ""
                ? ""
                : Decrypt(userSetting.PersonalHelpline)
            userSettingsData.PrefferedSurveys =
              userSetting.PrefferedSurveys === null || userSetting.PrefferedSurveys === ""
                ? ""
                : Decrypt(userSetting.PrefferedSurveys)
            userSettingsData.PrefferedCognitions =
              userSetting.PrefferedCognitions === null || userSetting.PrefferedCognitions === ""
                ? ""
                : Decrypt(userSetting.PrefferedCognitions)
            userSettingsData.Protocol = userSetting.Protocol
            userSettingsData.Language = userSetting.Language
            userSettingsData.ProtocolDate = new Date(0).toISOString().replace(/T/, " ").replace(/\..+/, "")
          }
        }
        Data = userSettingsData
        const APPVersion: APIRequest["APPVersion"] = Encrypt(requestData.APPVersion!)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const updateUserData = await SQL!
          .request()
          .query(
            "UPDATE Users SET SessionToken = '" +
              SessionToken +
              "' ,  APPVersion = '" +
              APPVersion +
              "' , EditedOn = GETUTCDATE() WHERE UserID = " +
              UserId
          )
        const userDeviceQuery: any = await SQL!
          .request()
          .query("SELECT UserDeviceID FROM UserDevices WHERE UserID = " + UserId + " ORDER By LastLoginOn DESC")
        if (userDeviceQuery.recordset.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const updateUserDevice = await SQL!
            .request()
            .query(
              "UPDATE UserDevices SET DeviceType = '" +
                requestData.DeviceType +
                "' , DeviceID = '" +
                Encrypt(requestData.DeviceID!) +
                "', DeviceToken = '" +
                Encrypt(requestData.DeviceToken!) +
                "' , LastLoginOn = GETUTCDATE() , OSVersion = '" +
                requestData.OSVersion +
                "' , DeviceModel = '" +
                requestData.DeviceModel +
                "' WHERE UserDeviceID = " +
                userDeviceQuery.recordset[0].UserDeviceID
            )
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const insertUserDevice = await SQL!
            .request()
            .query(
              "INSERT into UserDevices (UserID, DeviceType, DeviceID, DeviceToken, LastLoginOn, OSVersion, DeviceModel) VALUES (" +
                UserId +
                ", '" +
                requestData.DeviceType +
                "', '" +
                Encrypt(requestData.DeviceID!) +
                "', '" +
                Encrypt(requestData.DeviceToken!) +
                "', GETUTCDATE() , '" +
                requestData.OSVersion +
                "', '" +
                requestData.DeviceModel +
                "' ) "
            )
        }
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

        // User CTests Favourite
        const FavouriteCtestQuery: any = await SQL!
          .request()
          .query("SELECT UserID, CTestID, FavType FROM UserFavouriteCTests WHERE UserID = " + UserId)
        CTestsFavouriteList = FavouriteCtestQuery.recordset.length > 0 ? FavouriteCtestQuery.recordset : []

        // User Survey Favourite
        const FavouriteSurveyQuery: any = await SQL!
          .request()
          .query("SELECT UserID, SurveyID, FavType FROM UserFavouriteSurveys WHERE UserID = " + UserId)
        SurveyFavouriteList = FavouriteSurveyQuery.recordset.length > 0 ? FavouriteSurveyQuery.recordset : []

        // Get Admin WelcomeText & InstructionVideoLink
        const AdminSettingsQuery: any = await SQL!
          .request()
          .query("SELECT WelcomeMessage, InstructionVideoLink FROM Admin_Settings WHERE AdminID = " + AdminID)
        WelcomeText = AdminSettingsQuery.recordset.length > 0 ? AdminSettingsQuery.recordset[0].WelcomeMessage : ""
        InstructionVideoLink =
          AdminSettingsQuery.recordset.length > 0 ? AdminSettingsQuery.recordset[0].InstructionVideoLink : ""

        //CognitionSettings
        const CognitionSettingsQuery: any = await SQL!
          .request()
          .query(
            "SELECT a_ct.AdminCTestSettingID, a_ct.Notification, a_ct.AdminID, a_ct.CTestID, c_t.CTestName, NULL AS Status, NULL AS IconBlob, NULL AS Version, NULL AS MaxVersion FROM Admin_CTestSettings as a_ct JOIN CTest as c_t ON a_ct.CTestID = c_t.CTestID WHERE a_ct.AdminID = " +
              AdminID +
              " AND a_ct.Notification = 1  AND c_t.IsDeleted = 0"
          )
        CognitionSettings = CognitionSettingsQuery.recordset.length > 0 ? CognitionSettingsQuery.recordset : []

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
      }
    } else {
      return res.status(200).json({
        ErrorCode: 2034,
        ErrorMessage: "Login failed. Please check the specified credentials.",
      } as APIResponse)
    }
  } else {
    return res.status(200).json({
      ErrorCode: 2034,
      ErrorMessage: "Login failed. Please check the specified credentials.",
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
  const UserSettingID: any = requestData.UserSettingID
  if (UserSettingID > 0) {
    const resultQuery = await SQL!
      .request()
      .query("SELECT COUNT(UserID) as count FROM UserSettings WHERE UserSettingID = " + UserSettingID)
    const resultCount = resultQuery.recordset[0].count
    if (resultCount > 0) {
      const updateResult = await SQL!
        .request()
        .query(
          "UPDATE UserSettings SET AppColor = '" +
            Encrypt(requestData.AppColor!) +
            "', SympSurvey_SlotID = " +
            requestData.SympSurveySlotID +
            ", SympSurvey_Time = '" +
            requestData.SympSurveySlotTime +
            "' , SympSurvey_RepeatID = " +
            requestData.SympSurveyRepeatID +
            ", CognTest_SlotID = " +
            requestData.CognTestSlotID +
            ", CognTest_Time = '" +
            requestData.CognTestSlotTime +
            "', CognTest_RepeatID = " +
            requestData.CognTestRepeatID +
            ", [24By7ContactNo] = '" +
            Encrypt(requestData.ContactNo!) +
            "', PersonalHelpline = '" +
            Encrypt(requestData.PersonalHelpline!) +
            "', PrefferedSurveys = '" +
            Encrypt(requestData.PrefferedSurveys!) +
            "', PrefferedCognitions = '" +
            Encrypt(requestData.PrefferedCognitions!) +
            "', Protocol = '" +
            requestData.Protocol +
            "', Language = '" +
            requestData.Language +
            "' WHERE UserSettingID = " +
            UserSettingID
        )
      if (updateResult.rowsAffected[0] > 0) {
        return res.status(200).json({
          ErrorCode: 0,
          ErrorMessage: "The user settings have been saved successfully.",
        } as APIResponse)
      } else {
        return res.status(500).json({
          ErrorCode: 2030,
          ErrorMessage: "An error occured while updating data.",
        } as APIResponse)
      }
    } else {
      return res.status(422).json({
        Data: {},
        ErrorCode: 2031,
        ErrorMessage: "Specify valid User Setting Id.",
      } as APIResponse)
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = await SQL!
      .request()
      .query(
        "INSERT into UserSettings (UserID, AppColor, SympSurvey_SlotID, SympSurvey_Time, SympSurvey_RepeatID, CognTest_SlotID, CognTest_Time, CognTest_RepeatID, [24By7ContactNo], PersonalHelpline, PrefferedSurveys, PrefferedCognitions, Protocol, Language) VALUES (" +
          UserID +
          ", '" +
          Encrypt(requestData.AppColor!) +
          "', " +
          requestData.SympSurveySlotID +
          ", '" +
          requestData.SympSurveySlotTime +
          "', " +
          requestData.SympSurveyRepeatID +
          ", " +
          requestData.CognTestSlotID +
          ", '" +
          requestData.CognTestSlotTime +
          "', " +
          requestData.CognTestRepeatID +
          ", '" +
          Encrypt(requestData.ContactNo!) +
          "', '" +
          Encrypt(requestData.PersonalHelpline!) +
          "', '" +
          Encrypt(requestData.PrefferedSurveys!) +
          "', '" +
          Encrypt(requestData.PrefferedCognitions!) +
          "', '" +
          requestData.Protocol +
          "', '" +
          requestData.Language +
          "' ) "
      )
    return res.status(200).json({
      ErrorCode: 0,
      ErrorMessage: "The user settings have been saved successfully.",
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
  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserID
  if (!UserID || !Number.isInteger(Number(UserID)) || UserID == 0) {
    return res.status(422).json({
      Data: {},
      ErrorCode: 2031,
      ErrorMessage: "Specify valid User Id.",
    } as APIResponse)
  }
  const result = await SQL!
    .request()
    .query(
      'SELECT UserSettingID, UserID, AppColor, SympSurvey_SlotID SympSurveySlotID, SympSurvey_Time SympSurveySlotTime, SympSurvey_RepeatID SympSurveyRepeatID, CognTest_SlotID CognTestSlotID, CognTest_Time CognTestSlotTime, CognTest_RepeatID CognTestRepeatID, "24By7ContactNo" ContactNo, PersonalHelpline, PrefferedSurveys, PrefferedCognitions, Protocol, ProtocolDate, Language FROM UserSettings WHERE UserID =' +
        UserID
    )
  let objData: APIResponse["Data"] = {}
  if (result.recordset.length >= 0 && result.recordset[0] != null) {
    const resultData: any = result.recordset[0]
    const appColor = resultData.AppColor
    const ContactNo = resultData.ContactNo
    const PersonalHelpline = resultData.PersonalHelpline
    const PrefferedSurveys = resultData.PrefferedSurveys
    const PrefferedCognitions = resultData.PrefferedCognitions
    const objData1 = resultData
    delete objData1.AppColor
    delete objData1.ContactNo
    delete objData1.PersonalHelpline
    delete objData1.PrefferedSurveys
    delete objData1.PrefferedCognitions
    objData1.AppColor = Decrypt(appColor)
    objData1.ContactNo = Decrypt(ContactNo)
    objData1.PersonalHelpline = Decrypt(PersonalHelpline)
    objData1.PrefferedSurveys = Decrypt(PrefferedSurveys)
    objData1.PrefferedCognitions = Decrypt(PrefferedCognitions)
    objData = objData1
  }
  return res.status(200).json({
    Data: objData,
    ErrorCode: 0,
    ErrorMessage: "User Setting Details",
  } as APIResponse)
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
  const requestData: APIRequest = req.body
  const UserID: any = requestData.UserId
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

  if (Type == 1) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = await SQL!
      .request()
      .query(
        "INSERT into UserFavouriteSurveys (UserID, SurveyID, FavType) VALUES (" +
          UserID +
          "," +
          requestData.CTestID +
          "," +
          requestData.FavType +
          ") "
      )
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = await SQL!
      .request()
      .query(
        "INSERT into UserFavouriteCTests (UserID, CTestID, FavType) VALUES (" +
          UserID +
          "," +
          requestData.CTestID +
          "," +
          requestData.FavType +
          ") "
      )
  }
  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "User CTests Favourite Saved.",
  } as APIResponse)
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
  const result = await SQL!
    .request()
    .query(
      "SELECT TipText FROM Tips WHERE IsDeleted = 0 AND AdminID IN (SELECT AdminID FROM Users WHERE UserID = " +
        UserID +
        ");"
    )
  if (result.recordset.length >= 0 && result.recordset[0] != null) {
    resultData = result.recordset[0].TipText
  }
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
  const result = await SQL!
    .request()
    .query(
      "SELECT BlogTitle, BlogText, Content, ImageURL FROM Blogs WHERE IsDeleted = 0 AND AdminID IN (SELECT AdminID FROM Users WHERE UserID = " +
        UserID +
        ");"
    )
  if (result.recordset.length >= 0) {
    const resultData = result.recordset
    for (let k = 0; k < result.recordset.length; k++) {
      objData[k] = {
        BlogTitle: resultData[k].BlogTitle,
        Content: resultData[k].Content,
        ImageURL: `https://s3.us-east-2.amazonaws.com/${AWSBucketName}/BlogImages/${Decrypt(resultData[k].ImageURL)}`,
        BlogText: resultData[k].BlogText,
      }
    }
  }
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
  const resultQuery = await SQL!
    .request()
    .query(
      "SELECT AdminID, BlogsViewedOn, TipsViewedOn FROM Users as u_s JOIN UserSettings as us_s " +
        "ON u_s.UserID = us_s.UserID WHERE u_s.IsDeleted = 0 AND u_s.UserID = " +
        UserID
    )
  if (resultQuery.recordset.length > 0) {
    const AdminID = resultQuery.recordset[0].AdminID
    const BlogsViewedOn = resultQuery.recordset[0].BlogsViewedOn
    const TipsViewedOn = resultQuery.recordset[0].TipsViewedOn
    // Blog Checking
    const blogQuery = await SQL!
      .request()
      .query("SELECT CreatedOn, EditedOn FROM Blogs WHERE IsDeleted = 0 AND AdminID = " + AdminID)
    if (blogQuery.recordset.length > 0) {
      for (let i = 0; i < blogQuery.recordset.length; i++) {
        if (blogQuery.recordset[i].CreatedOn !== null && blogQuery.recordset[i].EditedOn !== null) {
          if (BlogsViewedOn < blogQuery.recordset[i].CreatedOn || BlogsViewedOn < blogQuery.recordset[i].EditedOn) {
            BlogsUpdate = true
            break
          }
        }
      }
    }
    // Tips Checking
    const tipsQuery = await SQL!
      .request()
      .query("SELECT CreatedOn, EditedOn FROM Tips WHERE IsDeleted = 0 AND AdminID = " + AdminID)
    if (tipsQuery.recordset.length > 0) {
      for (let i = 0; i < tipsQuery.recordset.length; i++) {
        if (tipsQuery.recordset[i].CreatedOn !== null && tipsQuery.recordset[i].EditedOn !== null) {
          if (TipsViewedOn < tipsQuery.recordset[i].CreatedOn || TipsViewedOn < tipsQuery.recordset[i].EditedOn) {
            TipsUpdate = true
            break
          }
        }
      }
    }
  }
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
  const resultQuery = await SQL!.request().query("SELECT AdminID FROM Users WHERE IsDeleted = 0 AND UserID = " + UserID)
  if (resultQuery.recordset.length > 0) {
    const AdminID: number = resultQuery.recordset[0].AdminID

    // ReminderClearInterval
    const UserSettingsQuery: any = await SQL!
      .request()
      .query("SELECT [24By7ContactNo] ContactNo, PersonalHelpline FROM UserSettings WHERE UserID = " + UserID)
    ContactNo =
      UserSettingsQuery.recordset.length > 0
        ? UserSettingsQuery.recordset[0].ContactNo === null || UserSettingsQuery.recordset[0].ContactNo === ""
          ? ""
          : Decrypt(UserSettingsQuery.recordset[0].ContactNo)
        : ""
    PersonalHelpline =
      UserSettingsQuery.recordset.length > 0
        ? UserSettingsQuery.recordset[0].PersonalHelpline === null ||
          UserSettingsQuery.recordset[0].PersonalHelpline === ""
          ? ""
          : Decrypt(UserSettingsQuery.recordset[0].PersonalHelpline)
        : ""

    // ReminderClearInterval
    const AdminSettingsQuery: any = await SQL!
      .request()
      .query("SELECT ReminderClearInterval FROM Admin_Settings WHERE AdminID = " + AdminID)
    ReminderClearInterval =
      AdminSettingsQuery.recordset.length > 0
        ? AdminSettingsQuery.recordset[0].ReminderClearInterval !== null
          ? parseInt(AdminSettingsQuery.recordset[0].ReminderClearInterval)
          : 1
        : 1

    // JewelsTrailsASettings
    const JewelsASettingQuery: any = await SQL!
      .request()
      .query(
        "SELECT NoOfSeconds_Beg, NoOfSeconds_Int, NoOfSeconds_Adv, NoOfSeconds_Exp, NoOfDiamonds, NoOfShapes, NoOfBonusPoints, X_NoOfChangesInLevel, X_NoOfDiamonds, Y_NoOfChangesInLevel, Y_NoOfShapes FROM Admin_JewelsTrailsASettings WHERE AdminID = " +
          AdminID
      )
    JewelsTrailsASettings =
      JewelsASettingQuery.recordset.length > 0
        ? JewelsASettingQuery.recordset[0]
        : {
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

    // JewelsTrailsBSettings
    const JewelsBSettingQuery: any = await SQL!
      .request()
      .query(
        "SELECT NoOfSeconds_Beg, NoOfSeconds_Int, NoOfSeconds_Adv, NoOfSeconds_Exp, NoOfDiamonds, NoOfShapes, NoOfBonusPoints, X_NoOfChangesInLevel, X_NoOfDiamonds, Y_NoOfChangesInLevel, Y_NoOfShapes FROM Admin_JewelsTrailsBSettings WHERE AdminID = " +
          AdminID
      )
    JewelsTrailsBSettings =
      JewelsBSettingQuery.recordset.length > 0
        ? JewelsBSettingQuery.recordset[0]
        : {
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

    // CognitionOffList
    const CognitionOffListQuery: any = await SQL!
      .request()
      .query(
        "SELECT a_ct.AdminCTestSettingID, a_ct.Notification, a_ct.IconBlob, a_ct.Version, a_ct.AdminID, a_ct.CTestID, c_t.MaxVersions, c_t.CTestName, a_ct.Status FROM Admin_CTestSettings as a_ct JOIN CTest as c_t ON a_ct.CTestID = c_t.CTestID WHERE a_ct.AdminID = " +
          AdminID +
          " AND a_ct.Status = 1  AND c_t.IsDeleted = 0"
      )
    if (CognitionOffListQuery.recordset.length > 0) {
      const CognitionOffListArray: any = []
      let eachCognitionOffList: any
      let CognitionOffListArray_1: any
      for (let i = 0, n = CognitionOffListQuery.recordset.length; i < n; ++i) {
        eachCognitionOffList = CognitionOffListQuery.recordset[i]
        CognitionOffListArray_1 = {
          AdminCTestSettingID: parseInt(eachCognitionOffList.AdminCTestSettingID),
          AdminID: parseInt(eachCognitionOffList.AdminID),
          CTestID: parseInt(eachCognitionOffList.CTestID),
          CTestName: eachCognitionOffList.CTestName,
          Status: eachCognitionOffList.Status,
          Notification: eachCognitionOffList.Notification,
          IconBlob:
            eachCognitionOffList.IconBlob != null
              ? Buffer.from(eachCognitionOffList.IconBlob).toString("base64")
              : null,
          Version: eachCognitionOffList.Version,
          MaxVersion: eachCognitionOffList.MaxVersions,
        }
        CognitionOffListArray[i] = CognitionOffListArray_1
      }
      CognitionOffList = CognitionOffListArray
    }

    // CognitionIconList
    const CognitionIconListQuery: any = await SQL!
      .request()
      .query(
        "SELECT AdminCTestSettingID, AdminID, CTestID , IconBlob FROM Admin_CTestSettings WHERE AdminID = " + AdminID
      )
    if (CognitionIconListQuery.recordset.length > 0) {
      const CognitionIconListArray: any = []
      let eachCognitionIconList: any
      let CognitionIconListArray_1: any
      for (let i = 0, n = CognitionIconListQuery.recordset.length; i < n; ++i) {
        eachCognitionIconList = CognitionIconListQuery.recordset[i]
        CognitionIconListArray_1 = {
          AdminCTestSettingID: parseInt(eachCognitionIconList.AdminCTestSettingID),
          AdminID: parseInt(eachCognitionIconList.AdminID),
          CTestID: parseInt(eachCognitionIconList.CTestID),
          IconBlob:
            eachCognitionIconList.IconBlob != null
              ? Buffer.from(eachCognitionIconList.IconBlob).toString("base64")
              : null,
          IconBlobString:
            eachCognitionIconList.IconBlob != null
              ? Buffer.from(eachCognitionIconList.IconBlob).toString("base64")
              : null,
        }
        CognitionIconListArray[i] = CognitionIconListArray_1
      }
      CognitionIconList = CognitionIconListArray
    }

    // SurveyIconList
    const SurveyIconListQuery: any = await SQL!
      .request()
      .query("SELECT  AdminID, SurveyID , IconBlob FROM Survey WHERE AdminID = " + AdminID)
    if (SurveyIconListQuery.recordset.length > 0) {
      const SurveyIconListArray: any = []
      let eachSurveyIconList: any
      let SurveyIconListArray_1: any
      for (let i = 0, n = SurveyIconListQuery.recordset.length; i < n; ++i) {
        eachSurveyIconList = SurveyIconListQuery.recordset[i]
        SurveyIconListArray_1 = {
          SurveyID: parseInt(eachSurveyIconList.SurveyID),
          AdminID: parseInt(eachSurveyIconList.AdminID),
          IconBlob:
            eachSurveyIconList.IconBlob != null ? Buffer.from(eachSurveyIconList.IconBlob).toString("base64") : null,
          IconBlobString:
            eachSurveyIconList.IconBlob != null ? Buffer.from(eachSurveyIconList.IconBlob).toString("base64") : null,
        }
        SurveyIconListArray[i] = SurveyIconListArray_1
      }
      SurveyIconList = SurveyIconListArray
    }

    // CognitionVersionList
    const CognitionVersionListQuery: any = await SQL!
      .request()
      .query(
        "SELECT a_ct.CTestID, c_t.CTestName, a_ct.Version FROM Admin_CTestSettings as a_ct JOIN CTest as c_t ON a_ct.CTestID = c_t.CTestID WHERE a_ct.AdminID = " +
          AdminID +
          " AND a_ct.Version IS NOT NULL"
      )
    CognitionVersionList = CognitionVersionListQuery.recordset.length > 0 ? CognitionVersionListQuery.recordset[0] : []

    // ScheduleSurveyList
    const ScheduleSurveyListQuery: any = await SQL!
      .request()
      .input("p_UserID", UserID)
      .input("p_LastFetchedTS", requestData.LastUpdatedSurveyDate)
      .output("p_ErrID", sql.VarChar(10))
      .output("p_LastUpdatedTS", sql.DateTime)
      .execute("GetAdminSurveyScheduleByUserID_sp")
    const scheduleSurveyListOutput = ScheduleSurveyListQuery.output
    if (Object.keys(scheduleSurveyListOutput).length > 0) {
      const p_ErrID = scheduleSurveyListOutput.p_ErrID
      LastUpdatedSurveyDate =
        scheduleSurveyListOutput.p_LastUpdatedTS != null
          ? new Date(scheduleSurveyListOutput.p_LastUpdatedTS).toISOString().replace(/T/, " ").replace(/\..+/, "")
          : null
      if (p_ErrID == 0) {
        const scheduleSurvArray: any = []
        if (ScheduleSurveyListQuery.recordsets[0].length > 0) {
          let eachSchedule: any
          for (let i = 0, n = ScheduleSurveyListQuery.recordsets[0].length; i < n; ++i) {
            eachSchedule = ScheduleSurveyListQuery.recordsets[0][i]
            let eachslotTimeOptions: any
            const slotTimeArray: any = []
            for (let j = 0, n = ScheduleSurveyListQuery.recordsets[1].length; j < n; ++j) {
              eachslotTimeOptions = ScheduleSurveyListQuery.recordsets[1][j]
              if (eachSchedule.SurveyScheduleID == eachslotTimeOptions.ScheduleID) {
                slotTimeArray.push(
                  eachslotTimeOptions.Time != null
                    ? new Date(eachslotTimeOptions.Time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                    : null
                )
              }
            }
            scheduleSurvArray.push({
              SurveyScheduleID: parseInt(eachSchedule.SurveyScheduleID),
              SurveyName: eachSchedule.SurveyName,
              Time: eachSchedule.Time,
              SlotTime:
                eachSchedule.Time != null
                  ? new Date(eachSchedule.Time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                  : null,
              SurveyId: parseInt(eachSchedule.SurveyId),
              ScheduleDate: eachSchedule.ScheduleDate,
              RepeatID: parseInt(eachSchedule.RepeatID),
              IsDeleted: eachSchedule.IsDeleted,
              SlotTimeOptions: slotTimeArray,
            })
            if (
              eachSchedule.RepeatID == 5 ||
              eachSchedule.RepeatID == 6 ||
              eachSchedule.RepeatID == 7 ||
              eachSchedule.RepeatID == 8 ||
              eachSchedule.RepeatID == 9 ||
              eachSchedule.RepeatID == 10 ||
              eachSchedule.RepeatID == 12
            ) {
              scheduleSurvArray.ScheduleDate = eachSchedule.Time
            }
          }
          ScheduleSurveyList = scheduleSurvArray
        }
      } else {
        return res.status(500).json({
          ErrorCode: 2030,
          ErrorMessage: "An error occured on Store procedure `GetAdminSurveyScheduleByUserID_sp`.",
        } as APIResponse)
      }
    } else {
      return res.status(500).json({
        ErrorCode: 2030,
        ErrorMessage: "An error occured on Store procedure `GetAdminSurveyScheduleByUserID_sp`.",
      } as APIResponse)
    }

    // scheduleGameList
    const scheduleGameListQuery: any = await SQL!
      .request()
      .input("p_UserID", UserID)
      .input("p_LastFetchedTS", requestData.LastUpdatedGameDate)
      .output("p_ErrID", sql.VarChar(10))
      .output("p_LastUpdatedTS", sql.DateTime)
      .execute("GetAdminCTestScheduleByUserID_sp")
    const scheduleGameListOutput = scheduleGameListQuery.output
    if (Object.keys(scheduleGameListOutput).length > 0) {
      const p_ErrID = scheduleGameListOutput.p_ErrID
      LastUpdatedGameDate =
        scheduleGameListOutput.p_LastUpdatedTS != null
          ? new Date(scheduleGameListOutput.p_LastUpdatedTS).toISOString().replace(/T/, " ").replace(/\..+/, "")
          : null
      if (p_ErrID == 0) {
        const scheduleGameArray: any = []
        if (scheduleGameListQuery.recordsets[0].length > 0) {
          let eachScheduleGame: any
          for (let i = 0, n = scheduleGameListQuery.recordsets[0].length; i < n; ++i) {
            eachScheduleGame = scheduleGameListQuery.recordsets[0][i]
            let eachslotTimeOptions: any
            const slotTimeArray: any = []
            for (let j = 0, n = scheduleGameListQuery.recordsets[1].length; j < n; ++j) {
              eachslotTimeOptions = scheduleGameListQuery.recordsets[1][j]
              if (eachScheduleGame.GameScheduleID == eachslotTimeOptions.ScheduleID) {
                slotTimeArray.push(
                  eachslotTimeOptions.Time != null
                    ? new Date(eachslotTimeOptions.Time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                    : null
                )
              }
            }
            scheduleGameArray.push({
              CTestId: parseInt(eachScheduleGame.CTestId),
              CTestName: eachScheduleGame.CTestName,
              Version: eachScheduleGame.Version,
              GameType: eachScheduleGame.GameType,
              Time: eachScheduleGame.Time,
              SlotTime:
                eachScheduleGame.Time != null
                  ? new Date(eachScheduleGame.Time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                  : null,
              GameScheduleID: parseInt(eachScheduleGame.GameScheduleID),
              ScheduleDate: eachScheduleGame.ScheduleDate,
              RepeatID: parseInt(eachScheduleGame.RepeatID),
              IsDeleted: eachScheduleGame.IsDeleted,
              SlotTimeOptions: slotTimeArray,
            })
            if (
              (eachScheduleGame.CTestId == 1 || eachScheduleGame.CTestId == 14) &&
              eachScheduleGame.GameType != null
            ) {
              scheduleGameArray.CTestName = eachScheduleGame.CTestName.replace("n-", "")
            }
            if (
              eachScheduleGame.RepeatID == 5 ||
              eachScheduleGame.RepeatID == 6 ||
              eachScheduleGame.RepeatID == 7 ||
              eachScheduleGame.RepeatID == 8 ||
              eachScheduleGame.RepeatID == 9 ||
              eachScheduleGame.RepeatID == 10 ||
              eachScheduleGame.RepeatID == 12
            ) {
              scheduleGameArray.ScheduleDate = eachScheduleGame.Time
            }
          }
          ScheduleGameList = scheduleGameArray
        }
      } else {
        return res.status(500).json({
          ErrorCode: 2030,
          ErrorMessage: "An error occured on Store procedure `GetAdminCTestScheduleByUserID_sp`.",
        } as APIResponse)
      }
    } else {
      return res.status(500).json({
        ErrorCode: 2030,
        ErrorMessage: "An error occured on Store procedure `GetAdminCTestScheduleByUserID_sp`.",
      } as APIResponse)
    }

    // BatchScheduleList
    const batchScheduleListQuery: any = await SQL!
      .request()
      .input("p_UserID", UserID)
      .input("p_LastFetchedTS", requestData.LastFetchedBatchDate)
      .output("p_ErrID", sql.VarChar(10))
      .output("p_LastUpdatedTS", sql.DateTime)
      .execute("GetAdminBatchScheduleByUserID_sp")
    const batchScheduleListOutput = batchScheduleListQuery.output
    if (Object.keys(batchScheduleListOutput).length > 0) {
      const p_ErrID = batchScheduleListOutput.p_ErrID
      LastUpdatedBatchDate =
        batchScheduleListOutput.p_LastUpdatedTS != null
          ? new Date(batchScheduleListOutput.p_LastUpdatedTS).toISOString().replace(/T/, " ").replace(/\..+/, "")
          : null
      if (p_ErrID == 0) {
        const batchScheduleArray: any = []
        if (batchScheduleListQuery.recordsets[0].length > 0) {
          let eachBatchSchedule: any
          for (let i = 0, n = batchScheduleListQuery.recordsets[0].length; i < n; ++i) {
            eachBatchSchedule = batchScheduleListQuery.recordsets[0][i]
            let eachslotTimeOptions: any
            const slotTimeArray: any = []
            for (let j = 0, n = batchScheduleListQuery.recordsets[3].length; j < n; ++j) {
              eachslotTimeOptions = batchScheduleListQuery.recordsets[3][j]
              if (eachBatchSchedule.ScheduleID == eachslotTimeOptions.ScheduleID) {
                slotTimeArray.push(
                  eachslotTimeOptions.Time != null
                    ? new Date(eachslotTimeOptions.Time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                    : null
                )
              }
            }
            //BatchScheduleSurvey_CTest
            const batchScheduleCtestArray: any = []
            if (batchScheduleListQuery.recordsets[1].length > 0) {
              let eachBatchCTestSchedule: any
              Object.keys(batchScheduleListQuery.recordsets[1]).forEach(function (key) {
                eachBatchCTestSchedule = batchScheduleListQuery.recordsets[1][key]
                if (eachBatchSchedule.ScheduleID == eachBatchCTestSchedule.ScheduleID) {
                  batchScheduleCtestArray.push({
                    BatchScheduleId: parseInt(eachBatchCTestSchedule.ScheduleID),
                    Type: 2,
                    ID: parseInt(eachBatchCTestSchedule.CTestID),
                    Version: parseInt(eachBatchCTestSchedule.Version),
                    Order: parseInt(eachBatchCTestSchedule.Order),
                    GameType: parseInt(eachBatchCTestSchedule.GameType),
                  })
                }
              })
            }
            //BatchScheduleCustomTime
            const batchScheduleCustomTimeArray: any = []
            if (batchScheduleListQuery.recordsets[3].length > 0) {
              let eachBatchCustomTime: any
              Object.keys(batchScheduleListQuery.recordsets[3]).forEach(function (key) {
                eachBatchCustomTime = batchScheduleListQuery.recordsets[3][key]
                if (eachBatchSchedule.ScheduleID == eachBatchCustomTime.ScheduleID) {
                  batchScheduleCustomTimeArray.push({
                    BatchScheduleId: parseInt(eachBatchCustomTime.ScheduleID),
                    Time:
                      eachBatchCustomTime.Time != null
                        ? new Date(eachBatchCustomTime.Time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                        : null,
                  })
                }
              })
            } 
            batchScheduleArray.push({
              BatchScheduleId: parseInt(eachBatchSchedule.ScheduleID),
              BatchName: eachBatchSchedule.BatchName,
              ScheduleDate: eachBatchSchedule.ScheduleDate,
              Time: eachBatchSchedule.Time,
              SlotTime:
                eachBatchSchedule.Time != null
                  ? new Date(eachBatchSchedule.Time).toISOString().replace(/T/, " ").replace(/\..+/, "")
                  : null,
              RepeatId: parseInt(eachBatchSchedule.RepeatID),
              IsDeleted: eachBatchSchedule.IsDeleted,
              IconBlob:
                eachBatchSchedule.IconBlob != null ? Buffer.from(eachBatchSchedule.IconBlob).toString("base64") : null,
              IconBlobString:
                eachBatchSchedule.IconBlob != null ? Buffer.from(eachBatchSchedule.IconBlob).toString("base64") : null,
              SlotTimeOptions: slotTimeArray,
              BatchScheduleSurvey_CTest: batchScheduleCtestArray,
              BatchScheduleCustomTime: batchScheduleCustomTimeArray,
            })
            if (
              eachBatchSchedule.RepeatID == 5 ||
              eachBatchSchedule.RepeatID == 6 ||
              eachBatchSchedule.RepeatID == 7 ||
              eachBatchSchedule.RepeatID == 8 ||
              eachBatchSchedule.RepeatID == 9 ||
              eachBatchSchedule.RepeatID == 10 ||
              eachBatchSchedule.RepeatID == 12
            ) {
              batchScheduleArray.ScheduleDate = eachBatchSchedule.Time
            }
          }
          BatchScheduleList = batchScheduleArray
        }
      } else {
        return res.status(500).json({
          ErrorCode: 2030,
          ErrorMessage: "An error occured on Store procedure `GetAdminBatchScheduleByUserID_sp`.",
        } as APIResponse)
      }
    } else {
      return res.status(500).json({
        ErrorCode: 2030,
        ErrorMessage: "An error occured on Store procedure `GetAdminBatchScheduleByUserID_sp`.",
      } as APIResponse)
    }
  } else {
    return res.status(500).json({
      ErrorCode: 2030,
      ErrorMessage: "Specified User ID doesnot exists.",
    } as APIResponse)
  }
  return res.status(200).json({
    ContactNo,
    PersonalHelpline,
    JewelsTrailsASettings,
    JewelsTrailsBSettings,
    ReminderClearInterval,
    CognitionOffList,
    CognitionIconList,
    SurveyIconList,
    CognitionVersionList,
    ScheduleSurveyList,
    BatchScheduleList,
    ScheduleGameList,
    LastUpdatedSurveyDate,
    LastUpdatedGameDate,
    LastUpdatedBatchDate,
    ErrorCode: 0,
    ErrorMessage: "Survey And Game Schedule Detail.",
  } as APIResponse)
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
  const resultQuery = await SQL!.request().query("SELECT AdminID FROM Users WHERE IsDeleted = 0 AND UserID = " + UserID)
  if (resultQuery.recordset.length > 0) {
    const AdminID: number = resultQuery.recordset[0].AdminID
    const surveysQuery = await SQL!
      .request()
      .query(
        "SELECT a_cs.SurveyID SurveyId FROM Admin_CTestSurveySettings as a_cs JOIN Survey as s_y " +
          "ON a_cs.SurveyID = s_y.SurveyID WHERE s_y.IsDeleted = 0 " +
          " AND a_cs.AdminID = " +
          AdminID +
          " AND a_cs.CTestID = " +
          CTestId
      )
    if (surveysQuery.recordset.length > 0) {
      SurveysList = surveysQuery.recordset
    }
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
  const resultQuery2 = await SQL!.request().query(`
        SELECT 
            SurveyID, 
            SurveyName, 
            Instructions AS Instruction, 
            ISNULL(Language, 'en') AS LanguageCode, 
            IsDeleted, 
            (
                SELECT 
                    QuestionID AS QuestionId,
                    QuestionText,
                    (CASE 
                        WHEN AnswerType = 1 THEN 'LikertResponse'
                        WHEN AnswerType = 2 THEN 'ScrollWheels'
                        WHEN AnswerType = 3 THEN 'YesNO'
                        WHEN AnswerType = 4 THEN 'Clock'
                        WHEN AnswerType = 5 THEN 'Years'
                        WHEN AnswerType = 6 THEN 'Months'
                        WHEN AnswerType = 7 THEN 'Days'
                        WHEN AnswerType = 8 THEN 'Textbox' 
                    END) AS AnswerType,
                    IsDeleted,
                    (
                        SELECT 
                            OptionText
                        FROM SurveyQuestionOptions
                        WHERE SurveyQuestions.QuestionID = SurveyQuestionOptions.QuestionID
                        FOR JSON AUTO, INCLUDE_NULL_VALUES
                    ) AS QuestionOptions,
                    CAST(0 AS BIT) AS EnableCustomPopup,
                    Threshold AS ThresholdId,
                    Operator AS OperatorId,
                    Message AS CustomPopupMessage
                FROM SurveyQuestions
                WHERE Survey.SurveyID = SurveyQuestions.SurveyID
                FOR JSON AUTO, INCLUDE_NULL_VALUES
            ) AS Questions
        FROM Survey 
        WHERE IsDeleted = 0
        AND AdminID IN (
            SELECT 
                AdminID 
            FROM Users 
            WHERE IsDeleted = 0 
                AND UserID = ${UserID}
        )
        FOR JSON AUTO, INCLUDE_NULL_VALUES
    ;`)

  return res.status(200).json({
    ErrorCode: 0,
    ErrorMessage: "Get surveys detail.",
    Survey: resultQuery2.recordset.length > 0 ? resultQuery2.recordset[0] : [],
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
