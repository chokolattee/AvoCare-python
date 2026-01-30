import { SET_CURRENT_USER, LOGOUT_USER } from "../Actions/Auth.action";

/**
 * Check if JWT payload is valid and not expired
 * @param {Object} decoded - Decoded JWT payload
 */
const isTokenValid = (decoded) => {
  if (!decoded) return false;
  
  const currentTime = Date.now() / 1000;
  
  // Check if token has expired
  if (decoded.exp && decoded.exp < currentTime) {
    return false;
  }
  
  return true;
};

/**
 * Auth reducer function
 * @param {Object} state - Current authentication state
 * @param {Object} action - Action to perform
 */
const authReducer = (state, action) => {
  switch (action.type) {
    case SET_CURRENT_USER:
      const isValid = isTokenValid(action.payload);
      
      return {
        ...state,
        isAuthenticated: isValid,
        user: isValid ? action.payload : null,
      };
      
    case LOGOUT_USER:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
      };
      
    default:
      return state;
  }
};

export default authReducer;