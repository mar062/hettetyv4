export type Page = 'home' | 'listings' | '3d-experience' | 'legal' | 'ai-chat' | 'login' | 'register' | 'contact' | '3d' | 'about' | 'buy' | 'verification' | 'tours' | 'terms' | 'privacy' | 'cookie-policy' | 'profile' | 'add-listing' | 'payment' | 'manage-users';

export interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  imageUrl: string;
  status: 'For Sale' | 'For Rent';
  isVerified: boolean;
  paymentMethods?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferences: string;
}

export interface Purchase {
  id: string;
  propertyId: string;
  purchaseDate: string;
  status: string;
  property?: Property;
}

export interface ChatMessage {
  role: 'model' | 'user';
  text: string;
  timestamp: Date;
}

export interface UserDocument {
  id: string;
  fileId?: string;
  name: string;
  type: string;
  status: string;
  uploadDate: string;
  accessStatus?: 'Locked' | 'Requested' | 'Granted';
  size?: number;
}
