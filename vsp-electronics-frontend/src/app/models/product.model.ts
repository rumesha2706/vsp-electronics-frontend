export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  subcategory?: string;
  brand: string;
  rating: number;
  inStock: boolean;
  stockCount?: number;
  isHot?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  description?: string;
  aboutProduct?: string;
  images?: string[];
  sku?: string;
  productUrl?: string;
  packageIncludes?: string[];
  specifications?: { [key: string]: string };
  features?: string[];
  recentPurchaseCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  productCount: number;
  description?: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  image?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
