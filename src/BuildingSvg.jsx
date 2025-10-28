// BuildingSvg.jsx
import { useState, useRef, useEffect } from "react";
import Navbar from "./components/Navbar";
import ButtonTray from "./components/Buttons";
import {
  t, getClient, publish, subscribe, onMessage,
  recordAck, startHeartbeat, stopHeartbeat, isDeviceAlive
} from "./mqttClient";

export default function BuildingOverlay() {
  const [floors] = useState([
    { id: 'a-wing', d: "m 395.75,135.28189 67.13911,-49.316769 8.41617,4.208083 11.49959,-6.63929 173.94459,132.832086 111.37111,-54.41031 1.27524,320.08566 -374.07089,73.96402 z", label: "A-WING" },
    { id: 'b-wing', d: "m 770.24597,161.95569 115.19683,-55.26047 28.46262,42.39114 13.07512,-6.6127 43.88429,65.22529 -0.93726,4.20371 3.93199,4.03826 0.10627,6.80129 7.65145,-2.1254 1.38151,10.83955 5.73859,-1.91286 v -34.21898 l 58.47412,-21.59081 76.9478,167.72215 -4.2081,264.50807 -242.58493,-139.8631 -107.54538,22.74181 z", label: "B-WING" },
    { id: 'shops',  d: "m 346.86626,603.55931 530.81959,-78.75126 254.88955,110.61246 0.6012,92.57782 -260.90114,30.65889 -524.80805,-21.64157 z", label: "SHOPS" }
  ]);

  const [selectedWing, setSelectedWing] = useState(null);
  const [hoveredWing, setHoveredWing]   = useState(null);
  const [brokerConnected, setBrokerConnected] = useState(false); // raw MQTT
  const [deviceConnected, setDeviceConnected] = useState(false); // ESP32 presence via ACKs
  const svgRef = useRef(null);

  // ---- MQTT wiring + presence heartbeat ----
  useEffect(() => {
    let stopHb = null;

    (async () => {
      const c = await getClient();

      const onConnect = () => {
        setBrokerConnected(true);
        subscribe(t("ui/ack"));    // ESP32 ACKs
        subscribe(t("ui/status")); // optional: 'online'/'offline' LWT
        // start heartbeat pings in background
        stopHb = startHeartbeat(5000);
        // kick one immediate ping so status flips quickly
        publish(t("ui/cmd"), { type: "ping", ts: Date.now() });
      };
      const onClose = () => {
        setBrokerConnected(false);
        setDeviceConnected(false); // broker down -> device unknown
        stopHeartbeat();
      };

      c.on("connect", onConnect);
      c.on("close",   onClose);

      onMessage((topic, msg) => {
        const s = msg.toString();
        if (topic === t("ui/ack")) {
          // any ACK counts as device alive
          recordAck();
          // debounce UI: only mark alive if last ACK < 12s ago
          setDeviceConnected(isDeviceAlive());
          try {
            const j = JSON.parse(s);
            // (optional) use j.ok/j.type if you want to surface details
            // console.log("ACK:", j);
          } catch { /* ignore */ }
        } else if (topic === t("ui/status")) {
          // if your ESP32 publishes 'online' retained at connect and LWT 'offline'
          if (s === "offline") setDeviceConnected(false);
          if (s === "online")  setDeviceConnected(true);
        } else {
          // other topics if any
          // console.log("MQTT:", topic, s);
        }
      });
    })();

    // soft background checker to age out deviceConnected if no ACKs for 12s
    const ageTimer = setInterval(() => {
      setDeviceConnected(isDeviceAlive());
    }, 2000);

    return () => {
      clearInterval(ageTimer);
      stopHeartbeat?.();
      try {
        const c = clientMaybe(); // best-effort: remove listeners if present
        c?.off?.("connect");
        c?.off?.("close");
      } catch {}
    };
  }, []);

  // helper for cleanup (optional)
  const clientMaybe = () => {
    try { return window.__mqtt_client_ref; } catch { return null; }
  };

  // ---- ID → LABEL maps that mirror Buttons.jsx ----
  const MAIN_BY_ID = {
    "1": "Pattern",
    "4": "Surround Lights",
    "5": "All Lights ON",
    "6": "OFF",
  };
  const PARENT_BY_ID = { "2": "Podium", "3": "BHK" };
  const SUB_BY_PARENT_ID = {
    "2": { "1": "Landscape", "2": "Parking", "3": "Shops" },
    "3": { "1": "3BHK",      "2": "4BHK" }
  };

  // --- publish helpers (trimmed labels) ---
  function publishMain(labelRaw) {
    const label = (labelRaw || "").trim();
    switch (label) {
      case "Pattern":         publish(t("ui/cmd"), { type: "pattern"   }); break;
      case "Surround Lights": publish(t("ui/cmd"), { type: "surround"  }); break;
      case "All Lights ON":   publish(t("ui/cmd"), { type: "all_on"    }); break;
      case "OFF":             publish(t("ui/cmd"), { type: "all_off"   }); break;
      default:
        console.warn("[BTN] Unmapped main label:", labelRaw);
    }
  }
  function publishSub(parentLabelRaw, subLabelRaw) {
    const parent = (parentLabelRaw || "").trim();
    const item   = (subLabelRaw   || "").trim();
    if (parent === "Podium") publish(t("ui/cmd"), { type: "podium", item });
    else if (parent === "BHK") publish(t("ui/cmd"), { type: "bhk", item });
    else console.warn("[BTN] Unmapped submenu:", parentLabelRaw, subLabelRaw);
  }

  // --- adapter that matches Buttons.jsx ("button", id) / ("submenu", {parent,item}) ---
  const handleButtonSelect = (type, value) => {
    if (type === "button") {
      if (!value) return; // deselect
      const label = MAIN_BY_ID[String(value)];
      if (label) publishMain(label);
      else console.warn("[BTN] Unknown main id:", value);
      return;
    }
    if (type === "submenu" && value && value.parent && value.item) {
      const parentLabel = PARENT_BY_ID[String(value.parent)];
      const itemLabel   = (SUB_BY_PARENT_ID[String(value.parent)] || {})[String(value.item)];
      if (parentLabel && itemLabel) publishSub(parentLabel, itemLabel);
      else console.warn("[BTN] Unknown submenu ids:", value);
      return;
    }
    console.warn("[BTN] Unknown (type,value):", type, value);
  };

  // ---- Existing wing hover/click logic ----
  const getFloorFillColor = (floor) =>
    selectedWing === floor.id ? "rgba(208, 170, 45, 0.5)" : "rgba(0, 0, 0, 0.22)";

  const handleNavbarSelect = (type, value) => {
    if (type === "wing") {
      setSelectedWing(value);
      if (svgRef.current) {
        floors.forEach((floor) => {
          const el = svgRef.current.querySelector(`#${floor.id}`);
          if (!el) return;
          el.style.fill = (value === floor.id)
            ? "rgba(208, 170, 45, 0.5)"
            : "rgba(0, 0, 0, 0.22)";
        });
      }
      publish(t("ui/cmd"), { type: "wing_select", wing: value });
    }
  };

  const handleFloorMouseEnter = (floor, event) => {
    event.target.style.fill = "rgba(208, 170, 45, 0.5)";
    if (floor.id === 'a-wing' || floor.id === 'b-wing') setHoveredWing(floor.id);
  };
  const handleFloorMouseLeave = (floor, event) => {
    event.target.style.fill = getFloorFillColor(floor);
    if (floor.id === 'a-wing' || floor.id === 'b-wing') setHoveredWing(null);
  };
  const handleFloorClick = (floor) => {
    publish(t("ui/cmd"), { type: "wing_click", wing: floor.id });
  };

  const getTextPosition = (wingId) => {
    switch (wingId) {
      case 'a-wing': return { x: 500, y: 250 };
      case 'b-wing': return { x: 850, y: 280 };
      default:       return { x: 0,   y: 0   };
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#dedbd4]">
      {/* Presence status — shows ESP32 presence, not raw broker status */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${deviceConnected ? "bg-green-500" : "bg-red-500"}`}/>
        <span className="text-xs text-gray-700">
          {deviceConnected ? "ESP32 connected" : (brokerConnected ? "ESP32 offline" : "Broker offline")}
        </span>
      </div>

      {/* Logo */}
      <div className="fixed top-4 right-10 z-40">
        <img src="/logo.png" alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 md:w-30 md:h-30 object-contain" />
      </div>

      {/* Main Building Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 1150 800"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          style={{ minWidth: '100%', minHeight: '100%' }}
        >
          <image
            href="/building.svg"
            x="0"
            y="-25"
            width="1150"
            height="800"
            preserveAspectRatio="xMidYMid meet"
          />
          <g style={{ transform: 'translate(5px, 75px) scale(0.72)', transformOrigin: '0 0' }}>
            {floors.map((floor) => (
              <g key={floor.id}>
                <path
                  id={floor.id}
                  d={floor.d}
                  fill={getFloorFillColor(floor)}
                  className="cursor-pointer transition-colors duration-200"
                  onMouseEnter={(e) => handleFloorMouseEnter(floor, e)}
                  onMouseLeave={(e) => handleFloorMouseLeave(floor, e)}
                  onClick={() => handleFloorClick(floor)}
                  vectorEffect="non-scaling-stroke"
                />
                {(floor.id === 'a-wing' || floor.id === 'b-wing') && (
                  <text
                    x={getTextPosition(floor.id).x}
                    y={getTextPosition(floor.id).y}
                    fill="#030605"
                    fontSize="32"
                    fontFamily="Spectra"
                    fontWeight="bold"
                    textAnchor="start"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      opacity: hoveredWing === floor.id ? 1 : 0,
                      transition: 'opacity 0.3s ease-in-out',
                      filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))',
                      letterSpacing: '2px'
                    }}
                  >
                    {floor.label}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Navbar + Buttons */}
      <Navbar onSelect={handleNavbarSelect} />
      <ButtonTray onSelect={handleButtonSelect} />
    </div>
  );
}
