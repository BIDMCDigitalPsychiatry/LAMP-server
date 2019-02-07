import 'reflect-metadata'

/* FIXME: Merge @Description into @Schema/Property. */
/* FIXME: @Min()/@Max() for Number/String/Array. */

/* TODO: Express HTML view rendering. */
/* TODO: Express multipart file upload. */
/* TODO: Express streaming downloads/attachment. */
/* TODO: Express TCP/WebSockets. */

/**
 * The `API` interfaces provide access to all OpenAPI-aware elements.
 * Use the decorators below instead to mark up classes, static methods,
 * properties, and parameters. `API.all()` will then be populated.
 */
export namespace API {

	/**
	 *
	 */
	export const enum HTTPMethod {

		/**
		 *
		 */
		GET = 'get',

		/**
		 *
		 */
		POST = 'post',

		/**
		 *
		 */
		PUT = 'put',

		/**
		 *
		 */
		PATCH = 'patch',

		/**
		 *
		 */
		DELETE = 'delete',

		/**
		 *
		 */
		OPTIONS = 'options',

		/**
		 *
		 */
		HEAD = 'head',
	}

	/**
	 * Modifies presentation visibility of properties in OpenAPI-aware schema.
	 */
	export const enum PresentMode {

		/**
		 * This property is always present in OpenAPI-aware facilities.
		 * Default.
		 */
	    Always    = 0 << 0,
			
		/**
		 * This property is only present when read from an OpenAPI-aware
		 * facility (such as an `HTTP GET`).
		 *
		 * Example: a runtime-generated or computed value not modifiable.
		 */
	    ReadOnly  = 1 << 2, /* no-write-bit=1 */
		
		/**
		 * This property is only present when written to an OpenAPI-aware
		 * facility (such as an `HTTP POST`).
		 * 
		 * Example: A password field not meant to be retrieved later.
		 */
	    WriteOnly = 1 << 1, /* no-read-bit=1 */
		
		/**
		 * This property is never present in OpenAPI-aware facilities. 
		 * This should typically not be used as it makes no sense.
		 */
	    Never     = ReadOnly | WriteOnly,
		
		/**
		 * The property is required to be always be present in either Read 
		 * or Write OpenAPI-aware facilities. 
		 * Default.
		 */
		Required  = 0 << 3,
			
		/**
		 * The property is not required to be present in either Read or
		 * Write OpenAPI-aware facilities.
		 */
		Optional  = 1 << 3,
			
		/**
		 * The property cannot be set to null in OpenAPI-aware facilities. 
		 * Default.
		 */
		Nonnull   = 0 << 4,
			
		/**
		 * The property may be set to null in OpenAPI-aware facilities.
		 */
		Nullable  = 1 << 4,
	}
	
	/**
	 * The location in the HTTP Request where a method parameter is found.
	 */
	export const enum Location {
			
		/**
		 * A variable undefined to OpenAPI-aware facilities. Do not use!
		 * Default.
		 */
		None = 'none',
			
		/**
		 * A variable in the URL path (specified by `:name` or `{name}`).
		 */
		Path = 'path',
			
		/**
		 * A variable in the URL query (specified by `?name=value`).
		 */
		Query = 'query',
			
		/**
		 * A variable within the JSON request body, or the request itself.
		 */
		Body = 'body',
			
		/**
		 * A variable in the HTTP header (specified by `X-Name: value`).
		 */
		Header = 'header',
			
		/**
		 * A variable in the HTTP cookie.
		 */
		Cookie = 'cookie',
			
		/**
		 * A variable in the current HTTP server-controlled session.
		 */
		Session = 'session',
	}

