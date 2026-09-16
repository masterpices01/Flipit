import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, useWindowDimensions, Animated, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingSettingsPanel from './FloatingSettingsPanel';
import { getOptimalLayout, shuffle } from './utils';

const ALL_ICONS = ['🐙','🦑','🦞','🦀','🐠','🐟','🐬','🐳'];
ALL_ICONS.push("🦈");
ALL_ICONS.push("🪼");
ALL_ICONS.push("🦪");
ALL_ICONS.push("🐡");
ALL_ICONS.push("🐚");
ALL_ICONS.push("🦭");
ALL_ICONS.push("🪸");
ALL_ICONS.push("🐸");
ALL_ICONS.push("🐊");
ALL_ICONS.push("🐢");
ALL_ICONS.push("🦠");
ALL_ICONS.push("⭐️");
ALL_ICONS.push("⚡️");
ALL_ICONS.push("☄️");
ALL_ICONS.push("🌈");
ALL_ICONS.push("🐧");
ALL_ICONS.push("⚓");
ALL_ICONS.push("🫧");
ALL_ICONS.push("🏝️");
ALL_ICONS.push("🦐");
ALL_ICONS.push("🌊");
ALL_ICONS.push("💭");
ALL_ICONS.push("💧");
ALL_ICONS.push("☀️");
ALL_ICONS.push("🏖️");
ALL_ICONS.push("🧊");
window.icons = ALL_ICONS;

const STORAGE_KEY = 'MEMORY_GAME_SETTINGS_V1';

const webStyles = Platform.OS === 'web' ? {
  userSelect: 'none',
  WebkitUserSelect: 'none',
} : {};

