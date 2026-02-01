import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Keyboard,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  Chatbot: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
};

type ChatbotScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chatbot'>;
type ChatbotScreenRouteProp = RouteProp<RootStackParamList, 'Chatbot'>;

interface Props {
  navigation: ChatbotScreenNavigationProp;
  route: ChatbotScreenRouteProp;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isError?: boolean;
}

interface Suggestion {
  id: number;
  category: string;
  question: string;
  icon: string;
}

// Animated Typing Indicator Component
const TypingIndicator: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 200);
    const anim3 = createAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const animateDot = (animatedValue: Animated.Value) => ({
    opacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingIndicator}>
      <Animated.View style={[styles.typingDot, animateDot(dot1)]} />
      <Animated.View style={[styles.typingDot, animateDot(dot2)]} />
      <Animated.View style={[styles.typingDot, animateDot(dot3)]} />
    </View>
  );
};

const ChatbotScreen: React.FC<Props> = ({ navigation }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AvoCare Assistant. Ask me anything about avocado cultivation, pest control, diseases, harvesting, or general farming tips!',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Backend API URL - Update this to match your server
  const API_BASE_URL = 'http://192.168.0.117:8081';

  // Default quick questions (fallback if API fails)
  const defaultQuestions = [
    'How do I identify root rot?',
    'Best fertilizer for avocados?',
    'When to harvest avocados?',
    'Common avocado pests?',
    'How to prevent anthracnose?',
    'Watering schedule for avocados?',
  ];

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Auto-scroll when messages update or keyboard appears
  useEffect(() => {
    if (chatMessages.length > 0 || isTyping) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, isTyping, keyboardHeight]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/suggestions`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      console.log('Using default suggestions');
    }
  };

  const sendMessageToBackend = async (message: string): Promise<{ text: string; isError: boolean }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.ok && data.success && data.response) {
        return { text: data.response, isError: false };
      } else {
        return { 
          text: data.error || 'Sorry, I couldn\'t process that. Please try again.', 
          isError: true 
        };
      }
    } catch (error) {
      console.error('Backend API error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { 
            text: 'Request timed out. Please check your connection and try again.', 
            isError: true 
          };
        }
        if (error.message.includes('Network request failed')) {
          return { 
            text: 'Cannot connect to server. Please check your internet connection.', 
            isError: true 
          };
        }
      }
      
      return { 
        text: 'An error occurred. Please try again.', 
        isError: true 
      };
    }
  };

  const handleSendMessage = async () => {
    if (currentMessage.trim() === '' || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: currentMessage.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    // Scroll after user message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Get response from backend
    const { text, isError } = await sendMessageToBackend(userMessage.text);

    const botMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: text,
      isUser: false,
      timestamp: new Date(),
      isError: isError,
    };

    setChatMessages(prev => [...prev, botMessage]);
    setIsTyping(false);

    // Scroll after bot message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleQuickQuestion = (question: string) => {
    setCurrentMessage(question);
    // Auto-focus input after setting question
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setChatMessages([
              {
                id: '1',
                text: 'Hello! I\'m your AvoCare Assistant. Ask me anything about avocado cultivation, pest control, diseases, harvesting, or general farming tips!',
                isUser: false,
                timestamp: new Date(),
              },
            ]);
          },
        },
      ]
    );
  };

  // Get questions to display
  const displayQuestions = suggestions.length > 0 
    ? suggestions.map(s => s.question)
    : defaultQuestions;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.avatarContainer}>
            <Ionicons name="leaf" size={24} color="#fff" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AvoCare Assistant</Text>
            <Text style={styles.headerSubtitle}>Powered by Gemini AI</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={clearChat}
          style={styles.clearButton}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Quick Questions */}
      <View style={styles.quickQuestionsSection}>
        <Text style={styles.quickQuestionsTitle}>Quick Questions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickQuestionsContent}
        >
          {displayQuestions.map((question, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickQuestionButton}
              onPress={() => handleQuickQuestion(question)}
              disabled={isTyping}
            >
              <Ionicons name="help-circle-outline" size={16} color="#5d873e" style={styles.questionIcon} />
              <Text style={styles.quickQuestionText} numberOfLines={1}>{question}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Container with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Chat Messages - Scrollable */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {chatMessages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessageContainer : styles.botMessageContainer,
                ]}
              >
                {!message.isUser && (
                  <View style={[styles.botAvatar, message.isError && styles.errorAvatar]}>
                    <Ionicons 
                      name={message.isError ? "alert-circle" : "leaf"} 
                      size={16} 
                      color={message.isError ? "#d32f2f" : "#5d873e"} 
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userMessageBubble : styles.botMessageBubble,
                    message.isError && styles.errorMessageBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser ? styles.userMessageText : styles.botMessageText,
                      message.isError && styles.errorMessageText,
                    ]}
                    selectable={true}
                  >
                    {message.text}
                  </Text>
                  <Text
                    style={[
                      styles.timestamp,
                      message.isUser ? styles.userTimestamp : styles.botTimestamp,
                    ]}
                  >
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
              <View style={[styles.messageContainer, styles.botMessageContainer]}>
                <View style={styles.botAvatar}>
                  <Ionicons name="leaf" size={16} color="#5d873e" />
                </View>
                <View style={[styles.messageBubble, styles.botMessageBubble, styles.typingBubble]}>
                  <TypingIndicator />
                </View>
              </View>
            </View>
          )}
          
          {/* Bottom padding for better scrolling */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Input Area - ALWAYS VISIBLE at bottom */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Ask about avocado farming..."
            placeholderTextColor="#999"
            value={currentMessage}
            onChangeText={setCurrentMessage}
            multiline
            maxLength={1000}
            editable={!isTyping}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (currentMessage.trim() === '' || isTyping) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={currentMessage.trim() === '' || isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={currentMessage.trim() === '' ? '#ccc' : '#fff'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#5d873e',
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a6b31',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#d4e5cc',
    marginTop: 2,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  quickQuestionsSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    paddingVertical: 10,
  },
  quickQuestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d873e',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  quickQuestionsContent: {
    paddingHorizontal: 12,
  },
  quickQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#5d873e',
    maxWidth: width * 0.7,
  },
  questionIcon: {
    marginRight: 6,
  },
  quickQuestionText: {
    fontSize: 12,
    color: '#5d873e',
    fontWeight: '500',
    flexShrink: 1,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  messageWrapper: {
    marginBottom: 12,
    width: '100%',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  botMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#5d873e',
    flexShrink: 0,
  },
  errorAvatar: {
    backgroundColor: '#ffebee',
    borderColor: '#d32f2f',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flex: 1,
    minWidth: 60,
  },
  userMessageBubble: {
    backgroundColor: '#5d873e',
    borderBottomRightRadius: 4,
  },
  botMessageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  errorMessageBubble: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 70,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#333',
  },
  errorMessageText: {
    color: '#c62828',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#d4e5cc',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#999',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5d873e',
    marginHorizontal: 3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 10,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#e8e8e8',
    elevation: 0,
  },
});

export default ChatbotScreen;