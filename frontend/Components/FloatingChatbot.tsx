import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { API_BASE_URL as BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fabStyles, chatStyles, CHAT_WIDTH, CHAT_HEIGHT } from '../Styles/Floatingchatbot.styles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Language Config ───────────────────────────────────────────────────────────

export type Language = 'english' | 'filipino' | 'taglish';

const LANGUAGES: { key: Language; label: string; flag: string }[] = [
  { key: 'english',  label: 'EN',  flag: '🇺🇸' },
  { key: 'filipino', label: 'FIL', flag: '🇵🇭' },
  { key: 'taglish',  label: 'TGL', flag: '🌴' },
];

const LANG_SYSTEM_PROMPTS: Record<Language, string> = {
  english:
    'You are AvoBot, a professional avocado farming assistant developed by AvoCare. Provide accurate, science-based information about avocado cultivation, pest management, disease identification, and harvesting practices. Maintain a helpful, educational tone and prioritize practical, actionable advice for farmers and enthusiasts.',
  filipino:
    'Ikaw si AvoBot, isang propesyonal na katulong sa pagtatanim ng abokado na binuo ng AvoCare. Magbigay ng tumpak at siyentipikong impormasyon tungkol sa pag-aalaga ng abokado, pamamahala ng peste, pagkilala ng sakit, at mga paraan ng pag-aani. Gumamit ng pormal ngunit magiliw na tono at magbigay ng praktikal na payo para sa mga magsasaka at mahilig magtanim.',
  taglish:
    'You are AvoBot, a professional avocado farming assistant developed by AvoCare. Magbigay ng accurate at science-based information tungkol sa avocado cultivation, pest management, disease identification, at harvesting practices. Maintain a helpful at educational tone habang nagbibigay ng practical at actionable advice para sa mga farmers at enthusiasts.',
};

const WELCOME_MESSAGES: Record<Language, string> = {
  english:
    "Welcome to AvoCare! I'm AvoBot, your professional avocado farming assistant. I can provide expert guidance on cultivation practices, pest and disease management, optimal harvesting techniques, and more. How may I assist you with your avocado farming needs today? 🥑",
  filipino:
    'Maligayang pagdating sa AvoCare! Ako si AvoBot, ang inyong propesyonal na katulong sa pagtatanim ng abokado. Makakapagbigay ako ng ekspertong gabay tungkol sa mga paraan ng pagtatanim, pamamahala ng peste at sakit, wastong pag-aani, at iba pa. Paano ko kayo matutulungan sa inyong pag-aalaga ng abokado ngayong araw? 🥑',
  taglish:
    "Welcome to AvoCare! I'm AvoBot, your professional avocado farming assistant. I can provide expert guidance on cultivation practices, pest and disease management, optimal harvesting techniques, at marami pang iba. Paano ko kayo matutulungan with your avocado farming needs today? 🥑",
};

