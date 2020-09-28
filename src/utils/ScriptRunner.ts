import { Stream } from "stream"
import _Docker from "dockerode"
import tar from "tar-stream"
import uniqid from "uniqid"
import getStream from "get-stream"
import fs from "fs-extra"
import vm2 from "vm2"

//
export const Docker = new _Docker({ host: "localhost", port: 2375 })

// TODO: USE DOCKER COMMIT!

//console.dir(await ((new ScriptRunner.JS()).execute('console.log(\'testing\'); return "hi";', '', '')))
//console.dir(await ((new ScriptRunner.Bash()).execute('echo "Hello World"', '', '')))

/**
 *
 */
export abstract class ScriptRunner {
  /**
   * Create a simple sequential task queue to manage script invocations.
   * FIXME: It's concurrent. :(
   */
  static queue = {
    _running: false,
    _store: <Array<() => Promise<void>>>[],
    _exec: () => {
      if (!ScriptRunner.queue._running && ScriptRunner.queue._store.length > 0) {
        ScriptRunner.queue._running = true
        console.group("ScriptRunner::TaskQueue")
        console.log(`current pressure = ${ScriptRunner.queue._store.length}`)
        const task = ScriptRunner.queue._store.shift()!
        task()
        console.groupEnd()
        ScriptRunner.queue._running = false
        ScriptRunner.queue._exec()
      }
    },
    enqueue: (task: () => Promise<void>) => {
      ScriptRunner.queue._store.push(task)
      if (!ScriptRunner.queue._running) ScriptRunner.queue._exec()
    },
  }

  /**
   *
   */
  public abstract async execute(script: string, requirements: string, input: any): Promise<any>

  /**
   *
   */
  public static Bash = class extends ScriptRunner {
    async execute(script: string, requirements: string, input: any): Promise<any> {
      return new Promise((resolve, reject) =>
        ScriptRunner.queue.enqueue(async () => {
          console.group("ScriptRunner.Bash")

          // Build a new image with an inline Dockerfile unless one already exists.
          const exists = await Docker.listImages({ filters: { reference: ["alpine:latest"] } })
          if (exists.length === 0) {
            console.log("Creating docker image...")

            const image = await Docker.pull("alpine:latest", {})
            await new Promise((resolve, reject) => {
              image.pipe(process.stdout)
              image.on("end", resolve)
              image.on("error", reject)
            })
          }

          // Create and start a new container...
          console.log("Creating docker container...")
          const container = await Docker.createContainer({
            Image: "alpine:latest",
            Tty: true,
            Cmd: ["/bin/sh"],
          })
          await container.start()

          // First configure the environment and packages with network available.
          const logs: Buffer[] = []
          try {
            // Place input files, call the main script, and grab the output files.
            console.log("Configuring script...")
            await container.putArchive(
              makeTar({
                "/src/script": script,
              }),
              { path: "/" }
            )
            logs.push(await containerExec(container, `touch /src/stdout && chmod +x /src/script && /src/script`))

            console.log("Retrieving result...")
            const output = (await getFileInTar(await container.getArchive({ path: "/src/stdout" }), "stdout")).toString(
              "utf8"
            )
            resolve({ output, logs: Buffer.concat(logs).toString("utf8") })
          } catch (e) {
            console.error(e)
            reject(e)
          } finally {
            console.log("Cleaning up...")
            console.groupEnd()

            //
            await container.stop()
            await container.remove({ force: true })
          }
        })
      )
    }
  }

