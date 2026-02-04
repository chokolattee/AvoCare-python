import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const authenticateMobile = async (data: any): Promise<void> => {
    try {
        const token = data.token || data.accessToken || data.jwt || data.data?.token;
        const user = data.user || data.data?.user;
        
        if (token && user) {
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('jwt', token);
            await AsyncStorage.setItem('user', JSON.stringify(user));
            
            if (user.id) {
                await AsyncStorage.setItem('userId', user.id);
            }
            
            // For web platform, also update sessionStorage and dispatch event
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('token', token);
                sessionStorage.setItem('jwt', token);
                sessionStorage.setItem('user', JSON.stringify(user));
                if (user.id) {
                    sessionStorage.setItem('userId', user.id);
                }
                // Dispatch custom event to notify components
                window.dispatchEvent(new CustomEvent('authChange', { detail: { authenticated: true, user } }));
            }
        }
    } catch (error) {
        console.error('Error storing auth data:', error);
    }
};

export const logoutMobile = async (): Promise<void> => {
    try {
        // Remove ALL auth-related items
        await AsyncStorage.multiRemove([
            'token',
            'jwt',
            'user',
            'userId',
            'accessToken'
        ]);
        
        // For web platform, also clear sessionStorage
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('jwt');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('userId');
            sessionStorage.removeItem('accessToken');
            
            // Dispatch custom event to notify components
            window.dispatchEvent(new CustomEvent('authChange', { detail: { authenticated: false, user: null } }));
        }
        
        console.log('Logout successful - AsyncStorage cleared');
    } catch (error) {
        console.error('Error clearing auth data:', error);
    }
};

export const getTokenMobile = async (): Promise<string | null> => {
    try {
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('jwt');
        return token;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

export const getUserMobile = async (): Promise<any | null> => {
    try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

export const isAuthenticatedMobile = async (): Promise<boolean> => {
    try {
        const token = await getTokenMobile();
        const user = await getUserMobile();
        return !!token && !!user;
    } catch (error) {
        return false;
    }
};