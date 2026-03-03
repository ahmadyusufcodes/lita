type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type HudPosition = {
  x: number;
  y: number;
};

const temperatureInput = document.querySelector<HTMLInputElement>("#temperature");
const brightnessInput = document.querySelector<HTMLInputElement>("#brightness");
const temperatureValue = document.querySelector<HTMLOutputElement>(
  "#temperature-value",
);
const brightnessValue = document.querySelector<HTMLOutputElement>(
  "#brightness-value",
);
const colorReadout = document.querySelector<HTMLElement>("#color-readout");
const lightLayer = document.querySelector<HTMLElement>("#light-layer");
const hud = document.querySelector<HTMLElement>("#hud");
const hudHeader = document.querySelector<HTMLElement>("#hud-header");
const floatingGuide = document.querySelector<HTMLElement>("#floating-guide");
const toggleFullscreenButton =
  document.querySelector<HTMLButtonElement>("#toggle-fullscreen");
const toggleOnTopButton =
  document.querySelector<HTMLButtonElement>("#toggle-on-top");
const toggleControlsButton =
  document.querySelector<HTMLButtonElement>("#toggle-controls");
const revealControlsButton =
  document.querySelector<HTMLButtonElement>("#reveal-controls");
const presetButtons = document.querySelectorAll<HTMLButtonElement>(".preset");

const HUD_POSITION_KEY = "lita.hud.position.v1";
let controlsVisible = true;
let hudPosition: HudPosition = { x: 20, y: 20 };
let activeDragPointerId: number | null = null;
let dragOffset: HudPosition = { x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseHudPosition = (raw: string | null): HudPosition | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    return null;
  }

  return null;
};

const clampHudPosition = (position: HudPosition): HudPosition => {
  const margin = 8;
  const hudWidth = hud?.offsetWidth ?? 0;
  const hudHeight = hud?.offsetHeight ?? 0;
  const maxX = Math.max(margin, window.innerWidth - hudWidth - margin);
  const maxY = Math.max(margin, window.innerHeight - hudHeight - margin);

  return {
    x: clamp(position.x, margin, maxX),
    y: clamp(position.y, margin, maxY),
  };
};

const applyHudPosition = (position: HudPosition) => {
  const clamped = clampHudPosition(position);
  hudPosition = clamped;

  if (hud) {
    hud.style.left = `${clamped.x}px`;
    hud.style.top = `${clamped.y}px`;
  }

  if (revealControlsButton) {
    revealControlsButton.style.left = `${clamped.x}px`;
    revealControlsButton.style.top = `${clamped.y}px`;
  }
};

const persistHudPosition = () => {
  localStorage.setItem(HUD_POSITION_KEY, JSON.stringify(hudPosition));
};

const kelvinToRgb = (kelvin: number): RgbColor => {
  const temp = kelvin / 100;
  let red: number;
  let green: number;
  let blue: number;

  if (temp <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temp) - 161.1195681661;
    blue =
      temp <= 19
        ? 0
        : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    blue = 255;
  }

  return {
    r: clamp(Math.round(red), 0, 255),
    g: clamp(Math.round(green), 0, 255),
    b: clamp(Math.round(blue), 0, 255),
  };
};

