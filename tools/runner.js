import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const QBLADE_SOURCE_DIR = "/home/jakub/qblade_2.0.4_source";

export async function runQBlade(options = {}) {
  const { inputFile, headless = true, timeoutMs = 15000 } = options;
  
  return new Promise((resolve, reject) => {
    // Ensure binary exists (can be QBladeCE or QBladeEXE depending on build results)
    let binaryPath = path.join(QBLADE_SOURCE_DIR, "QBladeCE");
    if (!fs.existsSync(binaryPath)) {
      // Try alternate name
      binaryPath = path.join(QBLADE_SOURCE_DIR, "QBladeEXE");
    }
    
    if (!fs.existsSync(binaryPath)) {
      return reject(new Error(`QBlade binary not found in ${QBLADE_SOURCE_DIR}. Please compile it first.`));
    }
    
    // Build library paths
    const localLibs = path.join(QBLADE_SOURCE_DIR, "libraries", "libs_unix_64bit");
    const ldLibraryPath = process.env.LD_LIBRARY_PATH 
      ? `${localLibs}:${process.env.LD_LIBRARY_PATH}`
      : localLibs;
      
    const env = { 
      ...process.env, 
      LD_LIBRARY_PATH: ldLibraryPath 
    };
    
    let command = binaryPath;
    let args = [];
    
    if (inputFile) {
      const resolvedInput = path.resolve(inputFile);
      if (!fs.existsSync(resolvedInput)) {
        return reject(new Error(`Input file not found at ${resolvedInput}`));
      }
      args.push(resolvedInput);
    }
    
    // Headless support via xvfb-run if headless is requested
    if (headless) {
      command = "xvfb-run";
      args = ["-a", binaryPath, ...args];
    }
    
    console.error(`Launching: ${command} ${args.join(" ")}`);
    
    const child = spawn(command, args, { 
      cwd: QBLADE_SOURCE_DIR,
      env
    });
    
    let stdoutData = "";
    let stderrData = "";
    
    child.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });
    
    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });
    
    // Handle timeout for automated simulation
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        success: true,
        message: `QBlade process terminated after reaching timeout of ${timeoutMs}ms.`,
        stdout: stdoutData,
        stderr: stderrData
      });
    }, timeoutMs);
    
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        success: code === 0 || code === null,
        exitCode: code,
        stdout: stdoutData,
        stderr: stderrData
      });
    });
    
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
