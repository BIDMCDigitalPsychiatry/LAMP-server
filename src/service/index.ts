import { Router } from 'express'

import { TypeService } from './TypeService'
import { CredentialService } from './CredentialService'
import { ResearcherService } from './ResearcherService'
import { StudyService } from './StudyService'
import { ParticipantService } from './ParticipantService'
import { ActivityService } from './ActivityService'
import { ActivitySpecService } from './ActivitySpecService'
import { ActivityEventService, ResultEventService } from './ActivityEventService'
import { SensorService } from './SensorService'
import { SensorSpecService } from './SensorSpecService'
import { SensorEventService } from './SensorEventService'

import jsonata from 'jsonata'
import { _verify } from '../service/Security'
import { ActivityEventRepository } from '../repository/ActivityEventRepository'
import { ActivityRepository } from '../repository/ActivityRepository'
import { CredentialRepository } from '../repository/CredentialRepository'
import { ParticipantRepository } from '../repository/ParticipantRepository'
import { SensorEventRepository } from '../repository/SensorEventRepository'
import { StudyRepository } from '../repository/StudyRepository'
import { TypeRepository } from '../repository/TypeRepository'
import { ResearcherRepository } from '../repository/ResearcherRepository'

const API = Router()
API.use(TypeService)
API.use(CredentialService)
API.use(ResearcherService)
API.use(StudyService)
API.use(ParticipantService)
API.use(ActivityService)
API.use(ActivitySpecService)
API.use(ActivityEventService)
API.use(ResultEventService) // FIXME: DEPRECATED
API.use(SensorService)
API.use(SensorSpecService)
API.use(SensorEventService)
API.post('/', async (req, res) => {
	try {
		jsonata(req.body ?? '').evaluate({}, {
			'ActivityEvent_all': async (participant_id: string, origin: string, from: number, to: number) => {
				participant_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_id)
				return await ActivityEventRepository._select(participant_id, origin, from, to)
			},
			'Activity_all': async () => {
				let _ = await _verify(req, res, ['parent'])
				return await ActivityRepository._select()
			},
			'Activity_view': async (participant_or_study_id: string) => {
				participant_or_study_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_or_study_id)
				return await ActivityRepository._select(participant_or_study_id)
			},
			'Credential_list': async (type_id: string) => {
				type_id = await _verify(req, res, ['self', 'parent'], type_id)
				return await CredentialRepository._select(type_id)
			},
			'Participant_all': async (study_id: string) => {
				study_id = await _verify(req, res, ['self', 'sibling', 'parent'], study_id)
				return await ParticipantRepository._select(study_id)
			},
			'Participant_view': async (participant_id: string) => {
				participant_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_id)
				return await ParticipantRepository._select(participant_id)
			},
			'Researcher_all': async () => {
				let _ = await _verify(req, res, [])
				return await ResearcherRepository._select()
			},
			'Researcher_view': async (researcher_id: string) => {
				researcher_id = await _verify(req, res, ['self', 'sibling', 'parent'], researcher_id)
				return await ResearcherRepository._select(researcher_id)
			},
			'SensorEvent_all': async (participant_id: string, origin: string, from: number, to: number) => {
				participant_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_id)
				return await SensorEventRepository._select(participant_id, origin, from, to)
			},
			'Study_all': async (researcher_id: string) => {
				researcher_id = await _verify(req, res, ['self', 'sibling', 'parent'], researcher_id)
				return await StudyRepository._select(researcher_id)
			},
			'Study_view': async (study_id: string) => {
				study_id = await _verify(req, res, ['self', 'sibling', 'parent'], study_id)
				return await StudyRepository._select(study_id)
			},
			'Type_parent': async (type_id: string) => {
				type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)
				return await TypeRepository._parent(type_id)
			},
			'Tags_list': async (type_id: string) => {
				return (<string[]>[]).concat(
					(await TypeRepository._list('a', <string>type_id)), 
					(await TypeRepository._list('b', <string>type_id)).map(x => 'dynamic/' + x)
				)
			},
			'Tags_view': async (type_id: string, attachment_key: string) => {
				type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)
				let x = null
				try { x = await TypeRepository._get('a', <string>type_id, attachment_key)
				} catch(e) {}
				return x
			}
		}, (err, output) => {
			if (err)
				 res.status(500).json({ error: err.message })
			else res.status(200).json(output)
		})
	} catch(e) {
		res.status(500).json({ error: e.message })
	}
})
export default API
