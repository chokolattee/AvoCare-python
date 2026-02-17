export interface NutritionEntry {
  id?: string;     
  label: string;  
  amount: string;  
}

// ─── Mirrors Category Document ────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;         
  created_at: string;   
}

// ─── Status choices from Product model ───────────────────────────────────────
export type ProductStatus = 'active' | 'draft' | 'archived';

// ─── Mirrors Product Document ─────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;             
  price: number;                   
  stock: number;                 
  images: string[];                
  nutrition: NutritionEntry[];    
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  is_out_of_stock: boolean;        
  nutrition_count: number;        
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string;           
  price: number;
  stock: number;
  images: string[];
  nutrition: NutritionEntry[];
  status: ProductStatus;
}