let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;
let showCalibration = false;

let orientationQ = [0, 0, 0];
let quaternion = [1, 0, 0, 0];
let calibration = [0, 0, 0, 0];

const maxLogLength = 500;
const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000];
const log = document.getElementById('log');
const butConnect = document.getElementById('butConnect');
const baudRate = document.getElementById('baudRate');
const lightSS = document.getElementById('light');
const darkSS = document.getElementById('dark');
const calContainer = document.getElementById('calibration');
const logContainer = document.getElementById("log-container");



document.addEventListener('DOMContentLoaded', () => {
  butConnect.addEventListener('click', clickConnect);
  baudRate.addEventListener('change', changeBaudRate);

  if ('serial' in navigator) {
    const notSupported = document.getElementById('notSupported');
    notSupported.classList.add('hidden');
  }


  initBaudRate();
  loadAllSettings();
  enableStyleSheet(darkSS, true);
});

/**
 * @name connect
 * Opens a Web Serial connection to a micro:bit and sets up the input and
 * output stream.
 */
async function connect() {
  // - Request a port and open a connection.
  port = await navigator.serial.requestPort();
  // - Wait for the port to open.toggleUIConnected
  await port.open({ baudRate: baudRate.value });

  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable
    .pipeThrough(new TransformStream(new LineBreakTransformer()));

  reader = inputStream.getReader();
  readLoop().catch(async function(error) {
    toggleUIConnected(false);
    await disconnect();
  });
  controls.reset();
}

/**
 * @name disconnect
 * Closes the Web Serial connection.
 */
async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }

  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }

  await port.close();
  port = null;
  showCalibration = false;
}

/**
 * @name readLoop
 * Reads data from the input stream and displays it on screen.
 */
async function readLoop() {
  while (true) {
    const {value, done} = await reader.read();
    if (value) {
      let plotdata;
      orientationQ = value.trim().split(" ").map(x=>+x);
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}

function logData(line) {
  // Update the Log
  log.innerHTML = "<h1>"+line.replace(/\s/g,"<br>")+ "</h1>";

  // Remove old log content
  if (log.textContent.split("\n").length > maxLogLength + 1) {
    let logLines = log.innerHTML.replace(/(\n)/gm, "").split("<br>");
    log.innerHTML = logLines.splice(-maxLogLength).join("<br>\n");
  }

}

function enableStyleSheet(node, enabled) {
  node.disabled = !enabled;
}


/**
 * @name reset
 * Reset the Plotter, Log, and associated data
 */
async function reset() {
  // Clear the data
  log.innerHTML = "";
}

/**
 * @name clickConnect
 * Click handler for the connect/disconnect button.
 */
async function clickConnect() {
  if (port) {
    await disconnect();
    toggleUIConnected(false);
    return;
  }

  await connect();

  reset();

  toggleUIConnected(true);
}


/**
 * @name changeBaudRate
 * Change handler for the Baud Rate selector.
 */
async function changeBaudRate() {
  saveSetting('baudrate', baudRate.value);
}



/**
 * @name clickClear
 * Click handler for the clear button.
 */
async function clickClear() {
  reset();
}

/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines.
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = '';
  }

  transform(chunk, controller) {
    this.container += chunk;
    const lines = this.container.split('\n');
    this.container = lines.pop();
    lines.forEach(line => {
      controller.enqueue(line)
      logData(line);
    });
  }

  flush(controller) {
    controller.enqueue(this.container);
  }
}

function convertJSON(chunk) {
  try {
    let jsonObj = JSON.parse(chunk);
    jsonObj._raw = chunk;
    return jsonObj;
  } catch (e) {
    return chunk;
  }
}

function toggleUIConnected(connected) {
  let lbl = 'Connect';
  if (connected) {
    lbl = 'Disconnect';
  }
  butConnect.textContent = lbl;
}

function initBaudRate() {
  for (let rate of baudRates) {
    var option = document.createElement("option");
    option.text = rate + " Baud";
    option.value = rate;
    baudRate.add(option);
  }
}

function loadAllSettings() {
  // Load all saved settings or defaults
  baudRate.value = loadSetting('baudrate', 115200);
}

function loadSetting(setting, defaultValue) {
  let value = JSON.parse(window.localStorage.getItem(setting));
  if (value == null) {
    return defaultValue;
  }

  return value;
}



function saveSetting(setting, value) {
  window.localStorage.setItem(setting, JSON.stringify(value));
}


