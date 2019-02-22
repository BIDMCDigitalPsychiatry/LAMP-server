import { API, Ownership, AuthorizationFailed, Identifier } from './OpenAPI'
import { Request, Response, Router, Application } from 'express'
import * as OA from 'openapi3-ts'

// FIXME!
import { SQL, Encrypt, Decrypt } from '../app'
import { Type, Participant, Researcher } from '../controllers'

/**
 * Create routers for each individual schema.
 */
export function ExpressAPI(api: API.Schema[], app: Application, rootPassword: string = '') {
	console.group('Configuring Express routes...')
	for (let component of api) {
		if (component.routes.length == 0) continue

		const router = Router()
		for (let route of component.routes) {
			let route_path = route.path.replace(/{([\w_]+)}/g, (_, p) => `:${p}`).replace('*', '')
			console.log(`[${component.name}::${route.name} => ${route.method} ${route_path}]`)

			// Select the correct Router function and configure router parameters.
			let method: typeof router.all = (router as any)[route.method.toLowerCase()].bind(router)
			method(route_path, async (req, res) => {
				try {

					// Extract the method and its declared parameters.
					let method = (component.object as any)[route.name || '']
					let args = route.input.map(x => {
						switch(x.location) {
							case API.Location.Path: 
							return req.params[x.name!]
							case API.Location.Query: 
							return req.query[x.name!]
							case API.Location.Body: 
							return !!x.name ? req.body[x.name!] : req.body
							case API.Location.Header: 
							return req.get(x.name!)
							case API.Location.Cookie: 
							return req.cookies[x.name!]
							case API.Location.Session: 
							return null /* FIXME */
							case API.Location.None: default: 
							return null
						}
					})

					// Authentication & Authorization:
					if (route.authorization !== null) {

						// Get the authorization components from the header and tokenize them.
						// TODO: ignoring the other authorization location stuff for now...
						let auth = (<string>req.get('Authorization')).replace('Basic', '').trim().split(':')

						// Find the value of the parameter that needs authentication.
						let param_idx = route.input.map(x => x.name!).indexOf(route.authorization.parameter)
						let auth_value = param_idx >= 0 ? args[param_idx] : undefined

						// Handle basic no credentials and root auth required cases.
						if (!auth_value && !(auth[0] === 'root' && auth[1] === rootPassword)) {
							throw new AuthorizationFailed()
						} else if (auth[0] === 'root' && auth[1] !== rootPassword) {
							throw new AuthorizationFailed()
						} else if (!(auth[0] === 'root' && auth[1] === rootPassword)) {
							let from = auth[0], to = auth_value




							// FIXME: This must be moved into Type/Credential and available for all types (!!!)
							/* FIXME */
							if (Type._self_type(from) === 'Participant') {

							    // Authenticate as a Participant.
					    		let result = (await SQL!.request().query(`
						            SELECT Password 
						            FROM Users
						            WHERE isDeleted = 0 AND StudyId = '${Encrypt(from)}';
								`)).recordset
					    		if (result.length === 0 || (Decrypt(result[0]['Password'], 'AES256') !== auth[1]))
									throw new AuthorizationFailed()

								/* [FIXME: EXPECTING AN EMAIL HERE?] */
							} else if (from.match(/^[^@]+@[^@]+\.[^@]+$/) /*|| Type._self_type(from) === 'Researcher'*/) { 

							    // Authenticate as a Researcher. 
					    		let result = (await SQL!.request().query(`
						            SELECT AdminID, Password 
						            FROM Admin
						            WHERE IsDeleted = 0 AND Email = '${Encrypt(from)}';
								`)).recordset
					    		if (result.length === 0 || (Decrypt(result[0]['Password'], 'AES256') !== auth[1]))
									throw new AuthorizationFailed()

								// FIXME: 
								from = <string>Researcher._pack_id({ admin_id: result[0]['AdminID'] })
							}
							/* FIXME */





							// Patch in the special-cased "me" to the actual authenticated credential.
							if(to === 'me')
								args[param_idx] = to = auth[0]

							// Handle whether we require the parameter to be [[[self], a sibling], or a parent].
							if (
								/* Check if `to` and `from` are the same object. */
								(route.authorization.requirement & Ownership.Self && 
								 from !== to) && 

								/* FIXME: Check if the immediate parent type of `to` is found in `from`'s inheritance tree. */
								(route.authorization.requirement & Ownership.Sibling &&
								 Type._parent_type(from).indexOf(Type._parent_type(to)[0]) < 0) &&

								/* Check if `from` is actually the parent ID of `to` matching the same type as `from`. */
								(route.authorization.requirement & Ownership.Parent &&
								 from !== await Type._parent_id(to, Type._self_type(from)))
							) {
								/* We've given the authorization enough chances... */
								throw new AuthorizationFailed()
							}
						}
					}

					// Invoke actual method with expanded arguments.
					let result = await method(...args)
					res.status(route.status).json({ data: result})
				} catch(e) {
					console.error(e)

					// Catch declared exceptions or throw a 500 error.
					let match = route.throws.find(x => e.constructor == x.object)
					res.status(!!match ? match.status : 500).json(e)
				}
			})
		}
		app.use(router)
	}
	console.groupEnd()
}

