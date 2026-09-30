export interface Conversation {
  _id?: string;
  name: string;
  lastMessage?: string;
  senderId?: string;
  timestamp?: string;
  participants?: string[];
  unread?: number;
  avatar: string;
  isOnline: boolean;
}

export interface MessengerUser {
  _id?: string | undefined;
  name: string | undefined;
  email: string | undefined;
  position: string | string[] | undefined;
  avatar: string | undefined;
  messengerId?: string | undefined;
  participants: (string | undefined)[];
  isOnline: boolean;
}