	/**
	 * Lists all root/top-level OpenAPI-aware Schema elements.
	 */
	export function all(): API.Schema[] {
		return (Reflect.getMetadata(Metadata.Schema, Schema) || []).map((schema: Function) => {
			return {
				name: (schema as any).name,
				description: Reflect.getMetadata(Metadata.Description, schema) || "",
				object: schema,
				properties: (Reflect.getMetadata(Metadata.Properties, schema) || []).map((prop: any) => {
					return {
						name: String(prop),
						description: Reflect.getMetadata(Metadata.Description, schema.prototype, prop) || "",
						object: (Reflect.getMetadata(Metadata.Generics, schema.prototype, prop) || 
							    [Reflect.getMetadata(Metadata._Type, schema.prototype, prop)]) || null,
						presentation: Reflect.getMetadata(Metadata.Presentation, schema.prototype, prop) || 0
					}
				}),
				routes: Object.getOwnPropertyNames(schema).filter(prop => 
					typeof (schema as any)[prop] === 'function' && 
					Reflect.hasMetadata(Metadata.Route, schema, prop)
				).map(prop => {
					return {
						...(Reflect.getMetadata(Metadata.Route, schema, prop) || {}),
						description: Reflect.getMetadata(Metadata.Description, schema, prop) || "",
						input: Reflect.getMetadata(Metadata._Parameters, schema, prop).map((param: any, idx: number) => {
							return {
								...(Reflect.getMetadata(Metadata.Location + ':' + idx, schema, prop) || {
									location: API.Location.None,
									name: null
								}),
								object: (Reflect.getMetadata(Metadata.Generics + ':' + idx, schema, prop) || [param])
							}
						}),
						output: {
							location: API.Location.Body,
							name: null,
							object: (Reflect.getMetadata(Metadata.Generics, schema, prop)) || 
							         [Reflect.getMetadata(Metadata._Type, schema, prop)] || null,
						},
						throws: (Reflect.getMetadata(Metadata.Throws, schema, prop) || []).map((exc: any) => {
							return {
								object: exc,
								status: Reflect.getMetadata(Metadata.Throws, exc) || 500
							}
						}),
						authorization: Reflect.getMetadata(Metadata.Auth, schema, prop) || null
					}
				})
			}
		})
	}

	/**
	 *
	 */
	export interface Element {

		/**
		 *
		 */
		name?: string

		/**
		 *
		 */
		description?: string

		/**
		 *
		 */
		object?: Function
	}

	/**
	 *
	 */
	export interface Schema extends Element {

		/**
		 *
		 */
		properties: Property[]

		/**
		 *
		 */
		routes: Route[]
	}

	/**
	 *
	 */
	export interface Property extends Element {

		/**
		 *
		 */
		presentation: API.PresentMode
	}

	/**
	 *
	 */
	export interface Route extends Element {

		/**
		 *
		 */
		method: HTTPMethod /* | string */

		/**
		 *
		 */
		path: string

		/**
		 *
		 */
		status: number

		/**
		 *
		 */
		input: Parameter[]

		/**
		 *
		 */
		output: Parameter

		/**
		 *
		 */
		throws: Exception[]

		/**
		 *
		 */
		authorization: Authorization | null
	}

	/**
	 *
	 */
	export interface Parameter extends Element {

		/**
		 *
		 */
		location: string
	}

	/**
	 *
	 */
	export interface Exception extends Element {

		/**
		 *
		 */
		status: number
	}

	/**
	 *
	 */
	export interface Authorization extends Element {

		/**
		 *
		 */
		location: string

		/**
		 *
		 */
		requirement: Ownership

		/**
		 *
		 */
		parameter: string
	}
}

/**
 * Use these Reflect keys to access internal metadata.
 */
const enum Metadata {

	/**
	 *
	 */
	_Type = "design:type",

	/**
	 *
	 */
	_Parameters = "design:paramtypes",

	/**
	 *
	 */
	Schema = "api:schema",

	/**
	 *
	 */
	Description = "api:description",

	/**
	 *
	 */
	Properties = "api:properties",

	/**
	 *
	 */
	Route = "api:route",

	/**
	 *
	 */
	Location = "api:location",

	/**
	 *
	 */
	Throws = "api:throws",

	/**
	 *
	 */
	Generics = "api:generics",

	/**
	 *
	 */
	Presentation = "api:presentation",

	/**
	 *
	 */
	Auth = "api:auth",

	/**
	 *
	 */
	Parent = "api:parent",

	/**
	 *
	 */
	Children = "api:children"
}

/**
 * Declares a class as an OpenAPI schema.
 */
