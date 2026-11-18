// The screenshot scenes behind ?shot=chase|foot|map|title. Each one sets the game to a
// fixed, seeded situation and plays the real rules forward for a fixed number of steps, so
// the frame is what a short game really looks like and the same seed always gives the same
// frame. The chase shot is the cover: the gold Garuda big in frame at speed, three wanted
// stars, a police car behind it and the helicopter large above with its spotlight on.

import { RACE } from './config.js';

const STEP = 1 / 60;

/** Drive the player's car straight ahead for `seconds`, at a fixed speed — keeping the
 * 3D mesh in step with the logical car, so the camera (which follows the car) and the mesh
 * never disagree. */
function driveForward(game, seconds, speed) {
  const car = game.playerCar.car;
  car.speed = speed;
  for (let i = 0; i < seconds / STEP; i += 1) {
    car.x += Math.sin(car.heading) * car.speed * STEP;
    car.z += Math.cos(car.heading) * car.speed * STEP;
    game.playerCar.mesh().position.set(car.x, 0, car.z);
    game.playerCar.mesh().rotation.y = car.heading;
    game.stepWorld(STEP);
  }
}

function setHudForPlay(game) {
  game.hud.showTitle(false);
  game.hud.showMap(false);
  game.hud.showGarage(false);
  game.hud.update(game.hudState(), 0);
}

function stageChase(game) {
  const car = game.playerCar.car;
  game.state.screen = 'play';
  game.state.inCar = true;
  game.state.wanted = 3;
  game.state.cash = 13230;
  game.state.clockMinutes = 21 * 60 + 30;
  game.state.day = 1;
  game.state.rep = 1320;
  game.missions.load(5); // Balapan Senja — the mission panel shows a race in progress.
  game.playerMesh.visible = false;
  game.playerCar.place(-300, 330, Math.PI); // beach road, heading north, clear of the tower row
  game.stepWorld(STEP);
  driveForward(game, 2.0, 34);
  // Park the pursuit where the camera can see it: the heli big and LOW ahead-right of the
  // car with its spotlight on, one police car pulling alongside on the right.
  const heli = game.police.heli;
  heli.position.set(car.x + 5, 10, car.z - 24);
  heli.rotation.y = Math.atan2(car.x - heli.position.x, car.z - heli.position.z);
  const cruiser = game.police.cars[0];
  if (cruiser) {
    cruiser.x = car.x + 9;
    cruiser.z = car.z - 18;
    cruiser.heading = Math.PI;
    cruiser.mesh.position.set(cruiser.x, 0, cruiser.z);
    cruiser.mesh.rotation.y = cruiser.heading;
  }
  setHudForPlay(game);
  game.hud.showDialogue('Agus', 'Three stars on you. Cut through the market, they hate the alleys.', 8);
  return { cameraMode: 'chase' };
}

function stageFoot(game) {
  game.state.screen = 'play';
  game.state.inCar = false;
  game.state.wanted = 0;
  game.state.cash = 12480;
  game.state.clockMinutes = 18 * 60 + 36;
  game.state.day = 1;
  game.missions.load(0);
  game.playerCar.place(-310, 358, Math.PI / 2 + 0.4);
  // The wheelman stands at the driver's door, big in frame — but stepped to his own right
  // of the sight line, so the parked Garuda shows whole beside him instead of hiding
  // behind his body. His mesh faces the camera, so his minifig face, patterned shirt and
  // C-hands read, with the gold car right beside him. Staged far south of the ferris
  // wheel, so the wheel is a small backdrop at the left edge instead of a leg across the
  // frame.
  game.state.player.heading = Math.atan2(-310 - (-306.5), 358 - 362.5);
  const px = -306.5 + (-Math.cos(game.state.player.heading)) * 2.5;
  const pz = 362.5 + Math.sin(game.state.player.heading) * 2.5;
  game.state.player.x = px;
  game.state.player.z = pz;
  game.playerMesh.position.set(game.state.player.x, 0, game.state.player.z);
  game.playerMesh.rotation.y = game.state.player.heading + Math.PI;
  game.playerMesh.visible = true;
  for (let i = 0; i < 90; i += 1) game.stepWorld(STEP);
  setHudForPlay(game);
  game.hud.showDialogue('Ratna', 'So the wheelman is back. Kencana missed you, kid.', 8);
  return { cameraMode: 'foot' };
}

function stageMap(game) {
  game.state.screen = 'map';
  game.state.inCar = true;
  game.state.wanted = 2;
  game.state.cash = 13230;
  game.state.clockMinutes = 18 * 60 + 37;
  game.state.day = 1;
  game.missions.load(5);
  game.playerCar.place(-60, -40, Math.PI / 2);
  game.playerMesh.visible = false;
  for (let i = 0; i < 60; i += 1) game.stepWorld(STEP);
  game.hud.showTitle(false);
  game.hud.showMap(true);
  game.hud.update(game.hudState(), 0);
  return { cameraMode: 'foot' };
}

function stageTitle(game) {
  game.state.screen = 'title';
  game.state.inCar = false;
  game.state.wanted = 0;
  game.stageTitleBackdrop();
  for (let i = 0; i < 60; i += 1) game.stepWorld(STEP);
  game.hud.showTitle(true);
  return { cameraMode: 'title' };
}

/** Garage interior, for verification only (not one of the four submitted shots): the
 * player inside the workshop, the gold Garuda on the lift, Bambang at the bench. */
function stageGarage(game) {
  game.state.screen = 'garage';
  game.state.inCar = false;
  game.state.wanted = 0;
  game.state.cash = 12330;
  const spawn = game.garage.interiorSpawn();
  game.state.player.x = spawn.x;
  game.state.player.z = spawn.z;
  game.state.player.heading = spawn.heading;
  game.playerMesh.position.set(spawn.x, 0, spawn.z);
  game.playerMesh.rotation.y = spawn.heading;
  game.playerMesh.visible = true;
  game.garage.state.inside = true;
  game.garage.setCar(0xffc93c);
  for (let i = 0; i < 60; i += 1) game.stepWorld(STEP);
  game.hud.showTitle(false);
  game.hud.showGarage(true);
  game.hud.setGarageInfo({ cash: game.state.cash, repairCost: game.garage.REPAIR_COST, carHp: 100, paintName: 'Gold' });
  return { cameraMode: 'garage' };
}

/**
 * Set the game to the named scene (chase, foot, map, title; any other name is title) and
 * return which camera the shot should use.
 */
export function stageShot(name, game) {
  if (name === 'chase') return stageChase(game);
  if (name === 'foot') return stageFoot(game);
  if (name === 'map') return stageMap(game);
  if (name === 'garage') return stageGarage(game);
  return stageTitle(game);
}