var wZ= 0
var xZ= 0
var yZ = 0 
var zZ = 1


function calibrate()
{
  wZ = orientationQ[0]
  xZ = orientationQ[1]
  yZ = orientationQ[2]
  zZ = orientationQ[3]
  // reset orbit controls
  controls.reset();
}

const geometry = new THREE.BoxGeometry( 25, 25, 25 );


/** Elements that aren't the focus of the example */
const scene = new THREE.Scene();

// transparent: true, opacity: 0.5
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth/2, window.innerHeight/2);
document.getElementById('scene').appendChild(renderer.domElement);

const material = new THREE.MeshNormalMaterial();

const mesh = new THREE.Mesh(geometry, material);

mesh.scale.x = 0.1;
mesh.scale.y = 0.1;
mesh.scale.z = 0.1;

scene.add(mesh);

camera.position.z = 5;

// add axes
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const frontSpot = new THREE.SpotLight(0xeeeece);
frontSpot.position.set(1000, 1000, 1000);
scene.add(frontSpot);

const frontSpot2 = new THREE.SpotLight(0xddddce);
frontSpot2.position.set(-500, -500, -500);
scene.add(frontSpot2);

// orbit controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;


const animate = function () {
  requestAnimationFrame(animate);

  let rawQ = new THREE.Quaternion(orientationQ[1], orientationQ[2], orientationQ[3], orientationQ[0]);
  let refQ = new THREE.Quaternion(xZ, yZ, zZ, wZ);

  var refQInverse = new THREE.Quaternion().copy(refQ).invert();
  var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQ);

 // transformedQ = swapYZAxesInQuaternion(transformedQ);
//  mesh.quaternion.copy(transformedQ);

 // mesh.rotation.setFromQuaternion(transformedQ.normalize());
  var e = new THREE.Euler().setFromQuaternion(transformedQ.normalize());
  mesh.rotation.set(e.x, e.y, e.z);
  renderer.render(scene, camera);
};

animate();

function swapXZAxesInQuaternion(quat) {
  // Create a quaternion representing a 90-degree rotation around the Y axis
  // This rotation swaps X and Z axes
  let swapQuat = new THREE.Quaternion();
  swapQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // 90-degree rotation around Y

  // Apply the swap quaternion to the original quaternion
  let swappedQuat = quat.clone().premultiply(swapQuat); // Pre-multiply to apply rotation first
  
  return swappedQuat;
}

function swapXYAxesInQuaternion(quat) {
  // Create a quaternion representing a 90-degree rotation around the Z axis
  // This rotation swaps X and Y axes
  let swapQuat = new THREE.Quaternion();
  swapQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2); // 90-degree rotation around Z

  // Apply the swap quaternion to the original quaternion
  let swappedQuat = quat.clone().premultiply(swapQuat); // Pre-multiply to apply rotation first
  
  return swappedQuat;
}

function swapYZAxesInQuaternion(quat) {
  // Create a quaternion representing a 90-degree rotation around the X axis
  // This rotation swaps Y and Z axes
  let swapQuat = new THREE.Quaternion();
  swapQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // 90-degree rotation around X

  // Apply the swap quaternion to the original quaternion
  let swappedQuat = quat.clone().premultiply(swapQuat); // Pre-multiply to apply rotation first
  
  return swappedQuat;
}


function invertXAxisInQuaternion(quat) {
  // Create a quaternion representing a 180-degree rotation around the Y axis
  let invertYQuat = new THREE.Quaternion();
  invertYQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // 180-degree rotation around Y

  // Create a quaternion representing a 180-degree rotation around the Z axis
  let invertZQuat = new THREE.Quaternion();
  invertZQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI); // 180-degree rotation around Z

  // Apply the inversion quaternions to the original quaternion
  let invertedQuat = quat.clone().premultiply(invertYQuat).premultiply(invertZQuat); // Pre-multiply to apply rotation first
  
  return invertedQuat;
}

function calibrateQuaternion(rawQuaternion, referenceQuaternion) {
  // Normalize the quaternions to ensure proper rotation calculations
  rawQuaternion.normalize();
  referenceQuaternion.normalize();
  
  // Invert the reference quaternion (to use it as a correction factor)
  let correctionQuat = referenceQuaternion.clone().invert();
  
  // Apply the correction to the raw quaternion
  let calibratedQuaternion = rawQuaternion.clone().multiply(correctionQuat);
  
  // Return the calibrated quaternion
  return calibratedQuaternion;
}