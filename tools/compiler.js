import { exec } from "child_process";
import fs from "fs";
import path from "path";

const QBLADE_SOURCE_DIR = "/home/jakub/qblade_2.0.4_source";

export async function compileQBlade(options = {}) {
  const forceClean = options.forceClean || false;
  const threads = options.threads || "all";
  
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(QBLADE_SOURCE_DIR)) {
      return reject(new Error(`QBlade source directory not found at ${QBLADE_SOURCE_DIR}`));
    }
    
    let cleanStep = forceClean ? "make clean && " : "";
    let threadCount = threads === "all" ? "$(nproc)" : threads;
    
    // Commands: qmake qblade.pro && make -j$(nproc)
    const compileCmd = `${cleanStep}qmake qblade.pro && make -j${threadCount}`;
    
    console.error(`Executing: ${compileCmd} in ${QBLADE_SOURCE_DIR}`);
    
    const proc = exec(compileCmd, { cwd: QBLADE_SOURCE_DIR }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: error.message,
          stdout,
          stderr
        });
      } else {
        resolve({
          success: true,
          message: "QBlade compiled successfully.",
          stdout,
          stderr
        });
      }
    });
  });
}
