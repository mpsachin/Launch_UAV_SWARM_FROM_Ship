import {
  Cartesian3,
  Color,
  ConstantPositionProperty,
  Entity,
  JulianDate,
  Math as CesiumMath,
  Viewer,
  SampledPositionProperty,
  VelocityOrientationProperty,
  Cartographic,
  Ellipsoid,
  LabelStyle,
  VerticalOrigin,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

// ------------------------------------------------------------
// Cesium viewer
// ------------------------------------------------------------

const viewer = new Viewer("cesiumContainer", {
  animation: true,
  timeline: true,
  shouldAnimate: true,
  baseLayerPicker: true,
});

viewer.scene.globe.depthTestAgainstTerrain = false;

// ------------------------------------------------------------
// Demonstration area
// Fictional offshore location
// ------------------------------------------------------------

const shipPosition = Cartesian3.fromDegrees(
  72.0,  // longitude
  15.0,  // latitude
  0
);

// ------------------------------------------------------------
// Ship
// ------------------------------------------------------------

const ship = viewer.entities.add({
  name: "Demonstration Vessel",
  position: shipPosition,

  box: {
    dimensions: new Cartesian3(140, 30, 12),
    material: Color.DARK_GRAY,
  },

  label: {
    text: "DEMO VESSEL",
    font: "14px sans-serif",
    fillColor: Color.WHITE,
    style: LabelStyle.FILL,
    verticalOrigin: VerticalOrigin.BOTTOM,
    pixelOffset: new Cartesian3(0, -20, 0),
  },
});

// ------------------------------------------------------------
// Launch deck marker
// ------------------------------------------------------------

viewer.entities.add({
  name: "Launch Deck",
  position: Cartesian3.add(
    shipPosition,
    new Cartesian3(30, 0, 8),
    new Cartesian3()
  ),

  cylinder: {
    length: 2,
    topRadius: 8,
    bottomRadius: 8,
    material: Color.ORANGE.withAlpha(0.8),
  },
});

// ------------------------------------------------------------
// Swarm configuration
// ------------------------------------------------------------

interface DroneConfig {
  id: string;
  offsetX: number;
  offsetY: number;

  // Direction of the purely illustrative flight path.
  headingDegrees: number;

  // Distance travelled during the demonstration.
  distanceMeters: number;

  // Time after launch before movement begins.
  launchDelaySeconds: number;
}

const swarm: DroneConfig[] = [
  {
    id: "UAV-01",
    offsetX: 25,
    offsetY: -8,
    headingDegrees: 15,
    distanceMeters: 1800,
    launchDelaySeconds: 0,
  },
  {
    id: "UAV-02",
    offsetX: 25,
    offsetY: -4,
    headingDegrees: 35,
    distanceMeters: 1600,
    launchDelaySeconds: 2,
  },
  {
    id: "UAV-03",
    offsetX: 25,
    offsetY: 0,
    headingDegrees: 55,
    distanceMeters: 1700,
    launchDelaySeconds: 4,
  },
  {
    id: "UAV-04",
    offsetX: 25,
    offsetY: 4,
    headingDegrees: 75,
    distanceMeters: 1500,
    launchDelaySeconds: 6,
  },
  {
    id: "UAV-05",
    offsetX: 25,
    offsetY: 8,
    headingDegrees: 95,
    distanceMeters: 1900,
    launchDelaySeconds: 8,
  },
];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function offsetFromShip(
  ship: Cartesian3,
  eastMeters: number,
  northMeters: number,
  heightMeters: number
): Cartesian3 {
  const cartographic = Cartographic.fromCartesian(ship);

  const latitude = cartographic.latitude;
  const longitude = cartographic.longitude;

  const earthRadius = 6378137;

  const dLat = northMeters / earthRadius;
  const dLon =
    eastMeters /
    (earthRadius * Math.cos(latitude));

  return Cartesian3.fromRadians(
    longitude + dLon,
    latitude + dLat,
    heightMeters
  );
}

function createDrone(
  config: DroneConfig,
  startTime: JulianDate
): Entity {
  const position = new SampledPositionProperty();

  const launchTime = JulianDate.addSeconds(
    startTime,
    config.launchDelaySeconds,
    new JulianDate()
  );

  // Initial position near the ship.
  const initialPosition = offsetFromShip(
    shipPosition,
    config.offsetX,
    config.offsetY,
    35
  );

  position.addSample(
    launchTime,
    initialPosition
  );

  // ----------------------------------------------------------
  // Generate a simple, predetermined demonstration trajectory.
  // This is intentionally not a navigation or mission planner.
  // ----------------------------------------------------------

  const heading = CesiumMath.toRadians(
    config.headingDegrees
  );

  const duration = 30;

  for (let i = 1; i <= duration; i++) {
    const distance =
      (config.distanceMeters * i) / duration;

    const east =
      config.offsetX +
      Math.sin(heading) * distance;

    const north =
      config.offsetY +
      Math.cos(heading) * distance;

    // Small visual altitude change.
    const altitude =
      35 + 20 * Math.sin((i / duration) * Math.PI);

    const point = offsetFromShip(
      shipPosition,
      east,
      north,
      altitude
    );

    const time = JulianDate.addSeconds(
      launchTime,
      i,
      new JulianDate()
    );

    position.addSample(time, point);
  }

  const drone = viewer.entities.add({
    name: config.id,

    availability: undefined,

    position,

    orientation: new VelocityOrientationProperty(
      position
    ),

    // Simple geometric representation of a UAV.
    ellipsoid: {
      radii: new Cartesian3(7, 3, 1.5),
      material: Color.CYAN.withAlpha(0.9),
    },

    path: {
      show: true,
      width: 2,
      leadTime: 0,
      trailTime: 120,
      material: Color.CYAN.withAlpha(0.7),
    },

    label: {
      text: config.id,
      font: "12px sans-serif",
      fillColor: Color.WHITE,
      style: LabelStyle.FILL,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: new Cartesian3(0, -15, 0),
    },
  });

  return drone;
}

// ------------------------------------------------------------
// Clock
// ------------------------------------------------------------

const start = JulianDate.now();

viewer.clock.startTime = JulianDate.clone(start);
viewer.clock.currentTime = JulianDate.clone(start);

viewer.clock.stopTime = JulianDate.addSeconds(
  start,
  50,
  new JulianDate()
);

viewer.clock.clockRange =
  2; // LOOP_STOP

viewer.clock.multiplier = 1;
viewer.clock.shouldAnimate = true;

// ------------------------------------------------------------
// Create swarm
// ------------------------------------------------------------

for (const config of swarm) {
  createDrone(config, start);
}

// ------------------------------------------------------------
// Camera
// ------------------------------------------------------------

viewer.camera.flyTo({
  destination: Cartesian3.fromDegrees(
    72.01,
    15.005,
    5000
  ),

  orientation: {
    heading: CesiumMath.toRadians(0),
    pitch: CesiumMath.toRadians(-45),
    roll: 0,
  },
});

// ------------------------------------------------------------
// Optional UI: restart demonstration
// ------------------------------------------------------------

const restartButton = document.getElementById(
  "restart"
);

restartButton?.addEventListener("click", () => {
  viewer.clock.currentTime =
    JulianDate.clone(viewer.clock.startTime);

  viewer.clock.shouldAnimate = true;
});

index.html

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Cesium UAV Swarm Demonstration</title>

  <style>
    html,
    body,
    #cesiumContainer {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    #restart {
      position: absolute;
      top: 15px;
      left: 15px;
      z-index: 10;

      padding: 8px 14px;
      border: 0;
      border-radius: 4px;

      background: #222;
      color: white;

      cursor: pointer;
    }

    #restart:hover {
      background: #444;
    }
  </style>
</head>

<body>
  <div id="cesiumContainer"></div>

  <button id="restart">
    Restart Demonstration
  </button>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>
