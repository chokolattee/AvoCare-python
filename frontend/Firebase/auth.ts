// Firebase/auth.ts
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification as firebaseSendEmailVerification,
  signOut as firebaseSignOut,
  User,
  UserCredential,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Sign in with Google using Firebase popup
 * @returns Firebase User object or null if cancelled
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const provider = new GoogleAuthProvider();
    
    // Add additional scopes for profile and email access
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters
    provider.setCustomParameters({
      prompt: 'select_account' // Force account selection
    });
    
    const result: UserCredential = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log('✅ Google Sign-In successful:', user.email);
    
    // Store user data in Firestore (optional - for Firebase side storage)
    await storeUserInFirestore(user, 'google');
    
    return user;
  } catch (error: any) {
    console.error('❌ Google Sign-In Error:', error);
    
    // Handle specific error codes
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('User closed the popup');
      return null;
    }
    
    if (error.code === 'auth/cancelled-popup-request') {
      console.log('Popup request was cancelled');
      return null;
    }
    
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by browser. Please allow popups for this site.');
    }
    
    throw error;
  }
};

/**
 * Create a new user with email and password
 * @param email User's email address
 * @param password User's password
 * @returns Firebase User object
 */
export const createUserWithEmail = async (
  email: string, 
  password: string
): Promise<User | null> => {
  try {
    const result: UserCredential = await createUserWithEmailAndPassword(
      auth, 
      email, 
      password
    );
    
    const user = result.user;
    console.log('✅ User created successfully:', user.email);
    
    // Store user data in Firestore
    await storeUserInFirestore(user, 'email');
    
    // Send verification email
    await sendEmailVerification(user);
    
    return user;
  } catch (error: any) {
    console.error('❌ Create User Error:', error);
    
    // Handle specific error codes
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email is already registered');
    }
    
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    }
    
    if (error.code === 'auth/weak-password') {
      throw new Error('Password must be at least 6 characters');
    }
    
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/password accounts are not enabled');
    }
    
    throw error;
  }
};

/**
 * Sign in with email and password
 * @param email User's email address
 * @param password User's password
 * @returns Firebase User object
 */
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<User | null> => {
  try {
    const result: UserCredential = await signInWithEmailAndPassword(
      auth, 
      email, 
      password
    );
    
    console.log('✅ Sign-In successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('❌ Sign-In Error:', error);
    
    // Handle specific error codes
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email');
    }
    
    if (error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    }
    
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    }
    
    if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled');
    }
    
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }
    
    throw error;
  }
};

/**
 * Send email verification to the current user
 * @param user Firebase User object
 */
export const sendEmailVerification = async (user: User): Promise<void> => {
  try {
    await firebaseSendEmailVerification(user);
    console.log('✅ Verification email sent to:', user.email);
  } catch (error: any) {
    console.error('❌ Send Email Verification Error:', error);
    
    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    }
    
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log('✅ User signed out successfully');
  } catch (error: any) {
    console.error('❌ Sign Out Error:', error);
    throw error;
  }
};

/**
 * Get the current authenticated user
 * @returns Current Firebase User or null
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Check if user's email is verified
 * @param user Firebase User object
 * @returns boolean
 */
export const isEmailVerified = (user: User): boolean => {
  return user.emailVerified;
};

/**
 * Update user profile (display name and photo URL)
 * @param user Firebase User object
 * @param displayName User's display name
 * @param photoURL User's photo URL
 */
export const updateUserProfile = async (
  user: User,
  displayName?: string,
  photoURL?: string
): Promise<void> => {
  try {
    await updateProfile(user, {
      displayName: displayName || user.displayName,
      photoURL: photoURL || user.photoURL
    });
    console.log('✅ User profile updated');
  } catch (error: any) {
    console.error('❌ Update Profile Error:', error);
    throw error;
  }
};

/**
 * Store user data in Firestore (optional - for Firebase-side storage)
 * This creates a user document in Firestore to complement MongoDB storage
 * @param user Firebase User object
 * @param authProvider Authentication provider used
 */
const storeUserInFirestore = async (
  user: User, 
  authProvider: 'email' | 'google'
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    
    // Check if user document already exists
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || '',
        photoURL: user.photoURL || '',
        authProvider: authProvider,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ User stored in Firestore:', user.uid);
    } else {
      // Update existing user document
      await setDoc(userRef, {
        emailVerified: user.emailVerified,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ User updated in Firestore:', user.uid);
    }
  } catch (error: any) {
    console.error('❌ Error storing user in Firestore:', error);
    // Don't throw - this is supplementary storage
  }
};

/**
 * Get user data from Firestore
 * @param uid User's Firebase UID
 * @returns User data object or null
 */
export const getUserFromFirestore = async (uid: string): Promise<any | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data();
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error getting user from Firestore:', error);
    return null;
  }
};

/**
 * Auth state observer
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};