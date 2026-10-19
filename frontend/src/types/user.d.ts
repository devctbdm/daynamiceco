// src/types/user.types.ts
export interface User {
  _id?: string;
  id: string;          // returned by authController publicUser()
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'manager' | 'customer';
  address: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  isTeam?: boolean;
  active?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string; // For mobile
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  phone: string;
  address: User['address'];
}
