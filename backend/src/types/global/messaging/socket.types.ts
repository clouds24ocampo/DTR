export interface ServerToClientEvents {
  "message:all": (payload: Message) => void;
  ready: () => void;
}

export interface ClientToServerEvents {
  auth: (payload: { userId: string }) => void;
}

export interface InterServerEvents {}
export interface SocketData {
  userId?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isOwn: string;
  isSeen?: boolean;
  createdAt: string;
}
