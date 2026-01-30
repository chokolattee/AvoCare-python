import React, { createContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { setCurrentUser, logoutUser } from '../Actions/Auth.action';
import authReducer from '../Reducers/Auth.reducer';

// Create context
const AuthGlobal = createContext();

/**
 * Authentication Provider Component
 * Wraps the app to provide auth state
 */
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    // Check for stored JWT token on app mount
    checkStoredToken();
  }, []);

  /**
   * Check if there's a stored JWT token and validate it
   */
  const checkStoredToken = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt');
      
      if (token) {
        const decoded = jwtDecode(token);
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp && decoded.exp > currentTime) {
          // Token is valid
          dispatch(setCurrentUser(decoded));
        } else {
          // Token is expired, remove it
          await AsyncStorage.removeItem('jwt');
          dispatch(logoutUser());
        }
      }
    } catch (error) {
      console.error('Error checking stored token:', error);
      // If token is invalid, remove it
      await AsyncStorage.removeItem('jwt');
      dispatch(logoutUser());
    }
  };

  return (
    <AuthGlobal.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthGlobal.Provider>
  );
};

export default AuthGlobal;