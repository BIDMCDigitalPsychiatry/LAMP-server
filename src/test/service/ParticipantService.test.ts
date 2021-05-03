import { assert } from "console"
import request from "supertest"
import app from  "../../app"
import { Bootstrap } from "../../repository/Bootstrap"
import { createResearcher, deleteResearcher, getStudy, deleteStudy } from "../helpers"

describe("ParticipantService", () => {
  const username = "reseacher"
  const password = "new-password"
  let study_id: string | undefined

  beforeAll(async () => {
    await Bootstrap()
    await createResearcher(username, password)
    study_id = await getStudy(username)
  })

  afterAll(async () => {
    await deleteResearcher(username, password)
    await deleteStudy(username)
  })

  it("creates a participant when using a researcher credential", done => {
    request(app)
      .post(`/study/${study_id}/participant`)
      .set({"authorization": `${username}:${password}`})
      .expect(200, done)
  })

  it("throws an error when creating a participant without a credential", done => {
    request(app)
      .post(`/study/${study_id}/participant`)
      .expect(401)
      .then(response => {
        assert(response.body.error === "missing-credentials")
        done()
      })
      .catch(err => done(err))
  })
})