/**
 * Set up all compile-time and runtime schema data.
 */
export function OpenAPI(api: API.Schema[], info: OA.InfoObject) {
	console.group('Configuring OpenAPI definition...')

	// 
	let definition: OA.OpenAPIObject = {
		openapi: "3.0.0", 
		info: info,
		paths: {},
		components: {
			schemas: {}
		}
	}

	for (let component of api) {

		// Configure the schema properties.
		definition.components!.schemas![component.name!] = {
			type: 'object',
			description: component.description,
			properties: component.properties.reduce((all: any, prop) => {
				all[prop.name!] = { 
					description: prop.description,
					...JSON_builtin(prop.object!)
				}; return all
			}, {})
		}

		// FIXME. Add the custom `Error` type and fix others.
		definition.components!.schemas!['Error'] = {
			type: 'object', 
			properties: { 
				error: { type: 'string' } 
			}
		}
		definition.components!.schemas!['Timestamp'] = {
			...definition.components!.schemas!['Timestamp'],
			type: 'number',
			format: 'int64',
			properties: undefined
		}
		definition.components!.schemas!['Identifier'] = {
			...definition.components!.schemas!['Identifier'],
			type: 'string',
			properties: undefined
		}

		// Configure the schema (controller)'s routes.
		for (let route of component.routes) {
			let bodyItems = route.input.filter(x => x.location === API.Location.Body)
			let otherItems = route.input.filter(x => x.location !== API.Location.Body)

			// If a path item doesn't already exist, make it.
			let match = Object.keys(definition.paths).find(x => x === route.path)
			if (!match)
				definition.paths[route.path] = <OA.PathItemObject>{};

			// Now add the operation to it.
			definition.paths[route.path][route.method.toLowerCase()] = <OA.OperationObject>{
				operationId: `${component.name}::${route.name}`,
				description: route.description,
				tags: [component.name],
				parameters: otherItems.map(x => (<OA.ParameterObject>{
					name: x.name,
					in: x.location,
					required: true, /* FIXME! */
					schema: JSON_builtin(x.object!)
				})),
				requestBody: bodyItems.length === 0 ? undefined : {
					required: true, /* FIXME */
					content: {
						'application/json': {
							schema: bodyItems.filter(x => !x.name).length === 0 ? {
								type: 'object',
								properties: bodyItems.reduce((all: any, prop) => {
									all[prop.name!] = { 
										...JSON_builtin(prop.object!),
										description: prop.description
									}; return all
								}, {})
							} : (['Object', 'Function'].indexOf((<any>bodyItems[0].object)[0].name) >= 0 ? {
								type: 'object'
							} : {
								$ref: `#/components/schemas/${(<any>bodyItems[0].object)[0].name}`
							})
						}
					}
				},
				responses: route.throws.reduce((all, exc) => {
					(<any>all)[exc.status] = <OA.ResponseObject>{
						description: exc.description || (<any>exc.object).name,
						content: {
							'application/json': {
								schema: <OA.SchemaObject>{
									$ref: '#/components/schemas/Error'
								}
							}
						}
					}; return all
				}, {
					'200': {
						description: 'Success',
						content: {
							'application/json': {
								schema: JSON_builtin(route.output.object!)
							}
						}
					}
				}),
				security: !route.authorization ? [] : [[route.authorization.parameter].reduce((x: any) => {
					x[route.authorization!.name!] = []; return x
				}, {})]
			}
		}

		// Configure security schemes.
		definition.components!.securitySchemes = component.routes
			.map(x => x.authorization)
			.filter(x => !!x)
			.reduce((all: any, auth) => {
				all[auth!.name!] = {
					type: 'apiKey',
					name: auth!.name!,
					in: auth!.location
				}; return all
			}, {})
	}

	console.groupEnd()
	return definition
}

// List all builtins provided by JSON.
function JSON_builtin(func: Function): OA.SchemaObject | OA.ReferenceObject {
	const _builtins: any = {
		Boolean: {
			type: 'boolean'
		},
		UInt8: {
			type: 'integer',
			format: 'uint8'
		},
		UInt16: {
			type: 'integer',
			format: 'uint16'
		},
		UInt32: {
			type: 'integer',
			format: 'uint32'
		},
		UInt64: {
			type: 'integer',
			format: 'uint64'
		},
		Int8: {
			type: 'integer',
			format: 'int8'
		},
		Int16: {
			type: 'integer',
			format: 'int16'
		},
		Int32: {
			type: 'integer',
			format: 'int32'
		},
		Int64: {
			type: 'integer',
			format: 'int64'
		},
		Float: {
			type: 'number',
			format: 'float'
		},
		Double: {
			type: 'number',
			format: 'double'
		},
		Number: {
			type: 'number'
		},
		String: {
			type: 'string'
		},
		Array: { 
			type: 'array',
			items: {}
		},
		Object: { /* Any? */
			type: 'object'
		}
	}
	let name = ((<any>func)[0] || {}).name
	name = (name === 'Function') ? 'Object' : name
	let match = Object.entries(_builtins).find(y => y[0] === name)
	return !!match ? match[1] : { $ref: `#/components/schemas/${name}` }
}
