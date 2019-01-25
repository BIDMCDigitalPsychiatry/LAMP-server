import _Docker from 'dockerode'
const Docker = new _Docker()
import tar from 'tar-stream'

// TODO: http://psjones.co.uk/jekyll/docker/typescript/dockerode/2017/05/29/typescript-plus-dockerode-awesome.html

/**
 * `await delay(x)`
 */
export const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t));

//
// Maintenance:
//
// KILLALL: docker kill $(docker ps -q); docker rm $(docker ps -a -q)
// CLEANUP: docker rmi $(docker images -q)
// EXEC: docker run --rm -it r-lamp:latest
//
// TODO: docker commit -> squash -> load?
//

/**
 *
 */
export default abstract class ScriptRunner {

	/**
	 *
	 */
	public abstract async execute(script: string, requirements: string, input: any): Promise<any>;

	/**
	 * RScript @ Ubuntu 18.04 LTS + R 3.5.1
	 */
	public static R = class extends ScriptRunner {
		async execute(script: string, requirements: string, input: any): Promise<any> {

			// ...
			const dockerfile = `
			FROM rocker/r-apt:bionic

			## Install some useful prerequisites for most R packages.
			RUN apt-get update -qq && \
				apt-get install -y r-cran-jsonlite libxml2-dev libcairo2-dev libssl-dev libcurl4-openssl-dev && \
				apt-get update -qq 

			## Move default packages to share apt between containers, relink the installer.
			RUN mv /usr/local/lib/R/site-library/* /usr/lib/R/library/ && \
				mv /usr/lib/R/site-library/* /usr/lib/R/library/ && \
				rm -f /usr/local/bin/install2.r && \
				ln -s /usr/lib/R/library/littler/examples/install2.r /usr/local/bin/install2.r`

			// Preinstalled libraries as part of the Docker image located at `/usr/lib/R/library`.
			const preinstalled = [
				'base', 'boot', 'class', 'cluster', 'codetools', 'compiler', 'datasets',
				'docopt', 'foreign', 'graphics', 'grDevices', 'grid', 'jsonlite', 'KernSmooth',
				'lattice', 'littler', 'MASS', 'Matrix', 'methods', 'mgcv', 'nlme', 'nnet',
				'parallel', 'Rcpp', 'rpart', 'spatial', 'splines', 'stats', 'stats4',
				'survival', 'tcltk', 'tools', 'translations', 'utils'
			]

			// The subscript driver script. // TODO: ~0.65s time
			const driverScript = `
	        library(jsonlite)
	        options(error=function() traceback(2))

	        # Execute the script with wrapped I/O + logging.
	        LAMP_input <<- fromJSON(file('/src/input'))
	        commandArgs <- function(...) LAMP_input
	        source('/src/script.r', print.eval=TRUE)
	        LAMP_output <<- get('value', .Last.value)

	        # If the result was a plot, save and read the file as a blob.
	        if ('ggplot' %in% class(LAMP_output)) {
	            get <- function(x, z) if(x %in% names(LAMP_input$\`_plot\`)) LAMP_input$\`_plot\`[[x]] else z

	            # Perform pixel <-> DPI translation based on img device and scale.
	            type <- get('type', 'png')
	            dpi <- 100 * get('scale', 1)
	            width <- get('width', 800) / dpi
	            height <- get('height', 600) / dpi

	            ggsave('tmp.out', device=type, dpi=dpi, width=width, height=height)
	            LAMP_output <<- readBin('tmp.out', 'raw', file.info('tmp.out')\$size)
	        }

	        # Serialize output to JSON or reinterpret if possible.
	        write(tryCatch({
	            toJSON(LAMP_output, auto_unbox=TRUE)
	        }, error = function(err) {
	            return(serializeJSON(LAMP_output))
	        }), '/src/stdout')`

			/*
			let image = await Docker.pull('tag', { authconfig: {
				username: 'username',
				password: 'password',
				auth: '',
				email: 'email@email',
				serveraddress: 'https://index.docker.io/v1'
			}})
			*/

			// Build a new image with an inline Dockerfile unless one already exists.
			let exists = (await Docker.listImages())
						 	.filter(x => x.RepoTags.indexOf('r-lamp:latest') > 0)
			if (!exists) {

				// Prepare a fake Tar file system with just the Dockerfile.
				let pack = tar.pack()
				pack.entry({ name: 'Dockerfile' }, dockerfile)
				pack.finalize()

			    // Create a Docker image from that Dockerfile.
				let image = await Docker.buildImage(pack, { t: 'r-lamp:latest' })
			}

			// 
			let container = await Docker.createContainer({
				Image: 'r-lamp:latest',
				AttachStdin: false,
				AttachStdout: true,
				AttachStderr: true,
				Tty: true,
				Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
				OpenStdin: false,
				StdinOnce: false
			})

			// 
			await container.start()

			// 
			await Promise.race([
				container.exec({}),
				delay(30 * 1000)
			])

			// 
			let output = container.getArchive({ path: '/something' })
			let logs = await container.logs({ stdout: true, stderr: true, follow: false })
			
			// 
			await container.stop()
			await container.remove({ force: true })
			return { output, logs }
		}
	}

