import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, onSnapshot, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { AlertCircle, Copy, Play, SkipForward, Users, Trophy, Image as ImageIcon, X, Check, ShieldAlert, Crown, Medal, Home, Presentation, Flag, ThumbsUp, ThumbsDown } from 'lucide-react';
import { auth, db, appId } from './firebase';

export interface MemeZone {
  top: string;
  left: string;
  width: string;
  height?: string;
  placeholder: string;
  fontSize?: string;
}

export interface MemeTemplate {
  url: string;
  zones: MemeZone[];
}

export interface Player {
  name: string;
  score: number;
}

export interface Caption {
  texts: string[];
  votes: number;
}

export interface PendingCaption {
  texts: string[];
  originalTexts: string[];
  timestamp: number;
  inappropriateWords: Record<number, any[]>;
}

export interface RoomData {
  hostId: string;
  status: 'lobby' | 'playing' | 'voting' | 'results' | 'final';
  players: Record<string, Player>;
  bannedWords: string;
  currentMeme: MemeTemplate | null;
  currentTheme: string | null;
  captions: Record<string, Caption>;
  pendingCaptions: Record<string, PendingCaption>;
  voters: string[];
  playedMemes: string[];
  playedThemes: string[]; // <-- AJOUT
  moderationEnabled: boolean;
  timeLimit: number;
  timerEndsAt: number | null;
  rejectedMemes?: string[];
}

