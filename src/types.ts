
export interface FAQItem {
  question: string;
  answer: string;
}

export interface Token {
  name: string;
  symbol: string;
  iconUrl: string;
  balance: number;
  valueUsd: number;
  priceUsd: number;
  priceChange?: number; // 24h price change percentage
  priceHistory: { time: number; price: number }[];
}


export type Credentials = {
  type: 'seed' | 'keys';
  seedPhrase?: string;
  privateKey?: string;
  publicKey?: string;
  address?: string;
}
