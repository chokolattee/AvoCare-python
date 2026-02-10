import { StyleSheet, Platform } from 'react-native';

const PRIMARY_COLOR = '#3d4d3d';

export const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  scrollContent: {
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
  },
  logo: {
    width: 250,
    height: 100,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#c33',
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
    flex: 1,
  },
  errorTextSmall: {
    color: '#c33',
    fontSize: 12,
    marginTop: 4,
  },
  formSelection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  selectionButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  selectionButtonActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  selectionButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  selectionButtonTextActive: {
    color: '#fff',
  },
  formPanel: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  inputError: {
    borderBottomColor: '#c33',
  },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orDividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
    flex: 1
  },
  
  // OR if you want simpler styles:
  successMessageContainer: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginVertical: 10
  },
  
  successMessageText: {
    color: '#155724',
    fontSize: 14
  }
});