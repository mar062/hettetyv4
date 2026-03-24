import { Property, UserProfile, Purchase } from './types';

const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Luxury Villa in New Cairo',
    price: 15000000,
    location: 'New Cairo, Egypt',
    bedrooms: 5,
    bathrooms: 6,
    area: 450,
    imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=800',
    status: 'For Sale',
    isVerified: true,
    paymentMethods: ['Cash', 'Installment']
  },
  {
    id: '2',
    title: 'Modern Apartment in Zamalek',
    price: 8500000,
    location: 'Zamalek, Cairo',
    bedrooms: 3,
    bathrooms: 2,
    area: 180,
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800',
    status: 'For Sale',
    isVerified: true,
    paymentMethods: ['Cash']
  },
  {
    id: '3',
    title: 'Sea View Chalet in North Coast',
    price: 6200000,
    location: 'North Coast, Egypt',
    bedrooms: 3,
    bathrooms: 3,
    area: 140,
    imageUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=800',
    status: 'For Sale',
    isVerified: false,
    paymentMethods: ['Installment']
  },
  {
    id: '4',
    title: 'Office Space in Financial District',
    price: 45000,
    location: 'New Capital, Egypt',
    bedrooms: 0,
    bathrooms: 2,
    area: 120,
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
    status: 'For Rent',
    isVerified: true,
    paymentMethods: ['Cash']
  }
];

// --- Simulated SQL Relational Database ---
// Table: users
let usersTable: UserProfile[] = [
  { id: 'u1', name: 'Abdallah Ahmed', email: 'abdallahahmedpilot2426@gmail.com', phone: '+20 100 123 4567', preferences: 'Looking for a villa in New Cairo or a chalet in North Coast. Prefers Installment payment methods.' }
];

// Table: purchases
let purchasesTable: Purchase[] = [
  { id: 'p1', propertyId: '2', purchaseDate: '2023-11-01', status: 'Completed' }
];

export const api = {
  getProperties: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true, data: MOCK_PROPERTIES };
  },
  addProperty: async (property: Omit<Property, 'id'>) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newProperty = { ...property, id: Math.random().toString(36).substring(7) };
    MOCK_PROPERTIES.push(newProperty);
    return { success: true, data: newProperty };
  },
  getProfile: async (userEmail?: string | null) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find user by email
    let user = usersTable.find(u => u.email === userEmail);
    
    if (!user) {
      if (userEmail === 'abdallahahmedpilot2426@gmail.com') {
        user = usersTable[0];
      } else if (userEmail) {
        // Create a temporary user if not found in mock DB
        user = {
          id: `u${Math.random().toString(36).substring(7)}`,
          name: userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1),
          email: userEmail,
          phone: '',
          preferences: ''
        };
        usersTable.push(user);
      } else {
        // Default to first user if no email provided (for demo)
        user = usersTable[0];
      }
    }

    // SQL JOIN simulation: SELECT * FROM purchases JOIN properties ON purchases.propertyId = properties.id WHERE userId = user.id
    // For mock purposes, we'll just return all purchases for now, or filter if we had user IDs on purchases
    const purchases = purchasesTable.map(p => ({
      ...p,
      property: MOCK_PROPERTIES.find(prop => prop.id === p.propertyId)
    }));
    return { success: true, data: { user, purchases } };
  },
  updateProfile: async (updates: Partial<UserProfile>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    usersTable[0] = { ...usersTable[0], ...updates };
    return { success: true, data: usersTable[0] };
  },
  purchaseProperty: async (propertyId: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const newPurchase: Purchase = {
      id: `p${Math.random().toString().slice(2, 8)}`,
      propertyId,
      purchaseDate: new Date().toISOString().split('T')[0],
      status: 'Processing'
    };
    purchasesTable.push(newPurchase);
    return { success: true, data: newPurchase };
  },
  chat: async (text: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, data: "Based on your preferences, I recommend looking at properties in New Cairo. Would you like to see some listings?" };
  },
  uploadDocument: async (name: string, type: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, data: { isValid: true } };
  },
  saveConsent: async (preferences: any) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("Consent saved to backend:", preferences);
    return { success: true };
  }
};
