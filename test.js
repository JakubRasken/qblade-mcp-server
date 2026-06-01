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
    assert(content.includes("Test_Run OBJECTNAME"), "Config contains overridden name parameter");
    assert(content.includes("12.5 MEANINF"), "Config contains overridden windSpeed parameter");
    assert(content.includes("0.05 TIMESTEP"), "Config contains overridden timeStep parameter");
    
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

  // --- Test 3: Compiler Execution ---
  try {
    console.log("\n(Testing compiler execution...)");
    const compResult = await compileQBlade({ forceClean: false });
    assert(compResult.success === true, "compileQBlade returns success: true and successfully checks the build status");
  } catch (error) {
    assert(false, `compileQBlade threw an unexpected error: ${error.message}`);
  }

  // --- Test 4: Runner Execution (End-to-End Headless Run) ---
  try {
    console.log("(Testing runner execution headlessly...)");
    const tempDir = "./temp_test";
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const simPath = path.join(tempDir, "test_run.sim");
    
    // Generate config first
    await generateQBladeConfig({
      type: "simulation",
      outputPath: simPath,
      params: { name: "IntegrationTest" }
    });
    
    // Run under xvfb-run headlessly for 3000ms
    const runResult = await runQBlade({
      inputFile: simPath,
      headless: true,
      runCLI: false,
      timeoutMs: 3000
    });
    
    console.log("Runner Execution Result:", JSON.stringify(runResult, null, 2));
    assert(runResult.success === true, "runQBlade successfully launched QBladeCE headlessly under xvfb-run");
    const hasTimeoutMsg = runResult.message && runResult.message.includes("terminated after reaching timeout");
    const exitedNormally = runResult.exitCode !== undefined;
    assert(hasTimeoutMsg || exitedNormally, "runQBlade correctly handled process execution");
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    assert(false, `runQBlade threw an unexpected error: ${error.message}`);
  }

  // --- Test 5: End-to-End Headless CLI Simulation on Workspace ---
  try {
    console.log("\n(Testing End-to-End CLI simulation run on real workspace files...)");
    const realSimFile = "/home/jakub/simulation_run/rooftop_simulation.sim";
    const testOutFile = "/home/jakub/simulation_run/rooftop_test_run_output.txt";
    
    if (fs.existsSync(testOutFile)) {
      fs.unlinkSync(testOutFile);
    }
    
    if (fs.existsSync(realSimFile)) {
      const cliResult = await runQBlade({
        inputFile: realSimFile,
        outputFile: testOutFile,
        runCLI: true,
        headless: true,
        timeoutMs: 15000
      });
      
      assert(cliResult.success === true, "Headless CLI simulation returned success");
      assert(fs.existsSync(testOutFile), "Headless CLI simulation successfully generated the output file");
      
      if (fs.existsSync(testOutFile)) {
        const parsed = await parseQBladeOutput({ filePath: testOutFile });
        assert(parsed.success === true, "parseQBladeOutput successfully parsed the generated physical data");
        assert(parsed.totalRows > 0, `Parsed ${parsed.totalRows} timesteps of physical variables successfully`);
        assert(parsed.headers.includes("Time [s]"), "Output headers include 'Time [s]'");
        assert(parsed.headers.includes("Tip Speed Ratio [-]"), "Output headers include 'Tip Speed Ratio [-]'");
        assert(parsed.headers.includes("Momentary Power Coefficient [-]"), "Output headers include 'Momentary Power Coefficient [-]'");
        assert(parsed.headers.includes("Momentary Torque Coefficient [-]"), "Output headers include 'Momentary Torque Coefficient [-]'");
        assert(parsed.headers.includes("Reynolds Number Blade 1 PAN 0 [-]"), "Output headers include 'Reynolds Number Blade 1 PAN 0 [-]'");
        console.log(`💡 Reynolds Number Mean: ${parsed.statistics["Reynolds Number Blade 1 PAN 0 [-]"].mean.toFixed(1)}`);
        console.log(`💡 Power Coefficient Max: ${parsed.statistics["Momentary Power Coefficient [-]"].max.toFixed(4)}`);
      }
    } else {
      console.log("⚠️ Skipped Test 5: Workspace sim file not found.");
    }
  } catch (error) {
    assert(false, `Headless CLI Simulation test threw an error: ${error.message}`);
  }

  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