const Card = ({ card, index, onPress, isOpen, isMatched, isSuccess, settings, layout }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(animatedValue, {
      toValue: isOpen ? 180 : 0,
      duration: 400,
      useNativeDriver: true, 
    });
    anim.start();
    
    return () => anim.stop();
  }, [isOpen]);

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <TouchableOpacity 
      disabled={isMatched}
      onPress={() => onPress(index)}
      style={[
        styles.cardContainer, 
        { width: layout.cardW, height: layout.cardH, opacity: isMatched ? settings.matchedOpacity : 1 }
      ]}
    >
      <Animated.View style={[styles.cardSide, { backgroundColor: settings.cardBack, transform: [{ rotateY: frontInterpolate }] }]} />
      
      <Animated.View style={[
        styles.cardSide, 
        styles.cardFront, 
        isSuccess && { 
            backgroundColor: '#27ae60',
            borderWidth: 3, 
            borderColor: '#2ecc71',
        },
        { transform: [{ rotateY: backInterpolate }] }
      ]}>
        <Text style={[styles.cardIcon, { fontSize: layout.cardH * 0.5, color: isSuccess ? '#fff' : '#000' }]}>
          {!isMatched ? card.symbol : ""} 
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function App() {
  const { width, height } = useWindowDimensions();
  const matchTimeoutRef = useRef(null);
  const isProcessing = useRef(false); 
  const isInitializing = useRef(true);
  
  // 新增：用來記錄每一步的歷史狀態
  const historyRef = useRef([]); 
  
  const [successPair, setSuccessPair] = useState([]);
  
  const defaultSettings = { 
    bgColor: '#aaa', 
    cardBack: '#34495e', 
    matchedOpacity: 0.2, 
    difficulty: 12,
    boardSizeScale: 1.0, 
    boardAspect: 1.618,
    orientation: 'DEFAULT',
    modalScale: 1.0,
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [cards, setCards] = useState([]);
  const [openedCards, setOpenedCards] = useState([]);
  const [matchedIndices, setMatchedIndices] = useState([]);
  const [moves, setMoves] = useState(0);
  const [turnCounts, setTurnCounts] = useState({});
  const [overlay, setOverlay] = useState({ show: false, title: "", msg: "", success: false });

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          setSettings(prev => ({ ...prev, ...JSON.parse(jsonValue) }));
        }
      } catch(e) {
        console.warn("Failed to load settings", e);
      } finally {
        isInitializing.current = false;
      }
    };
    loadSettings();
  }, []);

  // Save Settings
  useEffect(() => {
    if (isInitializing.current) return;
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn("Failed to save settings", e);
      }
    };
    const timer = setTimeout(saveSettings, 500);
    return () => clearTimeout(timer);
  }, [settings]);

  // Screen Orientation
  useEffect(() => {
    async function changeOrientation() {
      try {
        if (settings.orientation === 'PORTRAIT') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } else if (settings.orientation === 'LANDSCAPE') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
        }
      } catch (e) {
        // Silently fail if not supported
      }
    }
    changeOrientation();
  }, [settings.orientation]);

  const layoutInfo = useMemo(() => {
    const { cols, rows } = getOptimalLayout(settings.difficulty);
    const gap = 10;
    const currentAspect = height > width ? 1 / 1.1 : settings.boardAspect;
    const baseWidth = (width - 40) * settings.boardSizeScale; 
    const availH = (height - 150) * settings.boardSizeScale;
    const cardW = Math.min(baseWidth / cols - gap, (availH / rows - gap) * currentAspect);
    const cardH = cardW / 1.618; 
    const boardWidth = (cardW + gap) * cols;
    return { cols, rows, cardW, cardH, boardWidth };
  }, [settings.difficulty, settings.boardSizeScale, settings.boardAspect, width, height]);

  const setupDeck = useCallback(() => {
    const { cols } = getOptimalLayout(settings.difficulty); // 取得正確的欄數供 console.table 使用
    const icons = shuffle(ALL_ICONS).slice(0, settings.difficulty / 2);
    const deck = shuffle([...icons, ...icons]).map((s, i) => ({ id: i, symbol: s }));
    
    setCards(deck);
    setMatchedIndices([]);
    setOpenedCards([]);
    setMoves(0);
    setTurnCounts({});
    setOverlay({ show: false, title: "", msg: "", success: false });
    setSuccessPair([]);
    
    isProcessing.current = false;
    historyRef.current = []; // 遊戲重置時清空歷史紀錄
    if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);

    // 印出目前的矩陣答案
    const matrix = [];
    for (let i = 0; i < deck.length; i += cols) {
      matrix.push(deck.slice(i, i + cols).map(c => c.symbol));
    }
    console.log("=== 遊戲開始：解答矩陣 ===");
    console.table(matrix);

  }, [settings.difficulty]);

  useEffect(() => { setupDeck(); }, [setupDeck]);

  // 定義「回到上一動」功能
  const undoMove = useCallback(() => {
    if (historyRef.current.length === 0) {
      console.log("已經沒有上一步可以還原了！");
      return;
    }
    const lastState = historyRef.current.pop();
    
    // 恢復狀態
    setMatchedIndices(lastState.matchedIndices);
    setOpenedCards(lastState.openedCards);
    setTurnCounts(lastState.turnCounts);
    setMoves(lastState.moves);
    setSuccessPair(lastState.successPair);
    setOverlay(lastState.overlay); // 如果失敗跳出 Modal 也能還原
    
    // 如果正在等待配對動畫，將其中斷
    if (matchTimeoutRef.current) {
      clearTimeout(matchTimeoutRef.current);
      matchTimeoutRef.current = null;
    }
    isProcessing.current = false;
    console.log("已還原至上一個動作！");
  }, []);

  // 綁定至 window 供 Console 調用
  useEffect(() => {
    window.redo = undoMove;
    
    return () => {
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
    };
  }, [undoMove]);

  const handleRestart = () => {
    if (matchTimeoutRef.current) {
      clearTimeout(matchTimeoutRef.current);
      matchTimeoutRef.current = null;
    }
    isProcessing.current = true;

    setOverlay(prev => ({...prev, show: false}));
    setMatchedIndices([]); 
    setSuccessPair([]);
    setOpenedCards([]);
    setTimeout(() => {
        setupDeck(); 
        isProcessing.current = false;
    }, 550); 
  };

  const checkWin = useCallback((currentMatchedCount) => {
    if (currentMatchedCount === settings.difficulty) {
      setOverlay({ show: true, title: "SUCCESS!", msg: "Congratulations! Perfect memory.", success: true });
    }
  }, [settings.difficulty]);

  const handlePress = (idx) => {
    // 1. 基本阻擋條件
    if (matchedIndices.includes(idx) || overlay.show || openedCards.includes(idx)) return;
    if (isProcessing.current && openedCards.length !== 2) return; 

    // ✅ 記錄當下狀態到 historyRef (確保在修改前記錄)
    historyRef.current.push({
      matchedIndices,
      openedCards,
      turnCounts,
      moves,
      successPair,
      overlay
    });

    // 2. 處理「已翻兩張，點擊第三張」的情況
    if (openedCards.length === 2) {
      if (matchTimeoutRef.current) {
        clearTimeout(matchTimeoutRef.current);
        matchTimeoutRef.current = null;
      }
      isProcessing.current = false;

      const [i1, i2] = openedCards;
      if (cards[i1].symbol === cards[i2].symbol) {
        setMatchedIndices(prev => {
          const next = [...prev, i1, i2];
          checkWin(next.length);
          return next;
        });
      }
      // 點擊第三張時，前兩張處理完畢，新開這張
      setOpenedCards([idx]);
      setSuccessPair([]); 
      setTurnCounts(prev => ({ ...prev, [idx]: (Number(prev[idx]) || 0) + 1 }));
      return;
    }

    // 3. 處理正常翻牌（第1張或第2張）
    const currentCount = Number(turnCounts[idx]) || 0;
    const newCount = currentCount + 1;
    const nextTurnCounts = { ...turnCounts, [idx]: newCount };
    
    setTurnCounts(nextTurnCounts);
    const newOpened = [...openedCards, idx];
    setOpenedCards(newOpened);

    // 4. 如果翻開了兩張，進行比對邏輯
    if (newOpened.length === 2) {
      setMoves(m => m + 1);
      const [fIdx, sIdx] = newOpened;
      const isMatch = cards[fIdx].symbol === cards[sIdx].symbol;

      if (!isMatch) {
        // 檢查失敗條件
        const c1 = nextTurnCounts[fIdx] || 0;
        const c2 = nextTurnCounts[sIdx] || 0;
        
        if (c1 >= 2 || c2 >= 2) {
          setOverlay({ show: true, title: "GAME OVER", msg: `This card has appeared ${Math.max(c1, c2)} times!`, success: false });
          return;
        }

        isProcessing.current = true; 
        matchTimeoutRef.current = setTimeout(() => {
          setOpenedCards([]);
          isProcessing.current = false; 
          matchTimeoutRef.current = null;
        }, 1200);
      } else {
        setSuccessPair([fIdx, sIdx]);
        isProcessing.current = true;
        matchTimeoutRef.current = setTimeout(() => {
          setMatchedIndices(prev => {
            const next = [...prev, fIdx, sIdx];
            checkWin(next.length);
            return next;
          });
          setOpenedCards([]);
          setSuccessPair([]);
          isProcessing.current = false;
          matchTimeoutRef.current = null;
        }, 600);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: settings.bgColor }]}>
      <View style={[styles.board, { width: layoutInfo.boardWidth }]}>
        {cards.map((card, i) => (
          <Card 
            key={i} 
            card={card} 
            index={i} 
            settings={settings}
            layout={layoutInfo}
            isOpen={openedCards.includes(i) || matchedIndices.includes(i)}
            isMatched={matchedIndices.includes(i)}
            isSuccess={successPair.includes(i)}
            onPress={handlePress}
          />
        ))}
      </View>
      
      <FloatingSettingsPanel 
        settings={settings} 
        setSettings={setSettings} 
        onRestart={handleRestart} 
        moves={moves} 
      />
      
      <Modal visible={overlay.show} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { transform: [{ scale: settings.modalScale || 1 }] } 
          ]}>
            <Text style={styles.modalTitle}>{overlay.title}</Text>
            <Text style={styles.modalMsg}>{overlay.msg}</Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: overlay.success ? '#27ae60' : '#e74c3c' }]} onPress={handleRestart}>
              <Text style={{color:'#fff', fontWeight: 'bold'}}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const isWeb = Platform.OS === 'web';

let webView;
if(isWeb){ webView = 400}else{ webView = 800};

const styles = StyleSheet.create({
  container: { 
    flex: 1, alignItems: 'center', justifyContent: 'center',
    ...webStyles,
  },
  board: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cardContainer: { margin: 5 },
  cardSide: { 
    position: 'absolute', width: '100%', height: '100%', 
    backfaceVisibility: 'hidden', borderRadius: 10, 
    elevation: 5, 
    justifyContent: 'center', alignItems: 'center' 
  },
  cardFront: { backgroundColor: '#fff', transform: [{ rotateY: '180deg' }] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    backgroundColor: '#fff', padding: 40, borderRadius: 20, 
    alignItems: 'center', width: '100%', maxWidth: webView,
    ...webStyles,
  },
  modalTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  modalMsg: { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  btn: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 10, width:"100%",height:"auto" },
  cardIcon: { textAlign: 'center', ...webStyles }
});