  /**
   * RScript @ Ubuntu 18.04 LTS + R 3.5.1
   */
  public static R = class extends ScriptRunner {
    async execute(script: string, requirements: string, input: any): Promise<any> {
      const Dockerfile = `
			FROM ubuntu:18.04
			ENV DEBIAN_FRONTEND noninteractive

			RUN useradd docker \
				&& mkdir /home/docker \
				&& chown docker:docker /home/docker \
				&& addgroup docker staff

			RUN apt-get update \
				&& apt-get install -y --no-install-recommends \
					socat \
					curl \
					libcurl4-openssl-dev \
					software-properties-common \
					ed \
					less \
					locales \
					vim-tiny \
					wget \
					ca-certificates \
				&& add-apt-repository --enable-source --yes "ppa:marutter/rrutter3.5" \
				&& add-apt-repository --enable-source --yes "ppa:marutter/c2d4u3.5" 

			RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen \
				&& locale-gen en_US.utf8 \
				&& /usr/sbin/update-locale LANG=en_US.UTF-8
			ENV LC_ALL en_US.UTF-8
			ENV LANG en_US.UTF-8

			ENV R_LIBS_SITE /usr/lib/R/library
			RUN mkdir -p /usr/lib/R/library && mkdir -p /usr/local/lib/R/ \
				&& ln -s /usr/lib/R/library /usr/lib/R/site-library \
				&& ln -s /usr/lib/R/library /usr/local/lib/R/site-library 

			RUN apt-get update \
			        && apt-get install -y --no-install-recommends \
			 		 r-base \
			 		 r-base-dev \
			 		 r-recommended \
			         r-cran-rcpp \
			         r-cran-jsonlite \
			 		 littler \
			         libxml2-dev \
			         libcairo2-dev \
			         libssl-dev \
			         libcurl4-openssl-dev \
			    && /usr/lib/R/library/littler/examples/install.r docopt \
			 	&& rm -rf /tmp/downloaded_packages/ /tmp/*.rds \
			 	&& rm -rf /var/lib/apt/lists/*

			RUN apt-get update \
					&& apt-get install -y --no-install-recommends \
					 python python-pip python3-pip python-dev \
			 	&& rm -rf /tmp/downloaded_packages/ /tmp/*.rds \
			 	&& rm -rf /var/lib/apt/lists/*

			CMD ["/bin/bash"]`
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

      return new Promise((resolve, reject) =>
        ScriptRunner.queue.enqueue(async () => {
          console.group("ScriptRunner.R")

          // Build a new image with an inline Dockerfile unless one already exists.
          const exists = await Docker.listImages({ filters: { reference: ["lamp:latest"] } })
          if (exists.length === 0) {
            console.log("Creating docker image...")

            // Create a Docker image from a Dockerfile.
            const image = await Docker.buildImage(makeTar({ Dockerfile }), { t: "lamp:latest" })
            await new Promise((resolve, reject) => {
              image.pipe(process.stdout)
              image.on("end", resolve)
              image.on("error", reject)
            })

            // Migrate packages to the shared volume/bind-mount.
            // This can't be done from within a Docker build context.
            const res = await systemDocker(`mv /usr/lib/R/library/* /usr/lib/R/library2`, {
              Image: "lamp:latest",
              Tty: true,
              Cmd: ["/bin/bash"],
              HostConfig: {
                Binds: [`/src/r-libs:/usr/lib/R/library2`],
              },
            })
            console.log(res.toString("utf8"))
          }

          // Create and start a new container...
          console.log("Creating docker container...")
          const container = await Docker.createContainer({
            Image: "lamp:latest",
            Tty: true,
            Cmd: ["/bin/bash"],
            HostConfig: {
              Binds: [`/src/r-libs:/usr/lib/R/library`],
            },
          })
          await container.start()

          // First configure the R environment and packages with network available.
          const logs: Buffer[] = []
          try {
            // Install package requirements and configure network settings (if needed).
            if (requirements.split(",").length > 0) {
              console.log("Installing packages...")
              logs.push(
                await containerExec(
                  container,
                  `apt-get update -qq && apt-get install -y ${requirements
                    .split(",")
                    .map((x) => "r-cran-" + x.trim())
                    .join(
                      " "
                    )}; ls /usr/lib/R/site-library/; /usr/lib/R/site-library/littler/examples/install2.r -s ${requirements
                    .split(",")
                    .join(" ")}`
                )
              )
              // TODO: disconnect network && `socat -d -d TCP4-LISTEN:9000,reuseaddr,fork UNIX-CONNECT:/var/run/lamp.sock`
            }

            // Place input files, call the main script, and grab the output files.
            console.log("Configuring script...")
            await container.putArchive(
              makeTar({
                "/src/main.r": driverScript,
                "/src/script.r": script,
                "/src/input": input,
              }),
              { path: "/" }
            )
            logs.push(await containerExec(container, `touch /src/stdout && Rscript /src/main.r`))

            console.log("Retrieving result...")
            const output = (await getFileInTar(await container.getArchive({ path: "/src/stdout" }), "stdout")).toString(
              "utf8"
            )
            resolve({ output, logs: Buffer.concat(logs).toString("utf8") })
          } catch (e) {
            console.error(e)
            reject(e)
          } finally {
            console.log("Cleaning up...")
            console.groupEnd()

            //
            await container.stop()
            await container.remove({ force: true })
          }
        })
      )
    }
  }

