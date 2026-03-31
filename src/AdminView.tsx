import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  Play, 
  SkipForward, 
  Trophy, 
  Crown
} from 'lucide-react';

export default function AdminView() {
  const { roomCode } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState(null);
  const [showModerationPanel, setShowModerationPanel] = useState(true);

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

  // Fonctions d'administration
  const startGame = async () => {
    try {
      await updateDoc(doc(db, "rooms", roomCode), {
        status: 'playing',
        // Autres champs nécessaires pour démarrer une nouvelle manche
      });
    } catch (err) {
      console.error("Erreur lors du démarrage de la partie:", err);
      setError("Impossible de démarrer la partie");
    }
  };

  const advanceToVoting = async () => {
    try {
      await updateDoc(doc(db, "rooms", roomCode), {
        status: 'voting',
      });
    } catch (err) {
      console.error("Erreur lors du passage à la phase de vote:", err);
      setError("Impossible de passer à la phase de vote");
    }
  };

  const advanceToResults = async () => {
    try {
      await updateDoc(doc(db, "rooms", roomCode), {
        status: 'results',
      });
    } catch (err) {
      console.error("Erreur lors du passage aux résultats:", err);
      setError("Impossible d'afficher les résultats");
    }
  };

  const advanceToFinalRanking = async () => {
    try {
      await updateDoc(doc(db, "rooms", roomCode), {
        status: 'final',
      });
    } catch (err) {
      console.error("Erreur lors du passage au classement final:", err);
      setError("Impossible d'afficher le classement final");
    }
  };

  const resetToLobby = async () => {
    try {
      await updateDoc(doc(db, "rooms", roomCode), {
        status: 'lobby',
        // Réinitialiser les données de jeu
        playedMemes: [],
        captions: {},
        pendingCaptions: {},
        voters: [],
        // Conserver les joueurs mais réinitialiser les scores
        players: Object.fromEntries(
          Object.entries(roomData.players || {}).map(([id, player]) => [id, { ...player, score: 0 }])
        ),
      });
    } catch (err) {
      console.error("Erreur lors de la réinitialisation:", err);
      setError("Impossible de réinitialiser la partie");
    }
  };

  const approvePendingCaption = async (uid) => {
    if (!roomData.pendingCaptions?.[uid]) return;
    
    try {
      const caption = roomData.pendingCaptions[uid];
      const updatedCaptions = { ...roomData.captions };
      updatedCaptions[uid] = caption;
      
      const updatedPendingCaptions = { ...roomData.pendingCaptions };
      delete updatedPendingCaptions[uid];
      
      await updateDoc(doc(db, "rooms", roomCode), {
        captions: updatedCaptions,
        pendingCaptions: updatedPendingCaptions
      });
    } catch (err) {
      console.error("Erreur lors de l'approbation du mème:", err);
      setError("Impossible d'approuver le mème");
    }
  };

  const rejectPendingCaption = async (uid) => {
    if (!roomData.pendingCaptions?.[uid]) return;
    
    try {
      const updatedPendingCaptions = { ...roomData.pendingCaptions };
      delete updatedPendingCaptions[uid];
      
      await updateDoc(doc(db, "rooms", roomCode), {
        pendingCaptions: updatedPendingCaptions
      });
    } catch (err) {
      console.error("Erreur lors du rejet du mème:", err);
      setError("Impossible de rejeter le mème");
    }
  };

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

  const playersList = Object.entries(roomData.players || {}).map(([id, p]) => ({ id, ...p }));
  const pendingCaptionsCount = Object.keys(roomData.pendingCaptions || {}).length;
  const allSubmitted = playersList.length > 0 && 
    (Object.keys(roomData.captions || {}).length + Object.keys(roomData.pendingCaptions || {}).length) === playersList.length;
  const allVoted = roomData.voters?.length >= (playersList.length > 1 ? playersList.length - 1 : playersList.length);
  const isGameFinished = roomData.playedMemes?.length >= 10; // Remplacer par la longueur réelle de votre bibliothèque de mèmes

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-6">
      <header className="bg-gray-800 border-b border-gray-700 p-4 rounded-xl mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Mode Administrateur</h1>
          <div className="bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
            <span className="text-sm text-gray-400">Code:</span>
            <span className="font-mono font-bold tracking-wider text-purple-400 ml-1">{roomCode}</span>
          </div>
        </div>
        <div>
          <span className="bg-red-900/30 px-3 py-1 rounded-full text-sm font-medium border border-red-500">
            Admin
          </span>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panneau de gauche - Infos et contrôles */}
        <div className="space-y-6">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-3">État de la partie</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="font-medium">
                  {roomData.status === 'lobby' && 'Lobby'}
                  {roomData.status === 'playing' && 'Création des mèmes'}
                  {roomData.status === 'voting' && 'Phase de vote'}
                  {roomData.status === 'results' && 'Résultats de la manche'}
                  {roomData.status === 'final' && 'Classement final'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Joueurs:</span>
                <span className="font-medium">{playersList.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Thème actuel:</span>
                <span className="font-medium truncate max-w-[200px]">{roomData.currentTheme || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Manches jouées:</span>
                <span className="font-medium">{roomData.playedMemes?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-3">Contrôles</h2>
            <div className="space-y-3">
              {roomData.status === 'lobby' && (
                <button 
                  onClick={startGame}
                  className="w-full bg-green-600 hover:bg-green-500 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Démarrer la partie
                </button>
              )}

              {roomData.status === 'playing' && (
                <button 
                  onClick={advanceToVoting}
                  className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                    allSubmitted ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!allSubmitted}
                >
                  <SkipForward className="w-4 h-4" /> 
                  Passer au vote {allSubmitted ? "" : "(En attente...)"}
                </button>
              )}

              {roomData.status === 'voting' && (
                <button 
                  onClick={advanceToResults}
                  className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> Voir les résultats
                </button>
              )}

              {roomData.status === 'results' && (
                <button 
                  onClick={isGameFinished ? advanceToFinalRanking : startGame}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {isGameFinished ? (
                    <><Crown className="w-4 h-4" /> Voir le podium final</>
                  ) : (
                    <><Play className="w-4 h-4 fill-current" /> Manche suivante</>
                  )}
                </button>
              )}

              {roomData.status === 'final' && (
                <button 
                  onClick={resetToLobby}
                  className="w-full bg-gray-600 hover:bg-gray-500 py-2 rounded-lg font-medium"
                >
                  Retour au lobby (nouvelle partie)
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-3">Joueurs</h2>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {playersList.sort((a, b) => b.score - a.score).map((player) => (
                <div key={player.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{player.name}</span>
                    {player.id === roomData.hostId && (
                      <Crown className="w-3 h-3 text-yellow-400" />
                    )}
                  </div>
                  <span className="text-yellow-400 font-mono">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau central - Contenu principal */}
        <div className="lg:col-span-2">
          {/* Panneau de modération */}
          {pendingCaptionsCount > 0 && (
            <div className="bg-red-900/30 border border-red-500 p-4 rounded-xl mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-red-300 flex items-center gap-2">
                  <Flag className="text-red-400" /> Modération requise ({pendingCaptionsCount})
                </h3>
                <button 
                  onClick={() => setShowModerationPanel(!showModerationPanel)}
                  className="bg-red-800 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {showModerationPanel ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              
              {showModerationPanel && (
                <div className="space-y-4 mt-4 max-h-96 overflow-y-auto">
                  {Object.entries(roomData.pendingCaptions || {}).map(([uid, caption]) => {
                    const playerName = roomData.players[uid]?.name || "Joueur inconnu";
                    return (
                      <div key={uid} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold">Mème de {playerName}</h4>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => approvePendingCaption(uid)}
                              className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                            >
                              <ThumbsUp className="w-4 h-4" /> Approuver
                            </button>
                            <button 
                              onClick={() => rejectPendingCaption(uid)}
                              className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                            >
                              <ThumbsDown className="w-4 h-4" /> Rejeter
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black rounded-lg overflow-hidden">
                            <div className="relative">
                              <img src={roomData.currentMeme.url} alt="Meme" className="w-full h-auto" />
                              {roomData.currentMeme.zones.map((zone, idx) => (
                                <div 
                                  key={idx} 
                                  className="absolute flex items-center justify-center pointer-events-none"
                                  style={{ 
                                    top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto',
                                    ...memeTextStyle, fontSize: 'clamp(0.6rem, 1.5vw, 1rem)'
                                  }}
                                >
                                  {caption.texts[idx]}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium text-red-300 mb-2">Contenu potentiellement inapproprié :</h5>
                            <ul className="space-y-2">
                              {caption.originalTexts.map((text, idx) => {
                                const inappropriateWords = caption.inappropriateWords?.[idx] || [];
                                if (inappropriateWords.length === 0) return null;
                                
                                return (
                                  <li key={idx} className="bg-gray-900 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Zone {idx + 1}:</div>
                                    <div className="text-sm">{text}</div>
                                    <div className="mt-1 text-xs text-red-400">
                                      Mots détectés: {inappropriateWords.map(w => w.word).join(', ')}
                                    </div>
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

          {/* Affichage principal selon l'état du jeu */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold mb-6">
              {roomData.status === 'lobby' && 'Salle d\'attente'}
              {roomData.status === 'playing' && 'Création des mèmes en cours'}
              {roomData.status === 'voting' && 'Phase de vote en cours'}
              {roomData.status === 'results' && 'Résultats de la manche'}
              {roomData.status === 'final' && 'Classement final'}
            </h2>

            {roomData.status === 'playing' && (
              <div className="space-y-4">
                <div className="bg-purple-900/30 border border-purple-500 p-4 rounded-xl">
                  <h3 className="text-lg font-medium mb-2">Thème actuel</h3>
                  <p className="text-2xl">« {roomData.currentTheme} »</p>
                </div>
                
                <div className="bg-black p-2 rounded-xl">
                  <img 
                    src={roomData.currentMeme.url} 
                    alt="Meme template" 
                    className="w-full max-w-md mx-auto h-auto rounded-lg"
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Progression des soumissions</h3>
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-gray-700 rounded-full w-full">
                      <div 
                        className="h-4 bg-green-500 rounded-full"
                        style={{ width: `${(Object.keys(roomData.captions || {}).length + Object.keys(roomData.pendingCaptions || {}).length) / playersList.length * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-mono">
                      {Object.keys(roomData.captions || {}).length + Object.keys(roomData.pendingCaptions || {}).length} / {playersList.length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {roomData.status === 'voting' && (
              <div className="space-y-4">
                <div className="bg-yellow-900/30 border border-yellow-500 p-4 rounded-xl">
                  <h3 className="text-lg font-medium mb-2">Thème actuel</h3>
                  <p className="text-2xl">« {roomData.currentTheme} »</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Progression des votes</h3>
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-gray-700 rounded-full w-full">
                      <div 
                        className="h-4 bg-yellow-500 rounded-full"
                        style={{ width: `${(roomData.voters?.length || 0) / (playersList.length - 1) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-mono">
                      {roomData.voters?.length || 0} / {Math.max(1, playersList.length - 1)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {Object.entries(roomData.captions || {}).map(([uid, cap], idx) => {
                    const isMine = false; // Pas pertinent pour l'admin
                    return (
                      <div key={uid} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
                        <div className="bg-black p-2">
                          <div className="relative">
                            <img src={roomData.currentMeme.url} alt="Meme" className="w-full h-auto rounded-lg" />
                            {roomData.currentMeme.zones.map((zone, zIdx) => (
                              <div 
                                key={zIdx} 
                                className="absolute flex items-center justify-center pointer-events-none"
                                style={{ 
                                  top: zone.top, left: zone.left, width: zone.width, height: zone.height || 'auto',
                                  ...memeTextStyle, fontSize: 'clamp(0.6rem, 1.5vw, 1rem)'
                                }}
                              >
                                {cap.texts[zIdx]}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-900 flex justify-between items-center">
                          <span className="text-sm">{roomData.players[uid]?.name}</span>
                          <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded text-sm">
                            {cap.votes || 0} votes
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {roomData.status === 'results' && (
              <div className="space-y-6">
                <div className="bg-blue-900/30 border border-blue-500 p-4 rounded-xl">
                  <h3 className="text-lg font-medium mb-2">Résultats pour le thème</h3>
                  <p className="text-2xl">« {roomData.currentTheme} »</p>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(roomData.captions || {})
                    .sort((a, b) => b[1].votes - a[1].votes)
                    .map(([uid, cap], index) => {
                      const author = roomData.players[uid]?.name || "Inconnu";
                      return (
                        <div key={uid} className={`flex items-center gap-4 p-3 rounded-xl ${index === 0 ? 'bg-yellow-900/30 border border-yellow-500' : 'bg-gray-900'}`}>
                          <div className="text-2xl font-bold w-8 text-center">
                            #{index + 1}
                          </div>
                          <div className="flex-grow">
                            <div className="font-bold">{author}</div>
                            <div className="text-sm text-gray-400">{cap.votes} votes</div>
                          </div>
                          <div className="text-green-400 font-bold">
                            +{cap.votes * 100} pts
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {roomData.status === 'final' && (
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-6">Podium Final</h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* 2ème place */}
                  {playersList.length > 1 && (
                    <div className="bg-gray-700 rounded-xl p-4 border border-gray-600 order-1">
                      <div className="text-4xl font-black text-gray-500 mb-2">2</div>
                      <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <div className="font-bold truncate">{playersList.sort((a, b) => b.score - a.score)[1]?.name}</div>
                      <div className="text-gray-400 font-mono">{playersList.sort((a, b) => b.score - a.score)[1]?.score} pts</div>
                    </div>
                  )}
                  
                  {/* 1ère place */}
                  {playersList.length > 0 && (
                    <div className="bg-yellow-900/30 rounded-xl p-6 border-2 border-yellow-500 order-2">
                      <div className="text-5xl font-black text-yellow-500 mb-2">1</div>
                      <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                      <div className="font-bold text-xl truncate">{playersList.sort((a, b) => b.score - a.score)[0]?.name}</div>
                      <div className="text-yellow-400 font-mono text-lg">{playersList.sort((a, b) => b.score - a.score)[0]?.score} pts</div>
                    </div>
                  )}
                  
                  {/* 3ème place */}
                  {playersList.length > 2 && (
                    <div className="bg-amber-900/30 rounded-xl p-3 border border-amber-700 order-3">
                      <div className="text-3xl font-black text-amber-700 mb-1">3</div>
                      <Medal className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                      <div className="font-bold truncate">{playersList.sort((a, b) => b.score - a.score)[2]?.name}</div>
                      <div className="text-amber-600 font-mono">{playersList.sort((a, b) => b.score - a.score)[2]?.score} pts</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}