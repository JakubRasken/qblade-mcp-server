import fs from "fs";
import path from "path";

/**
 * Generates a key-value plain text configuration file in QBlade's custom format.
 */
function serializeConfig(obj) {
  let lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        // Handle array of strings/objects
        lines.push(`${key}`);
        for (const item of value) {
          lines.push(serializeConfig(item));
        }
        lines.push(`END_${key}`);
      } else {
        // Nested block
        lines.push(`${key}`);
        lines.push(serializeConfig(value));
        lines.push(`END_${key}`);
      }
    } else {
      lines.push(`${value} ${key}`);
    }
  }
  return lines.join("\n");
}

export async function generateQBladeConfig(options = {}) {
  const { type, outputPath, params = {} } = options;
  
  if (!type || !outputPath) {
    throw new Error("Missing type or outputPath arguments.");
  }
  
  let configContent = "";
  
  if (type === "simulation") {
    const defaultSim = {
      OBJECTNAME: params.name || "Default_Simulation",
      ISOFFSHORE: params.isOffshore !== undefined ? (params.isOffshore ? 1 : 0) : 0,
      TURB_1: [
        {
          TURBNAME: params.turbineName || "Turbine_1",
          TURBFILE: params.turbineFile || "turbine.trb",
          INITIAL_YAW: params.yaw || 0.0,
          INITIAL_PITCH: params.pitch || 0.0,
          INITIAL_AZIMUTH: params.azimuth || 0.0,
          STRSUBSTEP: params.structuralSubsteps || 4,
          RELAXSTEPS: params.relaxationSteps || 100,
          PRESCRIBETYPE: params.prescribeRPMType || 0,
          RPMPRESCRIBED: params.rpmPrescribed || 12.0,
          TINTEGRATOR: params.integratorType || 1,
          STRITERATIONS: params.structuralIterations || 5,
          GLOBPOS_X: params.globalPosX || 0.0,
          GLOBPOS_Y: params.globalPosY || 0.0,
          GLOBPOS_Z: params.globalPosZ || 0.0
        }
      ],
      TIMESTEP: params.timeStep || 0.1,
      NUMTIMESTEPS: params.numTimeSteps || 1000,
      RAMPUP: params.rampUp || 10.0,
      ADDDAMP: params.addDamp || 0.0,
      ADDDAMPFACTOR: params.addDampFactor || 0.0,
      WAKEINTERACTION: params.wakeInteraction || 1.0,
      WNDTYPE: params.windType || 0,
      WNDNAME: params.windName || "",
      MEANINF: params.windSpeed || 8.0,
      HORANGLE: params.horAngle || 0.0,
      VERTANGLE: params.vertAngle || 0.0,
      PROFILETYPE: params.profileType || 0,
      SHEAREXP: params.shear || 0.2,
      ROUGHLENGTH: params.roughness || 0.03,
      DIRSHEAR: params.dirShear || 0.0,
      REFHEIGHT: params.refHeight || 90.0,
      DENSITYAIR: params.density || 1.225,
      VISCOSITYAIR: params.viscosity || 1.48e-5,
      DENSITYWATER: params.densityWater || 1000.0,
      VISCOSITYWATER: params.viscosityWater || 1.0e-6,
      GRAVITY: params.gravity || 9.81,
      SEABEDSTIFF: params.seabedStiff || 0.0,
      SEABEDDAMP: params.seabedDamp || 0.0,
      SEABEDSHEAR: params.seabedShear || 0.0,
      STOREREPLAY: params.storeReplay || 0,
      STOREFROM: params.storeFrom || 0.0,
      STOREAERO: params.storeAero || 1,
      STOREBLADE: params.storeBlade || 1,
      STORESTRUCT: params.storeStruct || 1,
      STORECONTROLLER: params.storeController || 1,
      STOREHYDRO: params.storeHydro || 0,
      CALCMODAL: params.calcModal || 0,
      MINFREQ: params.minFreq || 0.1,
      DELTAFREQ: params.deltaFreq || 0.01
    };
    
    // Merge nested overrides if any
    const merged = { ...defaultSim, ...params };
    configContent = serializeConfig(merged);
    
  } else if (type === "turbine") {
    const defaultTurbine = {
      OBJECTNAME: params.name || "Default_Turbine",
      BLADEFILE: params.bladeFile || "blade.bld",
      TURBTYPE: params.turbType !== undefined ? params.turbType : 1, // 1 for VAWT!
      NUMBLADES: params.numBlades || 3,
      ROTORCONFIG: params.rotorConfig || 0,
      ROTATIONALDIR: params.rotationalDir || 0,
      DISCTYPE: params.discType || 0,
      NUMPANELS: params.numPanels || 40,
      NUMSTRUTPANELS: params.numStrutPanels || 10,
      ISSTRUTLIFT: params.isStrutLift || 0,
      OVERHANG: params.overhang || -5.0,
      SHAFTTILT: params.shaftTilt || 0.0, // 0 for VAWT!
      ROTORCONE: params.rotorCone || 0.0,
      CLEARANCE: params.clearance || 1.5,
      XTILT: params.xTilt || 0.0,
      YTILT: params.yTilt || 0.0,
      TOWERHEIGHT: params.towerHeight || 1.5,
      TOWERTOPRAD: params.towerTopRad || 0.1,
      TOWERBOTRAD: params.towerBotRad || 0.1,
      DYNSTALLTYPE: params.dynStallType || 0,
      TF_OYE: params.tfOye || 0.0,
      AM_GB: params.amGb || 0.0,
      TF_ATE: params.tfAte || 0.0,
      TP_ATE: params.tpAte || 0.0,
      "2PLIFTDRAG": params.twoPLiftDrag || 0,
      HIMMELSKAMP: params.himmelskamp || 0,
      TOWERSHADOW: params.towerShadow || 0,
      TOWERDRAG: params.towerDrag || 0.0,
      WAKETYPE: params.wakeType || 0,
      WAKEINTTYPE: params.wakeIntType || 0,
      WAKEROLLUP: params.wakeRollup || 0,
      TRAILINGVORT: params.trailingVort || 0,
      SHEDVORT: params.shedVort || 0,
      CONVECTIONTYPE: params.convectionType || 0,
      WAKERELAXATION: params.wakeRelaxation || 1.0,
      FIRSTWAKEROW: params.firstWakeRow || 1.0,
      MAXWAKESIZE: params.maxWakeSize || 1000.0,
      MAXWAKEDIST: params.maxWakeDist || 100.0,
      WAKEREDUCTION: params.wakeReduction || 1.0,
      WAKELENGTHTYPE: params.wakeLengthType || 0,
      CONVERSIONLENGTH: params.conversionLength || 10.0,
      NEARWAKELENGTH: params.nearWakeLength || 10.0,
      ZONE1LENGTH: params.zone1Length || 10.0,
      ZONE2LENGTH: params.zone2Length || 10.0,
      ZONE3LENGTH: params.zone3Length || 10.0,
      ZONE1FACTOR: params.zone1Factor || 1.0,
      ZONE2FACTOR: params.zone2Factor || 1.0,
      ZONE3FACTOR: params.zone3Factor || 1.0,
      BOUNDCORERADIUS: params.boundCoreRadius || 0.1,
      WAKECORERADIUS: params.wakeCoreRadius || 0.1,
      VORTEXVISCOSITY: params.vortexViscosity || 0.0,
      VORTEXSTRAIN: params.vortexStrain || 0,
      MAXSTRAIN: params.maxStrain || 1.0,
      GAMMARELAXATION: params.gammaRelaxation || 1.0,
      GAMMAEPSILON: params.gammaEpsilon || 0.01,
      GAMMAITERATIONS: params.gammaIterations || 10.0,
      POLARDISC: params.polarDisc || 0.0,
      BEMTIPLOSS: params.bemTipLoss || 0,
      BEMSPEEDUP: params.bemSpeedup || 0.0,
      CONTROLLERTYPE: params.controllerType || 0
    };
    
    const merged = { ...defaultTurbine, ...params };
    configContent = serializeConfig(merged);
    
  } else if (type === "wind") {
    // Generate simple TurbSim inp file template
    configContent = `
-------- TurbSim v2.00.* Input File -------------------------------------------
Simple wind profile generated by QBlade MCP Server.
--------------------------------------------------------------------------------
         123   RandSeed1       - First random seed
      456789   RandSeed2       - Second random seed
       ${params.windSpeed || 8.0}   URef            - Reference wind speed [m/s]
       ${params.hubHeight || 90.0}   RefHt           - Reference height [m]
       ${params.shear || 0.2}   PLexp           - Power law exponent
       ${params.roughness || 0.03}   Z0              - Roughness length [m]
--------------------------------------------------------------------------------
`.trim();
    
  } else if (type === "airfoil") {
    // Correctly formatted QBlade polar file for low Reynolds numbers
    configContent = `
NACA_0018_LowRe POLARNAME
NACA0018 FOILNAME
18 THICKNESS
50000 REYNOLDS
0 ISDECOMPOSED
-180.0 0.0 0.05 0.0
-10.0 -0.5 0.03 -0.05
0.0 0.0 0.02 0.0
10.0 0.5 0.03 0.05
180.0 0.0 0.05 0.0
`.trim();
  } else {
    throw new Error(`Unsupported config type: ${type}`);
  }
  
  const fullPath = path.resolve(outputPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, configContent, "utf-8");
  return {
    success: true,
    message: `Successfully generated QBlade ${type} config file at ${fullPath}`,
    path: fullPath
  };
}
