export interface Announcement {
  id: string;
  title: string;
  summary: string;
  activeFrom: string;
  activeTo?: string;
  destination?: string;
  dismissed?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  read: boolean;
  destination?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  role: string;
  programme?: string;
  isActive: boolean;
}
