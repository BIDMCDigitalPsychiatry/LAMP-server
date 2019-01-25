import secrets from './secrets'
import './controllers'
import { API, Unimplemented } from './utils'
import { OpenAPI, ExpressAPI } from './utils'
import express, { Request, Response, Router, Application } from 'express'
import bodyParser from 'body-parser'
import sql from 'mssql'
import net from 'net'
import crypto from 'crypto'
import fs from 'fs'
import http from 'http'
import https from 'https'

import _Docker from 'dockerode'
const Docker = new _Docker()

const info = {
	"title": "LAMP Platform",
	"description": "The LAMP Platform API.",
	"termsOfService": "http://psych.digital/lamp/terms/",
	"version": "0.1"
}

// Configure the base Express app and middleware.
export const app: Application = express()
app.set('json spaces', 2)
app.use(bodyParser.json())
app.use(require('cors')())
app.use(require('morgan')('combined'))

/**
 *
 */
export let SQL: sql.ConnectionPool | undefined

/**
 *
 */
export let Root = { id: 'root', password: secrets.auth.root }

/**
 * If the data could not be encrypted or is invalid, returns `undefined`.
 */
export const Encrypt = (data: string, mode: 'Rijndael' | 'AES256' = 'Rijndael'): string | undefined => {
	try {
		if (mode === 'Rijndael') {
			let cipher = crypto.createCipheriv('aes-256-ecb', secrets.auth.hipaa, '')
			return cipher.update(data, 'utf8', 'base64') + cipher.final('base64')
		} else if (mode === 'AES256') {
			let ivl = crypto.randomBytes(16)
			let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secrets.auth.oauth, 'hex'), ivl)
			return Buffer.concat([
				ivl,
				cipher.update(Buffer.from(data, 'utf16le')), 
				cipher.final()
			]).toString('base64')
		}
	} catch {}
	return undefined
}

/**
 * If the data could not be decrypted or is invalid, returns `undefined`.
 */
export const Decrypt = (data: string, mode: 'Rijndael' | 'AES256' = 'Rijndael'): string | undefined => {
	try {
		if (mode === 'Rijndael') {
			let cipher = crypto.createDecipheriv('aes-256-ecb', secrets.auth.hipaa, '')
			return cipher.update(data, 'base64', 'utf8') + cipher.final('utf8')
		} else if (mode === 'AES256') {
			let dat = Buffer.from(data, 'base64')
			let cipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secrets.auth.oauth, 'hex'), dat.slice(0, 16))
			return Buffer.concat([
				cipher.update(dat.slice(16)),
				cipher.final()
			]).toString('utf16le')
		}
	} catch {}
	return undefined
}

/**
 *
 */
export const Download = function(url: string) {
	return new Promise((resolve, reject) => {
	    const lib = url.startsWith('https') ? https : http
	    const request = lib.get(url, (response) => {
			if ((response.statusCode || 0) < 200 || (response.statusCode || 0) > 299)
				reject(new Error('' + response.statusCode))
			const body: Buffer[] = []
			response.on('data', (chunk) => body.push(Buffer.from(chunk)))
			response.on('end', () => resolve(Buffer.concat(body)))
	    });
	    request.on('error', (err) => reject(err))
	})
};


// Initialize and configure the application.
(async /* main */ () => {

	// Establish the API routes.
	const api = API.all()
	const defn = OpenAPI(api, info)
	ExpressAPI(api, app)
	app.get('/', (req, res) => res.json(defn))
	app.get('*', (req, res) => res.json(new Unimplemented()))

	// Establish the SQL connection.
	SQL = await new sql.ConnectionPool({
	    ...secrets.sql,
	    parseJSON: true,
	    options: { encrypt: true },
	    pool: {
	        min: 0, max: 10,
	        idleTimeoutMillis: 30000
	    }
	}).connect()

	// Begin listener on port 3000 and a TCP relay from 8080 to 3000.
	app.listen(3000, async () => {

		// Add a second listener on UNIX socket /var/run/lamp.sock.
		// This listener receives requests from local Docker containers.
		if (fs.existsSync('/var/run/lamp.sock'))
			fs.unlinkSync('/var/run/lamp.sock')
		process.on('SIGTERM', () => fs.unlinkSync('/var/run/lamp.sock'))
		app.listen('/var/run/lamp.sock')
	})
})()
