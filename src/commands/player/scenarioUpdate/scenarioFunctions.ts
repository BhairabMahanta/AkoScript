import { ScenarioData } from "../../../data/mongo/playerScenarioSchema";
import { mongoClient } from "../../../data/mongo/mongo";
import {
  Floor,
  interfaceScenario,
} from "../../../data/mongo/scenarioInterface";
const db = mongoClient.db("Akaimnky");

const scenarioCollection: any = db.collection("scenarioData");

export async function addScenario(
  playerId: string,
  scenarioData: interfaceScenario
): Promise<void> {
  const dbFilter = { _id: playerId };
  let playerScenarios = await scenarioCollection.findOne(dbFilter);
  if (!playerScenarios) {
    playerScenarios = { _id: playerId, scenarios: [] };
  }
  console.log("playerScenarios", playerScenarios);
  const scenarioExists = playerScenarios.scenarios.some(
    (scenario: interfaceScenario) => scenario.name === scenarioData.name
  );

  if (scenarioExists) {
    console.log(`Scenario "${scenarioData.name}" already exists.`);
    return;
  }

  const newScenario: interfaceScenario = {
    ...scenarioData,
    floors: [], // Initialize floors as empty
  };

  // Save the player data first before adding floors
  await scenarioCollection.updateOne(
    { _id: playerId },
    { $set: { scenarios: [newScenario] } },
    { upsert: true }
  );
  setTimeout(async () => {
    try {
      await addFloor(playerId, scenarioData.name, {
        floorNumber: 1,
        miniboss: false,
        boss: false,
        rewarded: false,
        cleared: false,
      });
      console.log("Floor added successfully after delay.");
    } catch (error) {
      console.error("Error adding floor:", error);
    }
  }, 4000); // 5000 milliseconds = 5 seconds

  console.log(
    `Scenario "${scenarioData.name}" added for player "${playerId}".`
  );
}
export async function addFloor(
  playerId: string,
  scenarioName: string,
  floorData: Floor
): Promise<void> {
  const dbFilter = { _id: playerId };
  const playerData = await scenarioCollection.findOne(dbFilter);
  console.log("playerData;", playerData);
  const scenario = playerData.scenarios.find(
    (scenario: interfaceScenario) => scenario.name === scenarioName
  );

  if (!scenario) {
    console.log(`Scenario "${scenarioName}" not found.`);
    return;
  }

  const floorExists = scenario.floors.some(
    (floor: Floor) => floor.floorNumber === floorData.floorNumber
  );

  if (floorExists) {
    console.log(
      `Floor ${floorData.floorNumber} already exists in scenario "${scenarioName}".`
    );
    return;
  }

  // Add a normal floor
  if (!floorData.boss) {
    scenario.floors.push(floorData);
    await scenarioCollection.updateOne(
      { _id: playerId },
      { $set: { scenarios: [scenario] } },
      { upsert: true }
    );

    console.log(
      `Floor ${floorData.floorNumber} added to scenario "${scenarioName}".`
    );
    return;
  }

  // Boss floor logic
  await addBossFloor(playerId, scenarioName, floorData);
}

export async function addBossFloor(
  playerId: string,
  scenarioName: string,
  floorData: Floor
): Promise<void> {
  console.log(
    `Setting up boss floor ${floorData.floorNumber} for scenario "${scenarioName}".`
  );
  const dbFilter = { _id: playerId };
  const playerData = await scenarioCollection.findOne(dbFilter);
  console.log("lauerData;", playerData);
  const scenario = playerData.scenarios.find(
    (scenario: interfaceScenario) => scenario.name === scenarioName
  );

  if (!scenario) {
    console.log(`Scenario "${scenarioName}" not found.`);
    return;
  }

  const floorExists = scenario.floors.some(
    (floor: Floor) => floor.floorNumber === floorData.floorNumber
  );

  if (floorExists) {
    console.log(
      `Floor ${floorData.floorNumber} already exists in scenario "${scenarioName}".`
    );
    return;
  }

  // Assuming boss floor involves specific JSON data or configuration
  const bossFloorData = {
    identifier: `forest-region`,
    uniqueIdentifier: "forest-region", // Replace with UUID generator if needed
    bgColor: "#696A79",
    ...floorData,
    entities: {
      monsters: [],
      npcs: [],
      chests: [],
      teleports: [],
    },
  };
  scenario.floors.push(bossFloorData);
  await scenarioCollection.updateOne(
    { _id: playerId },
    { $set: { scenarios: [scenario] } },
    { upsert: true }
  );
  // add a mail here (with tutorial, only if first region)
  console.log(
    `Boss floor ${floorData.floorNumber} initialized:`,
    bossFloorData
  );
}