export function Schema(): ClassDecorator {
	return function(target) {
		Reflect_appendMetadata(Metadata.Schema, Schema, target)
	}
}

/**
 * Declares a non-static property as an OpenAPI property.
 */
export function Property(): PropertyDecorator {
	return function(target, key) {
		Reflect_appendMetadata(Metadata.Properties, target.constructor, key)
	}
}

/**
 * Declares a user-facing description for an OpenAPI element.
 */
export function Description(value: string) {
	return Reflect.metadata(Metadata.Description, value)
}

/**
 * Declares a method as an OpenAPI path.
 */
export function Route(method: API.HTTPMethod | string, route: string, status: number): MethodDecorator {
	return function(target, key) {
		Reflect.defineMetadata(Metadata.Route, { 
			name: key,
			method: method, 
			path: route, 
			status: status 
		}, target, key)
	}
}

/**
 * Declares a method as an HTTP GET OpenAPI path.
 */
Route.GET = function(route: string) { return Route(API.HTTPMethod.GET, route, 200) }

/**
 * Declares a method as an HTTP POST OpenAPI path.
 */
Route.POST = function(route: string) { return Route(API.HTTPMethod.POST, route, 201) }

/**
 * Declares a method as an HTTP PUT OpenAPI path.
 */
Route.PUT = function(route: string) { return Route(API.HTTPMethod.PUT, route, 200) }

/**
 * Declares a method as an HTTP PATCH OpenAPI path.
 */
Route.PATCH = function(route: string) { return Route(API.HTTPMethod.PATCH, route, 200) }

/**
 * Declares a method as an HTTP DELETE OpenAPI path.
 */
Route.DELETE = function(route: string) { return Route(API.HTTPMethod.DELETE, route, 203) }

/**
 * Declares a method as an HTTP HEAD OpenAPI path.
 */
Route.HEAD = function(route: string) { return Route(API.HTTPMethod.HEAD, route, 200) }

/**
 * Declares a method as an HTTP OPTIONS OpenAPI path.
 */
Route.OPTIONS = function(route: string) { return Route(API.HTTPMethod.OPTIONS, route, 200) }

/**
 * Declares an OpenAPI-aware method parameter as provided from a specific location.
 */
export function Parameter(location: API.Location, name?: string): ParameterDecorator {
	return function(target, key, idx) {
        Reflect.defineMetadata(Metadata.Location + ':' + idx, {
        	location: location,
        	name: name || null
        }, target, key)
    }
}

/**
 * Declares an OpenAPI-aware method parameter as provided from the URL path.
 */
export function Path(name: string) { return Parameter(API.Location.Path, name) } 

/**
 * Declares a OpenAPI-aware method parameter as provided from the query.
 */
export function Query(name: string) { return Parameter(API.Location.Query, name) } 

/**
 * Declares a OpenAPI-aware method parameter as provided from the 
 * request body. If no `key` is provided, the parameter is assumed 
 * to be the entire request body.
 */
export function Body(name?: string) { return Parameter(API.Location.Body, name) } 

/**
 * Declares a OpenAPI-aware method parameter as provided from a header.
 */
export function Header(name: string) { return Parameter(API.Location.Header, name) } 

/**
 * Declares a OpenAPI-aware method parameter as provided from a cookie.
 */
export function Cookie(name: string) { return Parameter(API.Location.Cookie, name) } 

/**
 * Declares a OpenAPI-aware method parameter as provided from the session.
 */
export function Session(name: string) { return Parameter(API.Location.Session, name) } 

/** 
 * Modifies the presentation visibility of an OpenAPI-aware property.
 * Presentation determines when a property is available on an object, or 
 * if it is at all (i.e. R/W-only). If `replace` is true, the selected
 * `mode` overwrites the existing `mode`, otherwise, it is appended to it.
 */
export function Presentation(mode: API.PresentMode, replace?: Boolean): PropertyDecorator {
	return function(target, key) {
		Reflect.defineMetadata(
			Metadata.Presentation, 
			(!!replace ? (mode) : ((Reflect.getMetadata(Metadata.Presentation, target, key) || 0) | mode)), 
			target, key
		)
	}
}

