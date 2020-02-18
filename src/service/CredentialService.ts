import { Request, Response, Router } from 'express'
import { Credential } from '../model/Credential'
import { CredentialRepository } from '../repository/CredentialRepository'
import { SecurityContext, ActionContext, _verify } from './Security'
import jsonata from 'jsonata'

export const CredentialService = Router()
CredentialService.get('/type/:type_id/credential', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		type_id = await _verify(req, res, ['self', 'parent'], type_id)
		let output = { data: await CredentialRepository._select(type_id) }
		output = typeof req.query.transform === 'string' ? jsonata(req.query.transform).evaluate(output) : output
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
CredentialService.post('/type/:type_id/credential', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		let credential = req.body
		type_id = await _verify(req, res, ['self', 'parent'], type_id)
		let output = { data: await CredentialRepository._insert(type_id, credential) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
CredentialService.put('/type/:type_id/credential/:access_key', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		let access_key = req.params.access_key
		let credential = req.body
		type_id = await _verify(req, res, ['self', 'parent'], type_id)
		let output = { data: await CredentialRepository._update(type_id, access_key, credential) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
CredentialService.delete('/type/:type_id/credential/:access_key', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		let access_key = req.params.access_key
		type_id = await _verify(req, res, ['self', 'parent'], type_id)
		let output = { data: await CredentialRepository._delete(type_id, access_key) }
		res.json(output)
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
