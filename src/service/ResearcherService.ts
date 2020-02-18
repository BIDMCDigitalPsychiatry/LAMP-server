import { Request, Response, Router } from 'express'
import { Researcher } from '../model/Researcher'
import { ResearcherRepository } from '../repository/ResearcherRepository'
import { SecurityContext, ActionContext, _verify } from './Security'
import jsonata from 'jsonata'

export const ResearcherService = Router()
ResearcherService.post('/researcher', async (req: Request, res: Response) => {
	try {
		let researcher = req.body
		let _ = await _verify(req, res, [])
		let output = { data: await ResearcherRepository._insert(researcher) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ResearcherService.put('/researcher/:researcher_id', async (req: Request, res: Response) => {
	try {
		let researcher_id = req.params.researcher_id
		let researcher = req.body
		researcher_id = await _verify(req, res, ['self', 'sibling', 'parent'], researcher_id)
		let output = { data: await ResearcherRepository._update(researcher_id, researcher) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ResearcherService.delete('/researcher/:researcher_id', async (req: Request, res: Response) => {
	try {
		let researcher_id = req.params.researcher_id
		researcher_id = await _verify(req, res, ['self', 'sibling', 'parent'], researcher_id)
		let output = { data: await ResearcherRepository._delete(researcher_id) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ResearcherService.get('/researcher/:researcher_id', async (req: Request, res: Response) => {
	try {
		let researcher_id = req.params.researcher_id
		researcher_id = await _verify(req, res, ['self', 'sibling', 'parent'], researcher_id)
		let output = { data: await ResearcherRepository._select(researcher_id) }
		output = typeof req.query.transform === 'string' ? jsonata(req.query.transform).evaluate(output) : output
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ResearcherService.get('/researcher', async (req: Request, res: Response) => {
	try {
		let _ = await _verify(req, res, [])
		let output = { data: await ResearcherRepository._select() }
		output = typeof req.query.transform === 'string' ? jsonata(req.query.transform).evaluate(output) : output
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
