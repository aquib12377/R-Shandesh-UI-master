import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import "../App.css";

export default function Navbar({ onSelect }) {
  const containerRef = useRef(null);
  const buttonRefs = useRef({});
  const [selectedWing, setSelectedWing] = useState(null);

  // NEW: lock the last-clicked wing until another wing is clicked
  const [lockedWing, setLockedWing] = useState(null);

  const wings = [
    { id: "a-wing", label: "A-Wing" },
    { id: "b-wing", label: "B-Wing" },
    { id: "shops", label: "Shops" }
  ];

  const animateGradientFromPoint = (x, y, name) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const maxRadius = Math.hypot(rect.width, rect.height);
    const targetRadius = Math.min(220, maxRadius);

    container.style.setProperty("--x", `${x}px`);
    container.style.setProperty("--y", `${y}px`);

    gsap.killTweensOf(container);
    gsap.set(container, { "--r": 0 });
    gsap.to(container, {
      duration: 0.45,
      ease: "power3.out",
      "--r": targetRadius,
    });

    const btn = buttonRefs.current[name];
    if (btn) {
      gsap.killTweensOf(btn);
      gsap.set(btn, { "--br": 0 });
      gsap.to(btn, { duration: 0.35, ease: "power3.out", "--br": 120 });
    }
  };

  const handleContainerMouseMove = (event) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    target.style.setProperty("--x", `${mouseX}px`);
    target.style.setProperty("--y", `${mouseY}px`);
    target.style.setProperty("--b", `1`);
  };

  const rippleMouseMove = (e, btn) => {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    if (btn.querySelector("span")) {
      btn.querySelector("span").remove();
    }
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.position = "absolute";
    ripple.style.borderRadius = "50%";
    ripple.style.background = "#626478";
    ripple.style.pointerEvents = "none";
    ripple.style.transform = "scale(0)";
    ripple.style.opacity = "1";
    ripple.style.zIndex = "-1";

    btn.appendChild(ripple);

    gsap.to(ripple, {
      scale: 4,
      duration: 1.5,
      ease: "power2.out",
    });
  };

  const rippleMouseLeave = (e, btn) => {
    const ripple = btn.querySelector("span");
    if (ripple) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      gsap.to(ripple, {
        opacity: 0,
        duration: 1,
        scale: 0,
        ease: "power1.out",
        onComplete: () => ripple.remove(),
      });
    }
  };

  const handleContainerMouseLeave = (event) => {
    const target = event.currentTarget;
    target.style.setProperty("--x", `500%`);
    target.style.setProperty("--y", `500%`);
  };

  const handleWingClick = (wingId, e) => {
    // If this wing is locked (last clicked), ignore
    if (lockedWing === wingId) return;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      animateGradientFromPoint(x, y, `wing-${wingId}`);
    }

    // No toggle-off: select & lock this wing until another wing is clicked
    setSelectedWing(wingId);
    setLockedWing(wingId);

    if (onSelect) onSelect("wing", wingId);
    // console.log("Wing clicked:", wingId);
  };

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ fontFamily: 'Gotham-Office, sans-serif' }}>
      <div
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
        className="drop-container overflow-hidden w-fit h-fit text-nowrap text-white bottom-2 left-1/2 transform -translate-x-1/2 p-2 z-[99999] absolute bg-clip-padding backdrop-blur-sm border-4 border-[#385270]
         rounded-4xl flex justify-center items-center gap-16 
         max-sm:gap-1 max-sm:bottom-1 max-sm:border-2 max-sm:p-0.5 
         max-md:gap-0 max-md:bottom-1 max-md:border-2 max-md:p-0.5 max-md:justify-between
         max-lg:gap-0 max-lg:bottom-2 max-lg:border-2 max-lg:p-1 max-lg:justify-between 
         max-xl:p-2 max-xl:gap-0 max-xl:justify-between"
        style={{
          "--x": "500%",
          "--y": "500%",
          "--r": "160px",
          backgroundImage:
            "radial-gradient(var(--r) var(--r) at var(--x) var(--y), rgba(255, 208, 117, 0.8), rgba(255,255,255,0) 40%)",
        }}
      >
        {/* Wing Navigation Buttons */}
        {wings.map((wing) => {
          const disabled = lockedWing === wing.id;
          return (
            <div className="flex items-center" key={wing.id}>
              <button
                ref={(el) => {
                  if (el) buttonRefs.current[`wing-${wing.id}`] = el;
                }}
                onMouseEnter={(e) => !disabled && rippleMouseMove(e, e.currentTarget)}
                onMouseLeave={(e) => !disabled && rippleMouseLeave(e, e.currentTarget)}
                onClick={(e) => !disabled && handleWingClick(wing.id, e)}
                disabled={disabled}
                aria-disabled={disabled}
                className={`dropbox-btn font-zap uppercase overflow-hidden text-shadow-lg p-1 px-3 rounded-2xl transition-all duration-300 relative 
                  max-sm:px-1 max-sm:p-0.5 max-sm:text-[8px] 
                  max-md:px-2 max-md:p-1 max-md:text-[10px] 
                  max-lg:px-2 max-lg:p-1 max-lg:text-[12px]
                  max-xl:px-2 max-xl:p-1 max-xl:text-[12px]
                  max-2xl:px-2 max-2xl:p-1 max-2xl:text-[14px]
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
                style={
                  selectedWing === wing.id
                    ? { backgroundColor: "#404566" }
                    : {}
                }
              >
                {wing.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