const QUICK_QUESTIONS: Record<Language, string[]> = {
  english: [
    'What are the early signs of root rot and how can it be treated?',
    'What is the recommended fertilizer formulation for mature avocado trees?',
    'How can I determine the optimal harvest time for my avocado variety?',
    'What are the most common pests affecting avocado trees and their control methods?',
    'What preventive measures can be taken against anthracnose infection?',
    'What is the ideal irrigation schedule for avocado trees in different seasons?',
    'How do I identify nutritional deficiencies in avocado leaves?',
    'What are the best practices for pruning avocado trees?',
  ],
  filipino: [
    'Ano ang mga maagang palatandaan ng root rot at paano ito gagamutin?',
    'Ano ang inirerekomendang pataba para sa mga mature na puno ng abokado?',
    'Paano malalaman ang tamang panahon ng pag-aani para sa ibat ibang uri ng abokado?',
    'Ano-ano ang mga karaniwang peste ng abokado at paano ito kontrolin?',
    'Anong mga preventive measures ang maaaring gawin laban sa anthracnose?',
    'Ano ang ideal na iskedyul ng pagdidilig para sa abokado sa ibat ibang panahon?',
    'Paano makikilala ang kakulangan sa nutrisyon sa dahon ng abokado?',
    'Ano ang mga best practices sa pruning ng puno ng abokado?',
  ],
  taglish: [
    'Ano ang early signs ng root rot at paano ito i-treat?',
    'Ano ang recommended na fertilizer formulation para sa mature na avocado trees?',
    'Paano ma-determine ang optimal harvest time for different avocado varieties?',
    'Ano ang mga common pests na nakakaapekto sa avocado trees at ang control methods?',
    'Anong preventive measures ang pwede gawin laban sa anthracnose infection?',
    'Ano ang ideal na irrigation schedule para sa avocado trees sa different seasons?',
    'Paano ma-identify ang nutritional deficiencies sa avocado leaves?',
    'Ano ang best practices sa pag-prune ng avocado trees?',
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isError?: boolean;
}

interface FloatingChatbotProps {
  currentRoute?: string;
  user?: any;
}

// ─── Floating Hearts ──────────────────────────────────────────────────────────

const FloatingHeart: React.FC<{ play: boolean; index: number }> = ({ play, index }) => {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale     = useRef(new Animated.Value(0.4)).current;

  const hearts  = ['💚', '🥑', '🌿', '💛', '🍃', '💚'];
  const offsets = [
    { finalX: 6,   finalY: -48 },
    { finalX: -22, finalY: -44 },
    { finalX: 20,  finalY: -42 },
    { finalX: -24, finalY: -38 },
    { finalX: 22,  finalY: -36 },
    { finalX: -4,  finalY: -50 },
  ];

  useEffect(() => {
    if (!play) {
      opacity.setValue(0); translateY.setValue(0); translateX.setValue(0); scale.setValue(0.4);
      return;
    }
    const { finalX, finalY } = offsets[index % offsets.length];
    setTimeout(() => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true, delay: 250 }),
        ]),
        Animated.timing(translateY, { toValue: finalY, duration: 900, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: finalX, duration: 900, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.1, duration: 220, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.7, duration: 680, useNativeDriver: true }),
        ]),
      ]).start(() => {
        opacity.setValue(0); translateY.setValue(0); translateX.setValue(0); scale.setValue(0.4);
      });
    }, index * 130);
  }, [play]);

  const positions = [
    { top: -8, left: '50%' as any },
    { top: -4, left: '10%' as any },
    { top: -4, left: '80%' as any },
    { top: '40%' as any, left: '2%' as any },
    { top: '40%' as any, left: '88%' as any },
    { top: '20%' as any, left: '44%' as any },
  ];

  return (
    <Animated.Text style={[fabStyles.heart, positions[index % positions.length], { opacity, transform: [{ translateY }, { translateX }, { scale }] }]}>
      {hearts[index % hearts.length]}
    </Animated.Text>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 180),
        Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={chatStyles.typingRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[chatStyles.typingDot, {
          opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
          transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
        }]} />
      ))}
    </View>
  );
};

// ─── Markdown Renderer ────────────────────────────────────────────────────────

