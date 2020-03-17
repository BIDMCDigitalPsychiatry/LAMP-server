import { Request, Response, Router } from 'express'
import { ActivitySpec } from '../model/ActivitySpec'
import { ActivitySpecRepository } from '../repository/ActivitySpecRepository'
import { SecurityContext, ActionContext, _verify } from './Security'
import jsonata from 'jsonata'

export const ActivitySpecService = Router()
ActivitySpecService.post('/activity_spec', async (req: Request, res: Response) => {
	try {
		let activity_spec = req.body
		let _ = await _verify(req.get('Authorization'), [])
		let output = { data: await ActivitySpecRepository._insert(activity_spec) }
		res.json(output)
	} catch(e) {
		if (e.message === '401.missing-credentials')
			res.set('WWW-Authenticate', `Basic realm="LAMP" charset="UTF-8"`)
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivitySpecService.put('/activity_spec/:activity_spec_name', async (req: Request, res: Response) => {
	try {
		let activity_spec_name = req.params.activity_spec_name
		let activity_spec = req.body
		let _ = await _verify(req.get('Authorization'), [])
		let output = { data: await ActivitySpecRepository._update(activity_spec_name, activity_spec) }
		res.json(output)
	} catch(e) {
		if (e.message === '401.missing-credentials')
			res.set('WWW-Authenticate', `Basic realm="LAMP" charset="UTF-8"`)
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivitySpecService.delete('/activity_spec/:activity_spec_name', async (req: Request, res: Response) => {
	try {
		let activity_spec_name = req.params.activity_spec_name
		let _ = await _verify(req.get('Authorization'), [])
		let output = { data: await ActivitySpecRepository._delete(activity_spec_name) }
		res.json(output)
	} catch(e) {
		if (e.message === '401.missing-credentials')
			res.set('WWW-Authenticate', `Basic realm="LAMP" charset="UTF-8"`)
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivitySpecService.get('/activity_spec/:activity_spec_name', async (req: Request, res: Response) => {
	try {
		let activity_spec_name = req.params.activity_spec_name
		let _ = await _verify(req.get('Authorization'), ['self', 'sibling', 'parent'])
		let output = { data: await ActivitySpecRepository._select(activity_spec_name) }
		output = typeof req.query.transform === 'string' ? jsonata(req.query.transform).evaluate(output) : output
		res.json(output)
	} catch(e) {
		if (e.message === '401.missing-credentials')
			res.set('WWW-Authenticate', `Basic realm="LAMP" charset="UTF-8"`)
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
ActivitySpecService.get('/activity_spec', async (req: Request, res: Response) => {
	try {
		let _ = await _verify(req.get('Authorization'), ['self', 'sibling', 'parent'])
		let output = { data: await ActivitySpecRepository._select() }
		output = typeof req.query.transform === 'string' ? jsonata(req.query.transform).evaluate(output) : output
		res.json(output)
	} catch(e) {
		if (e.message === '401.missing-credentials')
			res.set('WWW-Authenticate', `Basic realm="LAMP" charset="UTF-8"`)
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
