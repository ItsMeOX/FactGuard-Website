export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

export type AuthResult = {
  user: AuthUser;
  token: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  reportCount: number;
};
