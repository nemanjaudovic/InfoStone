// guide §5.1
export type Plan = 'free' | 'paid';

export interface User {
  _id: string;
  username: string;
  email: string;
  plan: Plan;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
