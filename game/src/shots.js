// The staged scenes behind ?shot=title|chase|foot|map (with &seed=N).
// Each scene plays the real game forward a fixed number of fixed steps,
// so the frame is what real play looks like and the same seed always
// gives the same frame. When the scene is painted twice, the page sets
// window.__shotReady for the screenshot tool.
import { SPEAKERS } from './config.js';

const FAKE_FORWARD = {
  forward: () => true, back: () => false, left: () => false, right: () => false,
  shootHeld: () => false, weaponKey: () => -1,
  takePresses: () => ({ pressed: 0, garage: false }),
};

export function stageShot(name, ctx) {
  const { view, hud, radio, scene, world, traffic, peds, police, missions,
    player, heroCar, wheelman, heroDriver, startMission, step, updateHud,
    enterCar, setWanted, setMapOpen } = ctx;

  hud.setVersionStamp('KENCANA BAY · v6 · 18 NOV 2026');

  // The chase camera eases toward its target (k = dt * 5 per call), so a
  // shot taken after two frames would still show the camera's start
  // position high above the city. Settle it first: 120 calls leave it
  // a fraction of a percent from its target.
  function settleCamera() {
    for (let i = 0; i < 120; i += 1) view.chaseCamera(player, 1 / 60);
  }

  function paintTwice(draw) {
    let painted = 0;
    function paint() {
      draw();
      painted += 1;
      if (painted < 2) requestAnimationFrame(paint);
      else window.__shotReady = true;
    }
    requestAnimationFrame(paint);
  }

  if (name === 'title') {
    hud.showTitle(true);
    hud.setMission(null, 0, 0);
    paintTwice(() => {
      view.titleCamera(heroCar.x, heroCar.z, heroCar.heading, 1 / 60, 4);
      view.render();
    });
    return;
  }

  // The three play scenes all run the real loop for a fixed step count.
  hud.showTitle(false);
  startMission(missions, 5, police); // Balapan Senja: the race mission.
  const input = FAKE_FORWARD;

  if (name === 'foot') {
    setWanted(police, 3, scene);
    // The wheelman stands seven metres south of the parked Garuda,
    // facing north toward it: the chase camera sits behind him, so the
    // car is in the frame just beyond him instead of behind the camera.
    player.x = -240;
    player.z = 287;
    player.heading = Math.PI;
    wheelman.visible = true;
    wheelman.position.set(player.x, 0, player.z);
    wheelman.rotation.y = player.heading;
    heroCar.x = -240;
    heroCar.z = 280;
    heroCar.heading = 1.9;
    heroCar.group.position.set(-240, 0, 280);
    heroCar.group.rotation.y = 1.9;
    for (let i = 0; i < 90; i += 1) {
      step(1 / 60, { ...FAKE_FORWARD, forward: () => false }, performance.now());
    }
    hud.say(SPEAKERS.WANTO, 'You are standing in my city, wheelman. The KPD is watching.');
    settleCamera();
    paintTwice(() => {
      view.chaseCamera(player, 1 / 60);
      updateHud();
      view.render();
    });
    return;
  }

  if (name === 'map') {
    player.x = -240;
    player.z = 276.5;
    player.heading = 0.5;
    setMapOpen(true);
    updateHud();
    settleCamera();
    paintTwice(() => {
      view.chaseCamera(player, 1 / 60);
      view.render();
    });
    return;
  }

  // Default: the chase. The player drives the gold Garuda in the race,
  // four stars wanted, police closing in. The car is placed back at the
  // north end of the beach road and turned south for this shot so it
  // can run at full speed past the ferris wheel instead of into the
  // city blocks or off the map's south edge. Only 150 steps: the car
  // is still beside the beach and the wheel instead of at the far
  // empty end of the map.
  heroCar.x = -240;
  heroCar.z = 200;
  heroCar.heading = 0;
  heroCar.group.position.set(-240, 0, 200);
  heroCar.group.rotation.y = 0;
  enterCar(heroCar);
  setWanted(police, 4, scene);
  for (let i = 0; i < 150; i += 1) {
    step(1 / 60, input, performance.now());
  }
  // Frame one pursuing unit alongside the hero car: the police spawn
  // ninety metres out and trail behind the camera, so without this the
  // chase reads as an empty road. The unit keeps the player's heading
  // and sits ahead-right of the car, inside the chase camera's view.
  if (police.units.length > 0) {
    const lead = police.units[0];
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    lead.car.x = player.x + fx * 16 - fz * 7;
    lead.car.z = player.z + fz * 16 + fx * 7;
    lead.car.heading = player.heading;
    lead.car.speed = player.car.speed;
    lead.car.group.position.set(lead.car.x, 0, lead.car.z);
    lead.car.group.rotation.y = lead.car.heading;
  }
  hud.say(SPEAKERS.AGUS, 'Sunset race across four checkpoints. Win it for the crew.');
  settleCamera();
  paintTwice(() => {
    view.chaseCamera(player, 1 / 60);
    updateHud();
    view.render();
  });
}
