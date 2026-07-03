import { Response, Request } from "express";
import { keyBy, map, merge, values } from "lodash";
import { Part, PresignedUrlInfoWithExpiration } from "../service/VideoUploadService";
import {
  AbortBody,
  CompleteBody,
  CompleteResponse,
  InitiateBody,
  initiateResponseSchema,
  InitiateResponse,
  ParticipantParams,
  RefreshUrlsBody,
  refreshUrlsResponseSchema,
  RefreshUrlsResponse,
} from "../schemas/fileUpload";
import { sendValidatedJson } from "../utils/validatedResponse";

//-----------------------------------------------------------------------------
// Controller - Interface
//-----------------------------------------------------------------------------

export interface VideoUploadController {
  abort(req: Request, resp: Response): Promise<void> // 204, no body
  complete(req: Request, resp: Response<CompleteResponse>): Promise<void>
  initiate(req: Request, resp: Response<InitiateResponse>): Promise<void>
  refreshUrls(req: Request, resp: Response<RefreshUrlsResponse>): Promise<void>
}

//-----------------------------------------------------------------------------
// Controller - Implementation
//-----------------------------------------------------------------------------
//
// Request shapes are validated at the router boundary by the `validate`
// middleware (see VideoUploadRouter). Handlers read the already-parsed,
// typed data from `req.validated.*`.

export class VideoUploadControllerImpl implements VideoUploadController {

  async abort(req: Request, resp: Response): Promise<void> {
    const { id } = req.validated.body as AbortBody

    await req.context.services.videoUploadService.abort(id)

    resp.sendStatus(204)
  }

  async complete(req: Request, resp: Response<CompleteResponse>): Promise<void> {
    const { id, parts } = req.validated.body as CompleteBody

    await req.context.services.videoUploadService.complete(id, parts)

    resp.status(202).json({})
  }

  async initiate(req: Request, resp: Response<InitiateResponse>): Promise<void> {
    const { participantId } = req.validated.params as ParticipantParams
    const { metadata } = req.validated.body as InitiateBody
    const fileSizeBytes = metadata.size

    const parent = (await req.context.repository.getTypeRepository()._parent(participantId)) as any
    
    const id = await req.context.services.videoUploadService.initiate({
      LAMP_PARTICIPANT_ID: participantId,
      FILE_SIZE_BYTES: String(fileSizeBytes), // S3 object metadata values must be strings
      LAMP_RESEARCHER_ID: parent["Researcher"],
      LAMP_STUDY_ID: parent["Study"]
    })

    const partRanges : Part[] = req.context.services.videoUploadService.calculatePartRanges(fileSizeBytes)
    const partUrls : PresignedUrlInfoWithExpiration[] = await req.context.services.videoUploadService.getUploadUrlParts(id, map(partRanges, "partNumber"))

    const parts = values(
      merge(
        keyBy(partRanges, "partNumber"),
        keyBy(partUrls,   "partNumber")
      )
    )

    sendValidatedJson(resp, initiateResponseSchema, { id, parts })
  }

  async refreshUrls(req: Request, resp: Response<RefreshUrlsResponse>): Promise<void> {
    const { id, partNumbers } = req.validated.body as RefreshUrlsBody
    
    const partUrls : PresignedUrlInfoWithExpiration[] = await req.context.services.videoUploadService.getUploadUrlParts(id, partNumbers)

    sendValidatedJson(resp, refreshUrlsResponseSchema, { id, parts: partUrls })
  }
}
