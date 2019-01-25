import { SQL, Encrypt, Decrypt } from '../index'
import { 
	d, Schema, Property, Description, Retype, Route, Throws, 
	Path, BadRequest, NotFound, AuthorizationFailed, Auth,
	Enum, Ownership, Identifier, Parent, Body, Double, Int64, Timestamp
} from '../utils/OpenAPI'
import { IResult } from 'mssql'

// TODO: 
// every object can have a credential associated with it
// my_researcher.credentials = ['person A', 'person B', 'api A', 'person C', 'api B']
// 
export class Credential {

	// unique id (per parent object)
	public id: string = ''

	// the root object this credential is attached to
	// the scope of this credential is the object itself + any children
	public root: string = ''

	// show in UIs?
	public visible: boolean = false

	// 
}



/*
public static function me() {

    // Get the auth header parts.
    $parts = LAMP::auth_header();
    if (count($parts) !== 2)
        throw new APIError("invalid credentials", 403);

    // We're a Researcher.
    if (strpos($parts[0], '@') !== false) { // EMAIL
        $value = LAMP::encrypt($parts[0]);
        $result = LAMP::lookup("
            SELECT AdminID 
            FROM Admin
            WHERE IsDeleted = 0 AND Email = '{$value}';
        ");
        if (count($result) == 0) return null;
        return new TypeID([Researcher::class, $result[0]['AdminID']]);

    // We're a Participant.
    } else if (preg_match('#^G?U#', $parts[0]) === 1) { // UID
        $_id = LAMP::encrypt($parts[0]);
        $result = LAMP::lookup("
            SELECT StudyId 
            FROM Users
            WHERE isDeleted = 0 AND StudyId = '{$_id}';
        ");
        if (count($result) == 0) return null;
        return $parts[0];
    } else return null;
}

public static function authorize(

    $callback
) {
    // Get the auth header parts.
    $parts = LAMP::auth_header();
    if (count($parts) !== 2)
        throw new APIError("invalid credentials", 403);
    $value = $parts[0];

    // Step 1: Authenticate
    // Confirm that there exists a valid Researcher or Participant with
    // the specified ID or Email, along with encrypted password hash.
    $type = null;

    // Authenticate as Root.
    if ($parts[0] == 'root' && $parts[1] === DEPLOY_PASS) {
        return; // OK!

    // Authenticate as a Researcher.
    } else if (strpos($parts[0], '@') !== false) { // EMAIL
        $value = LAMP::encrypt($value);
        $result = LAMP::lookup("
            SELECT AdminID, Password 
            FROM Admin
            WHERE IsDeleted = 0 AND Email = '{$value}';
        ");
        if (count($result) == 0 || 
                $parts[1] !== LAMP::decrypt($result[0]['Password'], false, 'oauth'))
            throw new APIError("invalid credentials", 403);
        else 
            $value = (new TypeID([Researcher::class, $result[0]['AdminID']]))->part(1);
        $type = Researcher::class;

    // Authenticate as a Participant.
    } else if (preg_match('#^G?U#', $parts[0]) === 1) { // UID
        $_id = LAMP::encrypt($parts[0]);
        $result = LAMP::lookup("
            SELECT Password 
            FROM Users
            WHERE isDeleted = 0 AND StudyId = '{$_id}';
        ");
        if (count($result) == 0 || 
                $parts[1] !== LAMP::decrypt($result[0]['Password'], false, 'oauth'))
            throw new APIError("invalid credentials", 403);
        $type = Participant::class;

    } else throw new APIError("invalid credentials", 403);

    // Step 2: Authorize
    // If non-root, confirm that the authenticated object has action rights.
    if ($callback($type, $value) !== true)
        throw new APIError("access restricted", 403);
}

$mapping = [
	ResultEvent::class => [Activity::class, Participant::class, Study::class, Researcher::class],
	EnvironmentEvent::class => [Participant::class, Study::class, Researcher::class],
	FitnessEvent::class => [Participant::class, Study::class, Researcher::class],
	MetadataEvent::class => [Participant::class, Study::class, Researcher::class],
	SensorEvent::class => [Participant::class, Study::class, Researcher::class],
	Activity::class => [Study::class, Researcher::class],
	Participant::class => [Study::class, Researcher::class],
	Study::class => [Researcher::class],
	Researcher::class => [],
];
*/


