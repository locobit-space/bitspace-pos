export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  unitId: string;
  price: number;
  stock: number;
  minStock: number;
  branchId: string;
  status: "active" | "inactive";
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface Order {
  id: string;
  customer: string;
  branch: string;
  date: string;
  total: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  notes?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  product: Product;
}


// types/index.ts
export interface SalesMetric {
  period: string
  sales: number
  orders: number
}

export interface TopProduct {
  id: number
  name: string
  sales: number
  revenue: number
}

export interface RecentOrder {
  id: string
  customer: string
  amount: number
  status: 'pending' | 'processing' | 'completed'
  time: string
}