import { API_BASE_URL } from '../config/api';
import { Product, ProductFormData, Category } from '../Types/product';
import { ApiResponse } from '../Types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Auth ─────────────────────────────────────────────────────────────────────

const getToken = async (): Promise<string> => {
  return (await AsyncStorage.getItem('jwt')) || (await AsyncStorage.getItem('token')) || '';
};

const getAuthHeaders = async () => {
  const token = await getToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
};

// ─── Platform-aware image appender ────────────────────────────────────────────
// On native: use {uri, name, type} object — RN's fetch reads the file from disk.
// On web:    fetch the URI and convert to Blob — browsers require real Blob/File objects.

async function appendImageToFormData(
  formData: FormData,
  uri: string,
  index: number
): Promise<void> {
  const filename = `product_${Date.now()}_${index}.jpg`;

  if (Platform.OS === 'web') {
    // Web: fetch the local object URL / data URI and turn it into a Blob
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append('images', blob, filename);
  } else {
    // Native (iOS / Android): RN's FormData understands {uri, name, type}
    formData.append('images', { uri, name: filename, type: 'image/jpeg' } as any);
  }
}

// ─── Category APIs ────────────────────────────────────────────────────────────

export const getCategories = async (): Promise<ApiResponse<Category[]>> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/categories`, { method: 'GET', headers });
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, message: 'Failed to fetch categories' };
  }
};

export const createCategory = async (name: string): Promise<ApiResponse<Category>> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating category:', error);
    return { success: false, message: 'Failed to create category' };
  }
};

// ─── Product APIs ─────────────────────────────────────────────────────────────

export const getProducts = async (filters?: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<ApiResponse<Product[]>> => {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (filters?.status)   params.append('status',   filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search)   params.append('search',   filters.search);

    const url = `${API_BASE_URL}/api/products${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, { method: 'GET', headers });
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return { success: false, message: 'Failed to fetch products' };
  }
};

export const getProduct = async (id: string): Promise<ApiResponse<Product>> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'GET',
      headers,
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching product:', error);
    return { success: false, message: 'Failed to fetch product' };
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createProduct = async (
  data: ProductFormData | FormData
): Promise<ApiResponse<Product>> => {
  try {
    const token = await getToken();

    let formData: FormData;

    if (data instanceof FormData) {
      // Caller built the FormData themselves (legacy path from ProductScreen)
      // We must NOT re-process it — just send as-is.
      formData = data;
    } else {
      formData = new FormData();
      formData.append('name',        data.name);
      formData.append('description', data.description || '');
      formData.append('category',    data.category);
      formData.append('price',       String(data.price));
      formData.append('stock',       String(data.stock));
      formData.append('status',      data.status);
      formData.append('nutrition',   JSON.stringify(data.nutrition || []));

      const localImages = (data.images || []).filter(
        (img) => !img.startsWith('http://') && !img.startsWith('https://')
      );
      for (let i = 0; i < localImages.length; i++) {
        await appendImageToFormData(formData, localImages[i], i);
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // NO Content-Type — let browser/RN set boundary
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, message: 'Failed to create product' };
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateProduct = async (
  id: string,
  data: Partial<ProductFormData> | FormData
): Promise<ApiResponse<Product>> => {
  try {
    const token = await getToken();

    let formData: FormData;

    if (data instanceof FormData) {
      // ProductScreen passes a pre-built FormData — but it may contain blobs (web)
      // or {uri} objects (native) that were appended by handleSubmit.
      // We trust the caller built it correctly via appendImageToFormData.
      formData = data;
    } else {
      formData = new FormData();

      if (data.name        !== undefined) formData.append('name',        data.name);
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.category    !== undefined) formData.append('category',    data.category);
      if (data.price       !== undefined) formData.append('price',       String(data.price));
      if (data.stock       !== undefined) formData.append('stock',       String(data.stock));
      if (data.status      !== undefined) formData.append('status',      data.status);
      if (data.nutrition   !== undefined) formData.append('nutrition',   JSON.stringify(data.nutrition));

      const keepImageUrls: string[] = [];
      const localImages: string[]   = [];

      (data.images || []).forEach((img) => {
        if (img.startsWith('http://') || img.startsWith('https://')) {
          keepImageUrls.push(img);
        } else {
          localImages.push(img);
        }
      });

      formData.append('keepImageUrls', JSON.stringify(keepImageUrls));

      for (let i = 0; i < localImages.length; i++) {
        await appendImageToFormData(formData, localImages[i], i);
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }, // NO Content-Type — let browser/RN set boundary
      body: formData,
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, message: 'Failed to update product' };
  }
};

// ─── Archive / Restore ────────────────────────────────────────────────────────

export const archiveProduct = async (id: string): Promise<ApiResponse<Product>> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/products/${id}/archive`, {
      method: 'PATCH',
      headers,
    });
    return await response.json();
  } catch (error) {
    console.error('Error archiving product:', error);
    return { success: false, message: 'Failed to archive product' };
  }
};

export const restoreProduct = async (id: string): Promise<ApiResponse<Product>> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/products/${id}/restore`, {
      method: 'PATCH',
      headers,
    });
    return await response.json();
  } catch (error) {
    console.error('Error restoring product:', error);
    return { success: false, message: 'Failed to restore product' };
  }
};