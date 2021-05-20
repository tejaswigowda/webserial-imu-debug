let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;
let showCalibration = false;

let orientation = [0, 0, 0];
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
      orientation = value.trim().split(" ").map(x=>+x);
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




function updateCube()
{
  w = orientation[0]
  x = orientation[1]
  y = orientation[2]
  z = orientation[3]
  var q = new Quaternion(w,x,y,z);
  console.log(w, x,y,z)
  document.getElementById("cube").style.transform = 'translateZ(-100px) matrix3d(' + q.conjugate().toMatrix4() + ')';
}

var xZ= 0
var yZ = 0 
var zZ = 0
function calibrate()
{
  xZ = 360- orientation[2]
  yZ = orientation[0]
  zZ = orientation[1]
}

setInterval("updateCube()",1)
