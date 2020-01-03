import { Request, Response, Router } from 'express'
import { DynamicAttachment } from '../model/Type'
import { TypeRepository } from '../repository/TypeRepository'
import { SecurityContext, ActionContext, _verify } from './Security'

export const TypeService = Router()
TypeService.get('/type/:type_id/parent', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)
		res.json({ data: await TypeRepository._parent(type_id) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
TypeService.get('/type/:type_id/attachment', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)
		res.json({ data: (<string[]>[]).concat(
			(await TypeRepository._list('a', <string>type_id)), 
			(await TypeRepository._list('b', <string>type_id)).map(x => 'dynamic/' + x)
		)})
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
TypeService.get('/type/:type_id/attachment/:attachment_key', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)
		let attachment_key = req.params.attachment_key
		res.json({ data: await TypeRepository._get('a', <string>type_id, attachment_key) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
TypeService.put('/type/:type_id/attachment/:attachment_key/:target', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		let attachment_key = req.params.attachment_key
		let target = req.params.target
		let attachment_value = req.body
		type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)
		res.json({ data: await TypeRepository._set('a', target, <string>type_id, attachment_key, attachment_value) ? {} : null /* error */ })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
TypeService.get('/type/:type_id/attachment/dynamic/:attachment_key', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		let attachment_key = req.params.attachment_key
		let invoke_always = req.query.invoke_always
		let ignore_output = req.query.ignore_output
		let include_logs = req.query.include_logs
		type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)

		let result: any = {}
		if (!!invoke_always) {

			// If needed, invoke the attachment now.
			let attachment: DynamicAttachment = await TypeRepository._get('b', <string>type_id, attachment_key)
		    result = await TypeRepository._invoke(attachment, {})
			await TypeRepository._set('a', attachment.to!, <string>attachment.from, attachment.key + '/output', result)
		} else {

			// Otherwise, return any cached result available.
			result = await TypeRepository._get('a', <string>type_id, attachment_key + '/output')
		}
		res.json({ data: (!!include_logs && !ignore_output) ? result : {
			data: !ignore_output ? result.output : undefined,
			logs: !!include_logs ? result.logs : undefined
		}})
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
TypeService.put('/type/:type_id/attachment/dynamic/:attachment_key/:target', async (req: Request, res: Response) => {
	try {
		let type_id = req.params.type_id
		let attachment_key = req.params.attachment_key
		let target = req.params.target
		let attachment_value = req.body
		let invoke_once = req.query.invoke_once
		type_id = await _verify(req, res, ['self', 'sibling', 'parent'], type_id)

		let result: any = null /* error */
		if (TypeRepository._set('b', target, <string>type_id, attachment_key, attachment_value)) {

			// If needed, invoke the attachment now.
			if (!!invoke_once) {
			    TypeRepository._invoke(attachment_value, {}).then(y => {
					TypeRepository._set('a', target, <string>type_id, attachment_key + '/output', y)
				})
			}
			result = {}
		}
		res.json({ data: result })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
