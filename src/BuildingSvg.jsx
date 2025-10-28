import { useState, useRef, useEffect } from "react";
import Navbar from "./components/Navbar";
import ButtonTray from "./components/Buttons";
import { getClient, publish, subscribe, onMessage } from "./mqttClient";


export default function BuildingOverlay() {
  const [floors] = useState([
    { id: 'a-wing', d: "m 395.75,135.28189 67.13911,-49.316769 8.41617,4.208083 11.49959,-6.63929 173.94459,132.832086 111.37111,-54.41031 1.27524,320.08566 -374.07089,73.96402 z", label: "A-WING" },
    { id: 'b-wing', d: "m 770.24597,161.95569 115.19683,-55.26047 28.46262,42.39114 13.07512,-6.6127 43.88429,65.22529 -0.93726,4.20371 3.93199,4.03826 0.10627,6.80129 7.65145,-2.1254 1.38151,10.83955 5.73859,-1.91286 v -34.21898 l 58.47412,-21.59081 76.9478,167.72215 -4.2081,264.50807 -242.58493,-139.8631 -107.54538,22.74181 z", label: "B-WING" },
    { id: 'shops', d: "m 346.86626,603.55931 530.81959,-78.75126 254.88955,110.61246 0.6012,92.57782 -260.90114,30.65889 -524.80805,-21.64157 z", label: "SHOPS" }
  ]);

  const [selectedWing, setSelectedWing] = useState(null);
  const [hoveredWing, setHoveredWing] = useState(null);
  const [mqttConnected, setMqttConnected] = useState(false);
  const svgRef = useRef(null);

useEffect(() => {
  (async () => {
    const c = await getClient();
    c.on("connect", () => {
      c.subscribe("test");
      c.publish("test", "hello from ui");
    });
    onMessage((t, m) => console.log("MQTT:", t, m.toString()));
  })();
}, []);



  // Function to get fill color based on wing selection
  const getFloorFillColor = (floor) => {
    if (selectedWing === floor.id) {
      return "rgba(208, 170, 45, 0.5)"; // Highlight selected wing
    }
    return "rgba(0, 0, 0, 0.22)"; // Default color for all others
  };

  // Handler for navbar selections
  const handleNavbarSelect = (type, value) => {
    console.log("Navbar selection:", type, value);

    if (type === "wing") {
      setSelectedWing(value); // value will be "a-wing", "b-wing", "shops", or null

      // Update all floor paths with new colors
      if (svgRef.current) {
        floors.forEach((floor) => {
          const pathElement = svgRef.current.querySelector(`#${floor.id}`);
          if (pathElement) {
            if (value === floor.id) {
              pathElement.style.fill = "rgba(208, 170, 45, 0.5)"; // Highlight selected
            } else {
              pathElement.style.fill = "rgba(0, 0, 0, 0.22)"; // Reset others
            }
          }
        });
      }
      publish("building/ui/cmd", { type: "wing_select", wing: value });
    }
  };

  const handleFloorMouseEnter = (floor, event) => {
    event.target.style.fill = "rgba(208, 170, 45, 0.5)"; // Brighter on hover

    // Show text label for wings only
    if (floor.id === 'a-wing' || floor.id === 'b-wing') {
      setHoveredWing(floor.id);
    }
  };

  const handleFloorMouseLeave = (floor, event) => {
    event.target.style.fill = getFloorFillColor(floor);

    // Hide text label
    if (floor.id === 'a-wing' || floor.id === 'b-wing') {
      setHoveredWing(null);
    }
  };

  const handleFloorClick = (floor, event) => {
    console.log("Floor clicked:", floor.id);
    publish("building/ui/cmd", { type: "wing_click", wing: floor.id });
  };

  const handleButtonSelect = (type, value) => {
    console.log("Button tray selection:", type, value);
    publish("building/ui/cmd", { type, ...value });
    // Handle button selections here
  }

  // Get text position for each wing
  const getTextPosition = (wingId) => {
    switch (wingId) {
      case 'a-wing':
        return { x: 500, y: 250 }; // Adjust these coordinates as needed
      case 'b-wing':
        return { x: 850, y: 280 }; // Adjust these coordinates as needed
      default:
        return { x: 0, y: 0 };
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#dedbd4]">
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
          <g
            style={{
              transform: 'translate(5px, 75px) scale(0.72)',
              transformOrigin: '0 0'
            }}
          >
            {floors.map((floor) => (
              <g key={floor.id}>
                <path
                  id={floor.id}
                  d={floor.d}
                  fill={getFloorFillColor(floor)}
                  className="cursor-pointer transition-colors duration-200"
                  onMouseEnter={(event) => handleFloorMouseEnter(floor, event)}
                  onMouseLeave={(event) => handleFloorMouseLeave(floor, event)}
                  onClick={(event) => handleFloorClick(floor, event)}
                  vectorEffect="non-scaling-stroke"
                />

                {/* Text labels that appear on hover */}
                {(floor.id === 'a-wing' || floor.id === 'b-wing') && (
                  <text
                    x={getTextPosition(floor.id).x}
                    y={getTextPosition(floor.id).y}
                    fill="#030605" // Golden color
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

      {/* Navbar component */}
      <Navbar onSelect={handleNavbarSelect} />
      <ButtonTray onSelect={handleButtonSelect} />
    </div>
  );
}
