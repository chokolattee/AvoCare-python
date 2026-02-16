import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header (fixed at top like CommunityScreen)
  header: {
    backgroundColor: '#5d873e',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  centerColumn: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  
  // Categories
  categoriesRow: {
    marginBottom: 16,
    flexGrow: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 6,
    borderWidth: 1.5,
    borderColor: '#5d873e',
  },
  categoryButtonActive: {
    backgroundColor: '#5d873e',
    borderColor: '#5d873e',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5d873e',
    marginLeft: 4,
  },
  categoryTextActive: {
    color: '#fff',
  },
  
  // Analyses Container
  analysesContainer: {
    marginTop: 4,
  },
  
  // Analysis Card
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  
  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  analysisType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeAgo: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  
  // Images
  imagesContainer: {
    marginBottom: 12,
    flexGrow: 0,
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  analysisImage: {
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  imageLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Results
  resultsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Recommendation
  recommendationContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5d873e',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d873e',
    marginLeft: 6,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  // Details
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flexShrink: 1,
  },
  
  // Notes
  notesContainer: {
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFE66D',
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  // Probabilities
  probabilitiesContainer: {
    marginTop: 8,
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 12,
  },
  probabilitiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  probabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  probabilityLabel: {
    fontSize: 13,
    color: '#666',
    minWidth: 80,
    maxWidth: 120,
    textTransform: 'capitalize',
    flexShrink: 0,
  },
  probabilityBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#e8e8e8',
    borderRadius: 5,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  probabilityFill: {
    height: '100%',
    borderRadius: 5,
  },
  probabilityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    width: 50,
    textAlign: 'right',
    flexShrink: 0,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  
  // Login Prompt
  loginPromptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#5d873e',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    minWidth: 180,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});