// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  googleId: string;
}

// Event types
export interface Event {
  id: string;
  name: string;
  description: string;
  adminId: string;
  googleFolderId?: string;
  googleFolderUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Profession types
export interface Profession {
  id: string;
  name: string;
  description: string;
  futureInfo: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// EventProfession types
export interface EventProfession {
  id: string;
  eventId: string;
  professionId: string;
  order: number;
  profession?: Profession;
}

// VisitorSession types
export interface VisitorSession {
  id: string;
  eventId: string;
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
}

// VisitorSelection types
export interface VisitorSelection {
  id: string;
  eventId: string;
  professionId: string;
  sessionId: string;
  timestamp: Date;
  profession?: Profession;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
