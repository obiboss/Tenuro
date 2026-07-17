export type OfflineCoordinationEvent =
  | {
      type: "sync_started";
      at: string;
    }
  | {
      type: "sync_completed";
      at: string;
    }
  | {
      type: "data_cleared";
      at: string;
    }
  | {
      type: "owner_changed";
      at: string;
      ownerProfileId: string | null;
    }
  | {
      type: "health_changed";
      at: string;
    };

const CHANNEL_NAME =
  "bopa-offline-coordination";

export function broadcastOfflineEvent(
  event: OfflineCoordinationEvent,
) {
  if (
    typeof window === "undefined" ||
    !("BroadcastChannel" in window)
  ) {
    return;
  }

  const channel =
    new BroadcastChannel(CHANNEL_NAME);

  channel.postMessage(event);
  channel.close();
}

export function subscribeToOfflineEvents(
  listener: (
    event: OfflineCoordinationEvent,
  ) => void,
) {
  if (
    typeof window === "undefined" ||
    !("BroadcastChannel" in window)
  ) {
    return () => undefined;
  }

  const channel =
    new BroadcastChannel(CHANNEL_NAME);

  function handleMessage(
    event: MessageEvent<unknown>,
  ) {
    if (
      typeof event.data !== "object" ||
      event.data === null ||
      !("type" in event.data)
    ) {
      return;
    }

    listener(
      event.data as OfflineCoordinationEvent,
    );
  }

  channel.addEventListener(
    "message",
    handleMessage,
  );

  return () => {
    channel.removeEventListener(
      "message",
      handleMessage,
    );
    channel.close();
  };
}
