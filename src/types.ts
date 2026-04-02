import { Timestamp } from 'firebase/firestore';

export type AdCategory = 'For Sale' | 'Services' | 'Rentals' | 'Jobs' | 'Lost & Found';
export type AdStatus = 'active' | 'closed';

export interface Ad {
  id: string;
  title: string;
  category: AdCategory;
  description: string;
  price: number;
  contact: string;
  status: AdStatus;
  posted_at: Timestamp;
  expires_at: Timestamp;
  enquiry_count?: number;
  featured?: boolean;
  uid: string;
}

export interface Enquiry {
  id: string;
  ad_id: string;
  name: string;
  message: string;
  sent_at: Timestamp;
}
