import { spawn, exec } from "child_process";
import { existsSync } from "fs";

/** @type {import('aegir/types').PartialOptions} */
export default {
  test: {
    async before() {
      if (!existsSync("./go-libp2p-webtransport-server/main")) {
        await new Promise((resolve, reject) => {
          exec('go build -o main main.go',
            { cwd: "./go-libp2p-webtransport-server" },
            (error, stdout, stderr) => {
              if (error) {
                reject(error)
                console.error(`exec error: ${error}`);
                return;
              }
              resolve()
            });
        })
      }

      const server = spawn('./main', [], { cwd: "./go-libp2p-webtransport-server", killSignal: "SIGINT" });
      server.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`, typeof data);
      })
      const serverAddr = await (new Promise((resolve => {
        server.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`, typeof data);
          if (data.includes("addr=")) {
            // Parse the addr out
            resolve((data + "").match(/addr=([^\s]*)/)[1])
          }
        });
      })))

      return {
        server,
        env: {
          serverAddr
        }
      }
    },
    async after(_, { server }) {
      server.kill("SIGINT")
    }
  },
  build: {
    bundlesizeMax: '18kB'
  }
}