export const LOCAL_MEME_LIBRARY = [
  { url: "/memes/Expanding-Brain.jpg", zones: [{ top: '5%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 1' }, { top: '30%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 2' }, { top: '55%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 3' }, { top: '80%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 4' }] },
  { url: "/memes/Buff-Doge-vs-Cheems.png", zones: [{ top: '10%', left: '5%', width: '45%', height: '30%', placeholder: 'Buff Doge' }, { top: '25%', left: '55%', width: '40%', height: '30%', placeholder: 'Cheems' }] },
  { url: "/memes/Tuxedo-Winnie-The-Pooh.webp", zones: [{ top: '15%', left: '55%', width: '40%', height: '30%', placeholder: 'Normal Pooh' }, { top: '65%', left: '55%', width: '40%', height: '30%', placeholder: 'Tuxedo Pooh' }] },
  { url: "/memes/Sad-Pablo-Escobar.jpg", zones: [{ top: '40%', left: '10%', width: '80%', height: '20%', placeholder: 'Quand tu attends...' }] },
  { url: "/memes/baby-covering-mouth.jpg", zones: [{ top: '5%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Haut' }] },
  { url: "/memes/guy-pointing-at-himself.jpg", zones: [{ top: '75%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }] },
  { url: "/memes/ellie-smirk-meme.jpg", zones: [{ top: '75%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }] },
  { url: "/memes/rabbit-clock-meme.jpg", zones: [{ top: '75%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }] },
  { url: "/memes/3drags.jpg", zones: [{ top: '15%', left: '5%', width: '30%', height: '20%', placeholder: 'Dragon Sérieux 1' }, { top: '15%', left: '35%', width: '30%', height: '20%', placeholder: 'Dragon Sérieux 2' }, { top: '25%', left: '68%', width: '30%', height: '20%', placeholder: 'Dragon Débile' }] },
  { url: "/memes/doomer.jpeg", zones: [{ top: '80%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }] },
  { url: "/memes/venom_dunk.jpeg", zones: [{ top: '10%', left: '10%', width: '40%', height: '20%', placeholder: 'Venom' }, { top: '70%', left: '50%', width: '40%', height: '20%', placeholder: 'Spiderman' }] },
  { url: "/memes/crying_mask.jpeg", zones: [{ top: '80%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }] },
  { url: "/memes/kermit_hug.jpeg", zones: [{ top: '75%', left: '5%', width: '40%', height: '20%', placeholder: 'Kermit qui regarde' }, { top: '75%', left: '50%', width: '45%', height: '20%', placeholder: 'Kermit en hug' }] },
  { url: "/memes/singe.jpg", zones: [{ top: '5%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Haut' }] },
  { url: "/memes/squid.jpg", zones: [{ top: '40%', left: '0%', width: '80%', height: '20%', placeholder: 'Squid' }, { top: '15%', left: '35%', width: '80%', height: '20%', placeholder: 'Bob et Patrick' }] }
];

export const THEMES_LIBRARY = [
  "Quand ton code compile du premier coup",
  "Le lundi matin au bureau",
  "Quand tu vois ton compte en banque à la fin du mois",
  "Les repas de famille à Noël",
  "Quand tu essaies de dormir mais ton cerveau refuse",
  "La vie étudiante en fin de mois",
  "Les réunions qui auraient pu être un simple email",
  "Quand tu oublies ton mot de passe pour la 5ème fois",
  "Ton excuse éclatée pour arriver en retard",
  "La commande sur internet que tu n'aurais jamais dû faire",
  "Quand tu croises ton prof au supermarché",
  "Le moment de solitude quand tu dis au revoir mais vous allez dans la même direction"
];

const memeTextStyle: React.CSSProperties = {
  fontFamily: 'Impact, sans-serif',
  textTransform: 'uppercase',
  color: 'white',
  textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0px 2px 0 #000, 2px 0px 0 #000, 0px -2px 0 #000, -2px 0px 0 #000',
  wordWrap: 'break-word',
  whiteSpace: 'pre-wrap', // <--- AJOUTE CETTE LIGNE ICI
  textAlign: 'center',
  lineHeight: '1.1'
};

// Composant Timer pour afficher le temps restant
const TimerDisplay = ({ endsAt }: { endsAt: number | null }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    if (!endsAt) return;
    
    const updateTimer = () => setTimeLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
    updateTimer(); // Initial call
    
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [endsAt]);
  
  if (!endsAt) return null;
  
  return (
    <div className={`font-mono text-xl sm:text-2xl font-bold flex items-center gap-2 px-4 py-2 rounded-xl border ${timeLeft <= 10 ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse' : 'bg-blue-900/50 border-blue-500 text-blue-300'}`}>
      ⏱️ {timeLeft}s
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [currentTexts, setCurrentTexts] = useState<string[]>([]);
  const [localBannedWords, setLocalBannedWords] = useState('merde, con, putain, idiot, nul');

  const [presenterMode, setPresenterMode] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    signInAnonymously(auth).catch((err) => console.error("Erreur d'authentification:", err));

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !currentRoomCode || !db) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as RoomData;
        setRoomData(data);
      } else {
        setErrorMsg("La salle n'existe plus.");
        setCurrentRoomCode(null);
      }
    }, (err) => {
      console.error("Erreur de synchronisation:", err);
      setErrorMsg("Erreur de connexion à la salle.");
    });
    return () => unsubscribe();
  }, [user, currentRoomCode]);

  useEffect(() => {
    if (roomData?.currentMeme?.zones && currentTexts.length !== roomData.currentMeme.zones.length) {
      setCurrentTexts(Array(roomData.currentMeme.zones.length).fill(''));
    }
  }, [roomData?.currentMeme]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPresenter = urlParams.get('presenter') === 'true';
    const roomCode = urlParams.get('room');
    
    if (isPresenter) {
      setPresenterMode(true);
      if (roomCode && !currentRoomCode) {
        setCurrentRoomCode(roomCode);
      }
    }
  }, [currentRoomCode]);

  const isHost = (data = roomData) => {
    return data?.hostId === user?.uid;
  };

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const createRoom = async () => {
    if (!user) return setErrorMsg("Erreur d'authentification.");
    const code = generateRoomCode();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);

    const initialData: RoomData = {
      hostId: user.uid,
      status: 'lobby',
      players: {}, 
      bannedWords: 'merde, con, putain, idiot, nul',
      currentMeme: null,
      currentTheme: null,
      captions: {},
      pendingCaptions: {},
      voters: [],
      playedMemes: [],
      playedThemes: [], // <-- AJOUT
      moderationEnabled: true,
      timeLimit: 300,
      timerEndsAt: null,
      rejectedMemes: []
    };

    try {
      await setDoc(roomRef, initialData);
      setCurrentRoomCode(code);
      navigate(`/admin/${code}`);
    } catch (err) {
      setErrorMsg("Erreur lors de la création de la salle.");
    }
  };

  const joinRoom = async () => {
    if (!roomCodeInput.trim() || !user) return setErrorMsg("Infos manquantes.");
    const code = roomCodeInput.toUpperCase().trim();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);

    try {
      const docSnap = await getDoc(roomRef);
      if (!docSnap.exists()) return setErrorMsg("Salle introuvable.");
      
      const data = docSnap.data() as RoomData;
      
      if (data.hostId === user.uid) {
        navigate(`/admin/${code}`);
        return;
      }
      
      if (!playerName.trim()) return setErrorMsg("Entrez un pseudo.");
      
      const players = data.players || {};
      if (data.status !== 'lobby' && !players[user.uid]) {
        return setErrorMsg("La partie a déjà commencé.");
      }

      const censoredPlayerName = censorText(playerName.trim(), data.bannedWords || localBannedWords);
      const existingScore = players[user.uid]?.score || 0;

      await updateDoc(roomRef, {
        [`players.${user.uid}`]: { name: censoredPlayerName, score: existingScore }
      });
      setCurrentRoomCode(code);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg("Erreur pour rejoindre la salle.");
    }
  };

  const updateBannedWords = async (words: string) => {
    setLocalBannedWords(words);
    if (!user || !currentRoomCode) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    await updateDoc(roomRef, { bannedWords: words });
  };

  const toggleModerationEnabled = async () => {
    if (!isHost() || !currentRoomCode || !roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    await updateDoc(roomRef, { moderationEnabled: !roomData.moderationEnabled });
  };

  const detectInappropriateContent = (text: string, bannedWordsStr: string) => {
    if (!text) return { hasBannedWords: false, detectedWords: [] as any[] };
    
    const bannedWords = bannedWordsStr?.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0) || [];
    const detectedWords: any[] = [];
    let hasBannedWords = false;
    
    const wholeWordRegex = new RegExp(`\\b(${bannedWords.join('|')})\\b`, 'gi');
    let match;
    while ((match = wholeWordRegex.exec(text)) !== null) {
      detectedWords.push({ word: match[0], isWholeWord: true });
      hasBannedWords = true;
    }
    
    bannedWords.forEach(word => {
      if (word.length < 3) return;
      const regex = new RegExp(word, 'gi');
      let innerMatch;
      while ((innerMatch = regex.exec(text)) !== null) {
        const isAlreadyDetected = detectedWords.some(
          detected => detected.isWholeWord && 
          innerMatch!.index >= detected.index &&
          innerMatch!.index + innerMatch![0].length <= detected.index + detected.word.length
        );
        
        if (!isAlreadyDetected) {
          detectedWords.push({ word: innerMatch[0], index: innerMatch.index, isWholeWord: false });
          hasBannedWords = true;
        }
      }
    });
    
    return { hasBannedWords, detectedWords };
  };

  const censorText = (text: string, bannedString: string) => {
    if (!text) return '';
    let result = text;
    const words = bannedString?.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0) || [];
    
    words.forEach(word => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      result = result.replace(regex, (match) => {
        const chars = '!@#$%&*?';
        return Array.from(match).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
      });
    });
    return result;
  };

  const startGame = async () => {
    if (!currentRoomCode || !roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    
    let playedMemes = roomData.playedMemes || [];
    let playedThemes = roomData.playedThemes || []; // <-- AJOUT
    
    // Filtrage des éléments déjà joués
    let availableMemes = LOCAL_MEME_LIBRARY.filter(meme => !playedMemes.includes(meme.url));
    let availableThemes = THEMES_LIBRARY.filter(theme => !playedThemes.includes(theme)); // <-- AJOUT
    
    // Stoppe si 5 tours atteints, ou si on n'a plus de mèmes/thèmes
    if (playedMemes.length >= 5 || availableMemes.length === 0 || availableThemes.length === 0) return;
    
    const randomMeme = availableMemes[Math.floor(Math.random() * availableMemes.length)];
    const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)]; // <-- MODIFIÉ
    
    await updateDoc(roomRef, {
      status: 'playing',
      currentMeme: randomMeme,
      currentTheme: randomTheme,
      captions: {},
      pendingCaptions: {},
      voters: [],
      playedMemes: [...playedMemes, randomMeme.url],
      playedThemes: [...playedThemes, randomTheme], // <-- AJOUT
      timerEndsAt: Date.now() + (roomData.timeLimit || 300) * 1000,
      rejectedMemes: []
    });
    
    setCurrentTexts(Array(randomMeme.zones.length).fill(''));
  };
  const submitCaption = async () => {
    if (currentTexts.every(t => !t.trim())) return setErrorMsg("Ajoutez du texte !");
    if (!currentRoomCode || !roomData || !user) return;
    
    const inappropriateResults = currentTexts.map(text => 
      detectInappropriateContent(text, roomData.bannedWords)
    );
    
    const hasInappropriateContent = inappropriateResults.some(result => result.hasBannedWords);
    
    const inappropriateWords: Record<number, any[]> = {};
    inappropriateResults.forEach((result, idx) => {
      if (result.detectedWords.length > 0) {
        inappropriateWords[idx] = result.detectedWords;
      }
    });
    
    const censoredTexts = currentTexts.map(t => censorText(t, roomData.bannedWords));
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    const updates: Record<string, any> = {};
    
    // Si l'utilisateur avait été rejeté, on le retire de la liste des rejets puisqu'il resoumet
    if (roomData.rejectedMemes?.includes(user.uid)) {
      updates.rejectedMemes = arrayRemove(user.uid);
    }
    
    if (roomData.moderationEnabled && hasInappropriateContent && 
        inappropriateResults.some(result => result.detectedWords.some((word: any) => !word.isWholeWord))) {
      updates[`pendingCaptions.${user.uid}`] = {
          texts: censoredTexts,
          originalTexts: currentTexts,
          timestamp: new Date().getTime(),
          inappropriateWords
      };
      await updateDoc(roomRef, updates);
      setErrorMsg("Votre mème a été soumis pour modération.");
    } else {
      updates[`captions.${user.uid}`] = {
          texts: censoredTexts,
          votes: 0
      };
      await updateDoc(roomRef, updates);
    }
  };

  const approvePendingCaption = async (uid: string) => {
    if (!isHost() || !currentRoomCode || !roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    const pendingCaption = roomData.pendingCaptions[uid];
    
    if (pendingCaption) {
      await updateDoc(roomRef, {
        [`captions.${uid}`]: { texts: pendingCaption.texts, votes: 0 },
        [`pendingCaptions.${uid}`]: null
      });
    }
  };
  
  const rejectPendingCaption = async (uid: string) => {
    if (!isHost() || !currentRoomCode) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    await updateDoc(roomRef, { [`pendingCaptions.${uid}`]: null });
  };

  const advanceToVoting = async () => {
    if (!currentRoomCode || !roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    
    if (roomData.pendingCaptions && Object.keys(roomData.pendingCaptions).length > 0) {
      await updateDoc(roomRef, { status: 'voting', voters: [], pendingCaptions: {} });
    } else {
      await updateDoc(roomRef, { status: 'voting', voters: [] });
    }
  };

  const voteForCaption = async (targetUid: string) => {
    if (targetUid === user?.uid) return setErrorMsg("Tu ne peux pas voter pour toi !");
    if (roomData?.voters?.includes(user?.uid || '')) return setErrorMsg("Tu as déjà voté.");
    if (!currentRoomCode || !user) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    try {
      await updateDoc(roomRef, {
        voters: arrayUnion(user.uid),
        [`captions.${targetUid}.votes`]: increment(1)
      });
    } catch (err) {
      setErrorMsg("Erreur lors de l'enregistrement du vote.");
    }
  };

  const advanceToResults = async () => {
    if (!currentRoomCode || !roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    const updates: Record<string, any> = { status: 'results' };
    
    Object.entries(roomData.captions || {}).forEach(([uid, cap]) => {
      if (cap.votes > 0) {
        updates[`players.${uid}.score`] = increment(cap.votes * 100);
      }
    });

    await updateDoc(roomRef, updates);
  };

  const advanceToFinalRanking = async () => {
    if (!currentRoomCode) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    await updateDoc(roomRef, { status: 'final' });
  };

  const resetToLobby = async () => {
    if (!currentRoomCode || !roomData) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    
    const resetPlayers: Record<string, any> = {};
    Object.entries(roomData.players || {}).forEach(([uid, p]) => {
      resetPlayers[uid] = { ...p, score: 0 };
    });

    await updateDoc(roomRef, {
      status: 'lobby',
      players: resetPlayers,
      playedMemes: [],
      playedThemes: [], // <-- AJOUT
      currentMeme: null,
      currentTheme: null,
      captions: {},
      pendingCaptions: {},
      voters: []
    });
  };

  const openPresenterMode = () => {
    window.open(`/presenter/${currentRoomCode}`, '_blank');
    window.open(`/admin/${currentRoomCode}`, '_blank');
  };

  if (authLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans">Chargement...</div>;

  if (presenterMode && roomData) {
    return (
      <div className="min-h-screen bg-black text-white font-sans flex flex-col">
        <header className="bg-gray-900 p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mode Présentateur - Salle {currentRoomCode}</h1>
          <div className="flex items-center gap-4">
            <span className="bg-purple-900 px-4 py-2 rounded-lg">
              {roomData.status === 'lobby' ? 'Lobby' : 
               roomData.status === 'playing' ? 'Création' :
               roomData.status === 'voting' ? 'Votes' :
               roomData.status === 'results' ? 'Résultats' : 'Classement Final'}
            </span>
            <button onClick={() => window.close()} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>
        
        <main className="flex-grow flex flex-col items-center justify-center p-8">
          {roomData.status === 'lobby' && (
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-8">En attente des joueurs</h2>
              <div className="text-8xl font-mono font-bold text-purple-500 mb-12">{currentRoomCode}</div>
              <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
                {Object.values(roomData.players || {}).map((player: Player, idx: number) => (
                  <div key={idx} className="bg-gray-800 p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold truncate">{player.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {roomData.status === 'playing' && roomData.currentMeme && (
            <div className="text-center w-full max-w-5xl">
              <h2 className="text-4xl font-bold mb-6">Création des Mèmes</h2>
              <div className="bg-purple-900/50 border border-purple-500 rounded-xl p-6 mb-12">
                <h3 className="text-2xl font-bold mb-2">Thème</h3>
                <p className="text-4xl">« {roomData.currentTheme} »</p>
              </div>
              
              <div className="bg-black p-4 rounded-2xl border border-gray-800 mx-auto max-w-3xl">
                <img src={roomData.currentMeme.url} alt="Meme template" className="w-full h-auto rounded-lg" />
              </div>
              
              <div className="mt-12">
                <h3 className="text-2xl mb-4">Progression</h3>
                <div className="flex justify-center items-center gap-4">
                  <div className="h-4 bg-gray-800 rounded-full w-full max-w-md">
                    <div 
                      className="h-4 bg-green-500 rounded-full"
                      style={{ width: `${Object.keys(roomData.captions || {}).length / Math.max(1, Object.keys(roomData.players || {}).length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xl font-mono">
                    {Object.keys(roomData.captions || {}).length} / {Object.keys(roomData.players || {}).length}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {roomData.status === 'voting' && roomData.currentMeme && (
            <div className="text-center w-full max-w-6xl">
              <h2 className="text-4xl font-bold mb-6">Phase de Vote</h2>
              <div className="bg-yellow-900/50 border border-yellow-500 rounded-xl p-6 mb-12">
                <h3 className="text-2xl font-bold mb-2">Thème</h3>
                <p className="text-4xl">« {roomData.currentTheme} »</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {Object.entries(roomData.captions || {}).map(([uid, cap]: [string, any], idx) => (
                  <div key={uid} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                    <div className="bg-black p-2 relative">
                      <img src={roomData.currentMeme!.url} alt="Meme" className="w-full h-auto rounded-lg" />
                      {roomData.currentMeme!.zones.map((zone: any, zIdx: number) => (
                        <div 
                          key={zIdx} 
                          className="absolute flex items-center justify-center pointer-events-none"
                          style={{ 
                            top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto',
                            ...memeTextStyle, fontSize: 'clamp(1rem, 3vw, 2rem)'
                          }}
                        >
                          {cap.texts[zIdx]}
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-gray-900 text-center">
                      <span className="text-xl font-bold">Mème #{idx + 1}</span>
                      {cap.votes > 0 && <div className="mt-2 text-yellow-400 font-bold">{cap.votes} votes</div>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-12">
                <h3 className="text-2xl mb-4">Progression des votes</h3>
                <div className="flex justify-center items-center gap-4">
                  <div className="h-4 bg-gray-800 rounded-full w-full max-w-md">
                    <div 
                      className="h-4 bg-yellow-500 rounded-full"
                      style={{ width: `${(roomData.voters?.length || 0) / Math.max(1, Object.keys(roomData.players || {}).length - 1) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xl font-mono">
                    {roomData.voters?.length || 0} / {Math.max(1, Object.keys(roomData.players || {}).length - 1)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {roomData.status === 'results' && roomData.currentMeme && (
            <div className="text-center w-full max-w-5xl">
              <h2 className="text-5xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                Résultats de la Manche
              </h2>
              <div className="bg-gray-900 rounded-3xl p-8 border border-gray-700 mb-12">
                <div className="text-center mb-8">
                  <span className="text-gray-400 text-lg">Thème : </span>
                  <span className="text-3xl font-bold">« {roomData.currentTheme} »</span>
                </div>
                <div className="space-y-8">
                  {Object.entries(roomData.captions || {})
                    .sort((a: any, b: any) => b[1].votes - a[1].votes)
                    .map(([uid, cap]: [string, any], index) => {
                      const author = roomData.players[uid]?.name || "Inconnu";
                      return (
                        <div key={uid} className={`flex items-center gap-8 p-6 rounded-2xl ${index === 0 ? 'bg-yellow-900/30 border-2 border-yellow-500' : 'bg-gray-800 border border-gray-700'}`}>
                          <div className={`text-5xl font-black w-16 text-center ${index === 0 ? 'text-yellow-500' : 'text-gray-500'}`}>#{index + 1}</div>
                          <div className="w-64 bg-black rounded-lg relative overflow-hidden">
                            <img src={roomData.currentMeme!.url} alt="" className="w-full h-auto block" />
                            <div className="absolute inset-0">
                              {roomData.currentMeme!.zones.map((zone: any, idx: number) => (
                                <div key={idx} className="absolute flex items-center justify-center pointer-events-none" style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto', ...memeTextStyle, fontSize: 'clamp(0.5rem, 1.5vw, 1rem)' }}>
                                  {cap.texts[idx]}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex-grow text-left">
                            <h4 className="text-3xl font-bold flex items-center gap-3">{author} {index === 0 && <Trophy className="text-yellow-400 w-8 h-8" />}</h4>
                            <p className="text-xl text-gray-300 mt-2">{cap.votes} votes</p>
                          </div>
                          <div className="text-3xl font-bold text-green-400 bg-green-900/30 px-6 py-3 rounded-xl">+{cap.votes * 100} pts</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
          
          {roomData.status === 'final' && (
            <div className="text-center w-full max-w-6xl">
              <h2 className="text-6xl font-extrabold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-600">
                CLASSEMENT FINAL
              </h2>
              <div className="flex items-end justify-center gap-16 mb-16 h-96">
                {roomData.players && Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[1] && (
                  <div className="flex flex-col items-center">
                    <div className="bg-gray-400/20 border-2 border-gray-400 p-8 rounded-t-3xl w-64 text-center">
                      <Medal className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
                      <span className="text-3xl font-bold text-gray-200 block truncate">{Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[1][1].name}</span>
                      <span className="text-2xl font-mono text-gray-400 mt-2 block">{Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[1][1].score} pts</span>
                    </div>
                    <div className="bg-gradient-to-b from-gray-600 to-gray-800 w-64 h-32 rounded-b-lg border-x-2 border-b-2 border-gray-700 flex justify-center items-center"><span className="text-6xl font-black text-gray-900/50">2</span></div>
                  </div>
                )}
                
                {roomData.players && Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[0] && (
                  <div className="flex flex-col items-center transform -translate-y-12 z-10">
                    <div className="bg-yellow-500/20 border-4 border-yellow-500 p-10 rounded-t-3xl w-80 text-center">
                      <Crown className="w-24 h-24 text-yellow-400 mb-6 mx-auto" />
                      <span className="text-4xl font-black text-yellow-400 block truncate">{Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[0][1].name}</span>
                      <span className="text-3xl font-mono text-yellow-200 mt-3 block">{Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[0][1].score} pts</span>
                    </div>
                    <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 w-80 h-48 rounded-b-xl border-x-4 border-b-4 border-yellow-600 flex justify-center items-center"><span className="text-8xl font-black text-yellow-900/50">1</span></div>
                  </div>
                )}
                
                {roomData.players && Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[2] && (
                  <div className="flex flex-col items-center">
                    <div className="bg-amber-700/20 border-2 border-amber-700 p-6 rounded-t-3xl w-56 text-center">
                      <Medal className="w-12 h-12 text-amber-600 mb-3 mx-auto" />
                      <span className="text-2xl font-bold text-amber-500 block truncate">{Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[2][1].name}</span>
                      <span className="text-xl font-mono text-amber-600 mt-1 block">{Object.entries(roomData.players).sort((a: any, b: any) => b[1].score - a[1].score)[2][1].score} pts</span>
                    </div>
                    <div className="bg-gradient-to-b from-amber-800 to-amber-950 w-56 h-20 rounded-b-lg border-x-2 border-b-2 border-amber-900 flex justify-center items-center"><span className="text-5xl font-black text-amber-950/50">3</span></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (!currentRoomCode || !roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-gray-800/80 p-8 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700">
          <div className="flex justify-center mb-6"><ImageIcon className="w-16 h-16 text-purple-400" /></div>
          <h1 className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Meme Maker</h1>
          
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ton Pseudo</label>
              <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" placeholder="Ex: LeRigolodu93" />
            </div>
            <button onClick={createRoom} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-purple-900/50">Créer une nouvelle salle</button>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-600"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OU</span><div className="flex-grow border-t border-gray-600"></div>
            </div>
            <div className="flex gap-2">
              <input type="text" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} maxLength={4} className="w-2/3 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white font-mono text-center text-xl tracking-widest focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" placeholder="CODE" />
              <button onClick={joinRoom} className="w-1/3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-pink-900/50">Rejoindre</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const playersList = Object.entries(roomData.players || {}).map(([id, p]) => ({ id, ...p }));
  const sortedPlayers = [...playersList].sort((a, b) => b.score - a.score);
  const myCaption = roomData.captions?.[user?.uid || ''];
  const allSubmitted = playersList.length > 0 && (Object.keys(roomData.captions || {}).length + Object.keys(roomData.pendingCaptions || {}).length) === playersList.length;
  const isGameFinished = roomData.playedMemes?.length >= 5; // <-- MODIFIÉ (limite stricte à 5)
  const pendingCaptionsCount = Object.keys(roomData.pendingCaptions || {}).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <ImageIcon className="text-purple-400 w-8 h-8" />
          <h1 className="text-xl font-bold hidden sm:block">Meme Maker</h1>
          <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-2">
            <span className="text-sm text-gray-400">Code:</span>
            <span className="font-mono font-bold tracking-wider text-purple-400">{currentRoomCode}</span>
            <button onClick={() => navigator.clipboard.writeText(currentRoomCode)} className="text-gray-500 hover:text-white ml-1" title="Copier le code"><Copy className="w-4 h-4" /></button>
          </div>
          {isHost() && (
            <button onClick={openPresenterMode} className="bg-purple-700 hover:bg-purple-600 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
              <Presentation className="w-4 h-4" /><span className="hidden sm:inline">Mode Présentateur</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            {roomData.players[user?.uid || '']?.name} <span className="text-yellow-400 text-xs">({roomData.players[user?.uid || '']?.score} pts)</span>
          </span>
          <button onClick={() => setCurrentRoomCode(null)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
        </div>
      </header>

      {errorMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {errorMsg}
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 ml-2" /></button>
        </div>
      )}

      <main className="flex-grow flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
        {roomData.status === 'lobby' && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Users className="text-purple-400" /> Joueurs ({playersList.length}/30)</h2>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                {playersList.map((p) => (
                  <div key={p.id} className="bg-gray-700/50 p-3 rounded-xl flex items-center gap-3 border border-gray-600">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium truncate">{p.name}</span>
                    {p.id === roomData.hostId && <Crown className="w-4 h-4 text-yellow-400 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-6">
              {isHost() ? (
                <>
                  <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><ShieldAlert className="text-red-400 w-5 h-5" /> Configuration (Hôte)</h3>
                    <p className="text-sm text-gray-400 mb-3">Fichier des mots bannis :</p>
                    <textarea value={localBannedWords} onChange={(e) => updateBannedWords(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 h-32 resize-none" />
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-400">Modération manuelle :</span>
                      <button onClick={toggleModerationEnabled} className={`px-4 py-2 rounded-lg text-sm font-medium ${roomData.moderationEnabled ? 'bg-green-600' : 'bg-gray-600'}`}>{roomData.moderationEnabled ? 'Activée' : 'Désactivée'}</button>
                    </div>
                  </div>
                  <button onClick={startGame} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl text-xl shadow-lg shadow-green-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95"><Play className="fill-current" /> Démarrer la partie</button>
                </>
              ) : (
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700 flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <h3 className="text-xl font-bold">En attente de l'hôte...</h3>
                  <p className="text-gray-400 mt-2">Préparez vos meilleures blagues.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {roomData.status === 'playing' && roomData.currentMeme && (
          <div className="w-full max-w-5xl flex flex-col gap-6">
            <div className="w-full flex justify-between items-center bg-gray-800 p-4 rounded-2xl border border-gray-700">
              <span className="text-gray-400 font-medium tracking-wide">Manche <span className="text-white">{roomData.playedMemes?.length}</span> sur 5</span>
              <TimerDisplay endsAt={roomData.timerEndsAt} /> {/* <--- CHRONO ICI */}
              <div className="flex-grow mx-4 max-w-2xl bg-gradient-to-r from-purple-900/80 to-pink-900/80 border border-purple-500 rounded-xl py-2 px-4 text-center shadow-lg">
                <span className="text-purple-300 text-xs font-bold uppercase tracking-widest block">Thème</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">« {roomData.currentTheme} »</h2>
              </div>
            </div>

            {isHost() && pendingCaptionsCount > 0 && (
              <div className="w-full bg-red-900/30 border border-red-500 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-red-300 flex items-center gap-2"><Flag className="text-red-400" /> Modération requise ({pendingCaptionsCount})</h3>
                  <button onClick={() => setShowModerationPanel(!showModerationPanel)} className="bg-red-800 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium">{showModerationPanel ? 'Masquer' : 'Afficher'}</button>
                </div>
                {showModerationPanel && (
                  <div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
                    {Object.entries(roomData.pendingCaptions || {}).map(([uid, caption]: [string, any]) => {
                      const playerName = roomData.players[uid]?.name || "Joueur inconnu";
                      return (
                        <div key={uid} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold">Mème de {playerName}</h4>
                            <div className="flex gap-2">
                              <button onClick={() => approvePendingCaption(uid)} className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded-lg text-sm flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> Approuver</button>
                              <button onClick={() => rejectPendingCaption(uid)} className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg text-sm flex items-center gap-1"><ThumbsDown className="w-4 h-4" /> Rejeter</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black rounded-lg overflow-hidden">
                              <div className="relative">
                                <img src={roomData.currentMeme!.url} alt="Meme" className="w-full h-auto" />
                                {roomData.currentMeme!.zones.map((zone: any, idx: number) => (
                                  <div key={idx} className="absolute flex items-center justify-center pointer-events-none" style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto', ...memeTextStyle, fontSize: 'clamp(0.6rem, 1.5vw, 1rem)' }}>
                                    {caption.texts[idx]}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-red-300 mb-2">Contenu inapproprié :</h5>
                              <ul className="space-y-2">
                                {caption.originalTexts.map((text: string, idx: number) => {
                                  const inappropriateWords = caption.inappropriateWords?.[idx] || [];
                                  if (inappropriateWords.length === 0) return null;
                                  return (
                                    <li key={idx} className="bg-gray-900 p-2 rounded-lg">
                                      <div className="text-xs text-gray-400">Zone {idx + 1}:</div>
                                      <div className="text-sm">{text}</div>
                                      <div className="mt-1 text-xs text-red-400">Mots: {inappropriateWords.map((w: any) => w.word).join(', ')}</div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="w-full flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-2">
                  <div className="relative w-full max-w-2xl mx-auto">
                    <img src={roomData.currentMeme.url} alt="Meme template" className="w-full h-auto block rounded-lg" />
                    {roomData.currentMeme.zones.map((zone: any, idx: number) => (
                      <div key={idx} className="absolute flex items-center justify-center pointer-events-none" style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto', ...memeTextStyle, fontSize: zone.fontSize || 'clamp(1rem, 3vw, 2.5rem)' }}>
                        {myCaption ? myCaption.texts[idx] : (currentTexts[idx] || zone.placeholder.toUpperCase())}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-1/3 flex flex-col gap-6">
                {!myCaption ? (
                  <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-xl font-bold mb-4">À toi de jouer !</h3>
                    <div className="space-y-4">
                      {roomData.currentMeme.zones.map((zone: any, idx: number) => (
                        <div key={idx}>
                          <label className="block text-xs text-gray-400 mb-1">{zone.placeholder}</label>
                          <textarea 
                            rows={2} 
                            placeholder={`${zone.placeholder}...`} 
                            value={currentTexts[idx] || ''} 
                            onChange={(e) => { const newTexts = [...currentTexts]; newTexts[idx] = e.target.value; setCurrentTexts(newTexts); }} 
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white uppercase focus:ring-2 focus:ring-purple-500 transition-all resize-y min-h-[60px]" 
                          />
                        </div>
                      ))}
                      <button onClick={submitCaption} className="w-full bg-purple-600 hover:bg-purple-500 font-bold py-3 rounded-xl mt-4 shadow-lg transition-transform active:scale-95">Valider mon Meme</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-900/30 border border-green-500/50 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center">
                    <Check className="w-16 h-16 text-green-400 mb-4" />
                    <h3 className="text-xl font-bold text-green-300">Meme Envoyé !</h3>
                    <p className="text-gray-400 mt-2">En attente des autres joueurs...</p>
                  </div>
                )}
                {isHost() && (
                  <button onClick={advanceToVoting} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${allSubmitted ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-500/50' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`} disabled={!allSubmitted}>
                    <SkipForward className="w-5 h-5" /> Passer au Vote {allSubmitted ? "Maintenant !" : "(En attente...)"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {roomData.status === 'voting' && roomData.currentMeme && (
          <div className="w-full max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">L'heure du Vote !</h2>
              <div className="inline-block bg-purple-900/50 border border-purple-500/50 rounded-xl px-6 py-3 mt-4 mb-2 shadow-lg">
                <span className="text-purple-300 text-sm font-bold uppercase tracking-widest block mb-1">Thème</span>
                <span className="text-xl md:text-2xl font-bold text-white">« {roomData.currentTheme} »</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(roomData.captions || {}).map(([uid, cap]: [string, any]) => {
                const isMine = uid === user?.uid;
                const hasVotedThis = roomData.voters?.includes(user?.uid || '');
                return (
                  <div key={uid} className={`bg-gray-800 rounded-2xl overflow-hidden border-2 flex flex-col ${isMine ? 'border-purple-500/50' : 'border-gray-700 hover:border-gray-500'} transition-all`}>
                    <div className="relative bg-black p-2">
                      <img src={roomData.currentMeme!.url} alt="Meme" className="w-full h-auto block rounded-lg" />
                      {roomData.currentMeme!.zones.map((zone: any, idx: number) => (
                        <div key={idx} className="absolute flex items-center justify-center pointer-events-none" style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto', ...memeTextStyle, fontSize: zone.fontSize || 'clamp(0.8rem, 2vw, 1.5rem)' }}>
                          {cap.texts[idx]}
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-gray-800 flex justify-between items-center">
                      <span className="text-sm text-gray-400">{isMine ? "Ton chef-d'œuvre" : "Anonyme"}</span>
                      <button onClick={() => voteForCaption(uid)} disabled={isMine || hasVotedThis} className={`px-4 py-2 rounded-lg font-bold transition-colors ${isMine || hasVotedThis ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-lg'}`}>
                        {hasVotedThis ? "Voté" : "Voter !"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {isHost() && (
              <div className="mt-12 flex justify-center">
                <button onClick={advanceToResults} className="bg-purple-600 hover:bg-purple-500 px-8 py-4 rounded-xl font-bold shadow-lg shadow-purple-900/50 flex items-center gap-2 text-lg transition-transform active:scale-95">
                  Voir les Résultats <Trophy className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {roomData.status === 'results' && roomData.currentMeme && (
          <div className="w-full max-w-4xl">
            <h2 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">Résultats de la Manche</h2>
            <div className="text-center mb-8 mt-4"><span className="text-gray-400 text-sm uppercase tracking-wider">Thème joué : </span><span className="text-xl font-bold text-white">« {roomData.currentTheme} »</span></div>

            <div className="bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-700 mb-8">
              <div className="space-y-6">
                {Object.entries(roomData.captions || {}).sort((a: any, b: any) => b[1].votes - a[1].votes).map(([uid, cap]: [string, any], index) => {
                  const author = roomData.players[uid]?.name || "Inconnu";
                  return (
                    <div key={uid} className={`flex items-center gap-6 p-4 rounded-2xl ${index === 0 ? 'bg-yellow-900/30 border border-yellow-500/50' : 'bg-gray-900 border border-gray-700'}`}>
                      <div className="text-4xl font-black w-12 text-center text-gray-500">#{index + 1}</div>
                      <div className="w-32 bg-black rounded-lg relative flex-shrink-0 overflow-hidden">
                        <img src={roomData.currentMeme!.url} alt="" className="w-full h-auto block opacity-50" />
                        <div className="absolute inset-0">
                          {roomData.currentMeme!.zones.map((zone: any, idx: number) => (
                            <div key={idx} className="absolute flex items-center justify-center pointer-events-none" style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto', ...memeTextStyle, fontSize: '0.4rem', lineHeight: '1' }}>
                              {cap.texts[idx]}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-grow text-left">
                        <h4 className="text-xl font-bold flex items-center gap-2">{author} {index === 0 && <Trophy className="text-yellow-400 w-5 h-5" />}</h4>
                        <p className="text-gray-400">{cap.votes} Votes</p>
                      </div>
                      <div className="text-2xl font-bold text-green-400 bg-green-900/30 px-4 py-2 rounded-xl">+{cap.votes * 100} pts</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">Classement Général</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sortedPlayers.map((p, i) => (
                  <div key={p.id} className="bg-gray-800 p-3 rounded-xl text-center border border-gray-700">
                    <div className="text-sm text-gray-400">#{i + 1}</div>
                    <div className="font-bold truncate">{p.name}</div>
                    <div className="text-purple-400 font-mono">{p.score} pts</div>
                  </div>
                ))}
              </div>
            </div>

            {isHost() && (
              <div className="flex justify-center mt-8">
                {isGameFinished ? (
                  <button onClick={advanceToFinalRanking} className="bg-yellow-600 hover:bg-yellow-500 px-8 py-5 rounded-xl font-black shadow-lg shadow-yellow-900/50 flex items-center gap-3 text-2xl transition-transform hover:scale-105 active:scale-95 text-white">
                    <Crown className="w-8 h-8" /> Voir le Podium Final !
                  </button>
                ) : (
                  <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/50 flex items-center gap-2 text-xl transition-transform active:scale-95">
                    <Play className="w-6 h-6 fill-current" /> Lancer le Meme Suivant
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {roomData.status === 'final' && (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <h2 className="text-5xl font-extrabold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-600">CLASSEMENT FINAL</h2>
            <p className="text-gray-400 mb-12 text-lg">La partie est terminée ! Tous les mèmes ont été joués.</p>

            <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 mb-16 h-auto md:h-80 w-full px-4">
              {sortedPlayers[1] && (
                <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-1/3 mt-8 md:mt-0">
                  <div className="bg-gray-400/20 border border-gray-400 p-6 rounded-t-2xl w-full text-center flex flex-col items-center shadow-lg shadow-gray-500/20">
                    <Medal className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-2xl font-bold text-gray-200 truncate w-full">{sortedPlayers[1].name}</span>
                    <span className="text-lg font-mono text-gray-400">{sortedPlayers[1].score} pts</span>
                  </div>
                  <div className="bg-gradient-to-b from-gray-600 to-gray-800 w-full h-8 md:h-24 rounded-b-lg border-x border-b border-gray-700 flex justify-center items-center"><span className="text-3xl font-black text-gray-900/50">2</span></div>
                </div>
              )}
              {sortedPlayers[0] && (
                <div className="order-1 md:order-2 flex flex-col items-center w-full md:w-1/3 transform md:-translate-y-8 z-10">
                  <div className="bg-yellow-500/20 border-2 border-yellow-500 p-8 rounded-t-3xl w-full text-center flex flex-col items-center shadow-2xl shadow-yellow-500/30">
                    <Crown className="w-16 h-16 text-yellow-400 mb-3 drop-shadow-lg" />
                    <span className="text-3xl font-black text-yellow-400 truncate w-full">{sortedPlayers[0].name}</span>
                    <span className="text-xl font-mono text-yellow-200 mt-1">{sortedPlayers[0].score} pts</span>
                  </div>
                  <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 w-full h-8 md:h-32 rounded-b-xl border-x border-b border-yellow-600 flex justify-center items-center"><span className="text-5xl font-black text-yellow-900/50">1</span></div>
                </div>
              )}
              {sortedPlayers[2] && (
                <div className="order-3 flex flex-col items-center w-full md:w-1/3 mt-8 md:mt-0">
                  <div className="bg-amber-700/20 border border-amber-700 p-6 rounded-t-2xl w-full text-center flex flex-col items-center shadow-lg shadow-amber-900/20">
                    <Medal className="w-10 h-10 text-amber-600 mb-2" />
                    <span className="text-xl font-bold text-amber-500 truncate w-full">{sortedPlayers[2].name}</span>
                    <span className="text-md font-mono text-amber-600">{sortedPlayers[2].score} pts</span>
                  </div>
                  <div className="bg-gradient-to-b from-amber-800 to-amber-950 w-full h-8 md:h-16 rounded-b-lg border-x border-b border-amber-900 flex justify-center items-center"><span className="text-3xl font-black text-amber-950/50">3</span></div>
                </div>
              )}
            </div>

            {sortedPlayers.length > 3 && (
              <div className="w-full max-w-2xl bg-gray-800/50 border border-gray-700 rounded-3xl p-6 mb-12">
                <h3 className="text-xl font-bold text-gray-400 mb-4 border-b border-gray-700 pb-2">Suite du classement</h3>
                <div className="space-y-2">
                  {sortedPlayers.slice(3).map((p, i) => (
                    <div key={p.id} className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl">
                      <div className="flex items-center gap-4"><span className="text-gray-500 font-black w-6">{i + 4}.</span><span className="font-medium">{p.name}</span></div>
                      <span className="font-mono text-purple-400">{p.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isHost() && (
              <button onClick={resetToLobby} className="bg-gray-700 hover:bg-gray-600 px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-3 text-lg transition-transform active:scale-95 mt-4">
                <Home className="w-6 h-6" /> Retourner au Salon (Nouvelle Partie)
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}