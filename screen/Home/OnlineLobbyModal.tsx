import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  LobbyWebSocketClient,
  LobbyConnectionStatus,
  ChallengeReceivedPayload,
  ChallengeSentPayload,
  GameStartPayload,
} from '../../services/lobby';
import {
  searchUsers,
  getOnlineUsers,
  OnlinePlayer,
  UserSearchResult,
  createOnlineGame,
} from '../../services/api';

interface OnlineLobbyModalProps {
  visible: boolean;
  onClose: () => void;
  currentUsername: string;
  currentUserId?: string;
  onStartGame: (gameData: {
    gameId: string;
    playerColor: 'white' | 'black';
    opponentName: string;
    playerName: string;
  }) => void;
}

type TabType = 'online' | 'search' | 'quick' | 'room';

export default function OnlineLobbyModal({
  visible,
  onClose,
  currentUsername,
  currentUserId = '',
  onStartGame,
}: OnlineLobbyModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('online');
  const [onlineUsers, setOnlineUsers] = useState<OnlinePlayer[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<LobbyConnectionStatus>('disconnected');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Challenge states
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengeReceivedPayload | null>(null);
  const [outgoingChallenge, setOutgoingChallenge] = useState<ChallengeSentPayload | null>(null);
  const [quickMatchWaiting, setQuickMatchWaiting] = useState(false);

  // Color picker state before challenging
  const [targetToChallenge, setTargetToChallenge] = useState<string | null>(null);
  const [chosenColor, setChosenColor] = useState<'white' | 'black' | 'random'>('random');

  // Room code tab state
  const [roomSubTab, setRoomSubTab] = useState<'create' | 'join'>('create');
  const [roomSide, setRoomSide] = useState<'white' | 'black' | 'random'>('white');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const lobbyClientRef = useRef<LobbyWebSocketClient | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to Lobby WebSocket when modal opens
  useEffect(() => {
    if (!visible) {
      if (lobbyClientRef.current) {
        lobbyClientRef.current.disconnect();
        lobbyClientRef.current = null;
      }
      setIncomingChallenge(null);
      setOutgoingChallenge(null);
      setQuickMatchWaiting(false);
      setTargetToChallenge(null);
      return;
    }

    const client = new LobbyWebSocketClient();
    lobbyClientRef.current = client;

    client.setCallbacks({
      onStatusChange: (status) => {
        setConnectionStatus(status);
      },
      onOnlineUsers: (users) => {
        setOnlineUsers(users);
      },
      onChallengeReceived: (payload) => {
        setIncomingChallenge(payload);
      },
      onChallengeSent: (payload) => {
        setOutgoingChallenge(payload);
        setTargetToChallenge(null);
      },
      onChallengeDeclined: (payload) => {
        Alert.alert('Challenge Declined', payload.message || 'Opponent declined the match.');
        setOutgoingChallenge(null);
      },
      onChallengeCancelled: (payload) => {
        if (incomingChallenge?.challengeId === payload.challengeId) {
          setIncomingChallenge(null);
          Alert.alert('Challenge Cancelled', 'The opponent cancelled the challenge.');
        }
      },
      onGameStart: (payload: GameStartPayload) => {
        setIncomingChallenge(null);
        setOutgoingChallenge(null);
        setQuickMatchWaiting(false);
        setTargetToChallenge(null);
        onClose();

        onStartGame({
          gameId: payload.gameId,
          playerColor: payload.yourColor,
          opponentName: payload.opponentName,
          playerName: currentUsername,
        });
      },
      onQuickMatchWaiting: () => {
        setQuickMatchWaiting(true);
      },
      onError: (error) => {
        Alert.alert('Lobby Notice', error);
      },
    });

    client.connect(currentUsername, currentUserId);

    // Initial fetch of online users
    getOnlineUsers()
      .then((data) => setOnlineUsers(data.users || []))
      .catch(() => {});

    return () => {
      client.disconnect();
      lobbyClientRef.current = null;
    };
  }, [visible, currentUsername, currentUserId, onClose, onStartGame]);

  // Debounced search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(text.trim())
        .then((res) => {
          setSearchResults(res.users || []);
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    }, 300);
  };

  const handleSendChallenge = () => {
    if (!targetToChallenge) return;
    if (!lobbyClientRef.current) {
      Alert.alert('Error', 'Not connected to online lobby');
      return;
    }

    lobbyClientRef.current.sendChallenge(targetToChallenge, chosenColor);
  };

  const handleAcceptChallenge = () => {
    if (!incomingChallenge || !lobbyClientRef.current) return;
    lobbyClientRef.current.acceptChallenge(incomingChallenge.challengeId);
  };

  const handleDeclineChallenge = () => {
    if (!incomingChallenge || !lobbyClientRef.current) return;
    lobbyClientRef.current.declineChallenge(incomingChallenge.challengeId);
    setIncomingChallenge(null);
  };

  const handleCancelOutgoingChallenge = () => {
    if (!outgoingChallenge || !lobbyClientRef.current) return;
    lobbyClientRef.current.cancelChallenge(outgoingChallenge.challengeId);
    setOutgoingChallenge(null);
  };

  const handleToggleQuickMatch = () => {
    if (!lobbyClientRef.current) return;
    if (quickMatchWaiting) {
      lobbyClientRef.current.cancelQuickMatch();
      setQuickMatchWaiting(false);
    } else {
      lobbyClientRef.current.joinQuickMatch();
    }
  };

  const handleCreateRoomGame = async () => {
    try {
      setIsCreatingRoom(true);
      const chosenSide = roomSide === 'random' ? (Math.random() > 0.5 ? 'white' : 'black') : roomSide;
      const whiteName = chosenSide === 'white' ? currentUsername : 'Opponent';
      const blackName = chosenSide === 'black' ? currentUsername : 'Opponent';

      const game = await createOnlineGame(whiteName, blackName);
      setIsCreatingRoom(false);
      onClose();

      onStartGame({
        gameId: game.id,
        playerColor: chosenSide,
        opponentName: 'Opponent',
        playerName: currentUsername,
      });
    } catch (err: any) {
      setIsCreatingRoom(false);
      Alert.alert('Error', err?.message || 'Failed to create room.');
    }
  };

  const handleJoinRoomGame = () => {
    const trimmed = joinRoomId.trim();
    if (!trimmed) {
      Alert.alert('Missing ID', 'Please enter a game ID to join.');
      return;
    }
    const chosenSide = roomSide === 'random' ? 'white' : roomSide;
    onClose();

    onStartGame({
      gameId: trimmed,
      playerColor: chosenSide,
      opponentName: 'Opponent',
      playerName: currentUsername,
    });
  };

  // Filter out self from online users
  const otherOnlineUsers = onlineUsers.filter(
    (u) => u.username.toLowerCase() !== currentUsername.toLowerCase()
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Play Online</Text>
              <View style={styles.presenceRow}>
                <View
                  style={[
                    styles.statusDot,
                    connectionStatus === 'connected' ? styles.dotConnected : styles.dotDisconnected,
                  ]}
                />
                <Text style={styles.presenceText}>
                  {connectionStatus === 'connected'
                    ? `${onlineUsers.length} Player${onlineUsers.length === 1 ? '' : 's'} Online`
                    : connectionStatus === 'connecting'
                    ? 'Connecting to Lobby...'
                    : 'Reconnecting...'}
                </Text>
                <Text style={styles.userBadge}>👤 {currentUsername}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Incoming Challenge Alert Banner */}
          {incomingChallenge && (
            <View style={styles.incomingBanner}>
              <View style={styles.incomingHeader}>
                <Text style={styles.incomingIcon}>⚔️</Text>
                <View style={styles.incomingTextContainer}>
                  <Text style={styles.incomingTitle}>Incoming Challenge!</Text>
                  <Text style={styles.incomingSubtitle}>
                    <Text style={styles.boldText}>{incomingChallenge.challengerName}</Text> wants to play
                    {incomingChallenge.color !== 'random'
                      ? ` as ${incomingChallenge.color === 'white' ? '⚪ White' : '⚫ Black'}`
                      : ' (🎲 Random sides)'}
                  </Text>
                </View>
              </View>
              <View style={styles.incomingActionRow}>
                <TouchableOpacity
                  style={[styles.challengeBtn, styles.acceptBtn]}
                  onPress={handleAcceptChallenge}
                >
                  <Text style={styles.acceptBtnText}>✓ Accept & Play</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.challengeBtn, styles.declineBtn]}
                  onPress={handleDeclineChallenge}
                >
                  <Text style={styles.declineBtnText}>✕ Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Outgoing Challenge Waiting Banner */}
          {outgoingChallenge && (
            <View style={styles.waitingBanner}>
              <ActivityIndicator size="small" color="#38bdf8" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.waitingTitle}>
                  Challenging <Text style={styles.boldText}>{outgoingChallenge.targetName}</Text>...
                </Text>
                <Text style={styles.waitingSubtitle}>Waiting for opponent to accept</Text>
              </View>
              <TouchableOpacity
                onPress={handleCancelOutgoingChallenge}
                style={styles.cancelOutgoingBtn}
              >
                <Text style={styles.cancelOutgoingBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Match Waiting Banner */}
          {quickMatchWaiting && (
            <View style={styles.waitingBanner}>
              <ActivityIndicator size="small" color="#c9a84c" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.waitingTitle}>Matchmaking Queue</Text>
                <Text style={styles.waitingSubtitle}>Searching for an online opponent...</Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleQuickMatch}
                style={styles.cancelOutgoingBtn}
              >
                <Text style={styles.cancelOutgoingBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'online' && styles.tabItemActive]}
              onPress={() => setActiveTab('online')}
            >
              <Text style={[styles.tabText, activeTab === 'online' && styles.tabTextActive]}>
                🟢 Online ({otherOnlineUsers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'search' && styles.tabItemActive]}
              onPress={() => setActiveTab('search')}
            >
              <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
                🔍 Search
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'quick' && styles.tabItemActive]}
              onPress={() => setActiveTab('quick')}
            >
              <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>
                ⚡ Quick Play
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'room' && styles.tabItemActive]}
              onPress={() => setActiveTab('room')}
            >
              <Text style={[styles.tabText, activeTab === 'room' && styles.tabTextActive]}>
                🔑 Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Color Selection Drawer before sending challenge */}
          {targetToChallenge && (
            <View style={styles.challengeDrawer}>
              <Text style={styles.drawerTitle}>
                Challenge <Text style={styles.highlightText}>{targetToChallenge}</Text>
              </Text>
              <Text style={styles.drawerSubtitle}>Choose which side you want to play:</Text>

              <View style={styles.sideRow}>
                {(['random', 'white', 'black'] as const).map((side) => (
                  <TouchableOpacity
                    key={side}
                    style={[styles.sideBtn, chosenColor === side && styles.sideBtnSelected]}
                    onPress={() => setChosenColor(side)}
                  >
                    <Text style={[styles.sideBtnText, chosenColor === side && styles.sideBtnTextSelected]}>
                      {side === 'white' ? '⚪ White' : side === 'black' ? '⚫ Black' : '🎲 Random'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.drawerActionRow}>
                <TouchableOpacity
                  style={[styles.drawerBtn, styles.sendChallengeBtn]}
                  onPress={handleSendChallenge}
                >
                  <Text style={styles.sendChallengeBtnText}>⚔️ Send Challenge</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.drawerBtn, styles.cancelDrawerBtn]}
                  onPress={() => setTargetToChallenge(null)}
                >
                  <Text style={styles.cancelDrawerBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Content Area */}
          <View style={styles.contentContainer}>
            {/* TAB 1: Online Players */}
            {activeTab === 'online' && (
              <FlatList
                data={otherOnlineUsers}
                keyExtractor={(item) => item.id || item.username}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>♟️</Text>
                    <Text style={styles.emptyTitle}>No Other Players Online</Text>
                    <Text style={styles.emptySubtitle}>
                      You can use "⚡ Quick Play" or "🔍 Search" to challenge players!
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.playerCard}>
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerAvatarText}>
                        {item.username.charAt(0).toUpperCase()}
                      </Text>
                      <View style={[styles.avatarStatusDot, styles.dotConnected]} />
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{item.username}</Text>
                      <Text style={styles.playerStatus}>Online • Ready to play</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.challengePlayerBtn}
                      onPress={() => setTargetToChallenge(item.username)}
                    >
                      <Text style={styles.challengePlayerBtnText}>Play ⚔️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            {/* TAB 2: Search Players */}
            {activeTab === 'search' && (
              <View style={{ flex: 1 }}>
                <View style={styles.searchBarContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search player by username..."
                    placeholderTextColor="#777"
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearchChange('')}>
                      <Text style={styles.clearSearch}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isSearching ? (
                  <View style={styles.emptyContainer}>
                    <ActivityIndicator size="small" color="#38bdf8" />
                    <Text style={[styles.emptySubtitle, { marginTop: 8 }]}>Searching users...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults.filter(
                      (u) => u.username.toLowerCase() !== currentUsername.toLowerCase()
                    )}
                    keyExtractor={(item) => item.id || item.username}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>
                          {searchQuery ? 'No players found' : 'Type a username to search'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                          Search by username to challenge your contacts or friends
                        </Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <View style={styles.playerCard}>
                        <View style={styles.playerAvatar}>
                          <Text style={styles.playerAvatarText}>
                            {item.username.charAt(0).toUpperCase()}
                          </Text>
                          <View
                            style={[
                              styles.avatarStatusDot,
                              item.isOnline ? styles.dotConnected : styles.dotDisconnected,
                            ]}
                          />
                        </View>
                        <View style={styles.playerInfo}>
                          <Text style={styles.playerName}>{item.username}</Text>
                          <Text style={styles.playerStatus}>
                            {item.isOnline ? '🟢 Online now' : '⚪ Offline'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.challengePlayerBtn,
                            !item.isOnline && styles.challengePlayerBtnOffline,
                          ]}
                          onPress={() => {
                            if (!item.isOnline) {
                              Alert.alert(
                                'Player Offline',
                                `${item.username} is not currently online. Challenge anyway?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Send Challenge',
                                    onPress: () => setTargetToChallenge(item.username),
                                  },
                                ]
                              );
                            } else {
                              setTargetToChallenge(item.username);
                            }
                          }}
                        >
                          <Text style={styles.challengePlayerBtnText}>
                            {item.isOnline ? 'Play ⚔️' : 'Challenge'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                )}
              </View>
            )}

            {/* TAB 3: Quick Play */}
            {activeTab === 'quick' && (
              <View style={styles.quickPlayContainer}>
                <View style={styles.quickCard}>
                  <Text style={styles.quickHeroIcon}>⚡</Text>
                  <Text style={styles.quickHeroTitle}>Random Matchmaking</Text>
                  <Text style={styles.quickHeroSubtitle}>
                    Instantly pair up with anyone waiting in the lobby queue.
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.quickPlayButton,
                      quickMatchWaiting && styles.quickPlayButtonWaiting,
                    ]}
                    onPress={handleToggleQuickMatch}
                  >
                    {quickMatchWaiting ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.quickPlayButtonText}>Searching... (Cancel)</Text>
                      </View>
                    ) : (
                      <Text style={styles.quickPlayButtonText}>⚡ Find Match Now</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAB 4: Room Code */}
            {activeTab === 'room' && (
              <View style={styles.roomContainer}>
                <View style={styles.roomSubTabBar}>
                  <TouchableOpacity
                    style={[styles.roomSubTab, roomSubTab === 'create' && styles.roomSubTabActive]}
                    onPress={() => setRoomSubTab('create')}
                  >
                    <Text
                      style={[
                        styles.roomSubTabText,
                        roomSubTab === 'create' && styles.roomSubTabTextActive,
                      ]}
                    >
                      Create Game
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roomSubTab, roomSubTab === 'join' && styles.roomSubTabActive]}
                    onPress={() => setRoomSubTab('join')}
                  >
                    <Text
                      style={[
                        styles.roomSubTabText,
                        roomSubTab === 'join' && styles.roomSubTabTextActive,
                      ]}
                    >
                      Join by Code
                    </Text>
                  </TouchableOpacity>
                </View>

                {roomSubTab === 'create' ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>Play As</Text>
                    <View style={styles.sideRow}>
                      {(['white', 'black', 'random'] as const).map((side) => (
                        <TouchableOpacity
                          key={side}
                          style={[styles.sideBtn, roomSide === side && styles.sideBtnSelected]}
                          onPress={() => setRoomSide(side)}
                        >
                          <Text
                            style={[
                              styles.sideBtnText,
                              roomSide === side && styles.sideBtnTextSelected,
                            ]}
                          >
                            {side === 'white' ? '⚪ White' : side === 'black' ? '⚫ Black' : '🎲 Random'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[styles.createGameBtn, isCreatingRoom && { opacity: 0.6 }]}
                      onPress={handleCreateRoomGame}
                      disabled={isCreatingRoom}
                    >
                      <Text style={styles.createGameBtnText}>
                        {isCreatingRoom ? 'Creating...' : 'Create Room & Play'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>Game / Room ID</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Paste Game ID"
                      placeholderTextColor="#777"
                      value={joinRoomId}
                      onChangeText={setJoinRoomId}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <TouchableOpacity style={styles.createGameBtn} onPress={handleJoinRoomGame}>
                      <Text style={styles.createGameBtnText}>Join Game</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1f1e1b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '86%',
    borderWidth: 1,
    borderColor: '#383733',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f0d9b5',
    letterSpacing: 0.5,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: {
    backgroundColor: '#4ade80',
  },
  dotDisconnected: {
    backgroundColor: '#888',
  },
  presenceText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  userBadge: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2e2d29',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '700',
  },

  // Incoming challenge banner
  incomingBanner: {
    backgroundColor: '#133527',
    borderColor: '#22c55e',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  incomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  incomingIcon: {
    fontSize: 24,
  },
  incomingTextContainer: {
    flex: 1,
  },
  incomingTitle: {
    color: '#4ade80',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  incomingSubtitle: {
    color: '#d1fae5',
    fontSize: 13,
    marginTop: 2,
  },
  boldText: {
    fontWeight: '800',
    color: '#fff',
  },
  incomingActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  challengeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
  },
  acceptBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  declineBtn: {
    backgroundColor: '#2a2926',
    borderWidth: 1,
    borderColor: '#555',
  },
  declineBtnText: {
    color: '#bbb',
    fontSize: 14,
    fontWeight: '600',
  },

  // Waiting banners
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2a3a',
    borderColor: '#38bdf8',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  waitingTitle: {
    color: '#f0d9b5',
    fontSize: 13,
    fontWeight: '700',
  },
  waitingSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  cancelOutgoingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2e2d29',
  },
  cancelOutgoingBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#151412',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#2e2d29',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
  },
  tabTextActive: {
    color: '#f0d9b5',
  },

  // Color selection drawer
  challengeDrawer: {
    backgroundColor: '#262521',
    borderColor: '#38bdf8',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f0d9b5',
  },
  highlightText: {
    color: '#38bdf8',
  },
  drawerSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginBottom: 10,
  },
  sideRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#1a1917',
  },
  sideBtnSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2438',
  },
  sideBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
  },
  sideBtnTextSelected: {
    color: '#38bdf8',
  },
  drawerActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  drawerBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendChallengeBtn: {
    flex: 2,
    backgroundColor: '#38bdf8',
  },
  sendChallengeBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelDrawerBtn: {
    flex: 1,
    backgroundColor: '#333',
  },
  cancelDrawerBtnText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
  },

  contentContainer: {
    flex: 1,
  },

  // Player cards
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262521',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#33322d',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#383733',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatarText: {
    color: '#f0d9b5',
    fontSize: 16,
    fontWeight: '800',
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#262521',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f0d9b5',
  },
  playerStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  challengePlayerBtn: {
    backgroundColor: '#4a7c59',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  challengePlayerBtnOffline: {
    backgroundColor: '#383733',
  },
  challengePlayerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Search input
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151412',
    borderColor: '#383733',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f0d9b5',
    fontSize: 14,
    padding: 0,
  },
  clearSearch: {
    color: '#888',
    fontSize: 14,
    paddingHorizontal: 4,
  },

  // Quick Play Tab
  quickPlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  quickCard: {
    backgroundColor: '#262521',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#383733',
  },
  quickHeroIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  quickHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f0d9b5',
    marginBottom: 6,
  },
  quickHeroSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  quickPlayButton: {
    backgroundColor: '#c9a84c',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  quickPlayButtonWaiting: {
    backgroundColor: '#444',
  },
  quickPlayButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '800',
  },

  // Room tab
  roomContainer: {
    flex: 1,
  },
  roomSubTabBar: {
    flexDirection: 'row',
    backgroundColor: '#151412',
    borderRadius: 8,
    padding: 3,
  },
  roomSubTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  roomSubTabActive: {
    backgroundColor: '#38bdf8',
  },
  roomSubTabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  roomSubTabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  inputLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#151412',
    borderColor: '#383733',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f0d9b5',
    fontSize: 14,
    marginBottom: 14,
  },
  createGameBtn: {
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  createGameBtnText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0d9b5',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    lineHeight: 18,
  },
});
