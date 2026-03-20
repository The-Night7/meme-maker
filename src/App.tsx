import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { AlertCircle, Copy, Play, SkipForward, Users, Trophy, Image as ImageIcon, X, Check, ShieldAlert } from 'lucide-react';

// --- CONFIGURATION FIREBASE OBLIGATOIRE ---
const firebaseConfig = {
  apiKey: "AIzaSyAPQLDfP-C7bH_6FHBo1EG2x0RHm_CTN9U",
  authDomain: "meme-maker-99f30.firebaseapp.com",
  projectId: "meme-maker-99f30",
  storageBucket: "meme-maker-99f30.firebasestorage.app",
  messagingSenderId: "948871225601",
  appId: "1:948871225601:web:c8abcb0760bc60e959bb00",
  measurementId: "G-D9EKR39G3W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'make-it-meme-clone';

// --- BIBLIOTHÈQUE DE MEMES (Ajustée avec les zones personnalisées) ---
const LOCAL_MEME_LIBRARY = [
  {
    url: "/memes/Expanding-Brain.jpg", // parfait
    zones: [
      { top: '5%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 1' },
      { top: '30%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 2' },
      { top: '55%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 3' },
      { top: '80%', left: '5%', width: '45%', height: '20%', placeholder: 'Cerveau 4' }
    ]
  },
  {
    url: "/memes/Buff-Doge-vs-Cheems.png", // parfait
    zones: [
      { top: '10%', left: '5%', width: '45%', height: '30%', placeholder: 'Buff Doge' },
      { top: '25%', left: '55%', width: '40%', height: '30%', placeholder: 'Cheems' }
    ]
  },
  {
    url: "/memes/Tuxedo-Winnie-The-Pooh.webp", // parfait
    zones: [
      { top: '15%', left: '55%', width: '40%', height: '30%', placeholder: 'Normal Pooh' },
      { top: '65%', left: '55%', width: '40%', height: '30%', placeholder: 'Tuxedo Pooh' }
    ]
  },
  {
    url: "/memes/Sad-Pablo-Escobar.jpg", // à voir
    zones: [
      { top: '40%', left: '10%', width: '80%', height: '20%', placeholder: 'Quand tu attends...' }
    ]
  },
  {
    url: "/memes/baby-covering-mouth.jpg", // parfait
    zones: [
      { top: '5%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Haut' }
    ]
  },
  {
    url: "/memes/guy-pointing-at-himself.jpg", // parfait
    zones: [
      { top: '75%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }
    ]
  },
  {
    url: "/memes/ellie-smirk-meme.jpg", // parfait
    zones: [
      { top: '75%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }
    ]
  },
  {
    url: "/memes/rabbit-clock-meme.jpg", // parfait
    zones: [
      { top: '75%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }
    ]
  },
  {
    url: "/memes/3drags.jpg", // parfait
    zones: [
      { top: '15%', left: '5%', width: '30%', height: '20%', placeholder: 'Dragon Sérieux 1' },
      { top: '15%', left: '35%', width: '30%', height: '20%', placeholder: 'Dragon Sérieux 2' },
      { top: '25%', left: '68%', width: '30%', height: '20%', placeholder: 'Dragon Débile' }
    ]
  },
  {
    url: "/memes/doomer.jpeg", // parfait
    zones: [
      { top: '80%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }
    ]
  },
  {
    url: "/memes/venom_dunk.jpeg", // à voir
    zones: [
      { top: '10%', left: '10%', width: '40%', height: '20%', placeholder: 'Venom' },
      { top: '70%', left: '50%', width: '40%', height: '20%', placeholder: 'Spiderman' }
    ]
  },
  {
    url: "/memes/crying_mask.jpeg", // parfait
    zones: [
      { top: '80%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Bas' }
    ]
  },
  {
    url: "/memes/kermit_hug.jpeg", // à voir
    zones: [
      { top: '75%', left: '5%', width: '40%', height: '20%', placeholder: 'Kermit qui regarde' },
      { top: '75%', left: '50%', width: '45%', height: '20%', placeholder: 'Kermit en hug' }
    ]
  },
  {
    url: "/memes/singe.jpg", // à voir
    zones: [
      { top: '5%', left: '10%', width: '80%', height: '20%', placeholder: 'Texte Haut' }
    ]
  },
  {
    url: "/memes/squid.jpg", // à voir
    zones: [
      { top: '40%', left: '0%', width: '80%', height: '20%', placeholder: 'Squid' },
      { top: '15%', left: '35%', width: '80%', height: '20%', placeholder: 'Bob et Patrick' }
    ]
  }
];

// --- BIBLIOTHÈQUE DE THÈMES ---
const THEMES_LIBRARY = [
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

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // États locaux du joueur
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [currentRoomCode, setCurrentRoomCode] = useState(null);
  
  // État du jeu synchronisé (Firestore)
  const [roomData, setRoomData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // États de la phase de jeu
  const [currentTexts, setCurrentTexts] = useState([]);
  const [localBannedWords, setLocalBannedWords] = useState('merde, con, putain, idiot, nul');

  // 1. INITIALISATION DE L'AUTHENTIFICATION
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Erreur d'authentification:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. SYNCHRONISATION DE LA ROOM
  useEffect(() => {
    if (!user || !currentRoomCode || !db) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoomData(docSnap.data());
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

  // Synchronisation des champs de texte
  useEffect(() => {
    if (roomData?.currentMeme?.zones && currentTexts.length !== roomData.currentMeme.zones.length) {
      setCurrentTexts(Array(roomData.currentMeme.zones.length).fill(''));
    }
  }, [roomData?.currentMeme]);

  // --- LOGIQUE DU JEU ---

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const createRoom = async () => {
    if (!playerName.trim() || !user) return setErrorMsg("Entrez un pseudo.");
    const code = generateRoomCode();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);
    
    const initialData = {
      hostId: user.uid,
      status: 'lobby',
      players: {
        [user.uid]: { name: playerName, score: 0 }
      },
      bannedWords: localBannedWords,
      currentMeme: null,
      currentTheme: null,
      captions: {},
      voters: [],
      playedMemes: [] // <-- NOUVEAU: Historique des mèmes joués
    };

    try {
      await setDoc(roomRef, initialData);
      setCurrentRoomCode(code);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg("Erreur lors de la création de la salle.");
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim() || !user || !roomCodeInput.trim()) return setErrorMsg("Infos manquantes.");
    const code = roomCodeInput.toUpperCase().trim();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);

    try {
      const docSnap = await getDoc(roomRef);
      if (!docSnap.exists()) return setErrorMsg("Salle introuvable.");
      
      const data = docSnap.data();
      if (data.status !== 'lobby' && !data.players[user.uid]) {
        return setErrorMsg("La partie a déjà commencé.");
      }

      await updateDoc(roomRef, {
        [`players.${user.uid}`]: { name: playerName, score: data.players[user.uid]?.score || 0 }
      });
      setCurrentRoomCode(code);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg("Erreur pour rejoindre la salle.");
    }
  };

  const updateBannedWords = async (words) => {
    setLocalBannedWords(words);
    if (!user || !currentRoomCode) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    await updateDoc(roomRef, { bannedWords: words });
  };

  const censorText = (text, bannedString) => {
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
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    
    // NOUVEAU: Logique pour ne pas répéter les mèmes
    let playedMemes = roomData.playedMemes || [];
    let availableMemes = LOCAL_MEME_LIBRARY.filter(meme => !playedMemes.includes(meme.url));

    // Si tous les mèmes ont été joués, on remet tout à zéro
    if (availableMemes.length === 0) {
      availableMemes = LOCAL_MEME_LIBRARY;
      playedMemes = []; 
    }

    const randomMeme = availableMemes[Math.floor(Math.random() * availableMemes.length)];
    const randomTheme = THEMES_LIBRARY[Math.floor(Math.random() * THEMES_LIBRARY.length)];
    
    await updateDoc(roomRef, {
      status: 'playing',
      currentMeme: randomMeme,
      currentTheme: randomTheme,
      captions: {},
      voters: [],
      playedMemes: [...playedMemes, randomMeme.url] // <-- On ajoute le mème actuel à la liste des mèmes joués
    });
    
    setCurrentTexts(Array(randomMeme.zones.length).fill(''));
  };

  const submitCaption = async () => {
    if (currentTexts.every(t => !t.trim())) return setErrorMsg("Ajoutez du texte !");
    
    const censoredTexts = currentTexts.map(t => censorText(t, roomData.bannedWords));

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    await updateDoc(roomRef, {
      [`captions.${user.uid}`]: {
        texts: censoredTexts,
        votes: 0
      }
    });
  };

  const advanceToVoting = async () => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    await updateDoc(roomRef, { status: 'voting', voters: [] });
  };

  const voteForCaption = async (targetUid) => {
    if (targetUid === user.uid) return setErrorMsg("Tu ne peux pas voter pour toi !");
    if (roomData.voters.includes(user.uid)) return setErrorMsg("Tu as déjà voté.");

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    const newVoters = [...(roomData.voters || []), user.uid];
    const currentVotes = roomData.captions[targetUid]?.votes || 0;

    await updateDoc(roomRef, {
      voters: newVoters,
      [`captions.${targetUid}.votes`]: currentVotes + 1
    });
  };

  const advanceToResults = async () => {
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', currentRoomCode);
    
    const updates = { status: 'results' };
    Object.entries(roomData.captions || {}).forEach(([uid, cap]) => {
      const currentScore = roomData.players[uid]?.score || 0;
      updates[`players.${uid}.score`] = currentScore + (cap.votes * 100);
    });

    await updateDoc(roomRef, updates);
  };

  if (authLoading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans">Chargement...</div>;

  if (!currentRoomCode || !roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-gray-800/80 p-8 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700">
          <div className="flex justify-center mb-6">
            <ImageIcon className="w-16 h-16 text-purple-400" />
          </div>
          <h1 className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Meme Maker
          </h1>
          
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ton Pseudo</label>
              <input 
                type="text" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                placeholder="Ex: LeRigolodu93"
              />
            </div>

            <button 
              onClick={createRoom}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-purple-900/50"
            >
              Créer une nouvelle salle
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OU</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={roomCodeInput} 
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-2/3 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white font-mono text-center text-xl tracking-widest focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                placeholder="CODE"
              />
              <button 
                onClick={joinRoom}
                className="w-1/3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-pink-900/50"
              >
                Rejoindre
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHost = roomData.hostId === user.uid;
  const playersList = Object.entries(roomData.players || {}).map(([id, p]) => ({ id, ...p }));
  const myCaption = roomData.captions?.[user.uid];
  const allSubmitted = playersList.length > 0 && Object.keys(roomData.captions || {}).length === playersList.length;
  const allVoted = roomData.voters?.length >= (playersList.length > 1 ? playersList.length - 1 : playersList.length);

  const memeTextStyle = {
    fontFamily: 'Impact, sans-serif',
    textTransform: 'uppercase',
    color: 'white',
    textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0px 2px 0 #000, 2px 0px 0 #000, 0px -2px 0 #000, -2px 0px 0 #000',
    wordWrap: 'break-word',
    textAlign: 'center',
    lineHeight: '1.1'
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <ImageIcon className="text-purple-400 w-8 h-8" />
          <h1 className="text-xl font-bold hidden sm:block">Meme Maker</h1>
          <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-2">
            <span className="text-sm text-gray-400">Code:</span>
            <span className="font-mono font-bold tracking-wider text-purple-400">{currentRoomCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-medium">{roomData.players[user.uid]?.name}</span>
          <button onClick={() => setCurrentRoomCode(null)} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {errorMsg}
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 ml-2" /></button>
        </div>
      )}

      <main className="flex-grow flex flex-col items-center p-4 sm:p-6 overflow-y-auto">
        
        {/* PHASE 1: LOBBY */}
        {roomData.status === 'lobby' && (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="text-purple-400" /> Joueurs ({playersList.length}/30)
              </h2>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                {playersList.map((p) => (
                  <div key={p.id} className="bg-gray-700/50 p-3 rounded-xl flex items-center gap-3 border border-gray-600">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium truncate">{p.name}</span>
                    {p.id === roomData.hostId && <Trophy className="w-4 h-4 text-yellow-400 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {isHost ? (
                <>
                  <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <ShieldAlert className="text-red-400 w-5 h-5" /> Configuration (Hôte)
                    </h3>
                    <p className="text-sm text-gray-400 mb-3">Fichier des mots bannis (séparés par des virgules) :</p>
                    <textarea 
                      value={localBannedWords}
                      onChange={(e) => updateBannedWords(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-sm text-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 h-32 resize-none"
                    />
                  </div>
                  <button 
                    onClick={startGame}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl text-xl shadow-lg shadow-green-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Play className="fill-current" /> Démarrer la partie
                  </button>
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

        {/* PHASE 2: CREATION DU MEME */}
        {roomData.status === 'playing' && (
          <div className="w-full max-w-5xl flex flex-col gap-6">
            
            <div className="w-full bg-gradient-to-r from-purple-900/80 to-pink-900/80 border border-purple-500 rounded-2xl p-4 text-center shadow-lg">
              <span className="text-purple-300 text-sm font-bold uppercase tracking-widest">Thème de la manche</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">« {roomData.currentTheme} »</h2>
            </div>

            <div className="w-full flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-2">
                  <div className="relative w-full max-w-2xl mx-auto">
                    <img 
                      src={roomData.currentMeme.url} 
                      alt="Meme template" 
                      className="w-full h-auto block rounded-lg"
                    />
                    
                    {roomData.currentMeme.zones.map((zone, idx) => (
                      <div 
                        key={idx} 
                        className="absolute flex items-center justify-center pointer-events-none"
                        style={{
                          top: zone.top,
                          left: zone.left,
                          width: zone.width,
                          height: zone.height || 'auto',
                          ...memeTextStyle, 
                          fontSize: zone.fontSize || 'clamp(1rem, 3vw, 2.5rem)'
                        }}
                      >
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
                      {roomData.currentMeme.zones.map((zone, idx) => (
                        <div key={idx}>
                          <label className="block text-xs text-gray-400 mb-1">{zone.placeholder}</label>
                          <input 
                            type="text" 
                            placeholder={`${zone.placeholder}...`} 
                            value={currentTexts[idx] || ''}
                            onChange={(e) => {
                              const newTexts = [...currentTexts];
                              newTexts[idx] = e.target.value;
                              setCurrentTexts(newTexts);
                            }}
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white uppercase focus:ring-2 focus:ring-purple-500 transition-all"
                          />
                        </div>
                      ))}
                      <button 
                        onClick={submitCaption}
                        className="w-full bg-purple-600 hover:bg-purple-500 font-bold py-3 rounded-xl mt-4 shadow-lg transition-transform active:scale-95"
                      >
                        Valider mon Meme
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-900/30 border border-green-500/50 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center">
                    <Check className="w-16 h-16 text-green-400 mb-4" />
                    <h3 className="text-xl font-bold text-green-300">Meme Envoyé !</h3>
                    <p className="text-gray-400 mt-2">En attente des autres joueurs...</p>
                    <p className="text-sm font-mono mt-4 text-gray-500">
                      {Object.keys(roomData.captions).length} / {playersList.length} terminés
                    </p>
                  </div>
                )}

                {isHost && (
                  <button 
                    onClick={advanceToVoting}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${allSubmitted ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-500/50' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                    disabled={!allSubmitted}
                  >
                    <SkipForward className="w-5 h-5" /> 
                    Passer au Vote {allSubmitted ? "Maintenant !" : "(En attente...)"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: VOTES */}
        {roomData.status === 'voting' && (
          <div className="w-full max-w-6xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                L'heure du Vote !
              </h2>
              <div className="inline-block bg-purple-900/50 border border-purple-500/50 rounded-xl px-6 py-3 mt-4 mb-2 shadow-lg">
                <span className="text-purple-300 text-sm font-bold uppercase tracking-widest block mb-1">Thème</span>
                <span className="text-xl md:text-2xl font-bold text-white">« {roomData.currentTheme} »</span>
              </div>
              <p className="text-gray-400 mt-2">Vote pour le meme le plus drôle (tu ne peux pas voter pour toi).</p>
              <p className="text-sm font-mono mt-2 text-purple-400">{roomData.voters?.length || 0} a voté</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(roomData.captions || {}).map(([uid, cap]) => {
                const isMine = uid === user.uid;
                const hasVotedThis = roomData.voters?.includes(user.uid);
                
                return (
                  <div key={uid} className={`bg-gray-800 rounded-2xl overflow-hidden border-2 flex flex-col ${isMine ? 'border-purple-500/50' : 'border-gray-700 hover:border-gray-500'} transition-all`}>
                    <div className="relative bg-black p-2">
                      <div className="relative w-full mx-auto">
                        <img src={roomData.currentMeme.url} alt="Meme" className="w-full h-auto block rounded-lg" />
                        {roomData.currentMeme.zones.map((zone, idx) => (
                          <div 
                            key={idx} 
                            className="absolute flex items-center justify-center pointer-events-none"
                            style={{ 
                              top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto',
                              ...memeTextStyle, fontSize: zone.fontSize || 'clamp(0.8rem, 2vw, 1.5rem)' 
                            }}
                          >
                            {cap.texts[idx]}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-800 flex justify-between items-center">
                      <span className="text-sm text-gray-400">{isMine ? "Ton chef-d'œuvre" : "Anonyme"}</span>
                      <button 
                        onClick={() => voteForCaption(uid)}
                        disabled={isMine || hasVotedThis}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                          isMine ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                          hasVotedThis ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                          'bg-yellow-500 hover:bg-yellow-400 text-gray-900 shadow-lg'
                        }`}
                      >
                        {hasVotedThis ? "Voté" : "Voter !"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {isHost && (
              <div className="mt-12 flex justify-center">
                <button 
                  onClick={advanceToResults}
                  className="bg-purple-600 hover:bg-purple-500 px-8 py-4 rounded-xl font-bold shadow-lg shadow-purple-900/50 flex items-center gap-2 text-lg transition-transform active:scale-95"
                >
                  Voir les Résultats <Trophy className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* PHASE 4: RESULTATS */}
        {roomData.status === 'results' && (
          <div className="w-full max-w-4xl">
            <h2 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
              Résultats de la Manche
            </h2>
            
            <div className="text-center mb-8 mt-4">
              <span className="text-gray-400 text-sm uppercase tracking-wider">Thème joué : </span>
              <span className="text-xl font-bold text-white">« {roomData.currentTheme} »</span>
            </div>

            <div className="bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-700 mb-8">
              <div className="space-y-6">
                {Object.entries(roomData.captions || {})
                  .sort((a, b) => b[1].votes - a[1].votes)
                  .map(([uid, cap], index) => {
                    const author = roomData.players[uid]?.name || "Inconnu";
                    return (
                      <div key={uid} className={`flex items-center gap-6 p-4 rounded-2xl ${index === 0 ? 'bg-yellow-900/30 border border-yellow-500/50' : 'bg-gray-900 border border-gray-700'}`}>
                        <div className="text-4xl font-black w-12 text-center text-gray-500">
                          #{index + 1}
                        </div>
                        <div className="w-32 bg-black rounded-lg relative flex-shrink-0 overflow-hidden">
                          <img src={roomData.currentMeme.url} alt="" className="w-full h-auto block opacity-50" />
                          <div className="absolute inset-0">
                            {roomData.currentMeme.zones.map((zone, idx) => (
                              <div 
                                key={idx} 
                                className="absolute flex items-center justify-center pointer-events-none"
                                style={{ 
                                  top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto',
                                  ...memeTextStyle, fontSize: '0.4rem', lineHeight: '1' 
                                }}
                              >
                                {cap.texts[idx]}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-xl font-bold flex items-center gap-2">
                            {author} {index === 0 && <Trophy className="text-yellow-400 w-5 h-5" />}
                          </h4>
                          <p className="text-gray-400">{cap.votes} Votes</p>
                        </div>
                        <div className="text-2xl font-bold text-green-400 bg-green-900/30 px-4 py-2 rounded-xl">
                          +{cap.votes * 100} pts
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">Classement Général</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {playersList.sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} className="bg-gray-800 p-3 rounded-xl text-center border border-gray-700">
                    <div className="text-sm text-gray-400">#{i + 1}</div>
                    <div className="font-bold truncate">{p.name}</div>
                    <div className="text-purple-400 font-mono">{p.score} pts</div>
                  </div>
                ))}
              </div>
            </div>

            {isHost && (
              <div className="flex justify-center">
                <button 
                  onClick={startGame}
                  className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/50 flex items-center gap-2 text-xl transition-transform active:scale-95"
                >
                  <Play className="w-6 h-6 fill-current" /> Lancer le Meme Suivant
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}