'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth, Profile } from '../providers';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { 
  Send, Search, LogOut, Plus, Hash, User, Moon, Sun, 
  MessageSquare, Settings, Edit3, Check, Loader2, Sparkles,
  Paperclip, X, File as FileIcon, Info, Compass, Image as ImageIcon, Download, ChevronRight, Menu,
  Phone, Video, VideoOff, Mic, MicOff, PhoneOff, Minimize2, Maximize2,
  Smile, CheckCheck, Lock, Volume2, Trash2, BarChart3
} from 'lucide-react';

interface Room {
  id: string;
  name: string;
  is_dm: boolean;
}

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_key?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  reactions?: any;
}

export default function ChatPage() {
  const { user, loading, signOut, theme, setTheme } = useAuth();
  const router = useRouter();

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // App state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeRoomMembers, setActiveRoomMembers] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Input states
  const [newMessageText, setNewMessageText] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [editProfileName, setEditProfileName] = useState('');

  // Attachment states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    url: string;
    key: string;
    name: string;
    type: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state toggles
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [gemmaThinking, setGemmaThinking] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Advanced Features states & refs
  // Read receipts state
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({}); // maps user_id -> last_read_message_id

  // AI Summarization states
  const [summarizingChat, setSummarizingChat] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Voice note recording states & refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordingDurationRef = useRef(0);
  const recordingStartTimeRef = useRef<number>(0);

  // E2EE states
  const [e2eeKeys, setE2eeKeys] = useState<Record<string, CryptoKey>>({}); // maps room_id -> CryptoKey
  const [passcodeInputs, setPasscodeInputs] = useState<Record<string, string>>({}); // maps room_id -> passcode string
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({}); // maps msg_id -> decrypted text

  // Reactions picker state
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);

  // Keep track of active room in a ref for notifications
  const activeRoomRef = useRef(activeRoom);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // WebRTC Calling state
  const [callState, setCallState] = useState<'idle' | 'ringing-outgoing' | 'ringing-incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [callPartner, setCallPartner] = useState<Profile | null>(null);
  const [callRoomId, setCallRoomId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  // WebRTC Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const startPeerConnectionPromiseRef = useRef<Promise<RTCPeerConnection | null> | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const isRemoteDescriptionSetRef = useRef<boolean>(false);

  // Sync state refs to avoid stale closures in listeners
  const callStateRef = useRef(callState);
  const callRoomIdRef = useRef(callRoomId);
  const callPartnerRef = useRef(callPartner);
  const callTypeRef = useRef(callType);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    callRoomIdRef.current = callRoomId;
  }, [callRoomId]);

  useEffect(() => {
    callPartnerRef.current = callPartner;
  }, [callPartner]);

  useEffect(() => {
    callTypeRef.current = callType;
  }, [callType]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ==========================================
  // Web Crypto E2EE Helper Functions
  // ==========================================
  const deriveSaltFromRoomId = (roomId: string): Uint8Array => {
    const encoder = new TextEncoder();
    return encoder.encode(roomId.replace(/-/g, '').slice(0, 16));
  };

  const deriveKeyFromPassphrase = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as any,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  };

  const encryptMessage = async (plaintext: string, key: CryptoKey) => {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(plaintext)
    );
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const ciphertextHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { iv: ivHex, ciphertext: ciphertextHex };
  };

  const decryptMessage = async (ivHex: string, ciphertextHex: string, key: CryptoKey): Promise<string> => {
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(ciphertextHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  };

  const handleSetPassphrase = async (roomId: string, pass: string) => {
    if (!pass.trim()) {
      localStorage.removeItem(`e2ee_pass_${roomId}`);
      setE2eeKeys(prev => {
        const updated = { ...prev };
        delete updated[roomId];
        return updated;
      });
      return;
    }
    localStorage.setItem(`e2ee_pass_${roomId}`, pass);
    try {
      const salt = deriveSaltFromRoomId(roomId);
      const key = await deriveKeyFromPassphrase(pass, salt);
      setE2eeKeys(prev => ({ ...prev, [roomId]: key }));
    } catch (e) {
      console.error('E2EE key derivation failed:', e);
    }
  };

  // ==========================================
  // Message Reactions Logic
  // ==========================================
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !activeRoom) return;

    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const message = messages[msgIndex];
    let reactions: Record<string, string[]> = {};
    
    try {
      reactions = typeof message.reactions === 'string' 
        ? JSON.parse(message.reactions) 
        : (message.reactions || {});
    } catch (e) {
      reactions = {};
    }

    const usersList = reactions[emoji] || [];
    let updatedUsersList;

    if (usersList.includes(user.id)) {
      updatedUsersList = usersList.filter(id => id !== user.id);
    } else {
      updatedUsersList = [...usersList, user.id];
    }

    const updatedReactions = {
      ...reactions,
      [emoji]: updatedUsersList
    };

    if (updatedUsersList.length === 0) {
      delete updatedReactions[emoji];
    }

    try {
      const { data: updatedMsg } = await insforge.database
        .from('messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId)
        .select()
        .single();

      if (updatedMsg) {
        setMessages(prev => prev.map(m => m.id === messageId ? updatedMsg : m));
        const roomChannel = `room:${activeRoom.id}`;
        await insforge.realtime.publish(roomChannel, 'message_updated', updatedMsg);
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    } finally {
      setActiveReactionPickerMessageId(null);
    }
  };

  // ==========================================
  // AI Chat Summarization Logic
  // ==========================================
  const handleGenerateAISummary = async () => {
    if (messages.length === 0) return;
    setSummarizingChat(true);

    try {
      const historyText = messages.slice(-40).map(m => {
        const sender = profiles[m.sender_id]?.display_name || 'Unknown User';
        const content = m.content.startsWith('[E2EE]:') 
          ? (decryptedMessages[m.id] || '🔒 Encrypted message') 
          : m.content;
        return `${sender}: ${content}`;
      }).join('\n');

      const systemPrompt = {
        role: 'system' as const,
        content: 'You are an advanced summarization AI. Analyze the chat history provided and return a concise executive summary in bullet points, highlighting key topics discussed, decisions made, and any action items. Do not repeat usernames redundantly.'
      };

      const prompt = `Here is the chat history to summarize:\n\n${historyText}`;

      let aiResponse;
      try {
        aiResponse = await insforge.ai.chat.completions.create({
          model: 'google/gemma-4-26b-a4b-it:free',
          messages: [systemPrompt, { role: 'user', content: prompt }],
          temperature: 0.5,
          maxTokens: 800
        });
      } catch (err: any) {
        console.warn('Gemma 4 model rate-limited, falling back to openrouter/free:', err);
        aiResponse = await insforge.ai.chat.completions.create({
          model: 'openrouter/free',
          messages: [systemPrompt, { role: 'user', content: prompt }],
          temperature: 0.5,
          maxTokens: 800
        });
      }

      const summary = aiResponse.choices?.[0]?.message?.content || "Could not generate summary.";
      setAiSummary(summary);
      setShowSummaryModal(true);
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
      alert('Error generating summary. Please try again.');
    } finally {
      setSummarizingChat(false);
    }
  };

  // ==========================================
  // Voice Note Recording Logic
  // ==========================================
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        const durationSecs = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
        await uploadVoiceNote(audioBlob, durationSecs);
      };

      recorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          recordingDurationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording voice note:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (!shouldSend) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const uploadVoiceNote = async (audioBlob: Blob, duration: number) => {
    if (!user || !activeRoom) return;
    setUploadingFile(true);

    const uniqueId = Math.random().toString(36).substring(2, 9);
    const storageKey = `chat/${user.id}/${Date.now()}_${uniqueId}_voicenote.webm`;

    try {
      const bucket = insforge.storage.from('chat-attachments');
      const fileObj = new window.File([audioBlob], 'voicenote.webm', { type: audioBlob.type });
      
      const { data, error } = await bucket.upload(storageKey, fileObj);

      if (error) {
        console.error('Failed to upload voice note:', error);
        alert('Voice note upload failed.');
      } else if (data?.url) {
        let content = "Sent a voice note";
        
        const roomKey = e2eeKeys[activeRoom.id];
        if (roomKey) {
          const encrypted = await encryptMessage("Sent a voice note", roomKey);
          content = `[E2EE]:${encrypted.iv}:${encrypted.ciphertext}`;
        }

        const { data: newMsg } = await insforge.database
          .from('messages')
          .insert({
            room_id: activeRoom.id,
            sender_id: user.id,
            content: content,
            attachment_url: data.url,
            attachment_key: data.key,
            attachment_name: `Voice Note:${duration}`,
            attachment_type: 'audio/webm'
          })
          .select()
          .single();

        if (newMsg) {
          setMessages(prev => [...prev, newMsg]);
          const roomChannel = `room:${activeRoom.id}`;
          await insforge.realtime.publish(roomChannel, 'new_message', newMsg);

          const otherMember = Object.values(profiles).find(p => 
            p.id !== user.id && activeRoom.name.includes(p.display_name)
          );
          if (otherMember) {
            await insforge.realtime.publish(`user:${otherMember.id}`, 'new_message_notify', {
              message: newMsg,
              senderName: profiles[user.id]?.display_name || user.profile?.name || user.email
            });
          }
        }
      }
    } catch (err) {
      console.error('Unexpected voice note upload error:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    startPeerConnectionPromiseRef.current = null;
    iceCandidatesQueueRef.current = [];
    isRemoteDescriptionSetRef.current = false;

    setCallState('idle');
    setCallPartner(null);
    setCallRoomId(null);
    setIsMuted(false);
    setIsCamOff(false);
    setIsCallMinimized(false);
  };

  const hangUp = async () => {
    if (callPartnerRef.current && user) {
      try {
        await insforge.realtime.publish(`user:${callPartnerRef.current.id}`, 'call-signal', {
          type: 'call-hangup',
          senderId: user.id,
          roomId: callRoomIdRef.current
        });
      } catch (err) {
        console.error('Failed to send hangup signal:', err);
      }
    }
    cleanupCall();
  };

  const initiateCall = async (type: 'audio' | 'video') => {
    if (!activeRoom || !user) return;
    
    // Find the DM partner
    const otherMember = Object.values(profiles).find(p => 
      p.id !== user.id && activeRoom.name.includes(p.display_name)
    );
    if (!otherMember) {
      alert('Calls can only be made in 1-on-1 direct messages.');
      return;
    }

    setCallState('ringing-outgoing');
    setCallType(type);
    setCallPartner(otherMember);
    setCallRoomId(activeRoom.id);
    setIsMuted(false);
    setIsCamOff(false);

    try {
      await insforge.realtime.publish(`user:${otherMember.id}`, 'call-signal', {
        type: 'call-invite',
        senderId: user.id,
        roomId: activeRoom.id,
        callType: type,
        caller: profiles[user.id] || { id: user.id, display_name: user.profile?.name || user.email }
      });
    } catch (err) {
      console.error('Failed to send call invitation:', err);
      cleanupCall();
    }
  };

  const acceptIncomingCall = async () => {
    if (!callPartnerRef.current || !callRoomIdRef.current || !user) return;

    const targetRoom = rooms.find(r => r.id === callRoomIdRef.current);
    if (targetRoom) {
      setActiveRoom(targetRoom);
    }

    setCallState('connected');
    setIsMuted(false);
    setIsCamOff(false);

    try {
      // 1. Initialize local peer connection and media device streams first
      const pcPromise = startPeerConnection(callPartnerRef.current.id, false);
      await pcPromise;

      // 2. Only accept incoming call signal after everything is fully set up and ready on our side
      await insforge.realtime.publish(`user:${callPartnerRef.current.id}`, 'call-signal', {
        type: 'call-accept',
        senderId: user.id,
        roomId: callRoomIdRef.current
      });
    } catch (err) {
      console.error('Failed to accept incoming call:', err);
      cleanupCall();
    }
  };

  const declineIncomingCall = async () => {
    if (!callPartnerRef.current || !callRoomIdRef.current || !user) return;

    try {
      await insforge.realtime.publish(`user:${callPartnerRef.current.id}`, 'call-signal', {
        type: 'call-decline',
        senderId: user.id,
        roomId: callRoomIdRef.current
      });
    } catch (err) {
      console.error('Failed to send decline signal:', err);
    } finally {
      cleanupCall();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCamOff(!isCamOff);
    }
  };

  const startPeerConnection = (targetUserId: string, isInitiator: boolean): Promise<RTCPeerConnection | null> => {
    if (startPeerConnectionPromiseRef.current) {
      return startPeerConnectionPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const constraints = {
          audio: true,
          video: callTypeRef.current === 'video'
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            insforge.realtime.publish(`user:${targetUserId}`, 'call-signal', {
              type: 'call-ice-candidate',
              senderId: user?.id,
              roomId: callRoomIdRef.current,
              candidate: event.candidate
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            cleanupCall();
          }
        };

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await insforge.realtime.publish(`user:${targetUserId}`, 'call-signal', {
            type: 'call-offer',
            senderId: user?.id,
            roomId: callRoomIdRef.current,
            sdp: offer,
            callType: callTypeRef.current
          });
        }

        return pc;
      } catch (err) {
        console.error('Failed to start WebRTC peer connection:', err);
        cleanupCall();
        alert('Could not access media devices or initialize call connection.');
        return null;
      }
    })();

    startPeerConnectionPromiseRef.current = promise;
    return promise;
  };

  // Initialize Web Crypto derived keys for rooms from passphrases
  useEffect(() => {
    const initKeys = async () => {
      const mapping: Record<string, CryptoKey> = {};
      for (const room of rooms) {
        const pass = localStorage.getItem(`e2ee_pass_${room.id}`);
        if (pass) {
          try {
            const salt = deriveSaltFromRoomId(room.id);
            const key = await deriveKeyFromPassphrase(pass, salt);
            mapping[room.id] = key;
          } catch (e) {
            console.error('Key initialization failed for room', room.id, e);
          }
        }
      }
      setE2eeKeys(mapping);
    };

    if (rooms.length > 0) {
      initKeys();
    }
  }, [rooms]);

  // Request browser notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Async message decryption effect
  useEffect(() => {
    const decryptAll = async () => {
      const newDecrypted: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.content.startsWith('[E2EE]:')) {
          const key = e2eeKeys[msg.room_id];
          if (key) {
            try {
              const parts = msg.content.split(':');
              const iv = parts[1];
              const ciphertext = parts[2];
              const decrypted = await decryptMessage(iv, ciphertext, key);
              newDecrypted[msg.id] = decrypted;
            } catch (e) {
              newDecrypted[msg.id] = '🔒 Decryption failed';
            }
          }
        }
      }
      setDecryptedMessages(newDecrypted);
    };

    decryptAll();
  }, [messages, e2eeKeys]);

  useEffect(() => {
    if (messages.length > 0 || gemmaThinking) {
      scrollToBottom();
    }
  }, [messages, gemmaThinking]);

  // Load profiles mapping
  const loadProfiles = async () => {
    try {
      const { data, error } = await insforge.database
        .from('profiles')
        .select('*');
      if (data) {
        const mapping: Record<string, Profile> = {};
        data.forEach((p: any) => {
          mapping[p.id] = p;
        });
        setProfiles(mapping);
      }
    } catch (e) {
      console.error('Failed to load profiles', e);
    }
  };

  // Find or register the Gemma Bot profile
  const ensureGemmaBot = async () => {
    try {
      const { data: existing } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('display_name', 'Gemma 4 AI')
        .maybeSingle();

      if (existing) {
        return existing;
      }

      // If not exists, sign up the bot
      const botEmail = 'gemma-bot@letsping.ai';
      const botPassword = 'gemma-secure-password-123';
      const { data: signUpData } = await insforge.auth.signUp({
        email: botEmail,
        password: botPassword,
        name: 'Gemma 4 AI'
      });

      if (signUpData?.user) {
        // Update profile display name and status to online
        await insforge.database
          .from('profiles')
          .update({ display_name: 'Gemma 4 AI', status: 'online' })
          .eq('id', signUpData.user.id);
        
        const { data: newProfile } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', signUpData.user.id)
          .single();
        
        return newProfile;
      }
    } catch (e) {
      console.error('Failed to ensure Gemma bot', e);
    }
    return null;
  };

  // Trigger Gemma AI bot reply completion
  const triggerGemmaReply = async (roomId: string, botMember: Profile, messageHistory: Message[]) => {
    try {
      setGemmaThinking(true);

      const historyForAI = messageHistory.slice(-10).map(m => ({
        role: (m.sender_id === user?.id ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content
      }));

      const systemPrompt = {
        role: 'system' as const,
        content: 'You are Gemma 4 AI, a helpful, intelligent assistant integrated into the Lets Ping chat application. Provide concise, friendly, and formatted responses.'
      };

      let aiResponse;
      try {
        aiResponse = await insforge.ai.chat.completions.create({
          model: 'google/gemma-4-26b-a4b-it:free',
          messages: [systemPrompt, ...historyForAI],
          temperature: 0.7,
          maxTokens: 1000
        });
      } catch (err: any) {
        console.warn('Gemma 4 model rate-limited or failed, falling back to openrouter/free:', err);
        aiResponse = await insforge.ai.chat.completions.create({
          model: 'openrouter/free',
          messages: [systemPrompt, ...historyForAI],
          temperature: 0.7,
          maxTokens: 1000
        });
      }

      const replyText = aiResponse.choices?.[0]?.message?.content || "I couldn't generate a response.";

      // Insert AI message into database
      const { data: newMsg } = await insforge.database
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: botMember.id,
          content: replyText
        })
        .select()
        .single();

      if (newMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return prev[0]?.room_id === roomId ? [...prev, newMsg] : prev;
        });
        const roomChannel = `room:${roomId}`;
        await insforge.realtime.publish(roomChannel, 'new_message', newMsg);
      }
    } catch (err) {
      console.error('Error generating Gemma reply:', err);
    } finally {
      setGemmaThinking(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!user) return;

    const initializeApp = async () => {
      setAppLoading(true);
      await loadProfiles();
      const botProfile = await ensureGemmaBot();
      if (botProfile) {
        setProfiles(prev => ({
          ...prev,
          [botProfile.id]: botProfile
        }));
      }

      // Fetch rooms
      try {
        const { data: dbRooms } = await insforge.database
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: true });

        let currentRooms = dbRooms || [];

        // If no rooms exist, create a default Global Lounge room
        if (currentRooms.length === 0) {
          const { data: newRoom } = await insforge.database
            .from('rooms')
            .insert({ name: 'Global Lounge', is_dm: false })
            .select()
            .single();
          if (newRoom) {
            currentRooms = [newRoom];
          }
        }

        setRooms(currentRooms);

        const inputMapping: Record<string, string> = {};
        currentRooms.forEach((r: any) => {
          const pass = localStorage.getItem(`e2ee_pass_${r.id}`);
          if (pass) {
            inputMapping[r.id] = pass;
          }
        });
        setPasscodeInputs(inputMapping);
        
        // Find default or first room
        const globalRoom = currentRooms.find(r => r.name === 'Global Lounge') || currentRooms[0];
        setActiveRoom(globalRoom);
      } catch (e) {
        console.error('Initialization failed', e);
      } finally {
        setAppLoading(false);
      }
    };

    initializeApp();
  }, [user]);

  // Fetch messages and subscribe to active room events
  useEffect(() => {
    if (!activeRoom || !user) return;

    // Ensure the current user is recorded in room_members and fetch room member IDs
    const syncRoomMembers = async () => {
      try {
        await insforge.database
          .from('room_members')
          .upsert({ room_id: activeRoom.id, user_id: user.id });

        const { data } = await insforge.database
          .from('room_members')
          .select('user_id')
          .eq('room_id', activeRoom.id);

        if (data) {
          setActiveRoomMembers(data.map((m: any) => m.user_id));
        }
      } catch (err) {
        console.error('Failed to sync room membership:', err);
      }
    };

    // Fetch message history from DB
    const fetchMessages = async () => {
      const { data, error } = await insforge.database
        .from('messages')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });
      if (data) {
        setMessages(data);
      }
    };

    syncRoomMembers();
    fetchMessages();

    // Fetch existing read receipts
    const fetchReadReceipts = async () => {
      try {
        const { data } = await insforge.database
          .from('read_receipts')
          .select('*')
          .eq('room_id', activeRoom.id);
        if (data) {
          const mapping: Record<string, string> = {};
          data.forEach((r: any) => {
            mapping[r.user_id] = r.last_read_message_id;
          });
          setReadReceipts(mapping);
        }
      } catch (e) {
        console.error('Failed to fetch read receipts', e);
      }
    };

    fetchReadReceipts();

    // Define message handler callback
    const handleNewMessage = (msg: any) => {
      const data = msg.payload || msg;
      if (data && data.room_id === activeRoom.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    };

    const handleMessageUpdated = (msg: any) => {
      const data = msg.payload || msg;
      if (data && data.room_id === activeRoom.id) {
        setMessages(prev => prev.map(m => m.id === data.id ? data : m));
      }
    };

    const handleReadReceiptUpdated = (msg: any) => {
      const data = msg.payload || msg;
      if (data && data.room_id === activeRoom.id) {
        setReadReceipts(prev => ({
          ...prev,
          [data.user_id]: data.last_read_message_id
        }));
      }
    };

    // Register listeners
    insforge.realtime.on('new_message', handleNewMessage);
    insforge.realtime.on('message_updated', handleMessageUpdated);
    insforge.realtime.on('read_receipt_updated', handleReadReceiptUpdated);

    // Setup realtime connection & room subscription
    const connectRealtime = async () => {
      try {
        await insforge.realtime.connect();
        const roomChannel = `room:${activeRoom.id}`;
        await insforge.realtime.subscribe(roomChannel);
      } catch (err) {
        console.error('Realtime room connection error:', err);
      }
    };

    connectRealtime();

    return () => {
      const roomChannel = `room:${activeRoom.id}`;
      insforge.realtime.off('new_message', handleNewMessage);
      insforge.realtime.off('message_updated', handleMessageUpdated);
      insforge.realtime.off('read_receipt_updated', handleReadReceiptUpdated);
      insforge.realtime.unsubscribe(roomChannel);
    };
  }, [activeRoom?.id, user]);

  // Update read receipt when messages change or window visibility changes
  useEffect(() => {
    if (!activeRoom || !user || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    const markAsRead = async () => {
      try {
        await insforge.database
          .from('read_receipts')
          .upsert({
            room_id: activeRoom.id,
            user_id: user.id,
            last_read_message_id: latestMessage.id,
            updated_at: new Date().toISOString()
          });

        // Broadcast read receipt update
        const roomChannel = `room:${activeRoom.id}`;
        await insforge.realtime.publish(roomChannel, 'read_receipt_updated', {
          room_id: activeRoom.id,
          user_id: user.id,
          last_read_message_id: latestMessage.id
        });
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    };

    if (!document.hidden) {
      markAsRead();
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        markAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeRoom?.id, messages.length, user?.id]);

  // Subscribe to global presence channel for online/offline status
  useEffect(() => {
    if (!user) return;

    const handlePresenceJoin = (msg: any) => {
      if (msg.member?.type === 'user') {
        setOnlineUserIds(prev => {
          const updated = new Set(prev);
          updated.add(msg.member.presenceId);
          return updated;
        });
        loadProfiles();
      }
    };

    const handlePresenceLeave = (msg: any) => {
      if (msg.member?.type === 'user') {
        setOnlineUserIds(prev => {
          const updated = new Set(prev);
          updated.delete(msg.member.presenceId);
          return updated;
        });
      }
    };

    insforge.realtime.on('presence:join', handlePresenceJoin);
    insforge.realtime.on('presence:leave', handlePresenceLeave);

    const setupPresence = async () => {
      try {
        const presenceChannel = 'global:presence';
        if (!insforge.realtime.isConnected) {
          await insforge.realtime.connect();
        }
        const response = await insforge.realtime.subscribe(presenceChannel);
        if (response.ok) {
          const members = response.presence.members;
          const userIds = new Set<string>();
          members.forEach((m: any) => {
            if (m.type === 'user') {
              userIds.add(m.presenceId);
            }
          });
          setOnlineUserIds(userIds);
        }
      } catch (err) {
        console.error('Realtime presence error:', err);
      }
    };

    setupPresence();

    return () => {
      insforge.realtime.off('presence:join', handlePresenceJoin);
      insforge.realtime.off('presence:leave', handlePresenceLeave);
      insforge.realtime.unsubscribe('global:presence');
    };
  }, [user?.id]);

  // Subscribe to user-specific channel for WebRTC signaling
  useEffect(() => {
    if (!user) return;

    const userChannel = `user:${user.id}`;

    const handleCallSignal = async (msg: any) => {
      const payload = msg.payload || msg;
      const { type: signalType, senderId, roomId, callType: cType, sdp, candidate, caller } = payload;

      // Ignore signals sent by oneself
      if (senderId === user.id) return;

      console.log('Received calling signal:', signalType, payload);

      switch (signalType) {
        case 'call-invite':
          if (callStateRef.current === 'idle') {
            setCallState('ringing-incoming');
            setCallType(cType);
            setCallPartner(caller);
            setCallRoomId(roomId);
          } else {
            // Busy, decline automatically
            await insforge.realtime.publish(`user:${senderId}`, 'call-signal', {
              type: 'call-decline',
              senderId: user.id,
              roomId: roomId
            });
          }
          break;

        case 'call-accept':
          if (callStateRef.current === 'ringing-outgoing') {
            setCallState('connected');
            await startPeerConnection(senderId, true);
          }
          break;

        case 'call-decline':
          if (callStateRef.current === 'ringing-outgoing') {
            cleanupCall();
            alert('Call was declined or user is busy.');
          }
          break;

        case 'call-offer':
          if (callStateRef.current === 'connected' || callStateRef.current === 'ringing-incoming') {
            setCallState('connected');
            let pc = peerConnectionRef.current;
            if (!pc && startPeerConnectionPromiseRef.current) {
              pc = await startPeerConnectionPromiseRef.current;
            }
            if (!pc) {
              pc = await startPeerConnection(senderId, false);
            }
            if (pc && sdp) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                isRemoteDescriptionSetRef.current = true;
                
                // Flush queued ICE candidates
                for (const cand of iceCandidatesQueueRef.current) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (e) {
                    console.error('Error adding queued ICE candidate:', e);
                  }
                }
                iceCandidatesQueueRef.current = [];

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await insforge.realtime.publish(`user:${senderId}`, 'call-signal', {
                  type: 'call-answer',
                  senderId: user.id,
                  roomId: roomId,
                  sdp: answer
                });
              } catch (e) {
                console.error('Error handling call-offer SDP:', e);
              }
            }
          }
          break;

        case 'call-answer':
          if (sdp) {
            let pc = peerConnectionRef.current;
            if (!pc && startPeerConnectionPromiseRef.current) {
              pc = await startPeerConnectionPromiseRef.current;
            }
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                isRemoteDescriptionSetRef.current = true;

                // Flush queued ICE candidates
                for (const cand of iceCandidatesQueueRef.current) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (e) {
                    console.error('Error adding queued ICE candidate:', e);
                  }
                }
                iceCandidatesQueueRef.current = [];
              } catch (e) {
                console.error('Error setting remote description from call-answer:', e);
              }
            }
          }
          break;

        case 'call-ice-candidate':
          if (candidate) {
            const pc = peerConnectionRef.current;
            if (pc && isRemoteDescriptionSetRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error('Error adding received ice candidate:', e);
              }
            } else {
              iceCandidatesQueueRef.current.push(candidate);
            }
          }
          break;

        case 'call-hangup':
          cleanupCall();
          break;

        default:
          break;
      }
    };

    const handleMessageNotify = (msg: any) => {
      const payload = msg.payload || msg;
      const { message: notifiedMsg, senderName } = payload;
      
      if (notifiedMsg.room_id !== activeRoomRef.current?.id || document.hidden) {
        if (Notification.permission === 'granted') {
          let notifyText = notifiedMsg.content;
          if (notifyText.startsWith('[E2EE]:')) {
            notifyText = '🔒 Encrypted message';
          }
          
          const notification = new Notification(`New message from ${senderName}`, {
            body: notifyText
          });

          notification.onclick = () => {
            window.focus();
            const targetRoom = rooms.find(r => r.id === notifiedMsg.room_id);
            if (targetRoom) {
              setActiveRoom(targetRoom);
            }
          };
        }
      }
    };

    const setupSignaling = async () => {
      try {
        if (!insforge.realtime.isConnected) {
          await insforge.realtime.connect();
        }
        await insforge.realtime.subscribe(userChannel);
        insforge.realtime.on('call-signal', handleCallSignal);
        insforge.realtime.on('new_message_notify', handleMessageNotify);
      } catch (err) {
        console.error('Signaling subscription error:', err);
      }
    };

    setupSignaling();

    return () => {
      insforge.realtime.off('call-signal', handleCallSignal);
      insforge.realtime.off('new_message_notify', handleMessageNotify);
      insforge.realtime.unsubscribe(userChannel);
    };
  }, [user?.id, rooms]);

  // Clean up if tab closed while in call
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (callStateRef.current !== 'idle') {
        if (callPartnerRef.current && user) {
          insforge.realtime.publish(`user:${callPartnerRef.current.id}`, 'call-signal', {
            type: 'call-hangup',
            senderId: user.id,
            roomId: callRoomIdRef.current
          });
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  // File upload change handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingFile(true);
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `chat/${user.id}/${Date.now()}_${uniqueId}_${sanitizedName}`;

    try {
      const bucket = insforge.storage.from('chat-attachments');
      const { data, error } = await bucket.upload(storageKey, file);

      if (error) {
        console.error('Failed to upload file:', error);
        alert('File upload failed. Please try again.');
      } else if (data?.url) {
        setSelectedAttachment({
          url: data.url,
          key: data.key,
          name: file.name,
          type: file.type
        });
      }
    } catch (err) {
      console.error('Unexpected file upload error:', err);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove uploaded attachment
  const handleRemoveAttachment = async () => {
    if (!selectedAttachment) return;
    const { key } = selectedAttachment;
    setSelectedAttachment(null);
    try {
      const bucket = insforge.storage.from('chat-attachments');
      await bucket.remove(key);
    } catch (err) {
      console.error('Failed to remove storage object:', err);
    }
  };

  // Post message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !user) return;

    const text = newMessageText.trim();
    if (!text && !selectedAttachment) return;

    setNewMessageText('');
    const attachment = selectedAttachment;
    setSelectedAttachment(null);

    let contentToSend = text;
    
    // Apply E2EE encryption if passphrase is configured for the room
    const roomKey = e2eeKeys[activeRoom.id];
    if (roomKey && text) {
      try {
        const encrypted = await encryptMessage(text, roomKey);
        contentToSend = `[E2EE]:${encrypted.iv}:${encrypted.ciphertext}`;
      } catch (err) {
        console.error('Failed to encrypt outgoing message:', err);
      }
    }

    try {
      const { data: newMsg, error } = await insforge.database
        .from('messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: user.id,
          content: contentToSend,
          attachment_url: attachment?.url || null,
          attachment_key: attachment?.key || null,
          attachment_name: attachment?.name || null,
          attachment_type: attachment?.type || null
        })
        .select()
        .single();

      if (newMsg) {
        const updatedMessages = [...messages, newMsg];
        setMessages(updatedMessages);
        const roomChannel = `room:${activeRoom.id}`;
        await insforge.realtime.publish(roomChannel, 'new_message', newMsg);

        // Notify DM recipient
        const otherMember = Object.values(profiles).find(p => 
          p.id !== user.id && activeRoom.name.includes(p.display_name)
        );
        if (otherMember) {
          await insforge.realtime.publish(`user:${otherMember.id}`, 'new_message_notify', {
            message: newMsg,
            senderName: profiles[user.id]?.display_name || user.profile?.name || user.email
          });
        }

        // Check if DM with Gemma 4 AI bot
        const isGemmaRoom = activeRoom.is_dm && otherMember?.display_name === 'Gemma 4 AI';
        if (isGemmaRoom && otherMember) {
          triggerGemmaReply(activeRoom.id, otherMember, updatedMessages);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Create room handler
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !user) return;

    const name = newRoomName.trim();
    setNewRoomName('');
    setShowNewRoomModal(false);

    try {
      const { data: newRoom } = await insforge.database
        .from('rooms')
        .insert({ name, is_dm: false })
        .select()
        .single();

      if (newRoom) {
        // Automatically add creator to room_members
        await insforge.database
          .from('room_members')
          .insert({ room_id: newRoom.id, user_id: user.id });

        setRooms(prev => [...prev, newRoom]);
        setActiveRoom(newRoom);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  // Create or switch to DM room
  const handleStartDM = async (otherUser: Profile) => {
    if (!user) return;

    try {
      const { data: userRooms } = await insforge.database
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id);

      const { data: otherUserRooms } = await insforge.database
        .from('room_members')
        .select('room_id')
        .eq('user_id', otherUser.id);

      const userRoomIds = userRooms?.map((r: any) => r.room_id) || [];
      const otherRoomIds = otherUserRooms?.map((r: any) => r.room_id) || [];
      const commonRoomIds = userRoomIds.filter(id => otherRoomIds.includes(id));

      if (commonRoomIds.length > 0) {
        const { data: existingDMRooms } = await insforge.database
          .from('rooms')
          .select('*')
          .eq('is_dm', true)
          .in('id', commonRoomIds)
          .order('created_at', { ascending: true });

        if (existingDMRooms && existingDMRooms.length > 0) {
          setActiveRoom(existingDMRooms[0]);
          return;
        }
      }

      const { data: newRoom } = await insforge.database
        .from('rooms')
        .insert({ name: `${user.profile?.name || 'User'} & ${otherUser.display_name}`, is_dm: true })
        .select()
        .single();

      if (newRoom) {
        await insforge.database
          .from('room_members')
          .insert([
            { room_id: newRoom.id, user_id: user.id },
            { room_id: newRoom.id, user_id: otherUser.id }
          ]);

        setRooms(prev => [...prev, newRoom]);
        setActiveRoom(newRoom);
      }
    } catch (err) {
      console.error('Failed to start DM room:', err);
    }
  };

  // Edit user display name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileName.trim() || !user) return;
    setEditingProfile(true);

    try {
      const { data } = await insforge.auth.setProfile({
        name: editProfileName.trim()
      });
      if (data) {
        await loadProfiles();
        setShowProfileModal(false);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setEditingProfile(false);
    }
  };

  // Render initials avatar helper
  const renderAvatar = (name: string, isOnline: boolean, size = 'w-10 h-10', textStyle = 'text-sm font-semibold') => {
    const initials = name ? name.slice(0, 2).toUpperCase() : '??';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;

    return (
      <div className="relative flex-shrink-0">
        <div 
          className={`${size} rounded-full flex items-center justify-center text-white border border-white/10`}
          style={{ backgroundColor: color }}
        >
          <span className={textStyle}>{initials}</span>
        </div>
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950 ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
      </div>
    );
  };

  if (loading || appLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400">
        <div className="flex flex-col items-center gap-4 animate-fade">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium">Synchronizing environment...</p>
        </div>
      </div>
    );
  }

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true;
    return msg.content?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false;
  });

  // Group rooms
  const groupChannels = rooms.filter(r => !r.is_dm);
  const dmChannels = rooms.filter(r => r.is_dm);

  // List users for direct messaging (excluding self)
  const dmUserList = Object.values(profiles).filter(p => p.id !== user.id);

  // Filter channels and users based on sidebar search query
  const filteredGroupChannels = groupChannels.filter(room =>
    room.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const filteredDmUserList = dmUserList.filter(otherUser =>
    otherUser.display_name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  // Helper to render attachments
  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;

    const isImage = msg.attachment_type?.startsWith('image/') || 
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_name || '');

    const isAudio = msg.attachment_type?.startsWith('audio/') || 
                    /\.(webm|mp3|wav|ogg|m4a)$/i.test(msg.attachment_name || '');

    if (isImage) {
      return (
        <div className="message-attachment image-attachment">
          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
            <img 
              src={msg.attachment_url} 
              alt={msg.attachment_name || 'Attachment'} 
              className="attachment-img"
            />
          </a>
        </div>
      );
    }

    if (isAudio) {
      let defaultDuration = 0;
      if (msg.attachment_name && msg.attachment_name.startsWith('Voice Note:')) {
        const durationSecs = msg.attachment_name.split(':')[1];
        if (durationSecs) {
          defaultDuration = parseInt(durationSecs, 10) || 0;
        }
      }

      return (
        <div className="message-attachment audio-attachment mt-2">
          <AudioPlayer src={msg.attachment_url || ''} defaultDuration={defaultDuration} />
        </div>
      );
    }

    return (
      <div className="message-attachment file-attachment">
        <a 
          href={msg.attachment_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="file-attachment-card"
        >
          <div className="file-attachment-icon">
            <Paperclip className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="file-attachment-info">
            <span className="file-attachment-name">{msg.attachment_name || 'Attachment'}</span>
            <span className="file-attachment-size">Open / Download</span>
          </div>
        </a>
      </div>
    );
  };

  // Get active room title
  const getRoomTitle = () => {
    if (!activeRoom) return '';
    if (activeRoom.is_dm) {
      const otherMember = Object.values(profiles).find(p => 
        p.id !== user.id && activeRoom.name.includes(p.display_name)
      );
      return otherMember ? otherMember.display_name : activeRoom.name;
    }
    return activeRoom.name;
  };

  // Gather profiles of users active in this room
  const activeMemberIds = new Set<string>();
  if (user) activeMemberIds.add(user.id);
  messages.forEach(m => activeMemberIds.add(m.sender_id));
  const roomMembers = Array.from(activeMemberIds)
    .map(id => profiles[id])
    .filter(Boolean);

  // Shared attachments in this room
  const sharedFiles = messages.filter(m => m.attachment_url);

  return (
    <>
      <div className="app-layout">
      {/* 1. Narrow Leftmost Tab Sidebar */}
      <aside className="tab-sidebar">
        <div className="tab-sidebar-logo">
          <MessageSquare className="w-6 h-6 text-indigo-600 animate-pulse-slow" />
        </div>
        
        <div className="tab-sidebar-actions-mid">
          <button 
            className="tab-sidebar-action active"
            title="Chats"
          >
            <Compass className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowNewRoomModal(true)}
            className="tab-sidebar-action btn-add-channel"
            title="Create Channel"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="tab-sidebar-actions-bottom">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="tab-sidebar-action"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => router.push('/admin')}
            className="tab-sidebar-action text-indigo-500 hover:text-indigo-400"
            title="Admin Analytics"
          >
            <BarChart3 className="w-5 h-5" />
          </button>

          <button 
            onClick={() => {
              setEditProfileName(profiles[user.id]?.display_name || user.profile?.name || '');
              setShowProfileModal(true);
            }}
            className="tab-sidebar-avatar-trigger"
            title="Profile Settings"
          >
            {renderAvatar(profiles[user.id]?.display_name || user.profile?.name || user.email, true, 'w-8 h-8', 'text-xs font-semibold')}
          </button>

          <button 
            onClick={signOut}
            className="tab-sidebar-action btn-signout"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* 2. Middle-Left Chats Sidebar */}
      {mobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar-container ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
            Lets Ping <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-pulse-slow" />
          </h1>
        </div>

        <div className="sidebar-search-container">
          <div className="input-container search-container">
            <Search className="left-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Search rooms or users..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-nav-scroll">
          {/* Channels */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <p className="sidebar-section-title">Channels</p>
              <button 
                onClick={() => setShowNewRoomModal(true)}
                className="sidebar-section-add-btn"
                title="Create Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="sidebar-list">
              {filteredGroupChannels.map(room => (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoom(room);
                    setMobileSidebarOpen(false);
                  }}
                  className={`sidebar-item ${activeRoom?.id === room.id ? 'active' : ''}`}
                >
                  <Hash className="w-4 h-4 flex-shrink-0 opacity-60" />
                  <span className="truncate">{room.name}</span>
                </button>
              ))}
              {filteredGroupChannels.length === 0 && (
                <p className="text-xs text-zinc-500 italic px-3 py-1">No channels found</p>
              )}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <p className="sidebar-section-title">Direct Messages</p>
            </div>
            
            <div className="sidebar-list">
              {filteredDmUserList.map(otherUser => {
                const isOnline = otherUser.status === 'online' || onlineUserIds.has(otherUser.id);
                const dmRoom = dmChannels.find(r => r.name.includes(otherUser.display_name));
                const isActive = activeRoom?.id === dmRoom?.id;

                return (
                  <button
                    key={otherUser.id}
                    onClick={() => {
                      handleStartDM(otherUser);
                      setMobileSidebarOpen(false);
                    }}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="sidebar-avatar-wrapper">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {otherUser.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-zinc-950 ${
                        isOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`} />
                    </div>
                    <span className="truncate">{otherUser.display_name}</span>
                  </button>
                );
              })}

              {filteredDmUserList.length === 0 && (
                <p className="text-xs text-zinc-500 italic px-3 py-1">
                  {sidebarSearch ? 'No matching users found.' : 'No other users online yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Central Chat Pane Card */}
      <main className="chat-main-card">
        {activeRoom ? (
          <div className="chat-card-inner">
            {/* Chat Header */}
            <div className="chat-header">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                  className="chat-header-btn md:hidden flex"
                  title="Toggle Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="chat-header-info">
                  <h2 className="chat-header-title">
                    {activeRoom.is_dm ? <User className="w-4 h-4 text-indigo-600" /> : <Hash className="w-4 h-4 text-indigo-600" />}
                    {getRoomTitle()}
                  </h2>
                  <p className="chat-header-subtitle">
                    {activeRoom.is_dm 
                      ? (() => {
                          const otherMember = Object.values(profiles).find(p => p.id !== user.id && activeRoom.name.includes(p.display_name));
                          const isMemberOnline = (otherMember?.status === 'online' || onlineUserIds.has(otherMember?.id || ''));
                          return isMemberOnline ? 'Active Now' : 'Offline';
                        })()
                      : `${roomMembers.length} active in this channel`
                    }
                  </p>
                </div>
              </div>

              {/* Header Action Elements */}
              <div className="chat-header-actions">
                {activeRoom.is_dm && (
                  <>
                    <button
                      onClick={() => initiateCall('audio')}
                      className="header-call-btn"
                      title="Start Audio Call"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => initiateCall('video')}
                      className="header-call-btn"
                      title="Start Video Call"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="input-container search-container max-w-[150px] sm:max-w-[220px]">
                  <Search className="left-icon" />
                  <input
                    type="text"
                    className="input-field py-1.5 text-xs"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`chat-header-btn ${showDetails ? 'active' : ''}`}
                  title="Toggle details panel"
                >
                  <Info className="w-5 h-5" />
                </button>

                <button 
                  onClick={signOut}
                  className="chat-header-btn text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Feed */}
            <div className="chat-messages">
              {filteredMessages.map((msg, index) => {
                const isMe = msg.sender_id === user.id;
                const senderProfile = profiles[msg.sender_id];
                const senderName = senderProfile ? senderProfile.display_name : 'Unknown User';
                const isOnline = (senderProfile?.status === 'online' || onlineUserIds.has(msg.sender_id));
                const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div 
                    key={msg.id} 
                    className={`message-wrapper animate-message ${isMe ? 'me' : ''}`}
                  >
                    {!isMe && renderAvatar(senderName, isOnline, 'w-8 h-8', 'text-xs font-semibold')}
                    <div className="message-bubble-container">
                      <div className={`message-meta ${isMe ? 'me' : ''}`}>
                        <span className="message-sender">{isMe ? 'You' : senderName}</span>
                        <span className="message-time">
                          {timeString}
                          {isMe && (
                            (() => {
                              let isRead = false;
                              if (activeRoom.is_dm) {
                                const otherMemberId = activeRoomMembers.find(id => id !== user.id);
                                if (otherMemberId) {
                                  const lastReadId = readReceipts[otherMemberId];
                                  if (lastReadId) {
                                    if (lastReadId === msg.id) {
                                      isRead = true;
                                    } else {
                                      const lastReadIndex = messages.findIndex(m => m.id === lastReadId);
                                      const msgIndex = messages.findIndex(m => m.id === msg.id);
                                      isRead = msgIndex !== -1 && lastReadIndex !== -1 && msgIndex <= lastReadIndex;
                                    }
                                  }
                                }
                              } else {
                                // Group chat read receipts: read by all other members
                                const otherMemberIds = activeRoomMembers.filter(id => id !== user.id);
                                if (otherMemberIds.length > 0) {
                                  isRead = otherMemberIds.every(memberId => {
                                    const lastReadId = readReceipts[memberId];
                                    if (!lastReadId) return false;
                                    if (lastReadId === msg.id) return true;
                                    const lastReadIndex = messages.findIndex(m => m.id === lastReadId);
                                    const msgIndex = messages.findIndex(m => m.id === msg.id);
                                    return msgIndex !== -1 && lastReadIndex !== -1 && msgIndex <= lastReadIndex;
                                  });
                                }
                              }

                              return (
                                <span className="message-status-receipt" title={isRead ? "Read" : "Delivered"}>
                                  {isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 read-blue" />
                                  ) : (
                                    <CheckCheck className="w-3.5 h-3.5 sent-grey" />
                                  )}
                                </span>
                              );
                            })()
                          )}
                        </span>
                      </div>
                      
                      <div className={`message-bubble ${isMe ? 'me' : 'other'} ${!msg.content && msg.attachment_url ? 'attachment-only' : ''}`} style={{ position: 'relative' }}>
                        {msg.content && (
                          <p style={{ margin: 0 }}>
                            {msg.content.startsWith('[E2EE]:') ? (
                              decryptedMessages[msg.id] ? (
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="text-zinc-955 dark:text-zinc-50">{decryptedMessages[msg.id]}</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 italic">
                                  <Lock className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                                  Encrypted message (Set passcode in Details to decrypt)
                                </span>
                              )
                            ) : (
                              msg.content
                            )}
                          </p>
                        )}
                        {msg.attachment_url && renderAttachment(msg)}
                      </div>

                      {/* Render Reactions list */}
                      {(() => {
                        let reactions: Record<string, string[]> = {};
                        try {
                          reactions = typeof msg.reactions === 'string' 
                            ? JSON.parse(msg.reactions) 
                            : (msg.reactions || {});
                        } catch (e) {
                          reactions = {};
                        }
                        
                        if (Object.keys(reactions).length === 0) return null;
                        
                        return (
                          <div className="message-reactions-list">
                            {Object.entries(reactions).map(([emoji, userIds]) => {
                              const reacted = userIds.includes(user.id);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  className={`reaction-badge ${reacted ? 'active' : ''}`}
                                  title={`Reacted by ${userIds.length} users`}
                                >
                                  <span>{emoji}</span>
                                  <span>{userIds.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Reactions Picker Trigger Button */}
                    <button 
                      type="button"
                      onClick={() => setActiveReactionPickerMessageId(activeReactionPickerMessageId === msg.id ? null : msg.id)}
                      className="reaction-picker-trigger"
                      title="React to message"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {/* Reactions Picker Menu */}
                    {activeReactionPickerMessageId === msg.id && (
                      <div className="reaction-picker-menu">
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                          <button 
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className="reaction-emoji-btn"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 py-20">
                  <MessageSquare className="w-12 h-12 stroke-[1.5] mb-3 text-zinc-300 dark:text-zinc-700" />
                  <p className="text-sm font-medium">
                    {searchQuery ? 'No matching messages found.' : 'No messages in this chat yet. Say hello!'}
                  </p>
                </div>
              )}
              {gemmaThinking && (
                <div className="message-wrapper animate-message">
                  {renderAvatar('Gemma 4 AI', true, 'w-8 h-8', 'text-xs font-semibold')}
                  <div className="message-bubble-container">
                    <div className="message-meta">
                      <span className="message-sender">Gemma 4 AI</span>
                    </div>
                    <div className="message-bubble other flex items-center gap-1.5 py-2.5">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      <span className="text-xs text-zinc-500 font-medium">Gemma is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Message Input Composer */}
            <form onSubmit={handleSendMessage} className="chat-composer">
              {/* Attachment Preview Box */}
              {selectedAttachment && (
                <div className="attachment-preview-container">
                  {selectedAttachment.type.startsWith('image/') ? (
                    <img 
                      src={selectedAttachment.url} 
                      alt={selectedAttachment.name} 
                      className="attachment-preview-thumb" 
                    />
                  ) : (
                    <div className="attachment-preview-file">
                      <FileIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                  )}
                  <div className="attachment-preview-details">
                    <span className="attachment-preview-name">{selectedAttachment.name}</span>
                    <span className="attachment-preview-status">Ready to send</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleRemoveAttachment} 
                    className="attachment-preview-remove"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isRecording ? (
                <div className="composer-recording-panel">
                  <div className="flex items-center gap-3">
                    <span className="recording-dot" />
                    <span className="recording-timer">{formatDuration(recordingDuration)}</span>
                    <div className="recording-wave-visualizer">
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                      <span className="wave-bar" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => stopRecording(false)} 
                      className="composer-record-cancel-btn"
                      title="Discard"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => stopRecording(true)} 
                      className="composer-record-send-btn"
                      title="Send Voice Note"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="composer-input-wrapper">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="composer-attach-btn"
                    title="Attach file or image"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="composer-attach-btn text-zinc-500 hover:text-indigo-600"
                    title="Record Voice Note"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    className="composer-input"
                    placeholder={uploadingFile ? "Uploading file..." : `Send message to ${getRoomTitle()}...`}
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    disabled={uploadingFile}
                  />
                  <button 
                    type="submit" 
                    disabled={uploadingFile || (!newMessageText.trim() && !selectedAttachment)}
                    className="composer-send-btn"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Mobile Header when no active room */}
            <div className="chat-header md:hidden flex justify-between items-center w-full">
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="chat-header-btn flex"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Lets Ping</h2>
              <button 
                onClick={signOut}
                className="chat-header-btn text-red-500"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 p-6 text-center">
              <MessageSquare className="w-16 h-16 stroke-[1] mb-4 text-zinc-300 dark:text-zinc-700" />
              <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Select a room to start talking</h3>
              <p className="text-sm text-zinc-500 mt-1">Choose a channel or user profile from the sidebar.</p>
              <button 
                onClick={() => setMobileSidebarOpen(true)}
                className="btn-primary mt-4 md:hidden block"
              >
                Open Chats List
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4. Collapsible Rightmost Details Panel */}
      {showDetails && activeRoom && (
        <aside className="details-sidebar animate-fade">
          <div className="details-sidebar-header">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Details</h3>
            <button 
              onClick={() => setShowDetails(false)}
              className="details-sidebar-close"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="details-sidebar-content">
            {/* Card Preview */}
            <div className="details-preview-card">
              <div className="details-preview-avatar">
                {activeRoom.is_dm ? (
                  <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold">
                    {getRoomTitle().slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
                    #
                  </div>
                )}
              </div>
              <h4 className="details-preview-name">{getRoomTitle()}</h4>
              <p className="details-preview-desc">
                {activeRoom.is_dm 
                  ? "Direct Message Conversation" 
                  : `Public Channel • ${roomMembers.length} active members`
                }
              </p>
            </div>

            {/* Room Members Section */}
            <div className="details-section">
              <h5 className="details-section-title">Members ({roomMembers.length})</h5>
              <div className="details-members-list">
                {roomMembers.map(member => {
                  const isOnline = member.status === 'online' || onlineUserIds.has(member.id);
                  return (
                    <div key={member.id} className="details-member-item">
                      {renderAvatar(member.display_name, isOnline, 'w-7 h-7', 'text-[10px] font-bold')}
                      <div className="details-member-info">
                        <span className="details-member-name">
                          {member.display_name} {member.id === user.id && <span className="text-[10px] text-zinc-400 font-normal ml-1">(You)</span>}
                        </span>
                        <span className="details-member-status">
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Insights & Summarization Section */}
            <div className="details-section">
              <h5 className="details-section-title flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-indigo-500" /> AI Insights
              </h5>
              <button
                onClick={handleGenerateAISummary}
                disabled={summarizingChat || messages.length === 0}
                className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
              >
                {summarizingChat ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing chat...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Summarize Chat
                  </>
                )}
              </button>
            </div>

            {/* E2EE Passcode Section */}
            {activeRoom.is_dm && (
              <div className="details-section">
                <h5 className="details-section-title flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
                  <Lock className="w-4 h-4 text-emerald-500" /> End-to-End Encryption
                </h5>
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="password"
                    className="input-field py-1 text-xs"
                    placeholder="Enter Shared DM Passcode..."
                    value={passcodeInputs[activeRoom.id] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPasscodeInputs(prev => ({ ...prev, [activeRoom.id]: val }));
                      handleSetPassphrase(activeRoom.id, val);
                    }}
                  />
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Derived symmetric AES-GCM keys encrypt all message data locally. Ensure both users enter the exact same passcode.
                  </p>
                </div>
              </div>
            )}

            {/* Shared Attachments Section */}
            <div className="details-section">
              <h5 className="details-section-title">Shared Files ({sharedFiles.length})</h5>
              {sharedFiles.length > 0 ? (
                <div className="details-files-list">
                  {sharedFiles.map(file => {
                    const isImage = file.attachment_type?.startsWith('image/') || 
                                    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.attachment_name || '');
                    
                    return (
                      <div key={file.id} className="details-file-item">
                        {isImage ? (
                          <div className="details-file-preview-thumb">
                            <img src={file.attachment_url || ''} alt={file.attachment_name || 'preview'} />
                          </div>
                        ) : (
                          <div className="details-file-preview-icon">
                            <FileIcon className="w-4 h-4 text-indigo-500" />
                          </div>
                        )}
                        <div className="details-file-info">
                          <span className="details-file-name" title={file.attachment_name || 'Shared File'}>
                            {file.attachment_name || 'Shared File'}
                          </span>
                          <span className="details-file-meta">
                            {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <a 
                          href={file.attachment_url || ''} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="details-file-download"
                          title="Open or Download"
                        >
                          <Download className="w-4 h-4 text-zinc-500 hover:text-indigo-600" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="details-files-empty">
                  <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700 stroke-[1.5]" />
                  <p className="text-xs text-zinc-500 mt-2">No attachments shared yet</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-card animate-message">
            <h3 className="modal-title">Create a Channel</h3>
            <p className="modal-description">Channels are public spaces where everyone can read and send messages.</p>
            
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label className="form-label">Channel Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. general-chat"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRoomModal(false);
                    setNewRoomName('');
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="btn-primary"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay animate-fade">
          <div className="modal-card animate-message">
            <h3 className="modal-title">Profile Settings</h3>
            <p className="modal-description">Update your public display name shown in conversations.</p>
            
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  placeholder="e.g. John Doe"
                  autoFocus
                  disabled={editingProfile}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    setEditProfileName('');
                  }}
                  className="btn-cancel"
                  disabled={editingProfile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editProfileName.trim() || editingProfile}
                  className="btn-primary"
                >
                  {editingProfile ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* WebRTC Call Overlay */}
      {(() => {
        if (callState === 'idle' || !callPartner) return null;

        const partnerName = callPartner.display_name || 'Unknown User';
        const partnerInitials = partnerName.slice(0, 2).toUpperCase();

        return (
          <div className={`call-overlay-container ${isCallMinimized ? 'minimized' : ''}`}>
            <div className="call-card">
              {/* Minimize/Maximize button */}
              <button 
                onClick={() => setIsCallMinimized(!isCallMinimized)} 
                className="call-minimize-btn"
                title={isCallMinimized ? "Expand Call" : "Minimize Call"}
              >
                {isCallMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              {callState === 'connected' && callType === 'video' && (
                <>
                  {/* Remote Fullscreen Video */}
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="remote-video-full"
                  />
                  {/* Local Inset Video (PIP) */}
                  {!isCamOff && (
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="local-video-inset"
                    />
                  )}
                </>
              )}

              {/* Audio call or Ringing screen (Show avatar and status) */}
              {(callState !== 'connected' || callType === 'audio' || (callType === 'video' && !remoteVideoRef.current?.srcObject)) && (
                <div className="call-avatar-placeholder">
                  <div className={`call-avatar-circle ${callState.startsWith('ringing') ? 'ringing' : ''}`}>
                    {partnerInitials}
                  </div>
                  <div>
                    <p className="call-status-label">
                      {callState === 'ringing-outgoing' && 'Calling...'}
                      {callState === 'ringing-incoming' && 'Incoming Call...'}
                      {callState === 'connected' && 'Call Connected'}
                    </p>
                    <h3 className="call-partner-name">{partnerName}</h3>
                    {callState === 'connected' && callType === 'audio' && (
                      <p className="text-zinc-400 text-xs mt-2">Audio Call in progress</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Call controls */}
            <div className="call-controls-bar">
              {callState === 'connected' && (
                <>
                  {/* Mute Button */}
                  <button 
                    onClick={toggleMute} 
                    className={`call-btn ${isMuted ? 'active' : ''}`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Camera Button (Only for Video Call) */}
                  {callType === 'video' && (
                    <button 
                      onClick={toggleCamera} 
                      className={`call-btn ${isCamOff ? 'active' : ''}`}
                      title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                      {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}
                </>
              )}

              {callState === 'ringing-incoming' ? (
                <>
                  {/* Accept Call */}
                  <button 
                    onClick={acceptIncomingCall} 
                    className="call-btn answer"
                    title="Answer Call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>

                  {/* Decline Call */}
                  <button 
                    onClick={declineIncomingCall} 
                    className="call-btn hangup"
                    title="Decline Call"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </>
              ) : (
                /* Hangup for outgoing ringing or connected call */
                <button 
                  onClick={hangUp} 
                  className="call-btn hangup"
                  title="Hang Up"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* AI Summarization Result Modal */}
      {showSummaryModal && (
        <div className="modal-overlay animate-fade" style={{ zIndex: 300 }}>
          <div className="modal-card animate-message max-w-lg bg-zinc-950/80 border border-white/10 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="modal-title flex items-center gap-1.5 text-zinc-900 dark:text-white">
                <Sparkles className="w-5 h-5 text-indigo-500" /> AI Conversation Summary
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSummaryModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="modal-description text-zinc-400 text-xs">
              Based on the last 40 messages in {getRoomTitle()}:
            </p>

            <div className="ai-summary-text my-4 text-zinc-850 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium">
              {aiSummary}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  if (aiSummary) {
                    navigator.clipboard.writeText(aiSummary);
                    alert('Copied summary to clipboard!');
                  }
                }}
                className="btn-cancel text-zinc-300 hover:text-white"
              >
                Copy to Clipboard
              </button>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// Custom Audio Player for Voice Notes
// ==========================================
function AudioPlayer({ src, defaultDuration = 0 }: { src: string; defaultDuration?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(defaultDuration || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(defaultDuration || 0);
  }, [src, defaultDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    
    const resolveDuration = () => {
      if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      } else if (audio.duration === Infinity) {
        audio.currentTime = 1e9;
        const onTimeUpdate = () => {
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', onTimeUpdate);
          if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
        };
        audio.addEventListener('timeupdate', onTimeUpdate);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', resolveDuration);
    audio.addEventListener('durationchange', resolveDuration);
    audio.addEventListener('ended', handleEnded);

    if (audio.readyState >= 1) {
      resolveDuration();
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', resolveDuration);
      audio.removeEventListener('durationchange', resolveDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="voice-note-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button 
        type="button" 
        onClick={togglePlay} 
        className="voice-note-play-btn"
      >
        {isPlaying ? (
          <div className="pause-icon" />
        ) : (
          <div className="play-icon" />
        )}
      </button>
      <div className="voice-note-scrubber-container">
        <input 
          type="range" 
          min={0} 
          max={duration || 100} 
          value={currentTime} 
          onChange={handleScrub}
          className="voice-note-scrubber"
        />
        <div className="voice-note-time-info">
          <span>{formatTime(Math.floor(currentTime))}</span>
          <span>{formatTime(Math.floor(duration || 0))}</span>
        </div>
      </div>
    </div>
  );
}