const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const renderInline = (text: string, key: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <Text key={key}>
        {parts.map((part, i) =>
          /^\*\*(.+)\*\*$/.test(part)
            ? <Text key={i} style={chatStyles.mdBold}>{part.slice(2, -2)}</Text>
            : <Text key={i}>{part}</Text>
        )}
      </Text>
    );
  };

  return (
    <View>
      {content.split('\n').map((line, i) => {
        if (line.trim() === '') return <View key={i} style={{ height: 3 }} />;
        if (/^#{1,3}\s/.test(line)) {
          const level = line.match(/^(#+)/)?.[1].length ?? 1;
          return <Text key={i} style={[chatStyles.mdHeading, level === 1 ? chatStyles.mdH1 : level === 2 ? chatStyles.mdH2 : chatStyles.mdH3]}>{line.replace(/^#+\s/, '')}</Text>;
        }
        if (/^[*\-•]\s/.test(line)) {
          return <View key={i} style={chatStyles.mdBulletRow}><Text style={chatStyles.mdBulletIcon}>🌿 </Text><Text style={chatStyles.mdBulletText}>{renderInline(line.replace(/^[*\-•]\s/, ''), `b-${i}`)}</Text></View>;
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)?.[1] ?? '1';
          return <View key={i} style={chatStyles.mdBulletRow}><Text style={chatStyles.mdBulletIcon}>{num}. </Text><Text style={chatStyles.mdBulletText}>{renderInline(line.replace(/^\d+\.\s/, ''), `n-${i}`)}</Text></View>;
        }
        return <Text key={i} style={chatStyles.mdParagraph}>{renderInline(line, `p-${i}`)}</Text>;
      })}
    </View>
  );
};

// ─── Main FloatingChatbot ─────────────────────────────────────────────────────

const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ currentRoute, user }) => {
  // ── ALL HOOKS FIRST ───────────────────────────────────────────────────────
  const [language, setLanguage]     = useState<Language>('taglish');
  const [isOpen, setIsOpen]         = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', text: WELCOME_MESSAGES['taglish'], isUser: false, timestamp: new Date() },
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping]     = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [heartsPlaying, setHeartsPlaying] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const scaleAnim     = useRef(new Animated.Value(0)).current;
  const opacityAnim   = useRef(new Animated.Value(0)).current;
  const fabScaleAnim  = useRef(new Animated.Value(1)).current;
  const fabBobAnim    = useRef(new Animated.Value(0)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;
  const avoBobAnim    = useRef(new Animated.Value(0)).current;

  // FAB bob
  useEffect(() => {
    const bob = Animated.loop(Animated.sequence([
      Animated.timing(fabBobAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(fabBobAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ]));
    bob.start();
    return () => bob.stop();
  }, []);

  // Header avo bob
  useEffect(() => {
    const bob = Animated.loop(Animated.sequence([
      Animated.timing(avoBobAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(avoBobAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ]));
    bob.start();
    return () => bob.stop();
  }, []);

  // Badge
  useEffect(() => {
    Animated.spring(badgeScaleAnim, { toValue: unreadCount > 0 && !isOpen ? 1 : 0, useNativeDriver: true, bounciness: 18 }).start();
  }, [unreadCount, isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
  }, [chatMessages, isTyping, isOpen]);

  // Update welcome message when language changes
  useEffect(() => {
    setChatMessages([{ id: '1', text: WELCOME_MESSAGES[language], isUser: false, timestamp: new Date() }]);
  }, [language]);

  // ── Safe early return — after ALL hooks ───────────────────────────────────
  if (['Scan'].includes(currentRoute ?? '') || !user) return null;

  // ── Derived values ────────────────────────────────────────────────────────
  const fabBobTranslate = fabBobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const fabBobRotate    = fabBobAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-2deg', '2deg', '-2deg'] });
  const avoBobTranslate = avoBobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const avoBobRotate    = avoBobAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-2deg', '2deg', '-2deg'] });
  const quickQs = QUICK_QUESTIONS[language];

  // ── Open / Close ──────────────────────────────────────────────────────────
  const openChat = () => {
    setIsOpen(true); setUnreadCount(0); setHeartsPlaying(true);
    setTimeout(() => setHeartsPlaying(false), 1100);
    Animated.parallel([
      Animated.spring(scaleAnim,    { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 16 }),
      Animated.timing(opacityAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(fabScaleAnim, { toValue: 0, useNativeDriver: true, speed: 22 }),
    ]).start();
  };

  const closeChat = () => {
    Animated.parallel([
      Animated.timing(scaleAnim,    { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.spring(fabScaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
    ]).start(() => setIsOpen(false));
  };

  // ── API ───────────────────────────────────────────────────────────────────
  const sendMessageToBackend = async (message: string): Promise<{ text: string; isError: boolean }> => {
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 30000);
      const response   = await fetch(`${BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          language,
          systemPrompt: LANG_SYSTEM_PROMPTS[language],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (response.ok && data.success && data.response) return { text: data.response, isError: false };
      return { text: data.error || "Sorry, I couldn't process that.", isError: true };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') return { text: 'Request timed out. Please check your connection.', isError: true };
        if (error.message.includes('Network request failed')) return { text: 'Cannot connect to server.', isError: true };
      }
      return { text: 'An error occurred. Please try again.', isError: true };
    }
  };

  const handleSendMessage = async () => {
    if (currentMessage.trim() === '' || isTyping) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), text: currentMessage.trim(), isUser: true, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsTyping(true);
    const { text, isError } = await sendMessageToBackend(userMsg.text);
    setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text, isUser: false, timestamp: new Date(), isError }]);
    setIsTyping(false);
    if (!isOpen) setUnreadCount(prev => prev + 1);
  };

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setChatMessages([{ id: '1', text: WELCOME_MESSAGES[language], isUser: false, timestamp: new Date() }]) },
    ]);
  };

  // Scale-from-corner transform
  const chatTransform = [
    { scale: scaleAnim },
    { translateX: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [CHAT_WIDTH / 2, 0] }) },
    { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [CHAT_HEIGHT / 2, 0] }) },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Chat Window ── */}
      <Animated.View
        style={[chatStyles.chatWindow, { opacity: opacityAnim, transform: chatTransform }]}
        pointerEvents={isOpen ? 'box-none' : 'none'}
      >
        {/* Header */}
        <View style={chatStyles.chatHeader}>
          <View style={chatStyles.leavesContainer} pointerEvents="none">
            {['🍃', '🌿', '🍃', '🌿'].map((leaf, i) => (
              <Text key={i} style={[chatStyles.leafDecor, chatStyles[`leaf${i + 1}` as keyof typeof chatStyles] as any]}>{leaf}</Text>
            ))}
          </View>

          <View style={chatStyles.headerTopRow}>
            <TouchableOpacity onPress={clearChat} style={chatStyles.headerIconBtn}>
              <Ionicons name="trash-outline" size={14} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={closeChat} style={chatStyles.closeBtn}>
              <Text style={chatStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={chatStyles.headerAvoRow}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => { setHeartsPlaying(true); setTimeout(() => setHeartsPlaying(false), 1100); }}>
              <View style={chatStyles.avoAvatarWrap}>
                <Animated.Text style={[chatStyles.avoAvatarEmoji, { transform: [{ translateY: avoBobTranslate }, { rotate: avoBobRotate }] }]}>🥑</Animated.Text>
                {[0,1,2,3,4,5].map(i => <FloatingHeart key={i} play={heartsPlaying} index={i} />)}
              </View>
            </TouchableOpacity>

            <View style={chatStyles.headerInfo}>
              <Text style={chatStyles.headerTitle}>AvoBot</Text>
              <Text style={chatStyles.headerSubtitle}>AvoCare Assistant</Text>
              <View style={chatStyles.onlineRow}>
                <View style={chatStyles.onlineDot} />
                <Text style={chatStyles.onlineText}>Online!</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Language Selector Bar ── */}
        <View style={chatStyles.langBar}>
          <Text style={chatStyles.langLabel}>🌐 Lang:</Text>
          {LANGUAGES.map(({ key, label, flag }) => (
            <TouchableOpacity
              key={key}
              style={[chatStyles.langBtn, language === key && chatStyles.langBtnActive]}
              onPress={() => setLanguage(key)}
              activeOpacity={0.75}
            >
              <Text style={[chatStyles.langBtnText, language === key && chatStyles.langBtnTextActive]}>
                {flag} {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={chatStyles.messagesArea}
          contentContainerStyle={chatStyles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {chatMessages.map(msg => (
            <View key={msg.id} style={[chatStyles.msgRow, msg.isUser ? chatStyles.msgRowUser : chatStyles.msgRowBot]}>
              {!msg.isUser && <View style={chatStyles.msgAvatar}><Text style={chatStyles.msgAvatarEmoji}>🥑</Text></View>}
              <View style={[chatStyles.bubble, msg.isUser ? chatStyles.bubbleUser : chatStyles.bubbleBot, msg.isError && chatStyles.bubbleError]}>
                {msg.isUser
                  ? <Text style={chatStyles.bubbleTextUser}>{msg.text}</Text>
                  : <MarkdownText content={msg.text} />}
                <Text style={[chatStyles.timestamp, msg.isUser ? chatStyles.tsUser : chatStyles.tsBot]}>
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {msg.isUser && <View style={[chatStyles.msgAvatar, chatStyles.msgAvatarUser]}><Ionicons name="person" size={13} color="#fff" /></View>}
            </View>
          ))}

          {isTyping && (
            <View style={[chatStyles.msgRow, chatStyles.msgRowBot]}>
              <View style={chatStyles.msgAvatar}><Text style={chatStyles.msgAvatarEmoji}>🥑</Text></View>
              <View style={[chatStyles.bubble, chatStyles.bubbleBot, { paddingVertical: 12 }]}><TypingIndicator /></View>
            </View>
          )}
        </ScrollView>

        {/* Quick Questions — toggled by lightbulb button */}
        {showQuickQuestions && (
          <ScrollView style={chatStyles.quickSection} showsVerticalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {quickQs.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={chatStyles.quickBtn}
                onPress={() => { setCurrentMessage(q); setShowQuickQuestions(false); }}
                disabled={isTyping}
                activeOpacity={0.75}
              >
                <Text style={chatStyles.quickBtnText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={chatStyles.inputArea}>
          {/* Lightbulb toggle for quick questions */}
          <TouchableOpacity
            style={[chatStyles.quickToggleBtn, showQuickQuestions && chatStyles.quickToggleBtnActive]}
            onPress={() => setShowQuickQuestions(prev => !prev)}
            activeOpacity={0.75}
          >
            <Text style={chatStyles.quickToggleIcon}>💡</Text>
          </TouchableOpacity>
          <TextInput
            style={chatStyles.input}
            placeholder={language === 'english' ? 'Ask about avocado farming...' : language === 'filipino' ? 'Magtanong tungkol sa abokado...' : 'Magtanong about avocado farming...'}
            placeholderTextColor="#a8c8a8"
            value={currentMessage}
            onChangeText={setCurrentMessage}
            multiline
            maxLength={1000}
            editable={!isTyping}
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[chatStyles.sendBtn, (currentMessage.trim() === '' || isTyping) && chatStyles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={currentMessage.trim() === '' || isTyping}
            activeOpacity={0.8}
          >
            {isTyping ? <ActivityIndicator size="small" color="#fff" /> : <Text style={chatStyles.sendBtnIcon}>➤</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── FAB ── */}
      <Animated.View
        style={[fabStyles.fabContainer, { transform: [{ scale: fabScaleAnim }, { translateY: fabBobTranslate }, { rotate: fabBobRotate }] }]}
        pointerEvents={isOpen ? 'none' : 'box-none'}
      >
        <TouchableOpacity style={fabStyles.fab} onPress={openChat} activeOpacity={0.85}>
          {[0,1,2,3,4,5].map(i => <FloatingHeart key={i} play={heartsPlaying} index={i} />)}
          <Text style={fabStyles.fabEmoji}>🥑</Text>
        </TouchableOpacity>
        <Animated.View style={[fabStyles.badge, { transform: [{ scale: badgeScaleAnim }] }]}>
          <Text style={fabStyles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </Animated.View>
      </Animated.View>
    </>
  );
};

export default FloatingChatbot;