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
    jwt?: string;  // if your API uses this
    data?: {
        token: string;
        user: User;
    };
    [key: string]: any;  // Allow additional properties
}

export const authenticate = (data: AuthData, next: () => void): void => {
    if (typeof window !== 'undefined') {
        // Handle different response structures
        const token = data.token || data.accessToken || data.jwt || data.data?.token;
        const user = data.user || data.data?.user;
        
        if (token && user) {
            // Store token in multiple formats for compatibility
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('jwt', token);  // Some parts of app might use 'jwt'
            sessionStorage.setItem('user', JSON.stringify(user));
            
            // Store userId separately for easier access
            if (user.id) {
                sessionStorage.setItem('userId', user.id);
            }
            
            // Dispatch custom event to notify components about auth change
            window.dispatchEvent(new CustomEvent('authChange', { detail: { authenticated: true, user } }));
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

export const logout = (next?: () => void): void => {
    if (typeof window !== 'undefined') {
        // Clear ALL authentication-related items from sessionStorage
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('accessToken');
        
        // Also clear localStorage in case it's being used anywhere
        localStorage.removeItem('token');
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('accessToken');
        
        // Dispatch custom event to notify components about auth change
        window.dispatchEvent(new CustomEvent('authChange', { detail: { authenticated: false, user: null } }));
        
        // Show success message
        successMsg('Logged out successfully');
    }
    if (next) {
        next();
    }
};

export const getToken = (): string | false => {
    if (typeof window !== 'undefined') {
        // Check both 'token' and 'jwt' for compatibility
        const token = sessionStorage.getItem('token') || sessionStorage.getItem('jwt');
        if (token && token !== 'undefined' && token !== 'null') {
            return token.trim();
        } else {
            return false;
        }
    }
    return false;
};

export const getUserId = (): string | false => {
    if (typeof window !== 'undefined') {
        const userId = sessionStorage.getItem('userId');
        if (userId && userId !== 'undefined' && userId !== 'null') {
            return userId.trim();
        } else {
            // Fallback: try to get from user object
            const user = getUser();
            return user !== false && user.id ? user.id : false;
        }
    }
    return false;
};

export const isAuthenticated = (): boolean => {
    const token = getToken();
    const user = getUser();
    return token !== false && user !== false;
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