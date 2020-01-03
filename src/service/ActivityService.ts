import { Request, Response, Router } from 'express'
import { Activity } from '../model/Activity'
import { ActivityRepository } from '../repository/ActivityRepository'
import { SecurityContext, ActionContext, _verify } from './Security'

export const ActivityService = Router()
ActivityService.post('/study/:study_id/activity', async (req: Request, res: Response) => {
	try {
		let study_id = req.params.study_id
		let activity = req.body
		study_id = await _verify(req, res, ['self', 'sibling', 'parent'], study_id)
		res.json({ data: await ActivityRepository._insert(study_id, activity) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivityService.put('/activity/:activity_id', async (req: Request, res: Response) => {
	try {
		let activity_id = req.params.activity_id
		let activity = req.body
		activity_id = await _verify(req, res, ['self', 'sibling', 'parent'], activity_id)
		res.json({ data: await ActivityRepository._update(activity_id, activity) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivityService.delete('/activity/:activity_id', async (req: Request, res: Response) => {
	try {
		let activity_id = req.params.activity_id
		activity_id = await _verify(req, res, ['self', 'sibling', 'parent'], activity_id)
		res.json({ data: await ActivityRepository._delete(activity_id) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivityService.get('/activity/:activity_id', async (req: Request, res: Response) => {
	try {
		let activity_id = req.params.activity_id
		activity_id = await _verify(req, res, ['self', 'sibling', 'parent'], activity_id)
		res.json({ data: await ActivityRepository._select(activity_id) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivityService.get('/participant/:participant_id/activity', async (req: Request, res: Response) => {
	try {
		let participant_id = req.params.participant_id
		participant_id = await _verify(req, res, ['self', 'sibling', 'parent'], participant_id)
		res.json({ data: await ActivityRepository._select(participant_id) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivityService.get('/study/:study_id/activity', async (req: Request, res: Response) => {
	try {
		let study_id = req.params.study_id
		study_id = await _verify(req, res, ['self', 'sibling', 'parent'], study_id)
		res.json({ data: await ActivityRepository._select(study_id) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivityService.get('/researcher/:researcher_id/activity', async (req: Request, res: Response) => {
	try {
		let researcher_id = req.params.researcher_id
		researcher_id = await _verify(req, res, ['self', 'sibling', 'parent'], researcher_id)
		res.json({ data: await ActivityRepository._select(researcher_id) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivityService.get('/activity', async (req: Request, res: Response) => {
	try {
		let _ = await _verify(req, res, ['parent'])
		res.json({ data: await ActivityRepository._select() })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