	/**
	 *
	 */
	public static Py = class extends ScriptRunner {
		async execute(script: string, requirements: string, input: any): Promise<any> {
			throw Error('Unimplemented ScriptRunner!')
		}
	}

	/**
	 *
	 */
	public static JS = class extends ScriptRunner {
		async execute(script: string, requirements: string, input: any): Promise<any> {
			throw Error('Unimplemented ScriptRunner!')
		}
	}
}




// R Script PHP code:
/*
if (!(is_string($script) && is_array($packages))) return null;
$start = microtime(true);
$logs = '';

// Initializing environment.
$container_name = uniqid('scratch_');
$scratch_name = '/src/' . $container_name;
mkdir($scratch_name, 0755, true);
file_put_contents($scratch_name.'/main.r', RScriptRunner::$driverScript);
file_put_contents($scratch_name.'/script.r', $script);
file_put_contents($scratch_name.'/input', json_encode($input));

// Build a new image with an inline Dockerfile unless one already exists.
if (shell_exec('docker images -q r-lamp:latest 2> /dev/null') == "") {
	$logs .= shell_exec("
		docker build -t r-lamp - 2>&1 <<- EOF
		FROM rocker/r-apt:bionic

		## Install some useful prerequisites for most R packages.
		RUN apt-get update -qq && \
			apt-get install -y r-cran-jsonlite libxml2-dev libcairo2-dev libssl-dev libcurl4-openssl-dev && \
			apt-get update -qq 

		## Move default packages to share apt between containers, relink the installer.
		RUN mv /usr/local/lib/R/site-library/* /usr/lib/R/library/ && \
			mv /usr/lib/R/site-library/* /usr/lib/R/library/ && \
			rm -f /usr/local/bin/install2.r && \
			ln -s /usr/lib/R/library/littler/examples/install2.r /usr/local/bin/install2.r
		EOF
	");
}

// Assemble list of all non-installed packages to ATTEMPT binary installation.
$packages = array_diff($packages,
	RScriptRunner::$preinstalled,
	array_map('basename', array_filter(glob('/src/apt-packages/*'), 'is_dir')),
	array_map('basename', array_filter(glob('/src/lib-packages/*'), 'is_dir'))
);
$netstr = count($packages) == 0 ? '--network none' : '';

// Spin up a new Docker container. // TODO: ~0.4s time
$logs .= shell_exec("
    docker run --rm -dt \
        --name $container_name \
        $netstr \
        --memory=2g \
        -v $scratch_name:/src \
        -v /src/lib-packages:/usr/local/lib/R/site-library \
        -v /src/apt-packages:/usr/lib/R/site-library \
        r-lamp:latest bash 2>&1
");

// First configure the R environment and packages with network available. (With 1m timeout.)
// Disconnect the running container from the network!
// If there were no packages to install, the container is already disconnected.
if (count($packages) > 0) {
	$apt_pkgs = array_map(function($x) {
		return 'r-cran-'.strtolower(trim($x));
	}, $packages);
	$pkg_setup = 'apt-get update -qq && apt-get install -y '.implode(' ', $apt_pkgs).
		'; install2.r -s ' . implode(' ', $packages);
	$logs .= shell_exec("docker exec $container_name bash -c \"$pkg_setup\" 2>&1");
	$logs .= shell_exec("docker network disconnect bridge $container_name 2>&1");
}

// Execute the MAIN script in Docker with 30s timeout. // TODO: ~0.3s time
$logs .= shell_exec("docker exec $container_name timeout 30s \
    bash -c \"time Rscript /src/main.r\" 2>&1
");

// Spin down the Docker container. // TODO: ~0.3s time
$logs .= shell_exec("docker rm --force $container_name 2>&1");

// Perform Scratch cleanup after backing up the environment.
$output = file_exists($scratch_name.'/stdout') ?
	json_decode(file_get_contents($scratch_name.'/stdout')) : '';
sys_rm_rf($scratch_name);
$logs .= 'benchmark: ' . (microtime(true) - $start);
return [ "output" => $output, "log" => $logs];
*/







