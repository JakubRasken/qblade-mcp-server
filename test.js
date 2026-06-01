import { generateQBladeConfig } from "./tools/configGen.js";
import { parseQBladeOutput } from "./tools/parser.js";
import { compileQBlade } from "./tools/compiler.js";
import { runQBlade } from "./tools/runner.js";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("🧪 Starting QBlade MCP Server Tests...\n");
  
  let passed = 0;
  let failed = 0;
  
  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- Test 1: Config Generation ---
  try {
    const tempDir = "./temp_test";
    const simPath = path.join(tempDir, "test_sim.sim");
    
    const genResult = await generateQBladeConfig({
      type: "simulation",
      outputPath: simPath,
      params: {
        name: "Test_Run",
        windSpeed: 12.5,
        timeStep: 0.05
      }
    });
    
    assert(genResult.success === true, "generateQBladeConfig returns success: true");
    assert(fs.existsSync(simPath), "generateQBladeConfig successfully created the simulation config file");
    
    const content = fs.readFileSync(simPath, "utf-8");
    assert(content.includes("OBJECTNAME Test_Run"), "Config contains overridden name parameter");
    assert(content.includes("WIND_SPEED 12.5"), "Config contains overridden windSpeed parameter");
    assert(content.includes("TIMESTEP 0.05"), "Config contains overridden timeStep parameter");
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    assert(false, `Config generation test threw an error: ${error.message}`);
  }

  // --- Test 2: Output Parser ---
  try {
    const tempDir = "./temp_test";
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const outPath = path.join(tempDir, "test_out.txt");
    
    // Create dummy QBlade style data output
    const dummyOutput = `
# QBlade Simulation Export
# Metadata: Test run active
Time      Power      Thrust     Rpm
0.0       100.0      50.0       10.0
1.0       110.0      52.0       10.5
2.0       105.0      51.0       10.2
3.0       120.0      55.0       11.0
    `.trim();
    
    fs.writeFileSync(outPath, dummyOutput, "utf-8");
    
    const parseResult = await parseQBladeOutput({ filePath: outPath });
    
    assert(parseResult.success === true, "parseQBladeOutput returns success: true");
    assert(parseResult.totalRows === 4, "Correctly parsed 4 rows of data");
    assert(parseResult.headers.includes("Power"), "Headers includes 'Power'");
    assert(parseResult.statistics.Power.max === 120.0, "Correctly calculated max value");
    assert(parseResult.statistics.Thrust.min === 50.0, "Correctly calculated min value");
    assert(parseResult.statistics.Rpm.mean === 10.425, "Correctly calculated mean value");
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    assert(false, `Output parser test threw an error: ${error.message}`);
  }

  // --- Test 3: Compiler Error Handling when dependencies are missing ---
  try {
    console.log("\n(Testing compiler error handling...)");
    // Since qmake is missing, compiling should fail gracefully or resolve with success: false
    const compResult = await compileQBlade({ forceClean: false });
    assert(compResult.success === false, "compileQBlade returns success: false when compiler dependencies are missing");
    assert(compResult.error !== undefined, "compileQBlade returns a descriptive error message");
  } catch (error) {
    assert(false, `compileQBlade threw an unexpected error: ${error.message}`);
  }

  // --- Test 4: Runner Error Handling when binary is missing ---
  try {
    console.log("(Testing runner error handling...)");
    // Since QBladeCE binary hasn't been compiled yet, running should throw an error
    await runQBlade({ inputFile: "dummy.sim" });
    assert(false, "runQBlade should have failed when binary is missing");
  } catch (error) {
    assert(error.message.includes("binary not found"), "runQBlade throws a descriptive 'binary not found' error");
  }

  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
