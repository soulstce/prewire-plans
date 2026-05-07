export type CollabMessage<T> = {
  roomId: string;
  origin: string;
  payload: T;
};

export function createRoomChannel(roomId: string) {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  return new BroadcastChannel(`prewire-plans:${roomId}`);
}