/** 
 * The property is only present when retrieved from an OpenAPI-aware facility.
 */
export function ReadOnly() { return Presentation(API.PresentMode.ReadOnly) }

/** 
 * The property is only present when sent to an OpenAPI-aware facility.
 */
export function WriteOnly() { return Presentation(API.PresentMode.WriteOnly) }

/** 
 * The property may not be present when sent or retrieved from an OpenAPI-aware
 * facility. It may not be available on the object at all, or set to `null`.
 */
export function Optional() { return Presentation(API.PresentMode.Optional) }

/** 
 * Clarifies an OpenAPI-aware method parameter or property with a generic 
 * definition (i.e. `Promise<string>`) to its contained type.
 *
 * Can be used to rewrite the expected type of a parameter as well.
 */
export function Retype(...types: Function[]): {
	(target: Object, key: string | symbol): void;
	(target: Object, key: string | symbol, idx: number): void
	(target: Object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor | void;
} {
	return function(target: Object, key: string | symbol, idxOrDesc?: number | PropertyDescriptor) {
		let ext = (typeof idxOrDesc === 'number' ? `:${idxOrDesc}` : '')
		Reflect.defineMetadata(Metadata.Generics + ext, types, target, key)
	}
}

/**
 * Declares a OpenAPI-aware method as able to throw an error type.
 * If any of the `types` does not have an associated `@ErrorCode()`
 * it will be assumed to be `500` (or, `Server Error`).
 *
 * FIXME: `type` is not constrained to `Error` prototypes only.
 */
export function Throws<T extends Error>(...types: Function[]): MethodDecorator {
	return function(target, key) {
		Reflect.defineMetadata(Metadata.Throws, types, target, key)
	}
}

/**
 * When creating a custom `Error` sub-class marked as `@Schema()`,
 * use `@ErrorCode(40x)` to set the associated error code.
 */
export function ErrorCode(code: number): ClassDecorator {
	return function(target) {
		Reflect.defineMetadata(Metadata.Throws, code, target)
	}
}

/**
 * Describes which authenticated object may invoke a certain action.
 */
export const enum Ownership {

	/**
	 * The object itself must be authenticated. 
	 */
	Self    = 1 << 0,
	
	/**
	 * The object OR any sibling object must be authenticated.
	 */
	Sibling = 1 << 1,
	
	/**
	 * The object OR any parent object must be authenticated.
	 */
	Parent  = 1 << 2,

	/**
	 * Any object may be authenticated. Default.
	 */
	Any     = ~0,

	/**
	 * The root object MUST be authenticated.
	 */
	Root    = 0,
}

/**
 * Restricts access to an OpenAPI-aware method to certain authenticated objects.
 * 
 * Note: `parameter` refers to the field that holds the requested object.
 * Note: must provide the location that holds authentication info.
 */
export function Auth(requirement: Ownership, parameter?: string, 
	location: { location: API.Location, name: string } 
			= { location: API.Location.Header, name: 'Authorization' }
): MethodDecorator {
	return function(target, key) {
		Reflect.defineMetadata(Metadata.Auth, {
			requirement: requirement,
			parameter: parameter,
			location: location.location,
			name: location.name
		}, target, key)
	}
}

/**
 * Declares an object's parent type. Use `Parent.Root` as the root parent.
 */
export function Parent<T extends object>(type: T): ClassDecorator {
	return function(target) {
		Reflect.defineMetadata(Metadata.Parent, type, target)
		if (!!type) // FIXME: sometimes `type` is randomly `undefined`??
			Reflect_appendMetadata(Metadata.Children, type, target)
	}
}

/**
 * TODO
 */
Parent.Root = Object

interface EnumType { [id: number]: string }

/**
 * Creates an enum-type schema. Cannot be used as a decorator.
 */
export function Enum(type: EnumType, description?: string) {
	Reflect_appendMetadata(Metadata.Schema, Enum, {
		type: type,
		description: description
	})
}

/**
 * Adds a description for a particular enum value. Cannot be used as a decorator.
 */
Enum.Description = function<T extends EnumType>(type: T, key: keyof T, value: string) {
	Reflect_appendMetadata(Metadata.Description, Enum, {
		key: key,
		value: value
	}, (type as any).name)
}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class Int32 extends Number {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class Int64 extends Number {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class UInt32 extends Number {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class UInt64 extends Number {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class Float extends Number {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class Double extends Number {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class Base64 /* Byte */ extends String {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class Octet /* Binary */ extends String {}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class DateTime extends Date {}

/**
 * Provides a UNIX Epoch timestamp type backed by a uint64.
 */
@Schema()
@Description(d`
	The UNIX Epoch date-time representation: number of milliseconds
	since 1/1/1970 12:00 AM.
`)
export class Timestamp extends UInt64 {}

/**
 * Provides an extensible base64-component-oriented Identifier type.
 */
@Schema()
@Description(d`
	A globally unique reference for objects.
`)
export class Identifier extends String {

	/**
	 * 
	 */
	public static pack(components: any[]): Identifier {
		if (components.length === 0)
			return ''
		return Buffer.from(components.join(':')).toString('base64').replace(/=/g, '~')
	}

	/**
	 * 
	 */
	public static unpack(components: Identifier): any[] {
		if (components.match(/^G?U\d+$/))
			return []
		return Buffer.from((<string>components).replace(/~/g, '='), 'base64').toString('utf8').split(':')
	}
}

/**
 * Facade-stub used with @Retype to support OpenAPI type formats.
 */
export class Pattern extends String {
	constructor(pattern: string) {
		super(); this.pattern = pattern
	}

	/**
	 * The regular expression pattern to match.
	 */
	public pattern: string
}

/**
 * Template-string helper to trim leading tabs (\n\t) and escaped backticks.
 */
export function d(strings: TemplateStringsArray) {
	return String
			.raw(strings)
			.trim()
			.split(/(?:\r\n|\n|\r)/)
			.map((x) => x.replace(/^\s+/gm, ''))
			.join(' ')
			.replace(/\\`/g, '`')
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(400) //@Schema()
@Description('bad request')
export class BadRequest extends Error {
	constructor(message?: string) { super(message || 'bad request') }
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(403) //@Schema()
@Description('authorization failed')
export class AuthorizationFailed extends Error {
	constructor(message?: string) { super(message || 'authorization failed') }
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(404) //@Schema()
@Description('object not found')
export class NotFound extends Error {
	constructor(message?: string) { super(message || 'object not found') }
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(405) //@Schema()
@Description('method not allowed')
export class MethodNotAllowed extends Error {
	constructor(message?: string) { super(message || 'method not allowed') }
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(408) //@Schema()
@Description('request timeout')
export class RequestTimeout extends Error {
	constructor(message?: string) { super(message || 'request timeout') }
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(500) //@Schema()
@Description('internal server error')
export class ServerError extends Error {
	constructor(message?: string) { super(message || 'internal server error') }
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(501) //@Schema()
@Description('api endpoint not implemented')
export class Unimplemented extends Error {
	constructor(message?: string) { super(message || 'api endpoint not implemented') }
}

/**
 * Stub used with @Throws to support typical HTTP errors.
 */
@ErrorCode(503) //@Schema()
@Description('server unavailable')
export class ServerUnavailable extends Error {
	constructor(message?: string) { super(message || 'server unavailable') }
}

/**
 * [PRIVATE]
 * Stub `Error.toJSON` to display all member variables.
 */
if (!('toJSON' in Error.prototype))
Object.defineProperty(Error.prototype, 'toJSON', {
    value: function () {
        var alt = {}
        Object
        	.getOwnPropertyNames(this)
        	.filter(x => x !== 'stack')
        	.forEach(function (this: any, key) {
            	(alt as any)[key] = this[key]
        	}, this)
        return alt
    },
    configurable: true,
    writable: true
})

/**
 * [PRIVATE]
 * Shortcut function that assures an existing metadata list, and then
 * append an item to that list in one call.
 */
function Reflect_appendMetadata(key: any, target: object, value: any, subKey?: any) {
	if (!Reflect.hasOwnMetadata(key, target, subKey))
		Reflect.defineMetadata(key, [], target, subKey)
	Reflect.getMetadata(key, target, subKey).push(value)
}
