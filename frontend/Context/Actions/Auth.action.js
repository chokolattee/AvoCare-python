export const SET_CURRENT_USER = "SET_CURRENT_USER";
export const LOGOUT_USER = "LOGOUT_USER";

/**
 * Set the current authenticated user
 * @param {Object} decoded - Decoded JWT payload containing user info
 */
export const setCurrentUser = (decoded) => {
  return {
    type: SET_CURRENT_USER,
    payload: decoded
  };
};

export const logoutUser = () => {
  return {
    type: LOGOUT_USER,
  };
};