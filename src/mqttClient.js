// src/mqttClient.js
const URL  = import.meta.env.VITE_MQTT_URL  || "wss://mqtt.modelsofbrainwing.com:8083";
const USER = import.meta.env.VITE_MQTT_USER || "reactuser";
const PASS = import.meta.env.VITE_MQTT_PASS || "scaleModel";

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
  const mqtt = await loadMqttUmd();        // <- UMD exposes window.mqtt
  client = mqtt.connect(URL, {
    username: USER,
    password: PASS,
    protocolVersion: 4,
    reconnectPeriod: 1500,
    connectTimeout: 10_000,
    clean: true,
  });
  return client;
}

export async function publish(topic, payload, opts = { qos: 0, retain: false }) {
    console.log("[PUB]", topic, payload);

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
  c.on("message", handler);
}