const rgbToHex = ({ r, g, b }: RgbColor): string =>
  `#${[r, g, b]
    .map((channel) => clamp(channel, 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const blendWithBlack = ({ r, g, b }: RgbColor, brightness: number): RgbColor => {
  const intensity = clamp(brightness, 10, 100) / 100;
  return {
    r: Math.round(r * intensity),
    g: Math.round(g * intensity),
    b: Math.round(b * intensity),
  };
};

const getSliderState = () => ({
  kelvin: Number(temperatureInput?.value ?? 5200),
  brightness: Number(brightnessInput?.value ?? 100),
});

const updateFloatingGuide = () => {
  if (!floatingGuide) {
    return;
  }

  const { kelvin, brightness } = getSliderState();
  floatingGuide.textContent = `Scroll brightness (${brightness}%) · Shift + Scroll temperature (${kelvin}K) · Drag panel header`;
};

const getTauriWindow = async () => {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  } catch {
    return null;
  }
};

const updateLight = () => {
  const { kelvin, brightness } = getSliderState();
  const lightColor = blendWithBlack(kelvinToRgb(kelvin), brightness);

  if (lightLayer) {
    lightLayer.style.backgroundImage = "none";
    lightLayer.style.backgroundColor = `rgb(${lightColor.r} ${lightColor.g} ${lightColor.b})`;
  }

  if (temperatureValue) {
    temperatureValue.textContent = `${kelvin}K`;
  }

  if (brightnessValue) {
    brightnessValue.textContent = `${brightness}%`;
  }

  if (colorReadout) {
    colorReadout.textContent = rgbToHex(lightColor);
  }

  updateFloatingGuide();

  presetButtons.forEach((button) => {
    const presetKelvin = Number(button.dataset.kelvin);
    button.dataset.active = String(presetKelvin === kelvin);
  });
};

const stepTemperature = (delta: number) => {
  if (!temperatureInput) {
    return;
  }

  const next = clamp(Number(temperatureInput.value) + delta, 1800, 9000);
  temperatureInput.value = `${next}`;
  updateLight();
};

const stepBrightness = (delta: number) => {
  if (!brightnessInput) {
    return;
  }

  const next = clamp(Number(brightnessInput.value) + delta, 10, 100);
  brightnessInput.value = `${next}`;
  updateLight();
};

const updateFullscreenButtonLabel = async () => {
  if (!toggleFullscreenButton) {
    return;
  }

  let isFullscreen = Boolean(document.fullscreenElement);
  const appWindow = await getTauriWindow();
  if (appWindow) {
    isFullscreen = await appWindow.isFullscreen();
  }

  toggleFullscreenButton.textContent = isFullscreen
    ? "Exit Fullscreen"
    : "Enter Fullscreen";
};

const updateOnTopButtonLabel = async () => {
  if (!toggleOnTopButton) {
    return;
  }

  const appWindow = await getTauriWindow();
  if (!appWindow) {
    toggleOnTopButton.textContent = "Always on Top: Unsupported";
    toggleOnTopButton.disabled = true;
    return;
  }

  const isOnTop = await appWindow.isAlwaysOnTop();
  toggleOnTopButton.textContent = `Always on Top: ${isOnTop ? "On" : "Off"}`;
};

const toggleFullscreen = async () => {
  const appWindow = await getTauriWindow();
  if (appWindow) {
    const isFullscreen = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFullscreen);
  } else {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  }

  await updateFullscreenButtonLabel();
};

const toggleAlwaysOnTop = async () => {
  const appWindow = await getTauriWindow();
  if (!appWindow) {
    return;
  }

  const isOnTop = await appWindow.isAlwaysOnTop();
  await appWindow.setAlwaysOnTop(!isOnTop);
  await updateOnTopButtonLabel();
};

const startHudDrag = (event: PointerEvent) => {
  if (event.button !== 0 || !hud) {
    return;
  }

  const rect = hud.getBoundingClientRect();
  dragOffset = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  activeDragPointerId = event.pointerId;
  hud.classList.add("hud--dragging");
  event.preventDefault();
};

const moveHudDrag = (event: PointerEvent) => {
  if (!hud || activeDragPointerId !== event.pointerId) {
    return;
  }

  applyHudPosition({
    x: event.clientX - dragOffset.x,
    y: event.clientY - dragOffset.y,
  });
};

const endHudDrag = (event: PointerEvent) => {
  if (!hud || activeDragPointerId !== event.pointerId) {
    return;
  }

  activeDragPointerId = null;
  hud.classList.remove("hud--dragging");
  persistHudPosition();
};

const handleBackdropWheel = (event: WheelEvent) => {
  const dominantDelta =
    Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (dominantDelta === 0) {
    return;
  }

  const direction = dominantDelta < 0 ? 1 : -1;
  if (event.shiftKey) {
    stepTemperature(100 * direction);
  } else {
    stepBrightness(2 * direction);
  }

  event.preventDefault();
};

const setControlsVisibility = (visible: boolean) => {
  controlsVisible = visible;
  hud?.classList.toggle("hud--hidden", !visible);
  revealControlsButton?.classList.toggle("reveal-controls--visible", !visible);
  if (toggleControlsButton) {
    toggleControlsButton.textContent = visible ? "Hide Controls" : "Show Controls";
  }
};

window.addEventListener("DOMContentLoaded", () => {
  const storedHudPosition = parseHudPosition(localStorage.getItem(HUD_POSITION_KEY));
  applyHudPosition(storedHudPosition ?? hudPosition);

  temperatureInput?.addEventListener("input", updateLight);
  brightnessInput?.addEventListener("input", updateLight);
  hudHeader?.addEventListener("pointerdown", startHudDrag);
  window.addEventListener("pointermove", moveHudDrag);
  window.addEventListener("pointerup", endHudDrag);
  window.addEventListener("pointercancel", endHudDrag);
  lightLayer?.addEventListener("wheel", handleBackdropWheel, { passive: false });
  window.addEventListener("resize", () => applyHudPosition(hudPosition));

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!temperatureInput) {
        return;
      }

      const kelvin = Number(button.dataset.kelvin ?? 5200);
      temperatureInput.value = `${kelvin}`;
      updateLight();
    });
  });

  toggleFullscreenButton?.addEventListener("click", toggleFullscreen);
  toggleOnTopButton?.addEventListener("click", () => {
    void toggleAlwaysOnTop();
  });
  toggleControlsButton?.addEventListener("click", () =>
    setControlsVisibility(!controlsVisible),
  );
  revealControlsButton?.addEventListener("click", () => setControlsVisibility(true));

  window.addEventListener("keydown", (event) => {
    const target = event.target as HTMLElement | null;
    const isTextInput = target?.tagName === "INPUT";

    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void toggleFullscreen();
      return;
    }

    if (event.key.toLowerCase() === "h") {
      event.preventDefault();
      setControlsVisibility(!controlsVisible);
      return;
    }

    if (event.key.toLowerCase() === "a") {
      event.preventDefault();
      void toggleAlwaysOnTop();
      return;
    }

    if (isTextInput) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepTemperature(-100);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepTemperature(100);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      stepBrightness(-2);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      stepBrightness(2);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    void updateFullscreenButtonLabel();
  });

  updateLight();
  void updateFullscreenButtonLabel();
  void updateOnTopButtonLabel();
});
