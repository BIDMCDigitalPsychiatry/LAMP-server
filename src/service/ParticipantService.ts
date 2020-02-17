import { Request, Response, Router } from 'express'
import { Participant } from '../model/Participant'
import { ParticipantRepository } from '../repository/ParticipantRepository'
import { SecurityContext, ActionContext, _verify } from './Security'

export const ParticipantService = Router()
ParticipantService.post('/study/:study_id/participant', async (req: Request, res: Response) => {
	try {
		let study_id = req.params.study_id
		let participant = req.body
		study_id = await _verify(req, res, ['self', 'sibling', 'parent'], study_id)
		let output = { data: await ParticipantRepository._insert(study_id, participant) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ParticipantService.put('/participant/:participant_id', async (req: Request, res: Response) => {
	try {
		let participant_id = req.params.participant_id
		let participant = req.body
		participant_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_id)
		let output = { data: await ParticipantRepository._update(participant_id, participant) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ParticipantService.delete('/participant/:participant_id', async (req: Request, res: Response) => {
	try {
		let participant_id = req.params.participant_id
		participant_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_id)
		let output = { data: await ParticipantRepository._delete(participant_id) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ParticipantService.get('/participant/:participant_id', async (req: Request, res: Response) => {
	try {
		let participant_id = req.params.participant_id
		participant_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_id)
		let output = { data: await ParticipantRepository._select(participant_id) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ParticipantService.get('/study/:study_id/participant', async (req: Request, res: Response) => {
	try {
		let study_id = req.params.study_id
		study_id = await _verify(req, res, ['self', 'sibling', 'parent'], study_id)
		let output = { data: await ParticipantRepository._select(study_id) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ParticipantService.get('/researcher/:researcher_id/participant', async (req: Request, res: Response) => {
	try {
		let researcher_id = req.params.researcher_id
		researcher_id = await _verify(req, res, ['self', 'sibling', 'parent'], researcher_id)
		let output = { data: await ParticipantRepository._select(researcher_id) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ParticipantService.get('/participant', async (req: Request, res: Response) => {
	try {
		let _ = await _verify(req, res, [])
		let output = { data: await ParticipantRepository._select() }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
