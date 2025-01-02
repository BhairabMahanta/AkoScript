// location.ts
interface Layout {
  grid: string[][];
  navigationPoints: {
    [key: string]: { x: number; y: number };
  };
}

class Location {
  name: string;
  description: string;
  quests: string[];
  bosses: string[];
  mobs: string[];
  difficulty: string;
  layout: Layout;
  requiredLevel: number;

  constructor(
    name: string,
    description: string,
    quests: string[],
    bosses: string[],
    mobs: string[],
    difficulty: string,
    layout: Layout,
    requiredLevel: number
  ) {
    this.name = name;
    this.description = description;
    this.quests = quests;
    this.bosses = bosses;
    this.mobs = mobs;
    this.difficulty = difficulty;
    this.layout = layout;
    this.requiredLevel = requiredLevel;
  }
}

class Floor {
  name: string;
  locations: Location[];

  constructor(name: string, locations: Location[]) {
    this.name = name;
    this.locations = locations;
  }
}

const locationLayout: Layout = {
  grid: [
    ["W", "W", "W", "W", "W"],
    ["W", " ", " ", " ", "W"],
    ["W", "E", "P", " ", "W"],
    ["W", " ", " ", " ", "W"],
    ["W", "W", "W", "W", "W"],
  ],
  navigationPoints: {
    E: { x: 1, y: 2 }, // Entrance
    P: { x: 2, y: 2 }, // Point of interest
  },
};

const locationsFloor1: Location[] = [
  new Location(
    "Forest Clearing",
    "A peaceful clearing in the forest.",
    ["Gather Ingredients"],
    ["Dragon Lord", "Giant Spider"],
    ["Slimes"],
    "Easy",
    locationLayout,
    1
  ),
  new Location(
    "Cave Entrance",
    "A mysterious cave entrance beckons you.",
    ["Defeat the Spiders"],
    ["Giant Spider"],
    ["y"],
    "Moderate",
    locationLayout,
    1
  ),
  // ... Add more locations for the first floor
];

// Create the first floor
const floor1 = new Floor("Floor 1", locationsFloor1);

const locationsFloor2: Location[] = [
  new Location(
    "Desert Oasis",
    "A refreshing oasis in the midst of a desert.",
    [],
    [],
    [],
    "Moderate",
    locationLayout,
    1
  ),
  new Location(
    "Ruined Temple",
    "The remains of an ancient temple.",
    ["Conquer the temple"],
    ["Dragon Lord", "Giant Spider"],
    ["Slimes"],
    "Difficult",
    locationLayout,
    1
  ),
  // ... Add more locations for the second floor
];

// Create the second floor
const floor2 = new Floor("Floor 2", locationsFloor2);

// Create an array of all the floors
const allFloors: Floor[] = [floor1, floor2];

export { Location, Floor, floor1, floor2, allFloors };
