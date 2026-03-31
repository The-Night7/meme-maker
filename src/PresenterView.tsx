import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Trophy, Crown, Medal } from 'lucide-react';

export default function PresenterView() {
  const { roomCode } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomCode) {
      setError("Code de salle manquant");
      return;
    }

    // Écouter les changements de la salle en temps réel
    const unsubscribe = onSnapshot(
      doc(db, "rooms", roomCode),
      (snapshot) => {
        if (snapshot.exists()) {
          setRoomData(snapshot.data());
        } else {
          setError("Cette salle n'existe pas");
        }
      },
      (err) => {
        console.error("Erreur lors de l'écoute des données de la salle:", err);
        setError("Erreur de connexion à la salle");
      }
    );

    return () => unsubscribe();
  }, [roomCode]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-500 p-8 rounded-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Erreur</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-900 text-white font-sans p-6">
      <header className="mb-8 text-center">
        <div className="inline-block bg-gray-800 px-6 py-3 rounded-xl border border-gray-700">
          <span className="text-gray-400 text-sm">Code salle:</span>
          <span className="font-mono font-bold text-xl text-purple-400 ml-2">{roomCode}</span>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center">
        {/* PHASE 1: LOBBY */}
        {roomData.status === 'lobby' && (
          <div className="w-full max-w-4xl text-center">
            <h1 className="text-5xl font-extrabold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              En attente des joueurs
            </h1>
            
            <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl">
              <h2 className="text-2xl font-bold mb-8">Joueurs connectés ({Object.keys(roomData.players || {}).length})</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {Object.entries(roomData.players || {}).map(([id, player]) => (
                  <div key={id} className="bg-gray-700 p-4 rounded-xl border border-gray-600 flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mb-2"></div>
                    <span className="font-medium truncate w-full text-center">{player.name}</span>
                    {id === roomData.hostId && <Crown className="w-4 h-4 text-yellow-400 mt-1" />}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-12 text-2xl text-gray-400">
              L'hôte va bientôt lancer la partie...
            </div>
          </div>
        )}
        
        {/* PHASE 2: CREATION DU MEME */}
        {roomData.status === 'playing' && (
          <div className="text-center w-full max-w-5xl">
            <h2 className="text-4xl font-bold mb-6">Création des Mèmes</h2>
            <div className="bg-purple-900/50 border border-purple-500 rounded-xl p-6 mb-12">
              <h3 className="text-2xl font-bold mb-2">Thème</h3>
              <p className="text-4xl">« {roomData.currentTheme} »</p>
            </div>
            
            <div className="bg-black p-4 rounded-2xl border border-gray-800 mx-auto max-w-3xl">
              <div className="relative">
                <img 
                  src={roomData.currentMeme.url}
                  alt="Meme template"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
            
            <div className="mt-12">
              <h3 className="text-2xl mb-4">Progression</h3>
              <div className="flex justify-center items-center gap-4">
                <div className="h-4 bg-gray-800 rounded-full w-full max-w-md">
                  <div 
                    className="h-4 bg-green-500 rounded-full"
                    style={{ width: `${Object.keys(roomData.captions || {}).length / Object.keys(roomData.players || {}).length * 100}%` }}
                  ></div>
                </div>
                <span className="text-xl font-mono">
                  {Object.keys(roomData.captions || {}).length} / {Object.keys(roomData.players || {}).length}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* PHASE 3: VOTES */}
        {roomData.status === 'voting' && (
          <div className="text-center w-full max-w-6xl">
            <h2 className="text-4xl font-bold mb-6">Phase de Vote</h2>
            <div className="bg-yellow-900/50 border border-yellow-500 rounded-xl p-6 mb-12">
              <h3 className="text-2xl font-bold mb-2">Thème</h3>
              <p className="text-4xl">« {roomData.currentTheme} »</p>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              {Object.entries(roomData.captions || {}).map(([uid, cap], idx) => (
                <div key={uid} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                  <div className="bg-black p-2">
                    <div className="relative">
                      <img src={roomData.currentMeme.url} alt="Meme" className="w-full h-auto rounded-lg" />
                      {roomData.currentMeme.zones.map((zone, zIdx) => (
                        <div 
                          key={zIdx} 
                          className="absolute flex items-center justify-center pointer-events-none"
                          style={{ 
                            top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto',
                            fontFamily: 'Impact, sans-serif',
                            textTransform: 'uppercase',
                            color: 'white',
                            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                            wordWrap: 'break-word',
                            textAlign: 'center',
                            fontSize: 'clamp(1rem, 3vw, 2rem)'
                          }}
                        >
                          {cap.texts[zIdx]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-900 text-center">
                    <span className="text-xl font-bold">Mème #{idx + 1}</span>
                    {cap.votes > 0 && (
                      <div className="mt-2 text-yellow-400 font-bold">{cap.votes} votes</div>
                    )}
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
                    style={{ width: `${(roomData.voters?.length || 0) / (Object.keys(roomData.players || {}).length - 1) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xl font-mono">
                  {roomData.voters?.length || 0} / {Math.max(1, Object.keys(roomData.players || {}).length - 1)}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* PHASE 4: RESULTATS DE LA MANCHE */}
        {roomData.status === 'results' && (
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
                  .sort((a, b) => b[1].votes - a[1].votes)
                  .map(([uid, cap], index) => {
                    const author = roomData.players[uid]?.name || "Inconnu";
                    return (
                      <div key={uid} className={`flex items-center gap-8 p-6 rounded-2xl ${index === 0 ? 'bg-yellow-900/30 border-2 border-yellow-500' : 'bg-gray-800 border border-gray-700'}`}>
                        <div className={`text-5xl font-black w-16 text-center ${index === 0 ? 'text-yellow-500' : 'text-gray-500'}`}>
                          #{index + 1}
                        </div>
                        <div className="w-64 bg-black rounded-lg relative overflow-hidden">
                          <img src={roomData.currentMeme.url} alt="" className="w-full h-auto block" />
                          <div className="absolute inset-0">
                            {roomData.currentMeme.zones.map((zone, idx) => (
                              <div 
                                key={idx} 
                                className="absolute flex items-center justify-center pointer-events-none"
                                style={{ 
                                  top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto',
                                  fontFamily: 'Impact, sans-serif',
                                  textTransform: 'uppercase',
                                  color: 'white',
                                  textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                                  wordWrap: 'break-word',
                                  textAlign: 'center',
                                  fontSize: 'clamp(0.5rem, 1.5vw, 1rem)'
                                }}
                              >
                                {cap.texts[idx]}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-3xl font-bold flex items-center gap-3">
                            {author} {index === 0 && <Trophy className="text-yellow-400 w-8 h-8" />}
                          </h4>
                          <p className="text-xl text-gray-300 mt-2">{cap.votes} votes</p>
                        </div>
                        <div className="text-3xl font-bold text-green-400 bg-green-900/30 px-6 py-3 rounded-xl">
                          +{cap.votes * 100} pts
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
        
        {/* PHASE 5: PODIUM FINAL */}
        {roomData.status === 'final' && (
          <div className="text-center w-full max-w-6xl">
            <h2 className="text-6xl font-extrabold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-600">
              CLASSEMENT FINAL
            </h2>
            
            <div className="flex items-end justify-center gap-16 mb-16 h-96">
              {/* 2ème Place */}
              {roomData.players && Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[1] && (
                <div className="flex flex-col items-center">
                  <div className="bg-gray-400/20 border-2 border-gray-400 p-8 rounded-t-3xl w-64 text-center">
                    <Medal className="w-16 h-16 text-gray-400 mb-4" />
                    <span className="text-3xl font-bold text-gray-200 block truncate">
                      {Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[1][1].name}
                    </span>
                    <span className="text-2xl font-mono text-gray-400 mt-2 block">
                      {Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[1][1].score} pts
                    </span>
                  </div>
                  <div className="bg-gradient-to-b from-gray-600 to-gray-800 w-64 h-32 rounded-b-lg border-x-2 border-b-2 border-gray-700 flex justify-center items-center">
                    <span className="text-6xl font-black text-gray-900/50">2</span>
                  </div>
                </div>
              )}
              
              {/* 1ère Place */}
              {roomData.players && Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[0] && (
                <div className="flex flex-col items-center transform -translate-y-12 z-10">
                  <div className="bg-yellow-500/20 border-4 border-yellow-500 p-10 rounded-t-3xl w-80 text-center">
                    <Crown className="w-24 h-24 text-yellow-400 mb-6" />
                    <span className="text-4xl font-black text-yellow-400 block truncate">
                      {Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[0][1].name}
                    </span>
                    <span className="text-3xl font-mono text-yellow-200 mt-3 block">
                      {Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[0][1].score} pts
                    </span>
                  </div>
                  <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 w-80 h-48 rounded-b-xl border-x-4 border-b-4 border-yellow-600 flex justify-center items-center">
                    <span className="text-8xl font-black text-yellow-900/50">1</span>
                  </div>
                </div>
              )}
              
              {/* 3ème Place */}
              {roomData.players && Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[2] && (
                <div className="flex flex-col items-center">
                  <div className="bg-amber-700/20 border-2 border-amber-700 p-6 rounded-t-3xl w-56 text-center">
                    <Medal className="w-12 h-12 text-amber-600 mb-3" />
                    <span className="text-2xl font-bold text-amber-500 block truncate">
                      {Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[2][1].name}
                    </span>
                    <span className="text-xl font-mono text-amber-600 mt-1 block">
                      {Object.entries(roomData.players).sort((a, b) => b[1].score - a[1].score)[2][1].score} pts
                    </span>
                  </div>
                  <div className="bg-gradient-to-b from-amber-800 to-amber-950 w-56 h-20 rounded-b-lg border-x-2 border-b-2 border-amber-900 flex justify-center items-center">
                    <span className="text-5xl font-black text-amber-950/50">3</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}