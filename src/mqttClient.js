// src/mqttClient.js
// UMD + CDN loader for mqtt.js (works great with Vite/React without bundler quirks)

const URL  = import.meta.env.VITE_MQTT_URL  || "wss://mqtt.modelsofbrainwing.com:8083/mqtt"; // note /mqtt
const USER = import.meta.env.VITE_MQTT_USER || "reactuser";
const PASS = import.meta.env.VITE_MQTT_PASS || "scaleModel";

// ---------- PROJECT NAMESPACE ----------
export const PROJECT = import.meta.env.VITE_MQTT_PROJECT || "rsandesh";
export const t = (path) => `${PROJECT}/${path}`; // e.g. t('ui/cmd') -> 'rsandesh/ui/cmd'

let client;          // cached MQTT client
let loadingPromise;  // ensures only one script load

function loadMqttUmd() {
  if (typeof window !== "undefined" && window.mqtt) return Promise.resolve(window.mqtt);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mqtt/dist/mqtt.min.js"; // UMD browser build
    s.async = true;
    s.onload = () => resolve(window.mqtt);
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
  return loadingPromise;
}

export async function getClient() {
  if (client) return client;
  const mqtt = await loadMqttUmd(); // UMD exposes window.mqtt

  // Some proxies require the /mqtt path; keep URL overridable via env
  client = mqtt.connect(URL, {
    username: USER,
    password: PASS,
    protocolVersion: 4,     // MQTT 3.1.1
    reconnectPeriod: 1500,
    connectTimeout: 10_000,
    keepalive: 25,
    clean: true,
  });

  // optional: expose for manual debugging
  try { window.__mqtt_client_ref = client; } catch {}

  return client;
}

export async function publish(topic, payload, opts = { qos: 0, retain: false }) {
  // console.log("[PUB]", topic, payload);
  const c = await getClient();
  const msg = typeof payload === "string" ? payload : JSON.stringify(payload);
  if (c.connected) c.publish(topic, msg, opts);
  else c.once("connect", () => c.publish(topic, msg, opts));
}

export async function subscribe(topic, opts = { qos: 0 }) {
  const c = await getClient();
  if (c.connected) c.subscribe(topic, opts);
  else c.once("connect", () => c.subscribe(topic, opts));
}

export async function onMessage(handler) {
  const c = await getClient();
  c.on("message", handler); // (topic, Buffer)
}

/* ---------- HEARTBEAT (presence via ACKs) ----------
   UI will mark ESP32 as "connected" if it receives any ACK on <PROJECT>/ui/ack
   within a rolling window. We also actively ping (type:'ping') periodically.
*/
let lastAckTs = 0;
let hbTimer = null;

export function recordAck() {
  lastAckTs = Date.now();
}

export function isDeviceAlive(withinMs = 12_000) {
  return Date.now() - lastAckTs <= withinMs;
}

/** Start periodic ping; returns a stop() function. */
export function startHeartbeat(intervalMs = 5_000) {
  stopHeartbeat();
  hbTimer = setInterval(() => {
    // Fire-and-forget; ESP32 answers with 'pong' (or any ACK), which updates lastAckTs
    publish(t("ui/cmd"), { type: "ping", ts: Date.now() });
  }, intervalMs);
  return stopHeartbeat;
}

export function stopHeartbeat() {
  if (hbTimer) clearInterval(hbTimer);
  hbTimer = null;
}
