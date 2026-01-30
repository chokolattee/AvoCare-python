import { toast } from 'react-toastify';

interface User {
    role: string;
    [key: string]: any;
}

// Update this to match your actual API response structure
interface AuthData {
    token?: string;
    user?: User;
    accessToken?: string;  // if your API uses this
    data?: {
        token: string;
        user: User;
    };
    [key: string]: any;  // Allow additional properties
}

export const authenticate = (data: AuthData, next: () => void): void => {
    if (typeof window !== 'undefined') {
        // Handle different response structures
        const token = data.token || data.accessToken || data.data?.token;
        const user = data.user || data.data?.user;
        
        if (token && user) {
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(user));
        }
    }
    next();
};

export const getUser = (): User | false => {
    if (typeof window !== 'undefined') {
        const userStr = sessionStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr) as User;
            } catch (error) {
                console.error('Error parsing user:', error);
                return false;
            }
        } else {
            return false;
        }
    }
    return false;
};

export const logout = (next: () => void): void => {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
    }
    next();
};

export const getToken = (): string | false => {
    if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('token');
        if (token && token !== 'undefined' && token !== 'null') {
            return token.trim();
        } else {
            return false;
        }
    }
    return false;
};

export const isAdmin = (): boolean => {
    const user = getUser();
    return user !== false && user.role === 'admin';
};

export const errMsg = (message: string = ''): ReturnType<typeof toast.error> => 
    toast.error(message, {
        position: 'bottom-center'
    });

export const successMsg = (message: string = ''): ReturnType<typeof toast.success> => 
    toast.success(message, {
        position: 'bottom-center'
    });