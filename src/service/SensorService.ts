import { Request, Response, Router } from 'express'
import { Sensor } from '../model/Sensor'
import { SensorRepository } from '../repository/SensorRepository'
import { SecurityContext, ActionContext, _verify } from './Security'

export const SensorService = Router()