/*
class BeiweAPI {

	/**
	 * The list of all supported data streams in the Beiwe API.
	 *
	public const STREAMS_LIST = [
		"identifiers",
		"accelerometer",
		"bluetooth",
		"calls",
		"gps",
		"power_state",
		"texts",
		"wifi",
		"audio_recordings",
		"survey_answers",
		"survey_timings",
		"app_log",
		"ios_log"
	];

	/**
	 * Download Beiwe objects for a given Participant, given the parameters listed.
	 *
	public static function get_streams(

		/**
		 * The data access key in the Beiwe API.
		 *
		$access_key,

		/**
		 * The data secret key in the Beiwe API.
		 *
		$secret_key,

		/**
		 * The Study ID of the Study in the Beiwe API.
		 *
		$study_id,

		/**
		 * The User ID of the Participant in the Beiwe API.
		 *
		$user_id,

		/**
		 * The array of data streams (see STREAMS_LIST) in the Beiwe API.
		 *
		$data_streams
	) {

		// Convert the data streams list to a JSON string.
		if (count($data_streams) === 0)
			return new stdClass();

		$access_key = urlencode($access_key);
		$secret_key = urlencode($secret_key);
		$data_streams = json_encode($data_streams);

		// Write CURL body from the POST request into a temporary file.
		$fp = fopen("/tmp/tmp.zip", 'w');
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, "https://studies.beiwe.org/get-data/v1");
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, "access_key=$access_key&secret_key=$secret_key&study_id=$study_id&user_ids=[\"$user_id\"]&data_streams=$data_streams");
		curl_setopt($ch, CURLOPT_FILE, $fp);
		curl_exec($ch);
		curl_close($ch);
		fclose($fp);

		// Open and iterate all files within the downloaded archive.
		$summary = [];
		$zip = new ZipArchive();
		$zip->open('/tmp/tmp.zip');
		for($i = 0; $i < $zip->numFiles; $i++) {
			$path = explode('/', $zip->getNameIndex($i));

			// Ignore files that are not within the main user ID directory.
			if ($path[0] !== $user_id)
				continue;

			// Accumulate the CSV file under the summary object.
			if(!isset($summary[$path[1]]))
				$summary[$path[1]] = [];

			// Convert the CSV file into an indexed object.
			$rows = array_map('str_getcsv', explode("\n", $zip->getFromIndex($i)));
			$header = array_map(function ($x) {
				return str_replace(' ', '_', $x);
			}, array_shift($rows));
			foreach($rows as $row) {
				$data = array_combine($header, $row);
				$data['timestamp'] = intval($data['timestamp']); // Convert to number!
				unset($data['UTC_time']); // Not needed in our data format!
				$summary[$path[1]][] = $data;
			}
		}

		// Clean up and return the object downloaded.
		$zip->close();
		unlink('/tmp/tmp.zip');
		return $summary;
	}
}
*/


