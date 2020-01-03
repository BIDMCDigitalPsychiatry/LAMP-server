import { SQL, Encrypt, Decrypt } from '../app'
import { Request, Response } from 'express'
import { ResearcherRepository } from '../repository/ResearcherRepository'
import { TypeRepository } from '../repository/TypeRepository'

export function SecurityContext(): Promise<{type: string; id: string}> {
	return Promise.resolve({ type: '', id: '' })
}

export function ActionContext(): Promise<{type: string; id: string}> {
	return Promise.resolve({ type: '', id: '' })
}

const rootPassword = process.env.ROOT_PASSWORD || ''

export async function _verify(
	req: Request, 
	res: Response, 
	type: Array<'self' | 'sibling' | 'parent'>, /* 'root' = [] */
	auth_value?: string
): Promise<string> {

	// Get the authorization components from the header and tokenize them.
	// TODO: ignoring the other authorization location stuff for now...
	let authStr = (<string>req.get('Authorization') || '').replace('Basic', '').trim()
	let cosignData = authStr.startsWith('LAMP') ? JSON.parse(Decrypt(authStr.slice(4)) || '') : undefined
	if (cosignData !== undefined) // FIXME !?
		authStr = Object.values(cosignData.cosigner).join(':')
	else authStr = authStr.indexOf(':') >= 0 ? authStr : Buffer.from(authStr, 'base64').toString()
	let auth = authStr.split(':', 2)

	// If no authorization is provided, ask for something.
	if (auth.length !== 2 || !auth[1]) {
		res.set('WWW-Authenticate', `Basic realm="LAMP" charset="UTF-8"`)
		throw new Error('401.missing-credentials')
	}

	// Handle basic no credentials and root auth required cases.
	let sub_auth_value = undefined
	if (!auth_value && !['root', 'admin'].includes(auth[0])) {
		throw new Error('403.security-context-requires-root-scope')
	} else if (['root', 'admin'].includes(auth[0]) && auth[1] !== rootPassword) {
		throw new Error('403.invalid-credentials')
	} else if (!(['root', 'admin'].includes(auth[0]) && auth[1] === rootPassword)) {
		let from = auth[0], to = auth_value

		// FIXME: This must be moved into Type/Credential and available for all types (!!!)
		/* FIXME */
		if (TypeRepository._self_type(from) === 'Participant') {

		    // Authenticate as a Participant.
    		let result = (await SQL!.request().query(`
	            SELECT Password 
	            FROM Users
	            WHERE IsDeleted = 0 AND StudyId = '${Encrypt(from)}';
			`)).recordset
    		if (result.length === 0 || (Decrypt(result[0]['Password'], 'AES256') !== auth[1]))
				throw new Error('403.invalid-credentials') /* authorization-failed */

			/* [FIXME: EXPECTING AN EMAIL HERE?] */
		} else if (from.match(/^[^@]+@[^@]+\.[^@]+$/) || TypeRepository._self_type(from) === 'Researcher') { 

		    // Authenticate as a Researcher. 
    		let result = (await SQL!.request().query(`
	            SELECT AdminID, Password 
	            FROM Admin
	            WHERE IsDeleted = 0 AND Email = '${Encrypt(from)}';
			`)).recordset
    		if (result.length === 0 || (Decrypt(result[0]['Password'], 'AES256') !== auth[1]))
				throw new Error('403.invalid-credentials')

			// FIXME: 
			auth[0] = from = <string>ResearcherRepository._pack_id({ admin_id: result[0]['AdminID'] })
		}
		/* FIXME */

		// Patch in the special-cased "me" to the actual authenticated credential.
		if(to === 'me')
			sub_auth_value = to = auth[0]
		// FIXME: R vs P?

		// Handle whether we require the parameter to be [[[self], a sibling], or a parent].
		if (
			/* Check if `to` and `from` are the same object. */
			(type.includes('self') && 
			 from !== to) && 

			/* FIXME: Check if the immediate parent type of `to` is found in `from`'s inheritance tree. */
			(type.includes('sibling') &&
			 TypeRepository._parent_type(from || '').indexOf(TypeRepository._parent_type(to || '')[0]) < 0) &&

			/* Check if `from` is actually the parent ID of `to` matching the same type as `from`. */
			(type.includes('parent') &&
			 from !== await TypeRepository._parent_id(to || '', TypeRepository._self_type(from || '')))
		) {
			/* We've given the authorization enough chances... */
			throw new Error('403.security-context-out-of-scope')
		}
	}

	// FIXME: clean this up...
	// Handle the above normal login cases if we're cosigned by root.
	if (!!cosignData) {
		let from = cosignData.identity.from
		let to = auth_value

		// Patch in the special-cased "me" to the actual authenticated credential.
		if(auth_value /* to */ === 'me')
			sub_auth_value = to = cosignData.identity.to
		// FIXME: R vs P?

		// Handle whether we require the parameter to be [[[self], a sibling], or a parent].
		if (
			/* Check if `to` and `from` are the same object. */
			(type.includes('self') && 
			 from !== to) && 

			/* FIXME: Check if the immediate parent type of `to` is found in `from`'s inheritance tree. */
			(type.includes('sibling') &&
			 TypeRepository._parent_type(from || '').indexOf(TypeRepository._parent_type(to || '')[0]) < 0) &&

			/* Check if `from` is actually the parent ID of `to` matching the same type as `from`. */
			(type.includes('parent') &&
			 from !== await TypeRepository._parent_id(to || '', TypeRepository._self_type(from || '')))
		) {
			/* We've given the authorization enough chances... */
			throw new Error('403.security-context-out-of-scope')
		}
	}

	// There shouldn't be any "me" anymore -- unless we're root.
	if(cosignData === undefined && sub_auth_value === undefined && auth_value /* to */ === 'me')
		throw new Error('400.context-substitution-failed')

	return sub_auth_value || auth_value
}
