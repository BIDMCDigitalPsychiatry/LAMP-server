import { Request, Response, Router } from 'express'
import { SensorSpec } from '../model/SensorSpec'
import { SensorSpecRepository } from '../repository/SensorSpecRepository'
import { SecurityContext, ActionContext, _verify } from './Security'

export const SensorSpecService = Router()
SensorSpecService.post('/sensor_spec', async (req: Request, res: Response) => {
	try {
		let sensor_spec = req.body
		let _ = await _verify(req, res, ['self', 'sibling', 'parent'])
		res.json({ data: await SensorSpecRepository._insert(sensor_spec) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
SensorSpecService.put('/sensor_spec/:sensor_spec_name', async (req: Request, res: Response) => {
	try {
		let sensor_spec_name = req.params.sensor_spec_name
		let sensor_spec = req.body
		let _ = await _verify(req, res, ['self', 'sibling', 'parent'])
		res.json({ data: await SensorSpecRepository._update(sensor_spec_name, sensor_spec) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
SensorSpecService.delete('/sensor_spec/:sensor_spec_name', async (req: Request, res: Response) => {
	try {
		let sensor_spec_name = req.params.sensor_spec_name
		let _ = await _verify(req, res, ['self', 'sibling', 'parent'])
		res.json({ data: await SensorSpecRepository._delete(sensor_spec_name) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
SensorSpecService.get('/sensor_spec/:sensor_spec_name', async (req: Request, res: Response) => {
	try {
		let sensor_spec_name = req.params.sensor_spec_name
		let _ = await _verify(req, res, ['self', 'sibling', 'parent'])
		res.json({ data: await SensorSpecRepository._select(sensor_spec_name) })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
SensorSpecService.get('/sensor_spec', async (req: Request, res: Response) => {
	try {
		let _ = await _verify(req, res, ['self', 'sibling', 'parent'])
		res.json({ data: await SensorSpecRepository._select() })
	} catch(e) {
		res.status(parseInt(e.message.split('.')[0]) || 500).json({ error: e.message })
	}
})
