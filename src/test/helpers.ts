import { Repository } from "../repository/Bootstrap"

export const accessKeyToId = async (access_key: string, secret_key?: string) => {
  const ResearcherRepository = new Repository().getResearcherRepository()
  const CredentialRepository = new Repository().getCredentialRepository()
  let researcher_id

  // Find the credential associated with the researcher
  try {
    researcher_id = await CredentialRepository._find(access_key, secret_key)
  } catch (e) {
    return undefined
  }

  // Make sure the researcher still exists in the DB
  const researchers = await ResearcherRepository._select(researcher_id)
  if (researchers.length >= 1) {
    return researcher_id
  }

  return undefined
}

export const createResearcher = async (access_key: string, secret_key: string) => {
  const ResearcherRepository = new Repository().getResearcherRepository()
  const CredentialRepository = new Repository().getCredentialRepository()

  // If a researcher already exists, return that
  let researcher_id = await accessKeyToId(access_key, secret_key)
  if (researcher_id) {
    return researcher_id
  }

  // Create a new reseacher account and associated credential
  researcher_id = await ResearcherRepository._insert({ name: access_key })
  await CredentialRepository._insert(researcher_id, {
    origin: "me",
    access_key, 
    secret_key,
    description: "test credentials"
  })

  return researcher_id
}

export const deleteResearcher = async (access_key: string, secret_key: string) => {
  const ResearcherRepository = new Repository().getResearcherRepository()
  const CredentialRepository = new Repository().getCredentialRepository()

  const credential = await CredentialRepository._find(access_key, secret_key)
  if (credential !== '403.no-such-credentials') {
    throw new Error('Nothing to delete')
  }

  await ResearcherRepository._delete(credential)
  await CredentialRepository._delete(credential, access_key)
}

export const getStudy = async (access_key: string) => {
  const StudyRepository = new Repository().getStudyRepository()

  const researcher_id = await accessKeyToId(access_key)
  if (!researcher_id) {
    throw new Error('Unknown researcher')
  }

  const studies = await StudyRepository._select(researcher_id, true)
  if (studies.length <= 0) {
    throw new Error('No study found')
  }

  return studies[0].id
}

export const deleteStudy = async (access_key: string) => {
  const StudyRepository = new Repository().getStudyRepository()

  const researcher_id = await accessKeyToId(access_key)
  if (!researcher_id) {
    throw new Error('Unknown researcher')
  }

  const study = await getStudy(access_key)
  if (!study) {
    throw new Error('No study found')
  }

  await StudyRepository._delete(study)
}
