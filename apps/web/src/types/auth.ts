export type AuthMode = 'OPEN' | 'LOCAL' | 'KEYCLOAK' | 'SSO';

export interface User {
  id: string;
  name?: string;
  email?: string;
  authMode?: AuthMode;
  role?: string;
}

export interface LoginCredentials {
  id: string;
  password?: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  message?: string;
}
