import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { createPortal } from "react-dom";
import "../App.css";

export default function ButtonTray({ onSelect }) {
  const containerRef = useRef(null);
  const buttonRefs = useRef({});
  const submenuRef = useRef(null);

  const [selectedButton, setSelectedButton] = useState(null);
  const [showSubmenu, setShowSubmenu] = useState(null); // "3" for BHK, null otherwise
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // NEW: lock the last-clicked control ("button:ID" or "submenu:PARENT-ITEM")
  const [lockedKey, setLockedKey] = useState(null);
  const keyOf = (type, value) =>
    type === "button" ? `button:${value}` : `submenu:${value.parent}-${value.item}`;

  const buttons = [
    { id: "1", label: "Pattern", hasSubmenu: false },
    { id: "2", label: "Podium", hasSubmenu: false }, // 1) Shop → Podium
    {
      id: "3",
      label: "BHK",
      hasSubmenu: true,
      submenuItems: [
        { id: "1", label: "3BHK" },
        { id: "2", label: "4BHK" },
      ],
    },
    { id: "4", label: "Surround Lights", hasSubmenu: false },
    { id: "5", label: "All Lights ON ", hasSubmenu: false },
    { id: "6", label: "OFF", hasSubmenu: false },
  ];

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0
      );
    };
    checkTouch();
    window.addEventListener("resize", checkTouch);
    return () => window.removeEventListener("resize", checkTouch);
  }, []);

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
    if (isTouchDevice) return;
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
        onComplete: () => {
          ripple.remove();
        },
      });
    }
  };

  const handleContainerMouseLeave = (event) => {
    if (isTouchDevice) return;
    const target = event.currentTarget;
    target.style.setProperty("--x", `500%`);
    target.style.setProperty("--y", `500%`);
  };

  const handleSubmenuMouseMove = (event) => {
    if (isTouchDevice) return;
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    target.style.setProperty("--lx", `${mouseX}px`);
    target.style.setProperty("--ly", `${mouseY}px`);
  };

  // Keep BHK open: do NOT close on mouse leave for BHK
  const handleSubmenuMouseLeave = (event) => {
    if (isTouchDevice) return;
    if (showSubmenu === "3") return; // sticky BHK
    closeSubmenu();
  };

  const openSubmenu = (buttonId) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (showSubmenu !== buttonId && !isAnimating) {
      setShowSubmenu(buttonId);
    }
  };

  const closeSubmenu = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    const delay = isTouchDevice ? 0 : 150;

    hoverTimeoutRef.current = setTimeout(() => {
      if (isAnimating) return;
      setIsAnimating(true);
      if (submenuRef.current) {
        gsap.to(submenuRef.current, {
          opacity: 0,
          scale: 0.8,
          y: 20,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => {
            setShowSubmenu(null);
            setIsAnimating(false);
          },
        });
      } else {
        setShowSubmenu(null);
        setIsAnimating(false);
      }
    }, delay);
  };

  // Don’t auto-close BHK on hover out
  const handleButtonMouseEnter = (buttonId) => {
    if (isTouchDevice) return;
    const button = buttons.find((b) => b.id === buttonId);
    if (button?.hasSubmenu) {
      openSubmenu(buttonId);
    }
  };

  const handleButtonMouseLeave = (buttonId) => {
    if (isTouchDevice) return;
    const button = buttons.find((b) => b.id === buttonId);
    if (button?.hasSubmenu) {
      if (buttonId === "3") return; // sticky BHK
      closeSubmenu();
    }
  };

  const handleSubmenuMouseEnter = () => {
    if (isTouchDevice) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const isLocked = (k) => lockedKey && lockedKey === k;

  const handleButtonClick = (buttonId, e) => {
    e.preventDefault();

    // If this exact control is locked, ignore
    const k = keyOf("button", buttonId);
    if (isLocked(k)) return;

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      animateGradientFromPoint(x, y, `btn-${buttonId}`);
    }

    const button = buttons.find((b) => b.id === buttonId);

    // For submenu button (BHK)
    if (button?.hasSubmenu) {
      // Desktop: always open & keep open
      if (!isTouchDevice) {
        openSubmenu(buttonId);
        // lock the BHK button itself to prevent re-click until another control is clicked
        setLockedKey(k);
        return;
      }
      // Touch: toggle open/close (but lock on click)
      if (showSubmenu === buttonId) {
        // Keep BHK sticky even on touch (optional: comment to allow toggle close)
        openSubmenu(buttonId);
      } else {
        openSubmenu(buttonId);
      }
      setLockedKey(k);
      return;
    }

    // Non-submenu main buttons: close any submenu (this is the ONLY way BHK closes)
    if (showSubmenu) setShowSubmenu(null);

    // Toggle selected state for visual only (kept from your code)
    const newSelected = selectedButton === buttonId ? null : buttonId;
    setSelectedButton(newSelected);

    // Click-lock this button until another control is clicked
    setLockedKey(k);

    if (onSelect) {
      onSelect("button", newSelected);
    }

    // console.log("Button clicked:", buttonId);
  };

  const handleSubmenuItemClick = (parentId, itemId, e) => {
    e.preventDefault();

    const k = keyOf("submenu", { parent: parentId, item: itemId });
    if (isLocked(k)) return; // locked, ignore

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      animateGradientFromPoint(x, y, `submenu-${itemId}`);
    }

    if (onSelect) {
      onSelect("submenu", { parent: parentId, item: itemId });
    }

    // 2) Keep BHK menu OPEN after selecting 3/4BHK
    if (parentId !== "3") {
      setShowSubmenu(null);
    }

    // 3) Lock the clicked submenu item
    setLockedKey(k);

    // console.log("Submenu item clicked:", parentId, itemId);
  };

  // Touch ripples
  const handleTouchStart = (e, btn) => {
    if (!isTouchDevice) return;
    const touch = e.touches[0];
    rippleMouseMove({ clientX: touch.clientX, clientY: touch.clientY }, btn);
  };

  const handleTouchEnd = (e, btn) => {
    if (!isTouchDevice) return;
    const touch = e.changedTouches[0];
    rippleMouseLeave({ clientX: touch.clientX, clientY: touch.clientY }, btn);
  };

  useEffect(() => {
    if (submenuRef.current && showSubmenu && !isAnimating) {
      gsap.fromTo(
        submenuRef.current,
        { opacity: 0, scale: 0.8, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power3.out" }
      );
    }
  }, [showSubmenu, isAnimating]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Outside click: do NOT close if BHK is open (sticky)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showSubmenu) return;
      if (showSubmenu === "3") return; // keep BHK open until another main button click
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        submenuRef.current &&
        !submenuRef.current.contains(event.target)
      ) {
        setShowSubmenu(null);
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }
    };

    const ev = isTouchDevice ? "touchstart" : "mousedown";
    document.addEventListener(ev, handleClickOutside);
    return () => document.removeEventListener(ev, handleClickOutside);
  }, [showSubmenu, isTouchDevice]);

  return (
    <div
      className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[99998]"
      style={{ fontFamily: "Gotham-Office, sans-serif" }}
    >
      <div
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
        className="drop-container overflow-hidden w-fit h-fit text-nowrap text-white p-3 bg-clip-padding backdrop-blur-sm border-4 border-[#385270]
         rounded-4xl flex flex-col justify-center items-center gap-3 
         max-sm:gap-2 max-sm:border-2 max-sm:p-2 
         max-md:gap-2 max-md:border-2 max-md:p-2 
         max-lg:gap-3 max-lg:border-2 max-lg:p-2 
         max-xl:p-3 max-xl:gap-3"
        style={{
          "--x": "500%",
          "--y": "500%",
          "--r": "160px",
          backgroundImage:
            "radial-gradient(var(--r) var(--r) at var(--x) var(--y), rgba(255, 208, 117, 0.8), rgba(255,255,255,0) 40%)",
        }}
      >
        {buttons.map((button) => {
          const k = keyOf("button", button.id);
          const disabled = lockedKey === k;
          return (
            <div className="relative" key={button.id}>
              <button
                ref={(el) => {
                  if (el) buttonRefs.current[`btn-${button.id}`] = el;
                }}
                onMouseEnter={(e) => {
                  if (!isTouchDevice) {
                    rippleMouseMove(e, e.currentTarget);
                    handleButtonMouseEnter(button.id);
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isTouchDevice) {
                    rippleMouseLeave(e, e.currentTarget);
                    handleButtonMouseLeave(button.id);
                  }
                }}
                onTouchStart={(e) => handleTouchStart(e, e.currentTarget)}
                onTouchEnd={(e) => handleTouchEnd(e, e.currentTarget)}
                onClick={(e) => !disabled && handleButtonClick(button.id, e)}
                disabled={disabled}
                aria-disabled={disabled}
                className={`dropbox-btn font-zap uppercase overflow-hidden text-shadow-lg p-2 px-4 rounded-2xl transition-all duration-300 relative whitespace-nowrap
                  max-sm:px-2 max-sm:p-1 max-sm:text-[8px] 
                  max-md:px-3 max-md:p-1.5 max-md:text-[10px] 
                  max-lg:px-3 max-lg:p-1.5 max-lg:text-[12px]
                  max-xl:px-4 max-xl:p-2 max-xl:text-[14px]
                  max-2xl:px-4 max-2xl:p-2 max-2xl:text-[14px]
                  ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer active:bg-[#404566]"}
                `}
                style={
                  selectedButton === button.id || showSubmenu === button.id
                    ? { backgroundColor: "#404566" }
                    : {}
                }
              >
                {button.label}
                {button.hasSubmenu && <span className="ml-2 text-xs">▶</span>}
              </button>
            </div>
          );
        })}
      </div>

      {(showSubmenu || isAnimating) &&
        createPortal(
          <div
            ref={submenuRef}
            onMouseMove={handleSubmenuMouseMove}
            onMouseLeave={handleSubmenuMouseLeave}
            onMouseEnter={handleSubmenuMouseEnter}
            className="fixed right-58 top-1/2 transform -translate-y-1/2 p-2 z-[100000] flex flex-col gap-2 border-2 rounded-xl bg-clip-padding backdrop-blur-3xl border-solid border-[rgb(187,174,99)] 
            max-sm:right-32 max-sm:border-1 max-sm:rounded-md max-sm:gap-1 max-sm:p-1 
            max-md:right-36 max-md:border-1 max-md:rounded-lg max-md:gap-1 max-md:p-1 
            max-lg:right-44 max-lg:rounded-lg max-lg:gap-2 max-lg:p-1
            max-xl:right-48 max-xl:p-2 max-xl:gap-2"
            style={{
              "--lx": "50%",
              "--ly": "50%",
              "--lr": "120px",
              backgroundImage:
                "radial-gradient(var(--lr) var(--lr) at var(--lx) var(--ly), rgba(255,255,255,0.2), rgba(255,255,255,0) 55%)",
              backgroundColor: "rgba(24,26,61,0.67)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              minWidth: "180px",
            }}
          >
            {showSubmenu &&
              buttons
                .find((b) => b.id === showSubmenu)
                ?.submenuItems?.map((item) => {
                  const k = keyOf("submenu", { parent: showSubmenu, item: item.id });
                  const disabled = lockedKey === k;
                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        if (el) buttonRefs.current[`submenu-${item.id}`] = el;
                      }}
                      onMouseEnter={(e) =>
                        !isTouchDevice && rippleMouseMove(e, e.currentTarget)
                      }
                      onMouseLeave={(e) =>
                        !isTouchDevice && rippleMouseLeave(e, e.currentTarget)
                      }
                      onTouchStart={(e) => handleTouchStart(e, e.currentTarget)}
                      onTouchEnd={(e) => handleTouchEnd(e, e.currentTarget)}
                      onClick={(e) =>
                        !disabled && handleSubmenuItemClick(showSubmenu, item.id, e)
                      }
                      disabled={disabled}
                      aria-disabled={disabled}
                      className={`overflow-hidden uppercase text-shadow-lg text-white p-2 px-3 rounded-md transition-all duration-300 relative text-left flex-shrink-0 whitespace-nowrap
                        max-sm:px-2 max-sm:p-1 max-sm:rounded-xs max-sm:text-[8px]  
                        max-md:px-2 max-md:p-1.5 max-md:rounded-xs max-md:text-[10px]   
                        max-lg:px-3 max-lg:p-1.5 max-lg:rounded-sm max-lg:text-[12px]
                        max-2xl:px-3 max-2xl:p-2 max-2xl:rounded-sm max-2xl:text-[13px]
                        hover:bg-[rgba(255,208,117,0.3)] active:bg-[rgba(255,208,117,0.3)]
                        ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}
                      `}
                    >
                      {item.label}
                    </button>
                  );
                })}
          </div>,
          document.body
        )}
    </div>
  );
}
