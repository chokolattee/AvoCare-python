import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { API_BASE_URL as BASE_URL } from '../../config/api';
import { styles } from '../../Styles/ChatbotScreen.styles';

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

// On web, SafeAreaView renders as a plain div without height constraints,
// which prevents the inner ScrollView from scrolling. Use View on web instead.
const RootContainer = Platform.OS === 'web' ? View : SafeAreaView;

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
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Auto-scroll when messages update
  useEffect(() => {
    if (chatMessages.length > 0 || isTyping) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, isTyping]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/chatbot/suggestions`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
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
          isError: true,
        };
      }
    } catch (error) {
      console.error('Backend API error:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            text: 'Request timed out. Please check your connection and try again.',
            isError: true,
          };
        }
        if (error.message.includes('Network request failed')) {
          return {
            text: 'Cannot connect to server. Please check your internet connection.',
            isError: true,
          };
        }
      }

      return {
        text: 'An error occurred. Please try again.',
        isError: true,
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

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

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

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleQuickQuestion = (question: string) => {
    setCurrentMessage(question);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
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

  const displayQuestions = suggestions.length > 0
    ? suggestions.map(s => s.question)
    : defaultQuestions;

  return (
    <RootContainer style={styles.container}>
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

      {/* Main Chat Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled={Platform.OS !== 'web'}
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
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
                      name={message.isError ? 'alert-circle' : 'leaf'}
                      size={16}
                      color={message.isError ? '#d32f2f' : '#5d873e'}
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
        </ScrollView>

        {/* Input Area */}
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
            onSubmitEditing={handleSendMessage}
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
    </RootContainer>
  );
};

export default ChatbotScreen;