"use client";

// Floating "Deploy ONLINE" button for development: shows whether there is
// anything to commit or push, and does Commit + Push through /api/deploy.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const POSITION_KEY = "deployWidgetPosition";
const CIRCLE_SIZE = 96;
// A pointer that moves less than this is treated as a click, not a drag.
const DRAG_THRESHOLD = 4;

async function fetchPending() {
  const response = await fetch("/api/deploy", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro ?? "Erro ao consultar o estado");
  return data.pendente;
}

// The saved position lives in localStorage, which only exists in the browser.
// useSyncExternalStore reads it there and uses null on the server.
function subscribeToNothing() {
  return () => {};
}

function readSavedPositionText() {
  try {
    return localStorage.getItem(POSITION_KEY);
  } catch {
    return null;
  }
}

function readSavedPositionOnServer() {
  return null;
}

function parsePosition(text) {
  try {
    const saved = JSON.parse(text);
    return saved ? keepOnScreen(saved.x, saved.y) : null;
  } catch {
    return null;
  }
}

function keepOnScreen(x, y) {
  return {
    x: Math.min(Math.max(0, x), window.innerWidth - CIRCLE_SIZE),
    y: Math.min(Math.max(0, y), window.innerHeight - CIRCLE_SIZE),
  };
}

export default function DeployWidget() {
  const savedPositionText = useSyncExternalStore(
    subscribeToNothing,
    readSavedPositionText,
    readSavedPositionOnServer,
  );
  const [draggedPosition, setDraggedPosition] = useState(null);
  // null means the default spot: bottom-right corner.
  const position = draggedPosition ?? parsePosition(savedPositionText);
  const [pending, setPending] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState("WIP: sessão em curso");
  const [deployState, setDeployState] = useState("idle"); // idle | running | success | error
  const [deployError, setDeployError] = useState("");
  const dragRef = useRef(null);

  const refreshStatus = useCallback(() => {
    fetchPending().then(
      (isPending) => {
        setPending(isPending);
        setStatusError("");
      },
      (error) => {
        setPending(true);
        setStatusError(error.message);
      },
    );
  }, []);

  useEffect(() => {
    refreshStatus();
    const timer = setInterval(refreshStatus, 15000);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  function handlePointerDown(event) {
    const box = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const distance =
      Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
    if (distance > DRAG_THRESHOLD) drag.moved = true;
    if (drag.moved) {
      drag.lastPosition = keepOnScreen(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
      setDraggedPosition(drag.lastPosition);
    }
  }

  function handlePointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (drag.moved) {
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(drag.lastPosition));
      } catch {
        // Position just won't be remembered.
      }
    } else {
      setPanelOpen((open) => !open);
    }
  }

  async function commitAndPush() {
    setDeployState("running");
    setDeployError("");
    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro ?? "Erro no Commit + Push");
      setDeployState("success");
    } catch (error) {
      setDeployState("error");
      setDeployError(error.message);
    }
    refreshStatus();
  }

  const placement = position
    ? { left: position.x, top: position.y }
    : { right: 24, bottom: 24 };
  // Open the panel towards the side of the screen with more room.
  const panelAbove = !position || position.y > window.innerHeight / 2;
  const panelAlignRight = !position || position.x > window.innerWidth / 2;

  return (
    <div className="fixed z-50" style={placement}>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative flex h-24 w-24 cursor-grab touch-none select-none items-center justify-center rounded-full text-center text-sm font-semibold leading-tight text-white shadow-lg active:cursor-grabbing ${
          pending ? "bg-gray-500" : "bg-green-600"
        }`}
      >
        {pending && (
          <span className="absolute right-3 top-3 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
        )}
        Deploy
        <br />
        ONLINE
      </button>

      {panelOpen && (
        <div
          className={`absolute w-72 rounded-lg bg-white p-4 text-sm text-gray-900 shadow-xl ${
            panelAbove ? "bottom-full mb-2" : "top-full mt-2"
          } ${panelAlignRight ? "right-0" : "left-0"}`}
        >
          <label className="mb-1 block font-medium" htmlFor="deploy-message">
            Mensagem do commit
          </label>
          <input
            id="deploy-message"
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mb-3 w-full rounded border border-gray-300 px-2 py-1"
          />
          <button
            type="button"
            onClick={commitAndPush}
            disabled={deployState === "running"}
            className="w-full rounded bg-gray-900 px-3 py-2 font-medium text-white disabled:opacity-50"
          >
            Commit + Push
          </button>

          {deployState === "running" && <p className="mt-2 text-gray-600">A correr…</p>}
          {deployState === "success" && <p className="mt-2 text-green-700">Sucesso</p>}
          {deployState === "error" && (
            <p className="mt-2 whitespace-pre-wrap break-words text-red-700">Erro: {deployError}</p>
          )}
          {statusError && deployState !== "error" && (
            <p className="mt-2 whitespace-pre-wrap break-words text-red-700">Estado: {statusError}</p>
          )}
        </div>
      )}
    </div>
  );
}
