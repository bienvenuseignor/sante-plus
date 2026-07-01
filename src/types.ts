export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface ServicePrice {
  name: string;
  priceXOF: number;
  priceSats: number;
}

export interface Hospital {
  id: string;
  name: string;
  type: 'public' | 'private' | 'clinic';
  image: string;
  rating: number;
  reviewsCount: number;
  distance: string;
  address: string;
  phone: string;
  hours: string;
  isVerified: boolean;
  adminEmail?: string;
  services: string[];
  priceList: ServicePrice[];
  reviews: Review[];
  coords: { x: number; y: number }; // Simulated vector coordinates on our Abomey-Calavi map
  lat?: number;
  lng?: number;
}

export interface MedicalDocument {
  id: string;
  title: string;
  type: 'analyses' | 'prescription' | 'devis';
  items: { name: string; quantity?: number; priceXOF: number }[];
  priceXOF: number;
  priceSats: number;
}

export interface Appointment {
  id: string;
  hospitalId: string;
  hospitalName: string;
  date: string;
  timeSlot: string;
  patientName: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  service?: string;
  reason?: string;
  doctorName?: string;
}

export interface Invoice {
  id: string;
  patientName: string;
  patientPhone?: string;
  hospitalName: string;
  hospitalAddress: string;
  date: string;
  items: { name: string; priceXOF: number }[];
  totalXOF: number;
  totalSats: number;
  paymentMethod: 'Wallet' | 'Lightning' | 'FamilyHelp';
  txHash: string;
  isPaid: boolean;
  doctorName?: string;
}

export interface Patient {
  name: string;
  fullName?: string;
  id?: string;
  email: string;
  phone: string;
  walletBalance: number;
  npi?: string;
  avatar?: string;
}

export interface HospitalUser {
  email: string;
  hospitalId: string;
  role: 'doctor' | 'admin' | 'nurse';
  name?: string;
}

export interface AccessRequest {
  id: string;
  npi: string;
  doctorEmail: string;
  hospitalName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  confirmedAt?: string;
  blockchainTxHash?: string;
}

export interface MedicalConsultation {
  id: string;
  date: string;
  time: string;
  doctor: string;
  hospital: string;
  reason: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  treatmentPlan?: string;
  medication?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  followUp?: string;
  verified: boolean;
  timestamp: number;
  hash: string;
}

export type AppView = 'landing' | 'map' | 'hospital-details' | 'payment-flow' | 'wallet' | 'appointments' | 'auth' | 'hospital-dashboard' | 'medical-record';