  /**
   *
   */
  public static Py = class extends ScriptRunner {
    async execute(script: string, requirements: string, input: any): Promise<any> {
      throw Error("Unimplemented ScriptRunner!")
    }
  }

  /**
   *
   */
  public static JS = class extends ScriptRunner {
    async execute(script: string, requirements: string, input: any): Promise<any> {
      return new Promise((resolve, reject) =>
        ScriptRunner.queue.enqueue(async () => {
          const options: vm2.NodeVMOptions = {
            console: "redirect",
            wrapper: "none",
            require: {
              external: false,
              builtin: ["http", "url"],
              import: ["http", "url"],
            },
          }
          resolve(new vm2.NodeVM(options).run(script, ""))
        })
      )
    }
  }
}

/**
 *
 */
const containerExec = (container: _Docker.Container, shellCommand: string): Promise<Buffer> => {
  return new Promise((resolve, error) => {
    container.exec(
      { Cmd: ["/bin/sh", "-c", shellCommand], AttachStdout: true, AttachStderr: true },
      (cErr: any, exec: any) => {
        if (cErr) return error(cErr)
        exec.start({ hijack: true }, (sErr: any, stream: Stream) => {
          if (sErr) return error(sErr)

          const output: Buffer[] = []
          stream.on("data", (chunk: Buffer) => {
            chunk = chunk.slice(8)
            console.log(chunk.toString("utf8"))
            output.push(chunk)
          })
          stream.on("end", () => resolve(Buffer.concat(output)))
        })
      }
    )
  })
}

/**
 *
 */
const makeTar = (data: { [filename: string]: any }, dirPrefix = ""): tar.Pack => {
  const pack = tar.pack()
  for (const x of Object.entries(data))
    pack.entry({ name: dirPrefix + x[0] }, typeof x[1] === "string" ? x[1] : JSON.stringify(x[1]))
  pack.finalize()
  return pack
}

/**
 *
 */
const getFileInTar = async (tarStream: NodeJS.ReadableStream, filename: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const extract = tar.extract()
    const data: Buffer[] = []
    extract.on("entry", (header, stream, next) => {
      if (header.name !== filename) next()
      stream.on("data", (chunk: Buffer) => data.push(chunk))
      stream.on("end", next)
      stream.resume()
    })
    extract.on("finish", () => resolve(Buffer.concat(data)))
    tarStream.pipe(extract)
  })
}

/**
 *
 */
const systemDocker = async (command: string, options: _Docker.ContainerCreateOptions): Promise<Buffer> => {
  const container = await Docker.createContainer(options)
  await container.start()
  const output = await containerExec(container, command)
  await container.stop()
  await container.remove({ force: true })
  return output
}

/**
 * `await delay(x)`
 */
const delay = (t: number) => new Promise((resolve) => setTimeout(resolve, t))
