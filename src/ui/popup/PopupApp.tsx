import { useCallback, useEffect, useState } from "react";
import {
  sendMessage,
  type MessageResponse,
  type ActiveTabContext,
  type StatusPayload
} from "../../shared/messaging";
import "./PopupApp.css";

function unwrapPayload<T extends MessageResponse["type"]>(
  response: MessageResponse,
  expected: T
): Extract<MessageResponse, { type: T }>["payload"] {
  if (response.type === expected) {
    return response.payload as Extract<MessageResponse, { type: T }>["payload"];
  }

  if (response.type === "error") {
    throw new Error(response.payload.message);
  }

  throw new Error(`Unexpected response type: ${response.type}`);
}

export function PopupApp() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [context, setContext] = useState<ActiveTabContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshContext = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statusResponse, contextResponse] = await Promise.all([
        sendMessage({ type: "getStatus" }),
        sendMessage({ type: "getActiveTabContext" })
      ]);

      setStatus(unwrapPayload(statusResponse, "status"));
      setContext(unwrapPayload(contextResponse, "activeContext"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  const openOptions = () => {
    const url = chrome.runtime.getURL("options.html");

    if (chrome.windows && chrome.windows.create) {
      chrome.windows.create({
        url,
        type: "popup",
        width: 1120,
        height: 900
      });
      return;
    }

    chrome.runtime.openOptionsPage?.();
  };

  return (
    <div className="popup-card">
      <h1>LabelSorcerer</h1>
      {error && <p className="message error">{error}</p>}
      <div className="meta">
        <p className="label">Extension version</p>
        <p className="value">{status?.version ?? "0.1.0"}</p>
      </div>
      <div className="meta">
        <p className="label">Active tab</p>
        <p className="value">{context?.url ?? "No tab detected"}</p>
      </div>
      <div className="meta">
        <p className="label">Suggested data source</p>
        <p className="value">{context?.dataSourceName ?? "None"}</p>
      </div>
      <div className="meta">
        <p className="label">Suggested layout</p>
        <p className="value">{context?.defaultLayoutId ? `#${context.defaultLayoutId}` : "None"}</p>
      </div>
      <div className="actions">
        <button type="button" onClick={() => void refreshContext()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh context"}
        </button>
        <button type="button" onClick={openOptions}>
          Open options
        </button>
      </div>
    </div>
  );
}
