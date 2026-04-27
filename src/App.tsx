import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
// import { io, Socket } from 'socket.io-client';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User, 
  MessageCircle, 
  Send, 
  MoreHorizontal, 
  Share2, 
  Flag, 
  UserMinus,
  X,
  Plus,
  Video,
  VideoOff,
  Image,
  MessageSquare,
  Calendar,
  ArrowRight,
  Settings,
  Edit, 
  Edit3,
  LogOut,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Users,
  UserPlus,
  Eye,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Upload,
  Bookmark,
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  AlertTriangle,
  Info,
  ExternalLink,
  Zap,
  BadgeCheck,
  XCircle,
  Ban,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldOff,
  Loader2,
  Lock,
  Shield,
  Globe,
  Database,
  HelpCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  Languages,
  HardDrive,
  Trash2,
  Megaphone,
  Paperclip,
  Smile,
  Mic2,
  Play,
  Pause,
  Download,
  File,
  Sticker,
  Pin,
  Forward,
  Copy,
  Reply,
  Repeat2,
  SmilePlus,
  Filter,
  MapPin,
  BarChart2,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Monitor,
  MonitorUp,
  Hand,
  Crown,
  UserX,
  Music,
  Gift,
  Clock,
  Archive,
  ArrowLeft,
  Link,
  QrCode,
  Sparkles,
  RefreshCw,
  Radio,
  Palette,
  TrendingUp,
  ClipboardList,
  Key,
  List,
  Package,
  Presentation,
  Type as TypeIcon,
  Eraser,
  MousePointer2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp, 
  getDoc, 
  getDocs,
  setDoc,
  increment,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove,
  limit,
  Timestamp,
  getDocFromServer,
  deleteField
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, signInWithCredential, 
  FacebookAuthProvider,
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword, sendEmailVerification,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from './firebase';
import { translations } from './translations';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- UTILS ---
const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

async function moderateMessage(text: string): Promise<{ allowed: boolean, warning?: string }> {
  // 1. Quick local check for common bad words (Pre-filtering)
  const badWords = [
    'شتيمة', 'سب', 'قذف', 'اهانة', // Arabic placeholders
    'badword1', 'badword2', 'offensive' // English placeholders
  ];
  
  const lowerText = text.toLowerCase();
  if (badWords.some(word => lowerText.includes(word))) {
    return { allowed: false, warning: "تم حظر الرسالة فوراً لاحتوائها على لغة غير لائقة." };
  }

  // 2. AI Moderation for semantic analysis
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a strict community moderator. Analyze the following message for hate speech, abuse, sexual harassment, bullying, or harmful content. 
      Return a JSON object with "allowed" (boolean) and "warning" (string, a polite but firm warning in Arabic if not allowed).
      If the message is neutral or positive, return "allowed": true.
      Message: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            allowed: { type: Type.BOOLEAN },
            warning: { type: Type.STRING }
          },
          required: ["allowed"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Moderation error:", safeJsonStringify(error));
    // If AI fails, we allow it (fail-open) to keep the app responsive, 
    // unless the local filter caught it.
    return { allowed: true };
  }
}

// --- Types ---
// --- Error Handling ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class AppErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AppErrorBoundary caught an error", safeJsonStringify(error), safeJsonStringify(errorInfo));
  }

  render() {
    const language = localStorage.getItem('appLanguage') || 'ar';
    const t = translations[language] || translations['en'];

    if (this.state.hasError) {
      const isQuotaError = this.state.error?.message?.toLowerCase().includes('quota') || 
                          this.state.error?.message?.toLowerCase().includes('exhausted');
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {isQuotaError ? t.quotaExceededTitle : t.unexpectedErrorTitle}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {isQuotaError 
                ? t.quotaExceededMsg 
                : t.unexpectedErrorMsg}
            </p>

            {!isQuotaError && this.state.error && (
              <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-right overflow-hidden">
                <p className="text-[10px] font-mono text-gray-500 break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}
            
            {isQuotaError && (
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-right">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2 justify-end">
                  <Info className="w-4 h-4" />
                  {t.moreInfo}
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  {t.sparkPlanInfo}
                </p>
                <a 
                  href="https://firebase.google.com/pricing#cloud-firestore" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 mt-3 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {t.viewPricing}
                </a>
              </div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/25"
            >
              {t.reloadPage}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function safeJsonStringify(obj: any): string {
  if (obj === null || obj === undefined) return String(obj);
  
  const cache = new Set();
  const replacer = (_key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) return '[Circular]';
      
      // Prevent deep traversal of potential DOM/SDK nodes
      try {
        const ctorName = value.constructor?.name;
        if (
          value.nodeType || 
          value instanceof Element || 
          ctorName === 'Y2' || 
          ctorName === 'Ka' || 
          ctorName === 'Firestore' || 
          ctorName === 'FirebaseApp' ||
          ctorName === 'Transaction' ||
          ctorName === 'pP' || // Another common minified Firestore object
          ctorName === 'DP'    // Another common minified Firestore object
        ) {
          return `[SpecialObject: ${ctorName || 'Entity'}]`;
        }
      } catch (e) {
        return '[Unreadable Object]';
      }

      cache.add(value);

      // Handle Errors robustly
      if (value instanceof Error || (value && typeof value === 'object' && 'message' in value && 'name' in value)) {
        const errorObj: any = {
          name: (value as any).name,
          message: (value as any).message,
          stack: (value as any).stack,
          code: (value as any).code
        };
        // Copy other enumerable properties, but avoid deep objects for error metadata
        Object.keys(value).forEach(k => {
          if (!['name', 'message', 'stack', 'code'].includes(k)) {
            const prop = (value as any)[k];
            if (prop && typeof prop === 'object') {
              errorObj[k] = '[Object]';
            } else {
              errorObj[k] = prop;
            }
          }
        });
        return errorObj;
      }
    }
    return value;
  };

  try {
    return JSON.stringify(obj, replacer, 2);
  } catch (err) {
    try {
      return String(obj);
    } catch (e) {
      return '[Unable to stringify object]';
    }
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isQuotaError = errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exhausted');
  
  // Detect quota exceeded errors
  if (isQuotaError) {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    // Log quota errors as warnings to avoid cluttering the error logs too much
    console.warn('Firestore Quota Exceeded:', { operationType, path });
    return; // Don't log the full error info for quota errors to save space/noise
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid || undefined,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  const jsonString = safeJsonStringify(errInfo);

  console.error('Firestore Error: ', jsonString);
  
  // We only throw if it's a permission error, as required by the instructions.
  // This prevents non-permission errors (like missing indexes) from crashing the entire app
  // while still allowing the system to diagnose security rule issues.
  const isPermissionError = errorMessage.toLowerCase().includes('permission') || 
                            errorMessage.toLowerCase().includes('insufficient');
  
  if (isPermissionError) {
    throw new Error(jsonString);
  }
}

function VerifiedBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <BadgeCheck className={`${className} text-blue-500 fill-blue-500/10`} />
  );
}

interface UserProfile {
  uid: string;
  username?: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  isPrivate?: boolean;
  role?: 'user' | 'admin' | 'moderator';
  isVerified?: boolean;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: any;
  notificationSettings?: {
    likes: boolean;
    comments: boolean;
    followers: boolean;
    live: boolean;
    messages: boolean;
  };
  globalChatBackground?: string;
  bookmarks?: string[];
  friendsCount?: number;
  location?: { lat: number; lng: number; lastUpdated: any };
  locationEnabled?: boolean;
}

interface FriendRequest {
  senderId: string;
  senderName: string;
  senderPhoto: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: any;
}

interface Post {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorVerified?: boolean;
  content: string;
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
  repostsCount?: number;
  sharesCount?: number;
  type?: 'post' | 'repost';
  originalPostId?: string;
  originalAuthorName?: string;
  originalAuthorPhoto?: string;
  originalAuthorId?: string;
  createdAt: any;
  isFollowing?: boolean;
}

interface Story {
  id: string;
  userId: string;
  username: string;
  userPhoto?: string;
  url: string;
  mediaUrl?: string;
  type: 'image' | 'video' | 'live';
  roomId?: string;
  category?: string;
  createdAt: any;
}

interface Reel {
  id: string;
  userId: string;
  username: string;
  userPhoto: string;
  videoUrl: string;
  caption: string;
  category?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: any;
}

interface ReelComment {
  id: string;
  commentId: string;
  reelId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  createdAt: any;
}

interface LiveGuest {
  uid: string;
  name: string;
  photo: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSharingScreen?: boolean;
  agoraUid?: number | string;
  status: 'pending' | 'accepted' | 'rejected';
  joinedAt: any;
  invitedByHost?: boolean;
}

interface LiveRoom {
  id: string;
  roomId: string;
  hostId: string;
  hostName: string;
  hostPhoto: string;
  title: string;
  description?: string;
  quality: '480p' | '720p' | '1080p';
  layout?: 'grid' | 'fullscreen';
  beautyEnabled?: boolean;
  isCameraOff?: boolean;
  isHostMuted?: boolean;
  isSharingScreen?: boolean;
  hostAgoraUid?: number;
  status: 'active' | 'ended' | 'scheduled';
  viewerCount: number;
  startedAt: any;
  endedAt?: any;
  thumbnailUrl?: string;
  placeholderUrl?: string;
  type?: 'broadcast' | 'group_call';
  guestPrivacy?: 'public' | 'followers' | 'approved';
  allowedGuests?: string[];
  watchTogetherEnabled?: boolean;
  requestsEnabled?: boolean;
  commentsEnabled?: boolean;
  chatId?: string;
  participants?: string[];
  guests?: LiveGuest[];
  mutedUsers?: string[];
  blockedUsers?: string[];
  truthMode?: {
    active: boolean;
    expiresAt: any;
    participantLabels: { [uid: string]: string };
  };
}

interface AdminPermissions {
  canChangeInfo: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
  canInviteUsers: boolean;
  canPinMessages: boolean;
  canManageGroupCall: boolean;
  canAddAdmins: boolean;
}

interface Chat {
  chatId: string;
  participants: string[];
  lastMessage?: string;
  lastUpdate: any;
  type: 'direct' | 'group' | 'channel';
  groupName?: string;
  groupPhoto?: string;
  groupDescription?: string;
  groupType?: 'public' | 'private';
  groupColor?: string;
  topicsEnabled?: boolean;
  linkedChannel?: string;
  channelName?: string;
  channelDescription?: string;
  channelPhoto?: string;
  subscribersCount?: number;
  isVerified?: boolean;
  createdBy?: string;
  ownerId?: string;
  moderators?: string[];
  adminPermissions?: { [uid: string]: AdminPermissions };
  background?: string;
  permissions?: {
    canToggleTruthMode: 'all' | 'admins';
    canAddMembers: 'all' | 'admins';
    canRemoveMembers: 'admins';
    canKickMembers?: 'admins';
    canBanMembers?: 'admins';
    canDeleteMessages?: 'admins';
    sendMessages?: boolean;
    sendMedia?: boolean;
    addMembers?: boolean;
    pinMessages?: boolean;
    changeInfo?: boolean;
  };
  otherUser?: any; // For direct chats
  typing?: { [uid: string]: any };
  lastRead?: { [uid: string]: any };
  truthMode?: {
    active: boolean;
    expiresAt: any;
    participantLabels: { [uid: string]: string };
  };
  pinnedMessageId?: string;
  backgroundPattern?: string;
  blockedUsers?: string[];
  mutedBy?: string[];
  lastSenderId?: string;
}

/**
 * Helper to check if a user has a specific admin permission in a chat
 */
const hasPermission = (chat: Chat | undefined, uid: string, permission: keyof AdminPermissions): boolean => {
  if (!chat) return false;
  // Owner has all permissions
  const isOwner = chat.ownerId === uid || chat.createdBy === uid;
  if (isOwner) return true;
  
  const perms = chat.adminPermissions?.[uid];
  if (!perms) return false;
  
  return perms[permission] === true;
};

const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  canChangeInfo: true,
  canDeleteMessages: true,
  canBanUsers: true,
  canInviteUsers: true,
  canPinMessages: true,
  canManageGroupCall: true,
  canAddAdmins: false,
};

interface Message {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
  isAnonymous?: boolean;
  senderLabel?: string;
  type?: 'text' | 'voice' | 'video_note' | 'image' | 'file' | 'sticker' | 'gif' | 'system';
  mediaUrl?: string;
  mediaUrls?: string[];
  fileInfo?: {
    name: string;
    size: number;
    extension: string;
  };
  replyTo?: string;
  isForwarded?: boolean;
  forwardedFrom?: string;
  reactions?: { [emoji: string]: string[] };
  isEdited?: boolean;
  storyMediaUrl?: string;
  storyMediaType?: 'image' | 'video';
  sharedContentId?: string;
  sharedContentType?: 'post' | 'reel';
}

interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  type: 'message' | 'like' | 'live' | 'follow' | 'comment' | 'block';
  text: string;
  read: boolean;
  timestamp: any;
  linkId?: string; // e.g., roomId for live, postId for like/comment
  chatId?: string;
}

interface Report {
  id: string;
  type: 'post' | 'broadcast' | 'reel' | 'user';
}

interface Call {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  chatId: string;
  timestamp: any;
  duration?: number; // in seconds
}

interface Sticker {
  emoji: string;
  url: string;
}

interface StickerPack {
  id: string;
  name: string;
  authorId: string;
  stickers: Sticker[];
  createdAt: any;
}

// --- Map Component ---
function FriendsMap({ friends, currentUserLocation, onProfileClick, t, language }: { 
  friends: UserProfile[], 
  currentUserLocation?: { lat: number, lng: number },
  onProfileClick: (uid: string) => void,
  t: any,
  language: string
}) {
  const mapCenter: [number, number] = currentUserLocation ? [currentUserLocation.lat, currentUserLocation.lng] : [24.7136, 46.6753]; // Default to Riyadh
  
  // Custom Icon Implementation
  const createAvatarIcon = (photoURL: string) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-10 h-10 rounded-full border-2 border-blue-500 shadow-xl overflow-hidden bg-white flex items-center justify-center p-0.5 transform hover:scale-110 transition-transform">
              <img src="${photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}" class="w-full h-full rounded-full object-cover" />
             </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  return (
    <div className="h-[450px] w-full rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl relative z-0 mt-2">
      <MapContainer center={mapCenter} zoom={currentUserLocation ? 12 : 3} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {friends.filter(f => f.location).map(friend => (
          <Marker 
            key={friend.uid} 
            position={[friend.location!.lat, friend.location!.lng]} 
            icon={createAvatarIcon(friend.photoURL)}
          >
            <Popup className="rounded-2xl">
              <div className="text-center p-2 min-w-[120px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <img src={friend.photoURL} className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-blue-500" />
                <p className="font-black text-gray-900 text-sm mb-2">{friend.displayName}</p>
                <button 
                  onClick={() => onProfileClick(friend.uid)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-2 rounded-xl font-bold transition-all active:scale-95"
                >
                  {t.visitProfile}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        <button 
          onClick={() => {}} // Could add recalibrate button
          className="p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 text-blue-600 active:scale-90 transition-all"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// --- Components ---

function StoryViewer({ stories, initialIndex = 0, isVerified, userPhoto, onClose, onReply, currentUserId, quotaExceeded, allUsers, t: propT, language }: { stories: Story[], initialIndex?: number, isVerified?: boolean, userPhoto?: string, onClose: () => void, onReply: (text: string) => void, currentUserId: string, quotaExceeded: boolean, allUsers: UserProfile[], t: any, language: string }) {
  const t = propT || translations[language] || translations['en'];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [reply, setReply] = useState("");
  const [progress, setProgress] = useState(0);
  const [views, setViews] = useState<any[]>([]);
  const [showViews, setShowViews] = useState(false);
  const story = stories[currentIndex];
  const isOwner = story.userId === currentUserId;

  useEffect(() => {
    if (reply.length > 0) return; // Pause when typing

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(prevIdx => prevIdx + 1);
            return 0;
          } else {
            clearInterval(timer);
            onClose();
            return 100;
          }
        }
        return prev + 1;
      });
    }, 50); // 5 seconds total
    return () => clearInterval(timer);
  }, [onClose, reply.length, currentIndex, stories.length]);

  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Track view
  useEffect(() => {
    if (!isOwner && currentUserId && !quotaExceeded && story) {
      const markViewed = async () => {
        try {
          await setDoc(doc(db, `stories/${story.id}/views`, currentUserId), {
            viewerId: currentUserId,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          console.error("Error tracking view:", safeJsonStringify(err));
        }
      };
      markViewed();
    }
  }, [story?.id, currentUserId, isOwner, quotaExceeded]);

  // Fetch views if owner
  useEffect(() => {
    if (isOwner && !quotaExceeded && story) {
      const q = query(collection(db, `stories/${story.id}/views`), orderBy('timestamp', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        setViews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => handleFirestoreError(err, OperationType.LIST, `stories/${story.id}/views`));
      return unsub;
    }
  }, [story?.id, isOwner, quotaExceeded]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <div className="flex gap-1 mb-4">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 bg-gray-600 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-100" 
                style={{ 
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                }} 
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={userPhoto || story.userPhoto || `https://picsum.photos/seed/${story.userId}/100`} className="w-10 h-10 rounded-full border-2 border-white" referrerPolicy="no-referrer" loading="lazy" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-white font-bold text-sm">{story.username}</span>
                {isVerified && <VerifiedBadge className="w-3 h-3" />}
              </div>
              <span className="text-white/60 text-[10px]">
                {story.createdAt?.toDate ? story.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button 
                onClick={() => setShowViews(!showViews)}
                className="text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                <span className="text-xs font-bold">{views.length}</span>
              </button>
            )}
            <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-black relative">
        <div className="absolute inset-y-0 start-0 w-1/3 z-20 cursor-pointer" onClick={handlePrev} />
        <div className="absolute inset-y-0 end-0 w-1/3 z-20 cursor-pointer" onClick={handleNext} />
        
        {story.type === 'video' ? (
          <video src={story.mediaUrl || story.url} autoPlay className="max-w-full max-h-full" />
        ) : (
          <img src={story.mediaUrl || story.url} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" loading="lazy" />
        )}

        <AnimatePresence>
          {showViews && isOwner && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute inset-x-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-[32px] p-6 max-h-[60%] overflow-y-auto no-scrollbar z-20"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.views} ({views.length})</h3>
                <button onClick={() => setShowViews(false)} className="p-2 text-gray-400"><X /></button>
              </div>
              <div className="space-y-4">
                {views.length > 0 ? views.map(view => {
                  const viewerProfile = allUsers.find(u => u.uid === view.viewerId);
                  return (
                    <div key={view.id} className="flex items-center gap-3">
                      <img 
                        src={viewerProfile?.photoURL || `https://picsum.photos/seed/${view.viewerId}/100`} 
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{viewerProfile?.displayName || `${t.users} ${view.viewerId.slice(0, 5)}`}</p>
                        <p className="text-[10px] text-gray-400">
                          {view.timestamp?.toDate ? view.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t.now}
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center text-gray-400 py-8">{t.noViewsYet}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isOwner && (
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20">
            <input 
              type="text" 
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t.replyToStory}
              className="flex-1 bg-transparent border-none focus:ring-0 text-white text-sm placeholder:text-gray-400"
            />
            <button 
              onClick={() => {
                if (reply.trim()) {
                  onReply(reply);
                  setReply("");
                }
              }}
              className="p-2 bg-white text-black rounded-xl"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportModal({ isOpen, onClose, contentId, contentType, t: propT, language }: { isOpen: boolean, onClose: () => void, contentId: string, contentType: string, t: any, language: string }) {
  const t = propT || translations[language] || translations['en'];
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: auth.currentUser?.uid,
        contentId,
        contentType,
        reason,
        timestamp: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error("Error reporting:", safeJsonStringify(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transition-colors duration-300"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.reportContent}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>
        <div className="p-6">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t.reportReasonPlaceholder}</p>
          <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.reportReasonPlaceholder}
            className="w-full h-32 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/20"
          >
            {isSubmitting ? t.reporting : t.sendReport}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BlockConfirmationModal({ user, onConfirm, onCancel, t: propT, language }: { user: { name: string }, onConfirm: () => void, onCancel: () => void, t: any, language: string }) {
  const t = propT || translations[language] || translations['en'];
  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-right" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 transition-colors duration-300"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserMinus className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.blockUser}</h3>
          <div className="space-y-3 text-gray-500 dark:text-gray-400 text-sm leading-relaxed text-right">
            <p className="font-bold text-red-500">{t.blockingUserDesc}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t.blockingUserPoint1}</li>
              <li>{t.blockingUserPoint2}</li>
              <li>{t.blockingUserPoint3}</li>
              <li>{t.blockingUserPoint4}</li>
            </ul>
            <p className="mt-2">{t.blockingUserFinal}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-red-500/20"
          >
            {t.block}
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Post({ 
  postId, authorId, authorName, authorPhoto, isVerified, content, mediaUrl, likesCount, commentsCount, repostsCount, sharesCount, createdAt,
  type, originalPostId, originalAuthorName, originalAuthorPhoto, originalAuthorId,
  isFollowing, isLiked, isBookmarked, isReposted, userRole, currentUserId, onLike, onBookmark, onFollow, onUnfollow, onMessageClick, onProfileClick, onUpdate, onReport, onShare, onBlock, onCommentClick, onDelete,
  t: propT, language
}: any) {
  const t = propT || translations[language] || translations['en'];
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const isModerator = userRole === 'admin' || userRole === 'moderator';
  const isOwner = authorId === currentUserId;

  const canEdit = useMemo(() => {
    if (!isOwner) return false;
    if (likesCount > 0 || commentsCount > 0) return false;
    
    const postTime = createdAt?.toMillis ? createdAt.toMillis() : (createdAt?.seconds ? createdAt.seconds * 1000 : Date.now());
    const thirtyMinutes = 30 * 60 * 1000;
    return (Date.now() - postTime) < thirtyMinutes;
  }, [isOwner, likesCount, commentsCount, createdAt]);

  const editRestrictionReason = useMemo(() => {
    if (!isOwner) return null;
    if (likesCount > 0 || commentsCount > 0) return t.editInteractionRestricted;
    
    const postTime = createdAt?.toMillis ? createdAt.toMillis() : (createdAt?.seconds ? createdAt.seconds * 1000 : Date.now());
    const thirtyMinutes = 30 * 60 * 1000;
    if ((Date.now() - postTime) >= thirtyMinutes) return t.editTimeExpired;
    
    return null;
  }, [isOwner, likesCount, commentsCount, createdAt, t]);

  const handleUpdate = () => {
    onUpdate(postId, editContent);
    setIsEditing(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.005 }}
      className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 group"
      dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
    >
      {type === 'repost' && (
        <div className="px-5 pt-3 flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Repeat2 className="w-3.5 h-3.5 text-green-500" />
          <span className="text-[10px] font-bold">
            {authorId === currentUserId ? t.youReposted : (language === 'ar' ? `${authorName} ${t.userReposted}` : `${authorName} ${t.userReposted}`)}
          </span>
        </div>
      )}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={(type === 'repost' ? originalAuthorPhoto : authorPhoto) || `https://picsum.photos/seed/${type === 'repost' ? originalAuthorId : authorId}/100`} 
              className="w-11 h-11 rounded-full object-cover cursor-pointer ring-2 ring-gray-50 dark:ring-gray-800 group-hover:ring-blue-500/30 transition-all duration-300"
              onClick={() => onProfileClick(type === 'repost' ? originalAuthorId : authorId)}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
          <div className={`${language === 'en' ? 'text-left' : 'text-right'}`}>
            <div className={`flex items-center gap-1 ${language === 'en' ? 'justify-start' : 'justify-end'}`}>
              <h4 className="font-display font-bold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onProfileClick(type === 'repost' ? originalAuthorId : authorId)}>
                {type === 'repost' ? originalAuthorName : authorName}
              </h4>
              {isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
            </div>
            <div className={`flex items-center gap-1.5 ${language === 'en' ? 'justify-start' : 'justify-end'}`}>
              <p className="text-[10px] text-gray-400 font-medium">{t.sinceTwoHours}</p>
              {!isOwner && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      isFollowing ? onUnfollow() : onFollow();
                    }}
                    className={`text-[10px] font-black transition-all hover:scale-110 active:scale-95 px-2 py-0.5 rounded-full ${
                      isFollowing 
                        ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 hover:text-red-500' 
                        : 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100'
                    }`}
                  >
                    {isFollowing ? t.followingBtn : t.follow}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full text-gray-400">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute end-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden"
              >
                {isOwner ? (
                  <>
                    <button 
                      disabled={!canEdit}
                      onClick={() => { 
                        if (canEdit) {
                          setIsEditing(true); 
                          setShowMenu(false); 
                        }
                      }} 
                      className={`w-full px-4 py-3 text-right text-sm flex items-center gap-2 transition-colors ${
                        canEdit 
                          ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700' 
                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                      title={editRestrictionReason || ''}
                    >
                      <Edit className="w-4 h-4" /> 
                      <div className={`flex flex-col ${language === 'en' ? 'items-start' : 'items-end'}`}>
                        <span>{t.editPost}</span>
                        {editRestrictionReason && (
                          <span className="text-[8px] text-red-400 font-medium">{editRestrictionReason}</span>
                        )}
                      </div>
                    </button>
                    <button onClick={() => { /* Privacy logic */ setShowMenu(false); }} className={`w-full px-4 py-3 ${language === 'en' ? 'text-left' : 'text-right'} text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2`}>
                      <Lock className="w-4 h-4" /> {t.postPrivacy}
                    </button>
                    <button onClick={() => { onDelete(postId); setShowMenu(false); }} className={`w-full px-4 py-3 ${language === 'en' ? 'text-left' : 'text-right'} text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-bold`}>
                      <Trash2 className="w-4 h-4" /> {t.deletePost}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { onReport(postId, 'post'); setShowMenu(false); }} className={`w-full px-4 py-3 ${language === 'en' ? 'text-left' : 'text-right'} text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2`}>
                      <Flag className="w-4 h-4" /> {t.report}
                    </button>
                    <button onClick={() => { onBlock(authorId, authorName, authorPhoto); setShowMenu(false); }} className={`w-full px-4 py-3 ${language === 'en' ? 'text-left' : 'text-right'} text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2`}>
                      <UserMinus className="w-4 h-4" /> {t.blockUser}
                    </button>
                  </>
                )}
                {isModerator && !isOwner && (
                  <button onClick={() => { onDelete(postId); setShowMenu(false); }} className="w-full px-4 py-3 text-right text-sm text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                    <X className="w-4 h-4" /> {t.deletePostMod}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="px-5 pb-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white min-h-[100px]"
            />
            <div className="flex gap-2">
              <button 
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                {t.saveChanges}
              </button>
              <button 
                onClick={() => { setIsEditing(false); setEditContent(content); }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-bold"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{content}</p>
        )}
      </div>

      {mediaUrl && (
        <div className="px-3 pb-3">
          <div className="relative aspect-video overflow-hidden rounded-[1.5rem] group/media">
            <img 
              src={mediaUrl} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/5 transition-colors duration-300" />
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-gray-800/20">
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={onLike} 
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-90 ${
              isLiked 
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-bold">{likesCount || 0}</span>
          </button>

          <button 
            onClick={onCommentClick} 
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all active:scale-90"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-bold">{commentsCount || 0}</span>
          </button>

          <button 
            onClick={() => onShare(postId, 'repost')} 
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-90 ${
              isReposted 
                ? 'text-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/10'
            }`}
          >
            <Repeat2 className={`w-5 h-5 ${isReposted ? 'stroke-[3px]' : ''}`} />
            <span className="text-sm font-bold">{repostsCount || 0}</span>
          </button>

          <button 
            onClick={onBookmark} 
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-90 ${
              isBookmarked 
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>

        <button 
          onClick={() => onShare(postId, 'post')} 
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-90"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-bold">{sharesCount || 0}</span>
        </button>
      </div>
    </motion.div>
  );
}

function SettingsPage({ 
  profile, user, onBack, onLogout, onEditProfile, onDeleteAccount, 
  onUpdateSettings, onUpdateGlobalBackground, language, setLanguage, 
  darkMode, setDarkMode, globalBackground, t: propT 
}: { 
  profile: any, user: any, onBack: () => void, onLogout: () => void, 
  onEditProfile: () => void, onDeleteAccount: () => void, 
  onUpdateSettings: (settings: any) => void, 
  onUpdateGlobalBackground: (bg: string) => void, 
  language: string, setLanguage: (lang: string) => void, 
  darkMode: boolean, setDarkMode: (val: boolean) => void, globalBackground?: string, t: any 
}) {
  const t = propT || translations[language] || translations['en'];
  const [notifications, setNotifications] = useState(profile?.notificationSettings || {
    likes: true,
    comments: true,
    followers: true,
    live: true,
    messages: true
  });
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const languages = [
    { code: 'ar', name: t.arabic, flag: '🇸🇦' },
    { code: 'en', name: t.english, flag: '🇺🇸' },
    { code: 'fr', name: t.french, flag: '🇫🇷' },
    { code: 'es', name: t.spanish, flag: '🇪🇸' },
    { code: 'tr', name: t.turkish, flag: '🇹🇷' },
    { code: 'fa', name: t.persian, flag: '🇮🇷' },
    { code: 'hi', name: t.hindi, flag: '🇮🇳' },
    { code: 'zh', name: t.chinese, flag: '🇨🇳' },
    { code: 'ja', name: t.japanese, flag: '🇯🇵' },
    { code: 'ru', name: t.russian, flag: '🇷🇺' },
  ];

  const handleToggle = (key: string) => {
    const newSettings = { ...notifications, [key]: !notifications[key] };
    setNotifications(newSettings);
    onUpdateSettings(newSettings);
  };

  const backgrounds = [
    { id: 'default', name: 'الافتراضي', value: 'https://www.transparenttextures.com/patterns/cubes.png' },
    { id: 'dots', name: 'نقاط', value: 'https://www.transparenttextures.com/patterns/carbon-fibre.png' },
    { id: 'stars', name: 'نجوم', value: 'https://www.transparenttextures.com/patterns/stardust.png' },
    { id: 'circuit', name: 'دوائر كهربائية', value: 'https://www.transparenttextures.com/patterns/circuit-board.png' },
    { id: 'wood', name: 'خشب', value: 'https://www.transparenttextures.com/patterns/wood-pattern.png' },
    { id: 'paper', name: 'ورق', value: 'https://www.transparenttextures.com/patterns/paper-fibers.png' },
  ];

  const SettingItem = ({ icon: Icon, title, subtitle, onClick, color = "text-gray-400", action }: any) => (
    <div 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group ${onClick ? 'cursor-pointer' : ''} ${language === 'en' ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex items-center gap-4 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
        <div className={`p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={language === 'en' ? 'text-left' : 'text-right'}>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
          {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action ? action : (language === 'en' ? <ChevronRight className="w-4 h-4 text-gray-300" /> : <ChevronLeft className="w-4 h-4 text-gray-300" />)}
    </div>
  );

  return (
    <div className="h-full bg-white dark:bg-gray-900 overflow-y-auto no-scrollbar pb-24" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowRight className={`w-6 h-6 text-gray-900 dark:text-white ${language === 'en' ? 'rotate-180' : ''}`} />
        </button>
        <h2 className="text-xl font-black text-gray-900 dark:text-white">{t.settings}</h2>
      </div>

      {/* Profile Section */}
      <div className="p-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className={`relative flex items-center gap-4 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
            <img 
              src={profile?.photoURL || `https://picsum.photos/seed/${user?.uid}/200`} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className={`flex-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
              <h3 className="text-lg font-bold">{profile?.displayName || 'مستخدم'}</h3>
              <p className="text-xs text-white/70 truncate max-w-[180px]">{user?.email || 'لا يوجد بريد إلكتروني'}</p>
            </div>
            <button 
              onClick={onEditProfile}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-md"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="px-4 mb-8">
        <h3 className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t.accountSettings}</h3>
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <SettingItem 
            icon={Lock} 
            title={t.accountSecurity} 
            subtitle={t.securitySubtitle} 
            color="text-blue-500"
            onClick={() => {}} // TODO: Link to security settings
          />
          <div className="h-px bg-gray-50 dark:bg-gray-800 mx-4" />
          <SettingItem 
            icon={Shield} 
            title={t.privacy} 
            subtitle={t.privacySubtitle} 
            color="text-green-500"
            onClick={() => {}} // TODO: Link to privacy settings
          />
          <div className="h-px bg-gray-50 dark:bg-gray-800 mx-4" />
          <SettingItem 
            icon={Globe} 
            title={t.linkedAccounts} 
            subtitle={t.linkedAccountsSubtitle} 
            color="text-purple-500"
            onClick={() => {}} // TODO: Link to linked accounts
          />
        </div>
      </div>
      <div className="px-4 mb-8">
        <h3 className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t.appSettings}</h3>
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-50 dark:border-gray-800">
            <div className={`flex items-center gap-3 mb-4 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
              <Bell className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t.notifications}</h4>
            </div>
            <div className="space-y-4">
              <div className={`flex items-center justify-between ${language === 'en' ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-gray-600 dark:text-gray-400">{t.likes}</span>
                <Switch checked={notifications.likes} onChange={() => handleToggle('likes')} language={language} />
              </div>
              <div className={`flex items-center justify-between ${language === 'en' ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-gray-600 dark:text-gray-400">{t.comments}</span>
                <Switch checked={notifications.comments} onChange={() => handleToggle('comments')} language={language} />
              </div>
              <div className={`flex items-center justify-between ${language === 'en' ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-gray-600 dark:text-gray-400">{t.followers}</span>
                <Switch checked={notifications.followers} onChange={() => handleToggle('followers')} language={language} />
              </div>
              <div className={`flex items-center justify-between ${language === 'en' ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-gray-600 dark:text-gray-400">{t.live}</span>
                <Switch checked={notifications.live} onChange={() => handleToggle('live')} language={language} />
              </div>
              <div className={`flex items-center justify-between ${language === 'en' ? 'flex-row-reverse' : ''}`}>
                <span className="text-xs text-gray-600 dark:text-gray-400">{t.messages}</span>
                <Switch checked={notifications.messages} onChange={() => handleToggle('messages')} language={language} />
              </div>
            </div>
          </div>
          <SettingItem 
            icon={darkMode ? Moon : Sun} 
            title={t.appearance} 
            subtitle={darkMode ? t.darkMode : t.lightMode} 
            color="text-indigo-500"
            action={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} language={language} />}
          />
          <div className="h-px bg-gray-50 dark:bg-gray-800 mx-4" />
          <SettingItem 
            icon={Languages} 
            title={t.language} 
            subtitle={languages.find(l => l.code === language)?.name || t.arabic} 
            color="text-cyan-500"
            onClick={() => setIsLanguageModalOpen(true)}
          />
          <div className="h-px bg-gray-50 dark:bg-gray-800 mx-4" />
          <SettingItem 
            icon={HardDrive} 
            title={t.dataSaving} 
            subtitle={t.dataSavingSubtitle} 
            color="text-emerald-500"
            onClick={() => {}} // TODO: Link to data saving settings
          />
        </div>
      </div>

      {/* Chat Customization */}
      <div className="px-4 mb-8">
        <h3 className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t.chatCustomization}</h3>
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className={`flex items-center gap-3 mb-6 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Image className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className={language === 'en' ? 'text-left' : 'text-right'}>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t.defaultBackground}</h4>
              <p className="text-[10px] text-gray-400">{t.chooseChatBackground}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onUpdateGlobalBackground(bg.value)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${globalBackground === bg.value ? 'border-blue-500 scale-95 shadow-lg' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
              >
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800" />
                <div className="absolute inset-0 opacity-20 dark:opacity-40" style={{ backgroundImage: `url("${bg.value}")` }} />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-black/40 backdrop-blur-sm">
                  <span className="text-[8px] font-bold text-white">{bg.name}</span>
                </div>
                {globalBackground === bg.value && (
                  <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Support & Info */}
      <div className="px-4 mb-8">
        <h3 className={`text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-4 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t.support}</h3>
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
          <SettingItem 
            icon={HelpCircle} 
            title={t.helpCenter} 
            color="text-blue-400"
            onClick={() => {}} // TODO: Link to help center
          />
          <div className="h-px bg-gray-50 dark:bg-gray-800 mx-4" />
          <SettingItem 
            icon={FileText} 
            title={t.privacyPolicy} 
            color="text-gray-500"
            onClick={() => {}} // TODO: Link to privacy policy
          />
          <div className="h-px bg-gray-50 dark:bg-gray-800 mx-4" />
          <SettingItem 
            icon={Info} 
            title={t.about} 
            subtitle={t.version} 
            color="text-gray-400"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Final Actions */}
      <div className="px-4 space-y-3">
        <button 
          onClick={onLogout}
          className="w-full py-4 bg-red-50 dark:bg-red-900/10 text-red-600 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          {t.logout}
        </button>
        <button 
          onClick={onDeleteAccount}
          className="w-full py-4 text-gray-400 dark:text-gray-600 text-xs font-bold hover:text-red-500 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3 h-3" />
          {t.deleteAccount}
        </button>
      </div>

      {/* Language Modal */}
      <AnimatePresence>
        {isLanguageModalOpen && (
          <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-gray-900 w-full max-w-md h-[80vh] sm:h-auto sm:max-h-[600px] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.language}</h3>
                <button onClick={() => setIsLanguageModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {languages.map((lang) => (
                  <button 
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsLanguageModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-2 border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <span className={`font-bold ${language === lang.code ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>{lang.name}</span>
                    </div>
                    {language === lang.code && <Check className="w-5 h-5 text-blue-600" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Reel({ reel, isVerified, userPhoto, isLiked, onLike, onComment, onShare, onProfileClick, onReport, onView, t, language }: { 
  reel: Reel, 
  isVerified?: boolean,
  userPhoto?: string,
  isLiked: boolean, 
  onLike: () => void, 
  onComment: () => void, 
  onShare: () => void,
  onProfileClick: (uid: string) => void,
  onReport: (id: string, type: string) => void,
  onView?: () => void,
  t: any,
  language: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showHeart, setShowHeart] = useState(false);

  useEffect(() => {
    if (onView && isPlaying && !isLoading) {
      const timer = setTimeout(() => {
        onView();
      }, 2000); // Count as view after 2 seconds of active playback
      return () => clearTimeout(timer);
    }
  }, [onView, isPlaying, isLoading]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDoubleClick = () => {
    if (!isLiked) onLike();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
  };

  return (
    <motion.div 
      className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <video 
        ref={videoRef}
        src={reel.videoUrl} 
        className="h-full w-full object-contain cursor-pointer"
        loop
        autoPlay
        muted={isMuted}
        playsInline
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onClick={togglePlay}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause Indicator */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-6 rounded-full bg-black/40 backdrop-blur-md">
            <Video className="w-12 h-12 text-white opacity-80" />
          </div>
        </div>
      )}

      {/* Double Click Heart Animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="w-24 h-24 text-red-500 fill-current drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Toggle */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-6 left-6 p-3 rounded-full bg-black/40 backdrop-blur-md text-white z-20 hover:bg-black/60 transition-all"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
      
      {/* Right Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-10">
        <button onClick={onLike} className="flex flex-col items-center gap-1 group">
          <div className={`p-3 rounded-full backdrop-blur-md transition-all ${isLiked ? 'bg-red-500 text-white' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-white text-xs font-bold">{reel.likesCount || 0}</span>
        </button>
        
        <button onClick={onComment} className="flex flex-col items-center gap-1 group">
          <div className="p-3 rounded-full bg-white/10 text-white backdrop-blur-md group-hover:bg-white/20 transition-all">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-white text-xs font-bold">{reel.commentsCount || 0}</span>
        </button>
        
        <button onClick={onShare} className="flex flex-col items-center gap-1 group">
          <div className="p-3 rounded-full bg-white/10 text-white backdrop-blur-md group-hover:bg-white/20 transition-all">
            <Share2 className="w-6 h-6" />
          </div>
        </button>

        <button onClick={() => onReport(reel.id, 'reel')} className="flex flex-col items-center gap-1 group">
          <div className="p-3 rounded-full bg-white/10 text-white backdrop-blur-md group-hover:bg-white/20 transition-all">
            <Flag className="w-6 h-6" />
          </div>
        </button>
      </div>
      
      {/* Bottom Info */}
      <div className={`absolute bottom-6 left-4 right-16 ${language === 'en' ? 'text-left' : 'text-right'} z-10`} dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => onProfileClick(reel.userId)}>
          <img 
            src={userPhoto || reel.userPhoto || `https://picsum.photos/seed/${reel.userId}/100`} 
            className="w-10 h-10 rounded-full border-2 border-white object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-sm">@{reel.username}</span>
            {isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
          </div>
        </div>
        <p className="text-white/90 text-sm leading-relaxed line-clamp-2">{reel.caption || 'لا يوجد وصف'}</p>
      </div>
    </motion.div>
  );
}

function formatRelativeTime(timestamp: any, t: any) {
  if (!timestamp?.toDate) return t.justNow || 'الآن';
  const date = timestamp.toDate();
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t.justNow || 'الآن';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t.minutesAgo || 'د'}`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t.hoursAgo || 'سا'}`;
  return date.toLocaleDateString();
}

function NotificationsModal({ notifications, allUsers, onClose, onNotificationClick, followingIds, handleFollow, handleUnfollow, currentUserUid, t, language }: { 
  notifications: Notification[], 
  allUsers: UserProfile[],
  onClose: () => void,
  onNotificationClick: (notif: Notification) => void,
  followingIds: Set<string>,
  handleFollow: (uid: string, name: string, photo: string) => void,
  handleUnfollow: (uid: string) => void,
  currentUserUid: string,
  t: any,
  language: string
}) {
  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white dark:bg-gray-900 w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl transition-colors duration-300"
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.notifications}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((notif) => {
              const sender = allUsers.find(u => u.uid === notif.senderId);
              const isFollowing = followingIds.has(notif.senderId);
              const isSelf = notif.senderId === currentUserUid;

              return (
                <div 
                  key={notif.id} 
                  onClick={() => onNotificationClick(notif)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${notif.read ? 'bg-transparent' : 'bg-blue-50 dark:bg-blue-900/10'}`}
                >
                  <img 
                    src={sender?.photoURL || notif.senderPhoto || `https://picsum.photos/seed/${notif.senderId}/100`} 
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug truncate">
                      <span className="font-bold">{notif.senderName}</span> {notif.text}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(notif.timestamp, t)}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {notif.type === 'follow' && !isSelf && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          isFollowing ? handleUnfollow(notif.senderId) : handleFollow(notif.senderId, notif.senderName, sender?.photoURL || '');
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                          isFollowing 
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' 
                            : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        }`}
                      >
                        {isFollowing ? t.unfollow : t.follow}
                      </button>
                    )}
                    
                    {notif.type === 'live' && (
                      <div className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">
                        LIVE
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <Bell className="w-12 h-12 opacity-20" />
              <p>{t.noNotifications}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function UserListModal({ isOpen, title, users, onClose, onUserClick, followingIds, handleFollow, handleUnfollow, currentUserUid, t, language }: {
  isOpen: boolean,
  title: string,
  users: any[],
  onClose: () => void,
  onUserClick: (uid: string) => void,
  followingIds: Set<string>,
  handleFollow: (uid: string, name: string, photo: string) => void,
  handleUnfollow: (uid: string) => void,
  currentUserUid: string,
  t: any,
  language: string
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white dark:bg-gray-900 w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl transition-colors duration-300"
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {users.length > 0 ? (
            users.map((u) => (
              <div 
                key={u.uid} 
                className="flex items-center justify-between p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(u.uid)}>
                  <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{u.displayName}</p>
                    {u.username && <p className="text-[10px] text-gray-400">@{u.username}</p>}
                  </div>
                </div>
                {u.uid !== currentUserUid && (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => followingIds.has(u.uid) ? handleUnfollow(u.uid) : handleFollow(u.uid, u.displayName, u.photoURL)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      followingIds.has(u.uid)
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {followingIds.has(u.uid) ? t.unfollow : t.follow}
                  </motion.button>
                )}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <User className="w-12 h-12 opacity-20" />
              <p>{t.noResults}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function LiveStream({ room, allUsers, allUsersMap, user, profile, isHost, chatModeratorIds, chatOwnerId, onClose, onReport, quotaExceeded, setConfirmationModal, t: propT, language, liveSubscriptionIds, handleToggleLiveSubscription }: { room: LiveRoom, allUsers: UserProfile[], allUsersMap: Record<string, UserProfile>, user: FirebaseUser, profile: UserProfile | null, isHost: boolean, chatModeratorIds: string[], chatOwnerId: string, onClose: () => void, onReport: (id: string, type: string) => void, quotaExceeded: boolean, setConfirmationModal: (modal: any) => void, t: any, language: string, liveSubscriptionIds: Set<string>, handleToggleLiveSubscription: (uid: string) => void }) {
  const t = propT || translations[language] || translations['en'];

  if (!room || !room.id) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 p-10 bg-white/5 rounded-full border border-white/10"
        >
          <Search className="w-16 h-16 text-blue-500" />
        </motion.div>
        <h2 className="text-3xl font-display font-black text-white mb-4">
          {t.liveStreamNotFound}
        </h2>
        <p className="text-white/40 mb-10 max-w-sm text-lg leading-relaxed">
          {t.liveStreamNotFoundDesc}
        </p>
        <button 
          onClick={onClose} 
          className="w-full max-w-xs px-10 py-5 bg-white text-black font-black rounded-[2rem] hover:bg-gray-200 transition-all active:scale-95 shadow-2xl shadow-white/5 flex items-center justify-center gap-3"
        >
          <XCircle className="w-6 h-6" />
          <span>{t.close}</span>
        </button>
      </div>
    );
  }

  const [socket, setSocket] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [viewerCount, setViewerCount] = useState(room.viewerCount || 0);
  const [messages, setMessages] = useState<{ id: string, text: string, senderName: string, senderPhoto: string, timestamp?: any, type?: 'system' | 'user' }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [reactions, setReactions] = useState<{ id: number, emoji: string, x: number }[]>([]);
  const [quality, setQuality] = useState(room.quality || '720p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [streamDuration, setStreamDuration] = useState("00:00");
  const [truthModeTimeLeft, setTruthModeTimeLeft] = useState<number | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [currentRoomData, setCurrentRoomData] = useState<LiveRoom | null>(null);
  const [guestStreams, setGuestStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isGuest, setIsGuest] = useState(false);
  const [guestStatus, setGuestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [showLiveSettings, setShowLiveSettings] = useState(false);
  const [showGuestRequests, setShowGuestRequests] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<{ uid: string, name: string, photo: string, isHost: boolean } | null>(null);
  const [locallyMutedUIDs, setLocallyMutedUIDs] = useState<string[]>([]);
  const [activeMessageForReactions, setActiveMessageForReactions] = useState<string | null>(null);
  const [showViewerList, setShowViewerList] = useState(false);
  const [viewers, setViewers] = useState<UserProfile[]>([]);
  const [localllyCapturedReactions, setLocallyCapturedReactions] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [longPressedMessage, setLongPressedMessage] = useState<any>(null);
  const [showGridView, setShowGridView] = useState(true);
  const [streamEnded, setStreamEnded] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageValue, setEditMessageValue] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<any>(null);

  const handleMessageTouchStart = (msg: any) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressedMessage(msg);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  useEffect(() => {
    if (quotaExceeded || !room.id) return;
    const unsubscribeRoom = onSnapshot(doc(db, 'live_rooms', room.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as LiveRoom;
        setCurrentRoomData(data);
        if (data.layout) {
          setShowGridView(data.layout === 'grid');
        }
        if (data.status === 'ended') {
          setStreamEnded(true);
        }
        if (data.blockedUsers?.includes(user?.uid)) {
          alert(language === 'ar' ? 'لقد تم حظرك من هذا البث.' : 'You have been blocked from this stream.');
          onClose();
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `live_rooms/${room.id}`);
    });

    const unsubscribeChat = onSnapshot(
      query(collection(db, `live_rooms/${room.id}/chat`), orderBy('timestamp', 'asc'), limit(50)),
      (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `live_rooms/${room.id}/chat`);
      }
    );

    return () => {
      unsubscribeRoom();
      unsubscribeChat();
    };
  }, [room.id, quotaExceeded]);

  useEffect(() => {
    if (!user || quotaExceeded || !room.id) return;
    const viewerRef = doc(db, `live_rooms/${room.id}/viewers`, user.uid);
    setDoc(viewerRef, {
      uid: user.uid,
      username: profile?.username || user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
      displayName: profile?.displayName || user.displayName || 'Anonymous',
      photoURL: profile?.photoURL || user.photoURL || '',
      joinedAt: serverTimestamp()
    }, { merge: true });

    return () => {
      deleteDoc(viewerRef).catch(() => {});
    };
  }, [user, room.id, quotaExceeded]);

  useEffect(() => {
    if (quotaExceeded || !room.id) return;
    const q = query(collection(db, `live_rooms/${room.id}/viewers`), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const viewerData: any[] = [];
      snap.forEach(doc => viewerData.push(doc.data()));
      setViewers(viewerData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `live_rooms/${room.id}/viewers`));
    return () => unsub();
  }, [room.id, quotaExceeded]);

  useEffect(() => {
    if (quotaExceeded || !room.id) return;
    // We only want reactions added after today/now
    const startTime = Timestamp.now();
    const q = query(
      collection(db, `live_rooms/${room.id}/reactions`),
      where('timestamp', '>', startTime),
      orderBy('timestamp', 'asc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const id = Math.random();
          const newReaction = {
            id,
            emoji: data.emoji,
            x: 10 + Math.random() * 80, // 10vw to 90vw
            drift: Math.random() * 60 - 30, // -30 to 30vw
            rotation: Math.random() * 120 - 60 // -60 to 60 deg
          };
          setReactions(prev => [...prev.slice(-30), newReaction]);
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
          }, 4500);
        }
      });
    }, (err) => {
      console.warn("Reactions listener error:", err);
    });
    return () => unsub();
  }, [room.id, quotaExceeded]);

  useEffect(() => {
    if (!activeMessageForReactions) return;
    const handleOutsideClick = () => setActiveMessageForReactions(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeMessageForReactions]);

  const isOwner = user.uid === chatOwnerId || user.uid === room.hostId;
  const isModerator = chatModeratorIds.includes(user.uid) || (currentRoomData?.moderators || []).includes(user.uid);
  const canModerate = isHost || isModerator || isOwner;
  
  const isTargetOwner = (uid: string) => uid === chatOwnerId || uid === room.hostId;
  const isTargetModerator = (uid: string) => chatModeratorIds.includes(uid) || (currentRoomData?.moderators || []).includes(uid);
  
  const canPerformModerationOn = (uid: string) => {
    if (isOwner) return true;
    if (isModerator) {
      return !isTargetModerator(uid) && !isTargetOwner(uid);
    }
    return false;
  };

  useEffect(() => {
    if (currentRoomData?.guests) {
      const myGuestInfo = currentRoomData.guests.find(g => g.uid === user.uid);
      if (myGuestInfo) {
        setGuestStatus(myGuestInfo.status);
        setIsGuest(myGuestInfo.status === 'accepted');
      } else {
        setGuestStatus('none');
        setIsGuest(false);
      }
    }
  }, [currentRoomData?.guests, user.uid]);

  const isParticipant = isHost || isGuest;

  const participantsWithMedia = useMemo(() => {
    const guests = (currentRoomData?.guests || []).filter(g => g.status === 'accepted');
    const broadcaster = {
      uid: room.hostId,
      agoraUid: currentRoomData?.hostAgoraUid,
      name: room.hostName,
      photo: room.hostPhoto,
      isHost: true,
      isLocal: isHost,
      isMuted: isHost ? isMuted : currentRoomData?.isHostMuted,
      isCameraOff: isHost ? isCameraOff : currentRoomData?.isCameraOff,
      isSharingScreen: isHost ? isSharingScreen : currentRoomData?.isSharingScreen
    };
    
    return [broadcaster, ...guests.map(g => ({ ...g, isHost: false, isLocal: g.uid === user.uid }))];
  }, [currentRoomData?.guests, currentRoomData?.hostAgoraUid, room.hostId, room.hostName, room.hostPhoto, isHost, isMuted, isCameraOff, isSharingScreen, user.uid, currentRoomData?.isHostMuted, currentRoomData?.isCameraOff, currentRoomData?.isSharingScreen]);

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [, forceUpdate] = useState({});
  const agoraClient = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  const isJoining = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Force re-render when remote users change
  useEffect(() => {
    forceUpdate({});
  }, [remoteUsers.length]);

  // Global Agora Lifecycle Effect
  useEffect(() => {
    const appId = (import.meta as any).env.VITE_AGORA_APP_ID;
    if (!appId || !room.id || !user) return;

    let isMounted = true;
    let client: IAgoraRTCClient | null = null;
    
    const initAgora = async () => {
      try {
        const existingClient = agoraClient.current;
        if (existingClient) {
          await existingClient.leave().catch(() => {});
          existingClient.removeAllListeners();
        }

        client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        agoraClient.current = client;

        // 1. Global Listeners (Before joining)
        client.on("user-published", async (remoteUser, mediaType) => {
          if (!isMounted || !client) return;
          try {
            await client.subscribe(remoteUser, mediaType);
            setRemoteUsers(prev => {
              const filtered = prev.filter(u => String(u.uid) !== String(remoteUser.uid));
              return [...filtered, remoteUser];
            });
            if (mediaType === "audio" && remoteUser.audioTrack) {
              (remoteUser.audioTrack.play() as any)?.catch((e: any) => {
                if (e && e.code !== 'OPERATION_ABORTED') console.warn("Autoplay bypass needed:", e);
              });
            }
          } catch (e: any) {
            if (e.code !== 'OPERATION_ABORTED') console.error("Subscribe error:", e);
          }
        });

        client.on("user-unpublished", (remoteUser) => {
          if (isMounted) setRemoteUsers(prev => prev.filter(u => String(u.uid) !== String(remoteUser.uid)));
        });

        client.on("user-left", (remoteUser) => {
          if (isMounted) setRemoteUsers(prev => prev.filter(u => String(u.uid) !== String(remoteUser.uid)));
        });

    // 2. Set Role & Join
    const role = isHost || isGuest ? "host" : "audience";
    if (isJoining.current) return;
    isJoining.current = true;
    
    await client.setClientRole(role);
    // Use null to let Agora assign a unique numeric UID for this session to avoid UID_CONFLICT
    const assignedUid = await client.join(appId, room.id, null, null);
    
    // Update presence with the assigned Agora UID
    if (isMounted) {
      if (isHost) {
        await updateDoc(doc(db, 'live_rooms', room.id), { hostAgoraUid: assignedUid });
      }
      
      const viewerRef = doc(db, `live_rooms/${room.id}/viewers`, user.uid);
      await setDoc(viewerRef, {
        uid: user.uid,
        agoraUid: assignedUid,
        username: profile?.username || user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
        displayName: profile?.displayName || user.displayName || 'Anonymous',
        photoURL: profile?.photoURL || user.photoURL || '',
        joinedAt: serverTimestamp()
      }, { merge: true });

      // If guest, sync agoraUid to guest object too
      if (isGuest && currentRoomData) {
        const updatedGuests = (currentRoomData.guests || []).map(g => 
          g.uid === user.uid ? { ...g, agoraUid: assignedUid } : g
        );
        await updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests });
      }
    }

    if (isMounted && (isHost || isGuest)) {
          const agoraPreset = quality === '1080p' ? '1080p_1' : quality === '480p' ? '480p_1' : '720p_1';
          localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack().catch(() => null);
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack({ encoderConfig: agoraPreset as any }).catch(() => null);
          
          if (localVideoTrack.current && room.beautyEnabled) {
            await localVideoTrack.current.setBeautyEffect(true, {
              lighteningContrastLevel: 1,
              lighteningLevel: 0.7,
              smoothnessLevel: 0.5,
              rednessLevel: 0.1,
            }).catch(e => console.warn("Beauty effect failed:", e));
          }

          if (isMounted && client.connectionState === "CONNECTED") {
            const tracks = [];
            if (localAudioTrack.current) { await localAudioTrack.current.setEnabled(!isMuted); tracks.push(localAudioTrack.current); }
            if (localVideoTrack.current) { await localVideoTrack.current.setEnabled(!isCameraOff); tracks.push(localVideoTrack.current); }
            if (tracks.length > 0) await client.publish(tracks).catch(e => console.warn("Failed to publish tracks:", e));
          }
        }
      } catch (err: any) {
        if (err && err.code !== 'OPERATION_ABORTED' && err.code !== 'WS_ABORT') {
          console.error("Agora Init Failed:", safeJsonStringify(err));
        }
      }
    };

    initAgora();

    return () => {
      isMounted = false;
      const cleanup = async () => {
        isJoining.current = false;
        if (localAudioTrack.current) { localAudioTrack.current.stop(); localAudioTrack.current.close(); localAudioTrack.current = null; }
        if (localVideoTrack.current) { localVideoTrack.current.stop(); localVideoTrack.current.close(); localVideoTrack.current = null; }
        if (client) {
          client.removeAllListeners();
          await client.leave().catch(() => {});
          agoraClient.current = null;
        }
      };
      cleanup();
    };
  }, [room.id, user.uid, isHost, isGuest]);

  // Sync mute/camera states without re-joining
  useEffect(() => {
    const syncTracks = async () => {
      if (localAudioTrack.current) await localAudioTrack.current.setEnabled(!isMuted).catch(() => {});
      if (localVideoTrack.current) await localVideoTrack.current.setEnabled(!isCameraOff).catch(() => {});
    };
    syncTracks();
  }, [isMuted, isCameraOff]);

  useEffect(() => {
    if (currentRoomData?.truthMode?.active && currentRoomData.truthMode.expiresAt) {
      const interval = setInterval(() => {
        const expiresAt = currentRoomData.truthMode!.expiresAt.toDate ? currentRoomData.truthMode!.expiresAt.toDate().getTime() : new Date(currentRoomData.truthMode!.expiresAt).getTime();
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTruthModeTimeLeft(diff);
        if (diff <= 0) {
          if (isHost) {
            updateDoc(doc(db, 'live_rooms', room.id), { 'truthMode.active': false }).catch(() => {});
          }
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTruthModeTimeLeft(null);
    }
  }, [currentRoomData?.truthMode, room.id, isHost]);

  const toggleWatchTogether = async () => {
    if (!isHost) return;
    try {
      await updateDoc(doc(db, 'live_rooms', room.id), {
        watchTogetherEnabled: !currentRoomData?.watchTogetherEnabled
      });
    } catch (err) {
      console.error("Error toggling watch together:", safeJsonStringify(err));
    }
  };

  const toggleRequests = async () => {
    if (!isHost) return;
    try {
      await updateDoc(doc(db, 'live_rooms', room.id), {
        requestsEnabled: !(currentRoomData?.requestsEnabled ?? true)
      });
    } catch (err) {
      console.error("Error toggling requests:", safeJsonStringify(err));
    }
  };

  const toggleComments = async () => {
    if (!isHost) return;
    try {
      await updateDoc(doc(db, 'live_rooms', room.id), {
        commentsEnabled: !(currentRoomData?.commentsEnabled ?? true)
      });
    } catch (err) {
      console.error("Error toggling comments:", safeJsonStringify(err));
    }
  };

  const joinCall = async () => {
    if (isParticipant || quotaExceeded || !user) return;
    
    // Privacy Check
    if (room.guestPrivacy === 'followers') {
      try {
        const followSnap = await getDoc(doc(db, `users/${room.hostId}/followers`, user.uid));
        if (!followSnap.exists()) {
          alert(language === 'ar' ? 'هذا البث للمتابعين فقط.' : 'This stream is for followers only.');
          return;
        }
      } catch (e) {
        console.error("Privacy check failed:", e);
      }
    } else if (room.guestPrivacy === 'approved') {
      if (!room.allowedGuests?.includes(user.uid)) {
        alert(language === 'ar' ? 'يجب أن تتم دعوتك للانضمام كضيف.' : 'You must be invited to join as a guest.');
        return;
      }
    }

    if (room.type === 'broadcast') {
      if (!(currentRoomData?.requestsEnabled ?? true)) {
        alert(language === 'ar' ? 'طلبات الانضمام معطلة حالياً من قبل المضيف.' : 'Join requests are currently disabled by the host.');
        return;
      }
      await handleGuestAction(user.uid, 'request');
    } else {
      await handleGuestAction(user.uid, 'accept');
    }
  };

  const toggleTruthMode = async () => {
    if (!isHost || quotaExceeded) return;
    
    try {
      const isActive = currentRoomData?.truthMode?.active;
      const batch = writeBatch(db);
      const roomRef = doc(db, 'live_rooms', room.id);
      const systemMsgRef = doc(collection(db, `live_rooms/${room.id}/chat`));

      if (isActive) {
        batch.update(roomRef, { 'truthMode.active': false });
        batch.set(systemMsgRef, {
          text: language === 'ar' ? 'تم إيقاف وضع الصراحة.' : 'Truth mode disabled.',
          senderId: 'system',
          senderName: language === 'ar' ? 'نظام' : 'System',
          senderPhoto: '',
          timestamp: serverTimestamp(),
          type: 'system'
        });
      } else {
        batch.update(roomRef, {
          truthMode: {
            active: true,
            expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
            participantLabels: {} 
          }
        });
        batch.set(systemMsgRef, {
          text: language === 'ar' ? 'تم تفعيل وضع الصراحة! تحدثوا بصراحة الآن.' : 'Truth mode enabled! Speak your mind.',
          senderId: 'system',
          senderName: language === 'ar' ? 'نظام' : 'System',
          senderPhoto: '',
          timestamp: serverTimestamp(),
          type: 'system'
        });
      }
      await batch.commit();
    } catch (err) {
      console.error("Error toggling truth mode in live stream:", err);
      handleFirestoreError(err, OperationType.UPDATE, `live_rooms/${room.id}`);
    }
  };

  const toggleMute = async () => {
    try {
      if (!isParticipant) return;
      
      const newMuted = !isMuted;
      setIsMuted(newMuted);

      if (agoraClient.current && agoraClient.current.connectionState === "CONNECTED") {
        if (newMuted) {
          // FAILSAFE MUTE: Unpublish and disable
          if (localAudioTrack.current) {
            await agoraClient.current.unpublish(localAudioTrack.current);
            await localAudioTrack.current.setEnabled(false);
          }
        } else {
          // UNMUTE: Enable and publish
          if (!localAudioTrack.current) {
            localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
          }
          await localAudioTrack.current.setEnabled(true);
          await agoraClient.current.publish(localAudioTrack.current);
        }
      } else {
        // Just local state if not connected
        if (localAudioTrack.current) {
          await localAudioTrack.current.setEnabled(!newMuted);
        }
      }
      
      if (isHost) {
        updateDoc(doc(db, 'live_rooms', room.id), { isHostMuted: newMuted }).catch(() => {});
      } else if (isGuest) {
        const updatedGuests = (currentRoomData?.guests || []).map(g => 
          g.uid === user.uid ? { ...g, isMuted: newMuted } : g
        );
        updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests }).catch(() => {});
      }
    } catch (err) {
      console.error("Error toggling mute in LiveStream:", err);
    }
  };

  const toggleCamera = async () => {
    try {
      if (!isParticipant) return;
      
      const newCameraOff = !isCameraOff;
      setIsCameraOff(newCameraOff);

      if (agoraClient.current && agoraClient.current.connectionState === "CONNECTED") {
        if (newCameraOff) {
          // FAILSAFE CAMERA OFF: Unpublish and disable
          if (localVideoTrack.current) {
            await agoraClient.current.unpublish(localVideoTrack.current);
            await localVideoTrack.current.setEnabled(false);
          }
        } else {
          // CAMERA ON: Enable and publish
          if (!localVideoTrack.current) {
            localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          }
          await localVideoTrack.current.setEnabled(true);
          await agoraClient.current.publish(localVideoTrack.current);
        }
      } else {
        if (localVideoTrack.current) {
          await localVideoTrack.current.setEnabled(!newCameraOff);
        }
      }
      
      if (isHost) {
        updateDoc(doc(db, 'live_rooms', room.id), { isCameraOff: newCameraOff }).catch(() => {});
      } else if (isGuest) {
        const updatedGuests = (currentRoomData?.guests || []).map(g => 
          g.uid === user.uid ? { ...g, isCameraOff: newCameraOff } : g
        );
        updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests }).catch(() => {});
      }
    } catch (err) {
      console.error("Error toggling camera in LiveStream:", err);
    }
  };

  const stopScreenShare = async () => {
    try {
      if (!isSharingScreen || !agoraClient.current) return;
      
      // Stop screen track
      if (localVideoTrack.current) {
        localVideoTrack.current.stop();
        localVideoTrack.current.close();
      }
      
      // Re-create camera track
      const newCameraTrack = await AgoraRTC.createCameraVideoTrack().catch(() => null);
      if (newCameraTrack) {
        localVideoTrack.current = newCameraTrack;
        await localVideoTrack.current.setEnabled(!isCameraOff);
        if (agoraClient.current && (agoraClient.current.connectionState === "CONNECTED" || agoraClient.current.connectionState === "CONNECTING")) {
          await agoraClient.current.publish(localVideoTrack.current).catch(e => console.warn("Retry publish camera failed:", e));
        }
      }
      
      setIsSharingScreen(false);
      if (isHost) {
        updateDoc(doc(db, 'live_rooms', room.id), { isSharingScreen: false }).catch(() => {});
      } else if (isGuest) {
        const updatedGuests = (currentRoomData?.guests || []).map(g => 
          g.uid === user.uid ? { ...g, isSharingScreen: false } : g
        );
        updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests }).catch(() => {});
      }
    } catch (err) {
      console.error("Error stopping screen share:", safeJsonStringify(err));
    }
  };

  const handleScreenShare = async () => {
    try {
      if (isSharingScreen) {
        await stopScreenShare();
        return;
      }

      if (!agoraClient.current) {
        console.warn("Agora client not ready for screen share");
        return;
      }

      // Pre-check for screen sharing support
      if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
         setConfirmationModal({
          title: language === 'ar' ? 'مشاركة الشاشة غير مدعومة' : 'Screen Share Not Supported',
          message: language === 'ar' 
            ? 'متصفحك الحالي لا يدعم مشاركة الشاشة. يرجى استخدام متصفح حديث مثل Chrome أو Firefox.' 
            : 'Your current browser does not support screen sharing. Please use a modern browser.',
          onConfirm: () => setConfirmationModal(null),
          confirmLabel: language === 'ar' ? 'حسناً' : 'OK',
          type: 'info'
        });
        return;
      }
      
      try {
        // 1. Create screen track using Agora
        const screenTrackResult = await AgoraRTC.createScreenVideoTrack({ 
          encoderConfig: "1080p_1",
          optimizationMode: "detail",
          screenSourceType: "screen"
        }, "auto");

        const track = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
        
        // 2. Handle stop share from browser "Stop Sharing" button
        track.on("track-ended", () => {
          console.log("Screen share ended via browser UI");
          stopScreenShare().catch(console.error);
        });

        // 3. Unpublish camera, publish screen
        if (localVideoTrack.current) {
          if (agoraClient.current && (agoraClient.current.connectionState === "CONNECTED" || agoraClient.current.connectionState === "CONNECTING")) {
            await agoraClient.current.unpublish(localVideoTrack.current).catch(() => {});
          }
          localVideoTrack.current.stop();
          localVideoTrack.current.close();
        }
        
        localVideoTrack.current = track;
        if (agoraClient.current && (agoraClient.current.connectionState === "CONNECTED" || agoraClient.current.connectionState === "CONNECTING")) {
          await agoraClient.current.publish(localVideoTrack.current).catch(e => {
            console.error("Failed to publish screen track:", e);
            stopScreenShare();
          });
        }
        
        setIsSharingScreen(true);
        setIsCameraOff(false); // Enable visibility automatically

        // Sync state to Firestore
        if (isHost) {
          updateDoc(doc(db, 'live_rooms', room.id), { isSharingScreen: true, isCameraOff: false }).catch(() => {});
        } else if (isGuest) {
          const updatedGuests = (currentRoomData?.guests || []).map(g => 
            g.uid === user.uid ? { ...g, isSharingScreen: true, isCameraOff: false } : g
          );
          updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests }).catch(() => {});
        }
      } catch (e: any) {
        if (e.code === 'NOT_SUPPORTED' || e.message?.includes('not supported')) {
          setConfirmationModal({
            title: language === 'ar' ? 'مشاركة الشاشة غير مدعومة' : 'Screen Share Not Supported',
            message: language === 'ar' 
              ? 'متصفحك الحالي لا يدعم مشاركة الشاشة في هذه البيئة. يرجى فتح التطبيق في علامة تبويب جديدة.' 
              : 'Your current browser does not support screen sharing in this environment. Please open in a new tab.',
            onConfirm: () => setConfirmationModal(null),
            confirmLabel: language === 'ar' ? 'حسناً' : 'OK',
            type: 'info'
          });
        } else if (e.code === 'PERMISSION_DENIED' || e.name === 'NotAllowedError') {
           console.log("User denied screen share permission");
        } else {
          console.error("Screen share activation failed:", safeJsonStringify(e));
        }
      }
    } catch (err) {
      console.error("Error toggling screen share:", safeJsonStringify(err));
    }
  };

  const handleQualityChange = async (newQuality: string) => {
    if (!isHost || quotaExceeded || !localVideoTrack.current) return;
    
    try {
      setQuality(newQuality);
      setShowQualityMenu(false);
      
      // Map quality string to Agora Preset
      const agoraPreset = newQuality === '1080p' ? '1080p_1' : 
                          newQuality === '720p' ? '720p_1' : 
                          newQuality === '480p' ? '480p_1' : '720p_1';

      await localVideoTrack.current.setEncoderConfiguration(agoraPreset as any);
      
      // Update room in Firestore
      await updateDoc(doc(db, 'live_rooms', room.id), {
        quality: newQuality
      });
    } catch (err) {
      console.error("Error updating stream quality:", err);
    }
  };

  const handleLayoutChange = async (newLayout: 'grid' | 'fullscreen') => {
    if (!isHost || quotaExceeded) return;
    try {
      setShowGridView(newLayout === 'grid');
      await updateDoc(doc(db, 'live_rooms', room.id), { layout: newLayout });
    } catch (err) {
      console.error("Error updating stream layout:", err);
    }
  };

  const handleBeautyChange = async (enabled: boolean) => {
    if (!isHost || quotaExceeded || !localVideoTrack.current) return;
    try {
      await localVideoTrack.current.setBeautyEffect(enabled, {
        lighteningContrastLevel: 1,
        lighteningLevel: 0.7,
        smoothnessLevel: 0.5,
        rednessLevel: 0.1,
      });
      await updateDoc(doc(db, 'live_rooms', room.id), { beautyEnabled: enabled });
    } catch (err) {
      console.error("Error toggling beauty effect:", err);
    }
  };

  const handleGuestAction = async (guestUid: string, action: 'accept' | 'reject' | 'mute' | 'unmute' | 'remove' | 'invite' | 'request', guestData?: { name: string, photo: string }) => {
    if (quotaExceeded) return;

    try {
      await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(doc(db, 'live_rooms', room.id));
        if (!roomDoc.exists()) return;
        
        let updatedGuests = [...(roomDoc.data().guests || [])];
        const guestIndex = updatedGuests.findIndex(g => g.uid === guestUid);
        const roomType = roomDoc.data().type || 'broadcast';
        
        if (action === 'invite') {
          if (!isHost) return;
          if (guestIndex !== -1) return;
          
          updatedGuests.push({
            uid: guestUid,
            name: guestData?.name || 'Guest',
            photo: guestData?.photo || '',
            isMuted: true,
            isCameraOff: true,
            status: 'pending',
            invitedByHost: true,
            joinedAt: Date.now()
          });
          
          transaction.update(doc(db, 'live_rooms', room.id), { 
            guests: updatedGuests,
            participants: updatedGuests.map(g => g.uid),
            allowedGuests: arrayUnion(guestUid)
          });
          return;
        } else if (action === 'request') {
          if (guestIndex !== -1) return;
          updatedGuests.push({
            uid: user.uid,
            name: profile?.displayName || 'Guest',
            photo: profile?.photoURL || '',
            isMuted: true,
            isCameraOff: true,
            status: 'pending',
            joinedAt: Date.now()
          });
        } else if (guestIndex !== -1 || action === 'accept') {
          if (action === 'accept') {
            if (updatedGuests.filter(g => g.status === 'accepted').length >= 8) {
              throw new Error(language === 'ar' ? "تم الوصول للحد الأقصى للضيوف (8)" : "Maximum guests reached (8)");
            }
            if (guestIndex === -1) {
              // Direct join (for group calls or auto-accept situations)
              updatedGuests.push({
                uid: guestUid,
                name: profile?.displayName || 'Guest',
                photo: profile?.photoURL || '',
                isMuted: true,
                isCameraOff: true,
                status: 'accepted',
                joinedAt: Date.now()
              });
            } else {
              updatedGuests[guestIndex].status = 'accepted';
            }
          } else if (guestIndex !== -1) {
            if (action === 'reject') {
              updatedGuests[guestIndex].status = 'rejected';
            } else if (action === 'mute' && canModerate) {
              updatedGuests[guestIndex].isMuted = true;
            } else if (action === 'unmute' && canModerate) {
              updatedGuests[guestIndex].isMuted = false;
            } else if (action === 'remove' && canModerate) {
              updatedGuests = updatedGuests.filter(g => g.uid !== guestUid);
            }
          }
        } else {
          return;
        }

        const updatedParticipants = updatedGuests.map(g => g.uid);
        transaction.update(doc(db, 'live_rooms', room.id), { 
          guests: updatedGuests,
          participants: updatedParticipants
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === (language === 'ar' ? "تم الوصول للحد الأقصى للضيوف (8)" : "Maximum guests reached (8)")) {
        alert(err.message);
      } else {
        handleFirestoreError(err, OperationType.UPDATE, `live_rooms/${room.id}`);
      }
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !replyTo) return;
    if (currentRoomData?.commentsEnabled === false && !isHost) {
      alert(language === 'ar' ? "لقد تم تعطيل التعليقات في هذا البث." : "Comments are disabled in this stream.");
      return;
    }
    if (currentRoomData?.mutedUsers?.includes(user.uid) || currentRoomData?.blockedUsers?.includes(user.uid)) {
      alert(language === 'ar' ? "لا يمكنك إرسال تعليقات لأنك مكتوم أو محظور في هذا البث." : "You cannot send comments because you are muted or blocked in this stream.");
      return;
    }
    const text = newMessage.trim();
    setNewMessage("");

    try {
      const truthMode = currentRoomData?.truthMode;
      const isTruthModeActive = truthMode?.active && 
                                truthMode.expiresAt && 
                                (truthMode.expiresAt.toDate ? truthMode.expiresAt.toDate().getTime() : new Date(truthMode.expiresAt).getTime()) > Date.now();
      
      const isAnonymous = isTruthModeActive;
      
      // Safety Check for all messages
      setIsModerating(true);
      const moderation = await moderateMessage(text);
      setIsModerating(false);
      if (!moderation.allowed) {
        alert(moderation.warning || t.messageBlocked);
        return;
      }

      await addDoc(collection(db, `live_rooms/${room.id}/chat`), {
        text,
        senderId: user.uid,
        senderName: isAnonymous ? `مجهول ${user.uid.slice(0, 4)}` : (user.displayName || 'مجهول'),
        senderPhoto: isAnonymous ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}` : (user.photoURL || ''),
        timestamp: serverTimestamp(),
        isAnonymous,
        parentId: replyTo?.id || null,
        type: 'user'
      });
      setReplyTo(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `live_rooms/${room.id}/chat`);
    }
  };

  const handleReply = (message: any) => {
    if (message.type === 'system') return;
    setReplyTo(message);
    setNewMessage(`@${message.senderName} `);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };
 

  const addReaction = async (emoji: string) => {
    if (!user) return;
    if (currentRoomData?.mutedUsers?.includes(user.uid) || currentRoomData?.blockedUsers?.includes(user.uid)) return;
    try {
      const reactionData = {
        emoji,
        senderId: user.uid,
        timestamp: new Date()
      };
      
      // Batch update for performance
      await Promise.all([
        addDoc(collection(db, `live_rooms/${room.id}/reactions`), {
          ...reactionData,
          timestamp: serverTimestamp()
        }),
        updateDoc(doc(db, 'live_rooms', room.id), {
          reactions: arrayUnion(reactionData)
        })
      ]);

      // Cleanup logic (keep only last 20 in the array)
      if (currentRoomData?.reactions && currentRoomData.reactions.length > 20) {
        const oldestReaction = currentRoomData.reactions[0];
        await updateDoc(doc(db, 'live_rooms', room.id), {
          reactions: arrayRemove(oldestReaction)
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `live_rooms/${room.id}/reactions`);
    }
  };

  const handleMessageReaction = async (messageId: string, emoji: string) => {
    if (!user || quotaExceeded) return;
    try {
      const messageRef = doc(db, `live_rooms/${room.id}/chat`, messageId);
      await runTransaction(db, async (transaction) => {
        const msgDoc = await transaction.get(messageRef);
        if (!msgDoc.exists()) return;
        
        const data = msgDoc.data() as any;
        const reactions = data.reactions || {};
        const uids = reactions[emoji] || [];
        
        if (uids.includes(user.uid)) {
          reactions[emoji] = uids.filter((id: string) => id !== user.uid);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...uids, user.uid];
        }
        
        transaction.update(messageRef, { reactions });
      });
      setActiveMessageForReactions(null);
    } catch (err) {
      console.error("Error reacting to message:", safeJsonStringify(err));
    }
  };

  const deleteChatMessage = async (messageId: string) => {
    if (quotaExceeded) return;
    try {
      await deleteDoc(doc(db, `live_rooms/${room.id}/chat`, messageId));
      setLongPressedMessage(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `live_rooms/${room.id}/chat/${messageId}`);
    }
  };

  const updateChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessageId || !editMessageValue.trim() || quotaExceeded) return;
    try {
      const text = editMessageValue.trim();
      await updateDoc(doc(db, `live_rooms/${room.id}/chat`, editingMessageId), {
        text,
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingMessageId(null);
      setEditMessageValue("");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `live_rooms/${room.id}/chat/${editingMessageId}`);
    }
  };

  const handleModerationAction = async (targetUserId: string, action: 'mute' | 'unmute' | 'block' | 'unblock' | 'make_moderator') => {
    if (!canModerate || quotaExceeded) return;

    // Moderator protection: Moderator cannot mute/block another moderator or owner
    if (isModerator && !isOwner && action !== 'make_moderator') {
      if (isTargetModerator(targetUserId) || isTargetOwner(targetUserId)) return;
    }

    try {
      const roomRef = doc(db, 'live_rooms', room.id);
      const isHostAction = targetUserId === room.hostId;
      const targetUser = allUsers.find(u => u.uid === targetUserId) || viewers.find(v => v.uid === targetUserId);
      const targetName = targetUser?.displayName || (language === 'ar' ? 'مستخدم' : 'User');

      if (action === 'mute') {
        await updateDoc(roomRef, { 
          mutedUsers: arrayUnion(targetUserId),
          ...(isHostAction ? { isHostMuted: true } : {})
        });
        await addDoc(collection(db, `live_rooms/${room.id}/chat`), {
          text: language === 'ar' ? `تم كتم ${targetName} بواسطة المشرف.` : `${targetName} was muted by moderator.`,
          senderId: 'system',
          senderName: language === 'ar' ? 'نظام' : 'System',
          senderPhoto: '',
          timestamp: serverTimestamp(),
          type: 'system'
        });
      } else if (action === 'unmute') {
        const updatedMuted = (currentRoomData?.mutedUsers || []).filter(id => id !== targetUserId);
        await updateDoc(roomRef, { 
          mutedUsers: updatedMuted,
          ...(isHostAction ? { isHostMuted: false } : {})
        });
        await addDoc(collection(db, `live_rooms/${room.id}/chat`), {
          text: language === 'ar' ? `تم إلغاء كتم ${targetName} بواسطة المشرف.` : `${targetName} was unmuted by moderator.`,
          senderId: 'system',
          senderName: language === 'ar' ? 'نظام' : 'System',
          senderPhoto: '',
          timestamp: serverTimestamp(),
          type: 'system'
        });
      } else if (action === 'block') {
        setConfirmationModal({
          isOpen: true,
          title: t.blockUserTitle,
          message: t.blockUserConfirm,
          confirmText: t.blockAction,
          cancelText: t.cancelAction,
          isDanger: true,
          onConfirm: async () => {
            try {
              const snap = await getDoc(roomRef);
              const roomData = snap.data();
              const guests = roomData?.guests || [];
              const updatedGuests = guests.filter((g: any) => g.uid !== targetUserId);
              const updatedParticipants = updatedGuests.map((g: any) => g.uid);

              await updateDoc(roomRef, { 
                blockedUsers: arrayUnion(targetUserId),
                guests: updatedGuests,
                participants: updatedParticipants
              });
              await addDoc(collection(db, `live_rooms/${room.id}/chat`), {
                text: language === 'ar' ? `تم طرد ${targetName} من البث.` : `${targetName} was removed from the live stream.`,
                senderId: 'system',
                senderName: language === 'ar' ? 'نظام' : 'System',
                senderPhoto: '',
                timestamp: serverTimestamp(),
                type: 'system'
              });
              setConfirmationModal(null);
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `live_rooms/${room.id}`);
            }
          }
        });
      } else if (action === 'make_moderator') {
        if (!isOwner) return;
        await updateDoc(doc(db, 'live_rooms', room.id), {
          moderators: arrayUnion(targetUserId)
        });
        await addDoc(collection(db, `live_rooms/${room.id}/chat`), {
          text: language === 'ar' ? `تم تعيين ${targetName} كمشرف.` : `${targetName} was assigned as a moderator.`,
          senderId: 'system',
          senderName: language === 'ar' ? 'نظام' : 'System',
          senderPhoto: '',
          timestamp: serverTimestamp(),
          type: 'system'
        });
      } else if (action === 'unblock') {
        const updatedBlocked = (currentRoomData?.blockedUsers || []).filter(id => id !== targetUserId);
        await updateDoc(roomRef, { blockedUsers: updatedBlocked });
      }
      setSelectedMessageId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `live_rooms/${room.id}`);
    }
  };

  const cancelGuestJoinRequest = async () => {
    if (!quotaExceeded) {
      try {
        await runTransaction(db, async (transaction) => {
          const roomDoc = await transaction.get(doc(db, 'live_rooms', room.id));
          if (!roomDoc.exists()) return;
          const guests = roomDoc.data().guests || [];
          const updatedGuests = guests.filter((g: any) => g.uid !== user.uid);
          const updatedParticipants = updatedGuests.map((g: any) => g.uid);
          transaction.update(doc(db, 'live_rooms', room.id), { 
            guests: updatedGuests,
            participants: updatedParticipants
          });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `live_rooms/${room.id}`);
      }
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AUTO-JOIN as speaker for group calls if common member
  useEffect(() => {
    if (!isParticipant && room.type === 'group_call') {
      console.log("Auto-joining group call as participant...");
      if (typeof joinCall === 'function') {
        joinCall();
      }
    }
  }, [isParticipant, room.type]);

  // Helper to render shared modals (Viewer list, Participant info, Guest Requests, etc.)
  function renderSharedModals() {
    return (
      <>
        {/* Stream Ended Fallback UI */}
        <AnimatePresence>
          {(streamEnded || !room || !room.id) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 20 }}
                className="mb-8 p-10 bg-red-500/10 rounded-full border border-red-500/20"
              >
                <Ban className="w-20 h-20 text-red-500" />
              </motion.div>
              <h2 className="text-4xl font-display font-black text-white mb-4 tracking-tight">
                {t.liveStreamEnded}
              </h2>
              <p className="text-white/40 mb-12 max-w-sm text-xl font-medium leading-relaxed">
                {t.liveStreamEndedDesc}
              </p>
              <button 
                onClick={onClose} 
                className="w-full max-w-xs px-10 py-5 bg-white text-black font-black rounded-[2rem] hover:bg-gray-200 transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-3"
              >
                <XCircle className="w-6 h-6" />
                <span>{t.close}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Settings Modal */}
        <AnimatePresence>
          {showLiveSettings && isHost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLiveSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#16181d] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 p-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-white font-black text-xl">{language === 'ar' ? 'إعدادات البث' : 'Live Settings'}</h3>
                  <button onClick={() => setShowLiveSettings(false)} className="p-2 hover:bg-white/5 rounded-full">
                    <X className="w-5 h-5 text-white/40" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Manage Guests Link (New) */}
                  <button 
                    onClick={() => { setShowLiveSettings(false); setShowGuestRequests(true); }}
                    className="w-full flex items-center justify-between p-4 bg-blue-600/10 hover:bg-blue-600/20 rounded-2xl border border-blue-500/20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{language === 'ar' ? 'إدارة الضيوف والطلبات' : 'Manage Guests & Requests'}</p>
                        <p className="text-[10px] text-white/40">{language === 'ar' ? 'الموافقة، الرفض، الكتم، الحظر، والترقية' : 'Approve, reject, mute, block, and promote'}</p>
                      </div>
                    </div>
                    <ChevronLeft className={`w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors ${language === 'ar' ? '' : 'rotate-180'}`} />
                  </button>

                  {/* Watch Together Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 rounded-xl">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{t.watchTogether}</p>
                        <p className="text-[10px] text-white/40">{t.watchTogetherDesc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleWatchTogether}
                      className={`w-12 h-6 rounded-full transition-all relative ${currentRoomData?.watchTogetherEnabled ? 'bg-blue-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentRoomData?.watchTogetherEnabled ? (language === 'ar' ? 'left-1' : 'left-7') : (language === 'ar' ? 'left-7' : 'left-1')}`} />
                    </button>
                  </div>

                  {/* Truth Mode Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/20 rounded-xl">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{t.truthMode}</p>
                        <p className="text-[10px] text-white/40">{language === 'ar' ? 'تفعيل وضع الصراحة والأسئلة المجهولة' : 'Enable truth mode and anonymous questions'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleTruthMode}
                      className={`w-12 h-6 rounded-full transition-all relative ${currentRoomData?.truthMode?.active ? 'bg-purple-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentRoomData?.truthMode?.active ? (language === 'ar' ? 'left-1' : 'left-7') : (language === 'ar' ? 'left-7' : 'left-1')}`} />
                    </button>
                  </div>

                  {/* Join Requests Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-500/20 rounded-xl">
                        <UserPlus className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{language === 'ar' ? 'طلبات الانضمام' : 'Join Requests'}</p>
                        <p className="text-[10px] text-white/40">{language === 'ar' ? 'السماح للمشاهدين بطلب الانضمام كضيوف' : 'Allow viewers to request to join as guests'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleRequests}
                      className={`w-12 h-6 rounded-full transition-all relative ${(currentRoomData?.requestsEnabled ?? true) ? 'bg-green-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${(currentRoomData?.requestsEnabled ?? true) ? (language === 'ar' ? 'left-1' : 'left-7') : (language === 'ar' ? 'left-7' : 'left-1')}`} />
                    </button>
                  </div>

                  {/* Comments Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-yellow-500/20 rounded-xl">
                        <MessageCircle className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{language === 'ar' ? 'التعليقات' : 'Comments'}</p>
                        <p className="text-[10px] text-white/40">{language === 'ar' ? 'تفعيل أو تعطيل التعليقات في البث' : 'Enable or disable comments in the stream'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleComments}
                      className={`w-12 h-6 rounded-full transition-all relative ${(currentRoomData?.commentsEnabled ?? true) ? 'bg-yellow-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${(currentRoomData?.commentsEnabled ?? true) ? (language === 'ar' ? 'left-1' : 'left-7') : (language === 'ar' ? 'left-7' : 'left-1')}`} />
                    </button>
                  </div>

                  {/* Grid/Fullscreen Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 rounded-xl">
                        <LayoutGrid className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{language === 'ar' ? 'نمط العرض' : 'Layout Mode'}</p>
                        <p className="text-[10px] text-white/40">{language === 'ar' ? 'عرض المشاركين كشبكة أو شاشة كاملة' : 'Show participants in grid or fullscreen'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleLayoutChange(currentRoomData?.layout === 'fullscreen' ? 'grid' : 'fullscreen')}
                      className={`w-12 h-6 rounded-full transition-all relative ${currentRoomData?.layout !== 'fullscreen' ? 'bg-blue-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentRoomData?.layout !== 'fullscreen' ? (language === 'ar' ? 'left-1' : 'left-7') : (language === 'ar' ? 'left-7' : 'left-1')}`} />
                    </button>
                  </div>

                  {/* Beauty Filter Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-pink-500/20 rounded-xl">
                        <Sparkles className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{language === 'ar' ? 'فلتر التجميل' : 'Beauty Filter'}</p>
                        <p className="text-[10px] text-white/40">{language === 'ar' ? 'تحسين مظهر الفيديو تلقائياً' : 'Automatically enhance appearance'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleBeautyChange(!currentRoomData?.beautyEnabled)}
                      className={`w-12 h-6 rounded-full transition-all relative ${currentRoomData?.beautyEnabled ? 'bg-pink-600' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentRoomData?.beautyEnabled ? (language === 'ar' ? 'left-1' : 'left-7') : (language === 'ar' ? 'left-7' : 'left-1')}`} />
                    </button>
                  </div>

                  {/* Quality Settings */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-500/20 rounded-xl">
                        <Settings className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="text-right">
                      <p className="text-sm font-bold text-white">{t.liveQuality}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">{quality}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showQualityMenu ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Quality Dropdown Menu */}
                <AnimatePresence>
                  {showQualityMenu && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white/5 rounded-2xl border border-white/5 mt-2"
                    >
                      {['480p', '720p', '1080p'].map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQualityChange(q)}
                          className={`w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors ${quality === q ? 'bg-blue-500/10' : ''}`}
                        >
                          <span className={`text-sm font-bold ${quality === q ? 'text-blue-400' : 'text-white/60'}`}>{q}</span>
                          {quality === q && <Check className="w-4 h-4 text-blue-400" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>

                <div className="mt-10">
                  <button 
                    onClick={() => setConfirmationModal({
                      title: t.endLiveTitle,
                      message: t.endLiveConfirm,
                      onConfirm: () => { onClose(); setConfirmationModal(null); },
                      onCancel: () => setConfirmationModal(null),
                      confirmText: t.endAction,
                      confirmColor: 'bg-red-600'
                    })}
                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-2xl transition-all border border-red-500/20"
                  >
                    {t.endLive}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest Requests Modal */}
        <AnimatePresence>
          {showGuestRequests && isHost && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="absolute inset-x-0 bottom-0 top-20 bg-[#0f1014] rounded-t-[32px] z-[120] flex flex-col p-6 shadow-2xl overflow-hidden font-sans"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-500 w-6 h-6" />
                  <h3 className="text-white font-bold text-lg">{language === 'ar' ? 'طلبات الانضمام' : 'Join Requests'}</h3>
                </div>
                <button 
                  onClick={() => setShowGuestRequests(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-10">
                {/* Active Guests */}
                <div>
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">
                    {language === 'ar' ? 'الضيوف المتصلون' : 'Active Guests'}
                  </h4>
                  <div className="space-y-4">
                    {(currentRoomData?.guests?.filter(g => g.status === 'accepted') || []).map((guest) => (
                      <div key={guest.uid} className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={guest.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guest.uid}`} className="w-12 h-12 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                            <div>
                              <p className="text-white font-bold text-sm leading-none mb-1">{guest.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-green-500 text-[10px] uppercase font-bold tracking-tighter">{language === 'ar' ? 'مباشر' : 'Live'}</p>
                                {(currentRoomData?.moderators || []).includes(guest.uid) && (
                                  <span className="bg-purple-600/20 text-purple-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">{language === 'ar' ? 'مشرف' : 'MOD'}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleGuestAction(guest.uid, guest.isMuted ? 'unmute' : 'mute')}
                              className={`p-2.5 rounded-xl transition-all ${guest.isMuted ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}
                              title={guest.isMuted ? (language === 'ar' ? 'إلغاء كتم' : 'Unmute') : (language === 'ar' ? 'كتم' : 'Mute')}
                            >
                              {guest.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => handleGuestAction(guest.uid, 'remove')}
                              className="p-2.5 rounded-xl bg-gray-500/20 text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all"
                              title={language === 'ar' ? 'إخراج' : 'Remove'}
                            >
                              <PhoneOff className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Quick Host Actions for Guests */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <button 
                            onClick={() => handleModerationAction(guest.uid, 'block')}
                            className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <Ban className="w-3 h-3" />
                            {language === 'ar' ? 'حظر' : 'Block'}
                          </button>
                          {isOwner && !(currentRoomData?.moderators || []).includes(guest.uid) && (
                            <button 
                              onClick={() => handleModerationAction(guest.uid, 'make_moderator')}
                              className="flex-1 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-black rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {language === 'ar' ? 'ترقية لمشرف' : 'Make Mod'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Requests */}
                <div>
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 border-b border-blue-500/10 pb-2">
                    {language === 'ar' ? 'طلبات الانتظار' : 'Pending Requests'}
                  </h4>
                  <div className="space-y-4">
                    {(currentRoomData?.guests?.filter(g => g.status === 'pending') || []).map((guest) => (
                      <div key={guest.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <img src={guest.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guest.uid}`} className="w-12 h-12 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-white font-bold text-sm leading-none mb-1">{guest.name}</p>
                            <p className="text-white/40 text-[10px]">{language === 'ar' ? 'يطلب الانضمام' : 'Wants to join'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleModerationAction(guest.uid, 'block')}
                            className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all text-red-500"
                            title={language === 'ar' ? 'حظر' : 'Block'}
                          >
                            <Ban className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleGuestAction(guest.uid, 'reject')}
                            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleGuestAction(guest.uid, 'accept')}
                            className="px-4 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-xl transition-all text-white font-bold text-xs"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {language === 'ar' ? 'قبول' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Participant Info Modal */}
        <AnimatePresence>
          {selectedParticipant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedParticipant(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#16181d] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 p-8 text-center"
              >
                <div className="relative inline-block mb-6">
                  <img src={selectedParticipant.photo} className="w-24 h-24 rounded-full border-4 border-white/10 object-cover shadow-2xl" referrerPolicy="no-referrer" />
                  {selectedParticipant.isHost && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase border border-black shadow-lg flex items-center gap-1">
                      <Crown className="w-2 h-2 fill-white" />
                      <span>{language === 'ar' ? 'المذيع' : 'Host'}</span>
                    </div>
                  )}
                  {(currentRoomData?.moderators || []).includes(selectedParticipant.uid) && !selectedParticipant.isHost && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase border border-black shadow-lg flex items-center gap-1">
                      <ShieldCheck className="w-2 h-2" />
                      <span>{language === 'ar' ? 'مشرف' : 'Moderator'}</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-white font-black text-xl mb-1">{selectedParticipant.name}</h3>
                <p className="text-white/40 text-xs mb-8">@{selectedParticipant.uid.slice(0, 8)}</p>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { onReport(selectedParticipant.uid, 'user'); setSelectedParticipant(null); }} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold text-sm flex flex-col items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    <span>{language === 'ar' ? 'الحساب' : 'Profile'}</span>
                  </button>
                  {canModerate && !selectedParticipant.isHost && (
                    <>
                      <button 
                        onClick={() => {
                          const guest = currentRoomData?.guests?.find(g => g.uid === selectedParticipant.uid);
                          if (guest) {
                            handleGuestAction(selectedParticipant.uid, guest.isMuted ? 'unmute' : 'mute');
                          } else {
                            handleModerationAction(selectedParticipant.uid, (currentRoomData?.mutedUsers || []).includes(selectedParticipant.uid) ? 'unmute' : 'mute');
                          }
                          setSelectedParticipant(null);
                        }}
                        className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold text-sm flex flex-col items-center gap-2"
                      >
                        {(currentRoomData?.mutedUsers || []).includes(selectedParticipant.uid) ? <Mic className="w-5 h-5 text-green-400" /> : <MicOff className="w-5 h-5 text-gray-400" />}
                        <span>{(currentRoomData?.mutedUsers || []).includes(selectedParticipant.uid) ? (language === 'ar' ? 'إلغاء كتم' : 'Unmute') : (language === 'ar' ? 'كتم' : 'Mute')}</span>
                      </button>
                      {isOwner && !(currentRoomData?.moderators || []).includes(selectedParticipant.uid) && (
                        <button 
                          onClick={() => {
                            handleModerationAction(selectedParticipant.uid, 'make_moderator');
                            setSelectedParticipant(null);
                          }}
                          className="p-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-2xl transition-all font-bold text-sm flex flex-col items-center gap-2"
                        >
                          <ShieldCheck className="w-5 h-5" />
                          <span>{language === 'ar' ? 'تعيين مشرف' : 'Make Moderator'}</span>
                        </button>
                      )}
                      <button onClick={() => { handleModerationAction(selectedParticipant.uid, 'block'); setSelectedParticipant(null); }} className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all font-bold text-sm flex flex-col items-center gap-2">
                        <Ban className="w-5 h-5" />
                        <span>{language === 'ar' ? 'حظر وطرد' : 'Block & Kick'}</span>
                      </button>
                    </>
                  )}
                  {!canModerate && selectedParticipant.uid !== user.uid && (
                    <button onClick={() => { setLocallyMutedUIDs(prev => prev.includes(selectedParticipant.uid) ? prev.filter(id => id !== selectedParticipant.uid) : [...prev, selectedParticipant.uid]); setSelectedParticipant(null); }} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold text-sm flex flex-col items-center gap-2 col-span-2">
                      {locallyMutedUIDs.includes(selectedParticipant.uid) ? <Mic className="w-5 h-5 text-green-400" /> : <MicOff className="w-5 h-5 text-gray-400" />}
                      <span>{locallyMutedUIDs.includes(selectedParticipant.uid) ? (language === 'ar' ? 'إلغاء كتمه عندي' : 'Unmute for me') : (language === 'ar' ? 'كتمه عندي' : 'Mute for me')}</span>
                    </button>
                  )}
                </div>
                <button onClick={() => setSelectedParticipant(null)} className="mt-6 w-full py-3 text-white/40 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest">{language === 'ar' ? 'إغلاق' : 'Close'}</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest Invitation Overlay */}
        <AnimatePresence>
          {currentRoomData?.guests?.find(g => g.uid === user.uid && g.status === 'pending' && g.invitedByHost) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            >
              <div className="bg-[#16181d] rounded-[32px] p-8 w-full max-w-sm border border-white/10 text-center shadow-2xl">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-white font-black text-xl mb-2">{t.inviteAsGuest}</h3>
                <p className="text-white/60 text-sm mb-8">{t.invitedToJoin}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleGuestAction(user.uid, 'accept')}
                    className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    {t.accept}
                  </button>
                  <button 
                    onClick={() => handleGuestAction(user.uid, 'reject')}
                    className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm transition-all active:scale-95 border border-white/10"
                  >
                    {t.reject}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewer List Modal */}
        <AnimatePresence>
          {showViewerList && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="absolute inset-x-0 bottom-0 top-20 bg-[#0f1014] rounded-t-[32px] z-[100] flex flex-col p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold text-lg">{language === 'ar' ? 'المشاركون' : 'Participants'} ({viewers.length})</h3>
                <button onClick={() => setShowViewerList(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                {viewers.map((v) => (
                  <div key={v.uid} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <img src={v.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.uid}`} className="w-10 h-10 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-white font-medium text-sm">{v.displayName}</p>
                          {v.uid === room.hostId && <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                          {(currentRoomData?.moderators || []).includes(v.uid) && <ShieldCheck className="w-3 h-3 text-purple-400" />}
                        </div>
                        <p className="text-white/40 text-[10px]">@{v.username || v.uid?.slice(0, 8)}</p>
                        {v.uid === room.hostId && <p className="text-blue-400 text-[10px] font-bold uppercase tracking-tight">{t.hostLabel}</p>}
                        {(currentRoomData?.moderators || []).includes(v.uid) && v.uid !== room.hostId && <p className="text-purple-400 text-[10px] font-bold uppercase tracking-tight">{language === 'ar' ? 'مشرف' : 'Moderator'}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canModerate && v.uid !== user.uid && v.uid !== room.hostId && (
                        <div className="flex items-center gap-1">
                          {(currentRoomData?.mutedUsers || []).includes(v.uid) ? (
                            <button 
                              onClick={() => handleModerationAction(v.uid, 'unmute')}
                              className="p-2 rounded-full bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all"
                              title={language === 'ar' ? 'إلغاء الكتم' : 'Unmute'}
                            >
                              <MicOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleModerationAction(v.uid, 'mute')}
                              className="p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                              title={language === 'ar' ? 'كتم' : 'Mute'}
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleModerationAction(v.uid, 'block')} 
                            className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                            title={language === 'ar' ? 'طرد' : 'Kick'}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {isHost && v.uid !== user.uid && !currentRoomData?.guests?.some(g => g.uid === v.uid) && (
                        <button 
                          onClick={() => handleGuestAction(v.uid, 'invite', { name: v.displayName || 'Guest', photo: v.photoURL || '' })}
                          className="text-blue-400 hover:text-blue-500 px-3 py-1.5 rounded-full bg-blue-500/10 text-xs transition-colors font-bold uppercase tracking-tighter"
                        >
                          {t.inviteAsGuest}
                        </button>
                      )}
                      <button onClick={() => onReport(v.uid, 'user')} className="text-white/40 hover:text-white px-3 py-1.5 rounded-full bg-white/5 text-xs transition-colors">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] bg-[#0f172a] flex flex-col overflow-hidden select-none">
      {/* Background Ambience */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none z-[1]" />

      {/* Header Info (TikTok Style) */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-[60] bg-gradient-to-b from-black/60 to-transparent pointer-events-none" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Join Audio Action (Autoplay Bypass) */}
          <button 
            onClick={() => {
              remoteUsers.forEach(u => u.audioTrack?.play().catch(e => console.error("Error playing audio track:", e)));
              alert(language === 'ar' ? 'تم تفعيل الصوت للبث' : 'Audio enabled for stream');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all active:scale-95 shadow-xl shadow-blue-500/20 mb-2 group pointer-events-auto animate-pulse"
          >
            <Volume2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">{language === 'ar' ? 'تفعيل الصوت' : 'Join Audio'}</span>
          </button>

          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md pl-1 pr-4 py-1 rounded-full border border-white/10 shadow-lg">
            <div 
              onClick={() => setSelectedParticipant({ 
                uid: room.hostId, 
                name: room.hostName, 
                photo: allUsers.find(u => u.uid === room.hostId)?.photoURL || room.hostPhoto,
                isHost: true 
              })}
              className="relative cursor-pointer"
            >
              <img 
                src={allUsers.find(u => u.uid === room.hostId)?.photoURL || room.hostPhoto} 
                className="w-8 h-8 rounded-full border border-white/20 object-cover" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse" />
            </div>
            <div className="flex flex-col -space-y-0.5">
              <span className="text-white text-[10px] font-black tracking-tight max-w-[80px] truncate">{room.hostName}</span>
              <div className="flex items-center gap-1 opacity-60">
                <Users className="w-2 h-2 text-white" />
                <span className="text-white text-[8px] font-bold uppercase">{viewerCount}</span>
              </div>
            </div>
            {room.hostId !== user.uid && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLiveSubscription(room.hostId);
                }}
                className={`ml-1 p-1.5 rounded-full border border-white/10 transition-all active:scale-90 ${
                  liveSubscriptionIds.has(room.hostId)
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {liveSubscriptionIds.has(room.hostId) ? <Bell className="w-3 h-3 fill-white" /> : <Plus className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2 mr-2 bg-black/20 p-1 rounded-full backdrop-blur-sm" onClick={() => setShowViewerList(true)}>
              {viewers.slice(0, 3).map((v) => (
                <img key={v.uid} src={v.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.uid}`} className="w-6 h-6 rounded-full border border-white/20 shadow-lg object-cover cursor-pointer hover:scale-110 transition-transform" />
              ))}
              {viewers.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-[8px] text-white font-bold cursor-pointer">
                  +{viewers.length - 3}
                </div>
              )}
            </div>
            <button 
              onClick={() => isHost ? handleLayoutChange(showGridView ? 'fullscreen' : 'grid') : setShowGridView(!showGridView)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10 ${showGridView ? 'bg-blue-600' : 'bg-black/40 hover:bg-black/60'}`}
              title={showGridView ? (language === 'ar' ? 'عرض كلاسيكي' : 'Classic View') : (language === 'ar' ? 'عرض شبكي' : 'Grid View')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {truthModeTimeLeft !== null && (
            <div className="bg-purple-600/80 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md border border-purple-400/30">
              <Zap className="w-3 h-3 text-white fill-white" />
              <span className="text-[10px] font-black text-white">{Math.floor(truthModeTimeLeft / 60)}:{(truthModeTimeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-0 overflow-hidden">
        {/* Video Grid / Participant Area */}
        <div className="w-full h-full relative transition-all duration-500">
          {(showGridView && participantsWithMedia.length > 0) ? (
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center p-4">
               <div className={`w-full h-full gap-4 items-center justify-center ${participantsWithMedia.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'flex'}`}>
                 {participantsWithMedia.map((p: any) => {
                   const isSharing = p.isSharingScreen;
                   return (
                     <motion.div 
                       layout
                       initial={{ scale: 0.9, opacity: 0 }}
                       animate={{ 
                         scale: 1, 
                         opacity: 1,
                         // Local PiP logic integrated into grid for consistency but can be pulled out if preferred
                         // Here we treat it as an item in the grid
                       }}
                       key={`video-grid-${p.uid}`}
                       onClick={() => setSelectedParticipant({ 
                         uid: p.uid, 
                         name: p.name, 
                         photo: p.photo, 
                         isHost: p.isHost 
                       })}
                       className={`relative rounded-[2.5rem] bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl group cursor-pointer ${isSharing ? 'col-span-full aspect-video max-w-5xl mx-auto' : 'aspect-video w-full'}`}
                       ref={(el) => {
                         if (el) {
                           if (p.isLocal) {
                             if (localVideoTrack.current && !isCameraOff) {
                               localVideoTrack.current.play(el);
                             }
                           } else {
                             const remoteUser = remoteUsers.find(u => String(u.uid) === String(p.uid) || String(u.uid) === String(p.agoraUid));
                             if (remoteUser?.videoTrack) {
                               remoteUser.videoTrack.play(el);
                             }
                           }
                         }
                       }}
                     >
                        {p.isCameraOff && !isSharing && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#000]">
                             <img src={p.photo} className="w-24 h-24 rounded-full border-4 border-white/10 grayscale opacity-50" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                           <span className="text-[10px] font-black uppercase tracking-wider">{p.isLocal ? t.youLabel : p.name}</span>
                           {p.isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                           {p.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        {isSharing && (
                          <div className="absolute top-4 right-4 z-20 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1.5 border border-blue-400/30">
                            <Monitor className="w-3 h-3" />
                            <span>{language === 'ar' ? 'مشاركة شاشة' : 'SHARING'}</span>
                          </div>
                        )}
                     </motion.div>
                   );
                 })}
               </div>
            </div>
          ) : (
            <>
              {/* Single Host Full Screen (Classic Broadcast View) */}
              <motion.div 
                layout
                onClick={() => setSelectedParticipant({ 
                  uid: room.hostId, 
                  name: room.hostName, 
                  photo: allUsers.find(u => u.uid === room.hostId)?.photoURL || room.hostPhoto,
                  isHost: true 
                })}
                className="absolute inset-0 z-0 bg-black cursor-pointer"
                ref={(el) => {
                  if (el) {
                    if (isHost) {
                      if (localVideoTrack.current && !isCameraOff) {
                        localVideoTrack.current.play(el);
                      }
                    } else {
                      const hostUser = remoteUsers.find(u => String(u.uid) === String(room.hostId) || String(u.uid) === String(currentRoomData?.hostAgoraUid));
                      if (hostUser?.videoTrack) {
                        hostUser.videoTrack.play(el);
                      }
                    }
                  }
                }}
              >
                {((isHost ? isCameraOff : currentRoomData?.isCameraOff)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#000]">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-white/10 flex items-center justify-center p-2">
                        <img 
                          src={allUsersMap[room.hostId]?.photoURL || room.hostPhoto} 
                          className="w-full h-full rounded-full object-cover grayscale opacity-50"
                        />
                      </div>
                      {(isHost ? isMuted : currentRoomData?.isHostMuted) && (
                        <div className="absolute bottom-0 right-0 bg-red-500 p-2 rounded-full border-4 border-black">
                          <MicOff className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-white/40 font-bold tracking-widest uppercase text-xs">{language === 'ar' ? 'الكاميرا مغلقة' : 'CAMERA OFF'}</p>
                  </div>
                )}
                {((isHost && isSharingScreen) || (!isHost && currentRoomData?.isSharingScreen)) && (
                  <div className="absolute top-24 right-6 bg-orange-600 px-3 py-1.5 rounded-full flex items-center gap-2 z-30 shadow-xl border border-white/20">
                    <Monitor className="w-4 h-4 text-white" />
                    <span className="text-xs text-white font-bold">{t.shareScreen}</span>
                  </div>
                )}
              </motion.div>

              {/* Guest PiP Overlay for Classic View */}
              <div className="absolute top-20 right-4 flex flex-col gap-2 z-10 w-32 md:w-48 pointer-events-none">
                {currentRoomData?.guests?.filter(g => g.status === 'accepted').map((guest, index) => {
                  const uid = guest.uid;
                  return (
                    <motion.div 
                      layout
                      key={uid} 
                      initial={{ opacity: 0, scale: 0.8, x: 50 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedParticipant({ uid, name: guest.name, photo: guest.photo, isHost: false });
                      }}
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-900 border-2 border-white/10 shadow-2xl group cursor-pointer pointer-events-auto"
                      ref={(el) => {
                        if (el) {
                          if (uid === user.uid) {
                            if (localVideoTrack.current && !isCameraOff) {
                              localVideoTrack.current.play(el);
                            }
                          } else {
                            const remoteUser = remoteUsers.find(u => String(u.uid) === String(uid) || String(u.uid) === String(guest.agoraUid));
                            if (remoteUser?.videoTrack) {
                              remoteUser.videoTrack.play(el);
                            }
                          }
                        }
                      }}
                    >
                      {guest.isCameraOff && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e293b]">
                          <img src={guest.photo} className="w-12 h-12 rounded-full border-2 border-white/10" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                        <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-bold text-white border border-white/10">
                          {guest.name}
                        </div>
                        {guest.isSharingScreen && (
                          <div className="bg-orange-600 p-1 rounded-lg border border-white/20 shadow-lg">
                            <Monitor className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      {(guest.isMuted || currentRoomData?.mutedUsers?.includes(uid)) && (
                        <div className="absolute bottom-2 right-2 bg-red-500/80 p-1 rounded-full backdrop-blur-sm">
                          <MicOff className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Floating Reactions Overflow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[45]">
          <AnimatePresence>
            {reactions.map((r: any) => (
              <motion.div
                key={r.id}
                initial={{ y: '100vh', x: `${r.x}vw`, opacity: 0, scale: 0.5, rotate: 0 }}
                animate={{ 
                  y: '-10vh', 
                  x: `${r.x + (r.drift || 0)}vw`, 
                  opacity: [0, 1, 1, 0], 
                  scale: [0.5, 1.2, 1.2, 0.8],
                  rotate: r.rotation || 0
                }}
                transition={{ duration: 4, ease: "linear" }}
                className="absolute text-4xl select-none"
                style={{ bottom: 0 }}
              >
                {r.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right Actions (TikTok Style) */}
        {!isParticipant && (
          <div className="absolute right-4 bottom-32 flex flex-col gap-5 items-center z-[60]">
            {/* Quick Reactions */}
            <div className="flex flex-col gap-3 p-1.5 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
              {['🔥', '👏', '😂', '😮', '👍'].map(emoji => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 1.5 }}
                  onClick={() => addReaction(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-colors drop-shadow-md"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>

            <button 
              onClick={() => addReaction('❤️')} 
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3.5 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 hover:scale-110 active:scale-95 transition-all">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <span className="text-white text-[10px] font-black uppercase tracking-tighter drop-shadow-lg">{t.likeLabel}</span>
            </button>
            
            <button 
              onClick={() => {
                const url = `${window.location.origin}/#room=${room.id}`;
                navigator.clipboard.writeText(url);
                alert(language === 'ar' ? 'تم نسخ رابط البث!' : 'Stream link copied!');
              }} 
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3.5 rounded-full bg-white/10 text-white backdrop-blur-md group-hover:bg-white/20 transition-all border border-white/5 active:scale-90 shadow-xl">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-white text-[10px] font-black uppercase tracking-tighter drop-shadow-lg">{language === 'ar' ? 'مشاركة' : 'Share'}</span>
            </button>
            
            <button 
              onClick={() => onReport(room.id, 'live_stream')} 
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3.5 rounded-full bg-white/10 text-white backdrop-blur-md group-hover:bg-white/20 transition-all border border-white/5 active:scale-90 shadow-xl">
                <Flag className="w-6 h-6 text-white/60" />
              </div>
              <span className="text-white text-[10px] font-black uppercase tracking-tighter drop-shadow-lg">{language === 'ar' ? 'إبلاغ' : 'Report'}</span>
            </button>
          </div>
        )}

        {/* Live Chat Overlay (TikTok Style) */}
        <div className="absolute bottom-24 left-4 right-16 md:right-auto md:w-80 h-[30vh] flex flex-col z-[48] pointer-events-none group/chat">
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-4 flex flex-col justify-end mask-gradient-overlay" style={{ maskImage: 'linear-gradient(to top, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 80%, transparent 100%)' }}>
            {messages.slice(-50).map((msg) => {
              const msgTime = msg.timestamp?.toDate?.() || (msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000) : new Date());
              const canEditDelete = msg.senderId === user.uid && (Date.now() - msgTime.getTime()) < 5 * 60 * 1000;

              return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-start gap-2 pr-4 group/msg ${msg.parentId ? (language === 'ar' ? 'pr-8 border-r border-white/10' : 'pl-8 border-l border-white/10') : ''}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (msg.type !== 'system') {
                    setLongPressedMessage(msg);
                  }
                }}
                onTouchStart={() => msg.type !== 'system' && handleMessageTouchStart(msg)}
                onTouchEnd={handleMessageTouchEnd}
              >
                {msg.type === 'system' ? (
                  <div className="bg-black/10 backdrop-blur-[2px] px-3 py-1 rounded-lg border border-white/5 shadow-sm max-w-[90%]">
                    <span className="text-[10px] font-bold text-white/40 tracking-tight">{msg.text}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5 max-w-full pointer-events-auto">
                    <div className="flex items-baseline gap-1.5 px-3 py-1.5 bg-black/20 backdrop-blur-[2px] rounded-2xl border border-white/5 shadow-md group-hover/msg:bg-black/40 transition-colors">
                      <span 
                        onClick={() => onReport(msg.senderId, 'user')}
                        className="text-white/60 text-[11px] font-black cursor-pointer hover:text-white"
                      >
                        {msg.senderName}:
                      </span>
                      <p className="text-white text-[12px] font-medium break-words leading-tight">
                        {msg.text}
                        {(msg as any).isEdited && (
                          <span className="text-[9px] text-white/30 italic ml-1">({language === 'ar' ? 'معدل' : 'edited'})</span>
                        )}
                      </p>
                    </div>
                    {/* Reply Button for Live Chat */}
                    <button 
                      onClick={() => handleReply(msg)}
                      className="text-[9px] text-white/40 hover:text-white transition-colors ml-2 mt-0.5"
                    >
                      {language === 'ar' ? 'رد' : 'Reply'}
                    </button>
                  </div>
                )}
              </motion.div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Footer Controls (TikTok Style) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black/80 to-transparent z-[70] flex flex-col gap-4 pointer-events-none">
        {editingMessageId && (
          <div className="px-4 flex items-center justify-between bg-black/60 backdrop-blur-md py-2 rounded-t-2xl border-t border-x border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2">
              <Edit3 className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-white/60">{t.editMessageLabel}</span>
            </div>
            <button onClick={() => { setEditingMessageId(null); setEditMessageValue(""); }} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-3 h-3 text-white/60" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Chat Input Bar */}
          <div className="flex flex-col flex-1 mr-4 gap-2">
            {replyTo && (
              <div className="flex items-center justify-between px-3 py-1 bg-black/60 backdrop-blur-md rounded-t-xl border-t border-x border-white/10">
                <span className="text-[10px] text-white/60">
                  {t.replyingTo} <span className="text-blue-400 font-bold">{replyTo.senderName}</span>
                </span>
                <button onClick={() => { setReplyTo(null); setNewMessage(""); }} className="p-1 hover:bg-white/10 rounded-full">
                  <X className="w-3 h-3 text-white/40" />
                </button>
              </div>
            )}
            <form onSubmit={editingMessageId ? updateChatMessage : sendChatMessage} className={`flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2.5 rounded-full border border-white/10 focus-within:border-white/20 transition-all relative ${editingMessageId ? 'border-blue-500/50' : ''} ${replyTo ? 'rounded-t-none border-t-0' : ''}`}>
              {isModerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center z-10">
                   <div className="flex items-center gap-2">
                     <Loader2 className="w-3 h-3 text-white animate-spin" />
                     <span className="text-[10px] text-white font-bold">{t.scanningMessage}</span>
                   </div>
                </div>
              )}
              <input 
                ref={messageInputRef}
                type="text" 
                value={editingMessageId ? editMessageValue : newMessage}
                onChange={(e) => editingMessageId ? setEditMessageValue(e.target.value) : setNewMessage(e.target.value)}
                placeholder={editingMessageId ? t.editMessagePlaceholder : t.saySomethingPlaceholder}
                className="flex-1 bg-transparent border-none text-white text-[13px] placeholder:text-white/30 focus:ring-0 px-0 h-4"
                autoFocus={!!editingMessageId}
              />
              <button type="submit" disabled={editingMessageId ? !editMessageValue.trim() : !newMessage.trim()} className="text-white/80 hover:text-white disabled:opacity-0 transition-opacity">
                {editingMessageId ? <Check className="w-4 h-4 text-blue-400" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2">
            {isHost ? (
              <>
                <button 
                  onClick={() => setShowGuestRequests(true)}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${showGuestRequests ? 'bg-blue-600' : 'bg-black/60'} text-white`}
                >
                  <Users className="w-5 h-5" />
                  {(currentRoomData?.guests?.filter(g => g.status === 'pending').length || 0) > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black flex items-center justify-center text-[8px] font-black">
                      {currentRoomData?.guests?.filter(g => g.status === 'pending').length}
                    </div>
                  )}
                </button>
                <button 
                  onClick={() => setShowLiveSettings(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-black/60 text-white"
                >
                  <Settings className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
                <button 
                  onClick={toggleCamera}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-black/60 text-white/40' : 'bg-blue-600 text-white'}`}
                >
                  {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
                <button 
                  onClick={toggleMute}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-black/60 text-white/40' : 'bg-green-600 text-white'}`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                  onClick={toggleTruthMode}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentRoomData?.truthMode?.active ? 'bg-purple-600 text-white animate-pulse' : 'bg-black/60 text-purple-400'}`}
                >
                  <Zap className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScreenShare();
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ring-offset-2 ring-offset-black ${isSharingScreen ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.7)] ring-2 ring-orange-500 animate-pulse' : 'bg-black/60 text-orange-400 hover:text-white hover:bg-black/80'}`}
                  title={language === 'ar' ? 'مشاركة الشاشة' : 'Share Screen'}
                >
                  <Monitor className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    setConfirmationModal({
                      isOpen: true,
                      title: language === 'ar' ? 'إنهاء البث' : 'End Stream',
                      message: language === 'ar' ? 'هل أنت متأكد من إنهاء البث التباشر؟' : 'Are you sure you want to end the live stream?',
                      confirmText: language === 'ar' ? 'إنهاء للكل' : 'End All',
                      cancelText: language === 'ar' ? 'إلغاء' : 'Cancel',
                      onConfirm: async () => {
                        await updateDoc(doc(db, 'live_rooms', room.id), { status: 'ended' });
                        onClose();
                      },
                      isDanger: true
                    });
                  }}
                  className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                {guestStatus === 'none' && room.status === 'active' && (room.type === 'group_call' || (currentRoomData?.requestsEnabled ?? true)) ? (
                  <button 
                    onClick={joinCall}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shadow-lg border border-white/10 transition-all active:scale-95"
                    title={room.type === 'broadcast' ? (language === 'ar' ? 'طلب انضمام' : 'Request Join') : (language === 'ar' ? 'انضمام' : 'Join')}
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                ) : guestStatus === 'pending' ? (
                  <button 
                    onClick={cancelGuestJoinRequest}
                    className="w-10 h-10 rounded-full bg-gray-600 text-white flex items-center justify-center animate-pulse"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={toggleMute}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-black/60 text-white/40' : 'bg-green-600 text-white'}`}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={toggleCamera}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-black/60 text-white/40' : 'bg-blue-600 text-white'}`}
                    >
                      {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScreenShare();
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ring-offset-2 ring-offset-black ${isSharingScreen ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.7)] ring-2 ring-orange-500 animate-pulse' : 'bg-black/60 text-orange-400 hover:text-white hover:bg-black/80'}`}
                        title={language === 'ar' ? 'مشاركة الشاشة' : 'Share Screen'}
                      >
                        <Monitor className="w-5 h-5" />
                      </button>
                  </div>
                )}
                 <button 
                  onClick={() => {
                    const reactionsList = ['❤️', '🔥', '👏', '😮', '😂', '👍'];
                    addReaction(reactionsList[Math.floor(Math.random() * reactionsList.length)]);
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center transition-all active:scale-90 hover:bg-white/20 border border-white/10"
                >
                  <Heart className="w-5 h-5 fill-white text-white" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

        {/* Bottom Menu / Participants Summary Toggle (TikTok Style) */}
        <div className="flex items-center gap-4 px-4">
          <button 
            onClick={() => setShowViewerList(true)}
            className="bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors border border-white/5 backdrop-blur-md pointer-events-auto"
          >
            <Users className="w-3 h-3 text-white/70" />
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-tight">
              {viewers.length} {language === 'ar' ? 'مشاهد' : 'Viewers'}
            </span>
          </button>
        </div>

      {/* Shared Modals for TikTok UI */}
      {renderSharedModals()}

      {/* Message Context Menu (TikTok specific) */}
      <AnimatePresence>
        {longPressedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLongPressedMessage(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#16181d] rounded-[24px] overflow-hidden shadow-2xl border border-white/10"
            >
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <img src={longPressedMessage.senderPhoto} className="w-10 h-10 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-bold truncate">{longPressedMessage.senderName}</p>
                    {longPressedMessage.senderId === room.hostId && <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                    {(currentRoomData?.moderators || []).includes(longPressedMessage.senderId) && <ShieldCheck className="w-3 h-3 text-purple-400" />}
                  </div>
                  <p className="text-white/40 text-[10px] line-clamp-1">{longPressedMessage.text}</p>
                </div>
              </div>
              <div className="p-2 space-y-1">
                {longPressedMessage.senderId === user.uid && (() => {
                  const msgTime = longPressedMessage.timestamp?.toDate?.() || (longPressedMessage.timestamp?.seconds ? new Date(longPressedMessage.timestamp.seconds * 1000) : new Date());
                  const canEditDelete = (Date.now() - msgTime.getTime()) < 5 * 60 * 1000;
                  
                  if (!canEditDelete) return null;
                  
                  return (
                    <>
                      <button 
                        onClick={() => {
                          setEditingMessageId(longPressedMessage.id);
                          setEditMessageValue(longPressedMessage.text);
                          setLongPressedMessage(null);
                        }}
                        className="w-full p-4 flex items-center gap-4 text-white hover:bg-white/5 transition-colors rounded-xl font-medium"
                      >
                        <Edit3 className="w-5 h-5 text-green-400" />
                        <span>{t.edit}</span>
                      </button>
                      <button 
                        onClick={() => {
                          deleteChatMessage(longPressedMessage.id);
                        }}
                        className="w-full p-4 flex items-center gap-4 text-red-400 hover:bg-red-400/5 transition-colors rounded-xl font-bold"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>{t.delete}</span>
                      </button>
                    </>
                  );
                })()}

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(longPressedMessage.text);
                    setLongPressedMessage(null);
                  }}
                  className="w-full p-4 flex items-center gap-4 text-white hover:bg-white/5 transition-colors rounded-xl font-medium"
                >
                  <Copy className="w-5 h-5 text-blue-400" />
                  <span>{t.copy}</span>
                </button>
                <button 
                  onClick={() => {
                    onReport(longPressedMessage.id, 'comment'); 
                    setLongPressedMessage(null);
                  }}
                  className="w-full p-4 flex items-center gap-4 text-white hover:bg-white/5 transition-colors rounded-xl font-medium"
                >
                  <Flag className="w-5 h-5 text-orange-400" />
                  <span>{t.reportComment}</span>
                </button>
                {(isOwner || isModerator) && longPressedMessage.senderId !== user.uid && (
                   <>
                    {(currentRoomData?.mutedUsers || []).includes(longPressedMessage.senderId) ? (
                      <button 
                        onClick={() => { handleModerationAction(longPressedMessage.senderId, 'unmute'); setLongPressedMessage(null); }}
                        className="w-full p-4 flex items-center gap-4 text-white hover:bg-white/5 transition-colors rounded-xl font-medium"
                      >
                        <Mic className="w-5 h-5 text-blue-400" />
                        <span>{t.unmute}</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => { handleModerationAction(longPressedMessage.senderId, 'mute'); setLongPressedMessage(null); }}
                        className="w-full p-4 flex items-center gap-4 text-white hover:bg-white/5 transition-colors rounded-xl font-medium"
                      >
                        <MicOff className="w-5 h-5 text-gray-400" />
                        <span>{t.muteUser}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => { handleModerationAction(longPressedMessage.senderId, 'block'); setLongPressedMessage(null); }}
                      className="w-full p-4 flex items-center gap-4 text-red-400 hover:bg-red-400/5 transition-colors rounded-xl font-bold"
                    >
                      <Ban className="w-5 h-5" />
                      <span>{t.block}</span>
                    </button>
                    {isOwner && !(currentRoomData?.moderators || []).includes(longPressedMessage.senderId) && (
                      <button 
                        onClick={() => { handleModerationAction(longPressedMessage.senderId, 'make_moderator'); setLongPressedMessage(null); }}
                        className="w-full p-4 flex items-center gap-4 text-purple-400 hover:bg-purple-400/5 transition-colors rounded-xl font-medium"
                      >
                        <ShieldAlert className="w-5 h-5" />
                        <span>{t.makeModerator}</span>
                      </button>
                    )}
                   </>
                )}
                <button 
                  onClick={() => { onReport(longPressedMessage.senderId, 'user'); setLongPressedMessage(null); }}
                  className="w-full p-4 flex items-center gap-4 text-white hover:bg-white/5 transition-colors rounded-xl font-medium"
                >
                  <User className="w-5 h-5 text-blue-400" />
                  <span>{t.visitProfile}</span>
                </button>
                <button 
                  onClick={() => setLongPressedMessage(null)}
                  className="w-full p-4 text-white/40 hover:text-white transition-colors text-center text-sm"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {renderSharedModals()}
    </div>
  );
}

function GroupVideoChatScreen({ 
  room, 
  allUsers, 
  allUsersMap,
  user, 
  profile,
  onClose, 
  onMinimize,
  onReport,
  t: propT,
  language,
  setConfirmationModal,
  setCurrentView,
  setViewedUserUid,
  allChats
}: { 
  room: LiveRoom, 
  allUsers: UserProfile[], 
  allUsersMap: Record<string, UserProfile>,
  user: FirebaseUser, 
  profile: UserProfile | null,
  onClose: (endCall?: boolean) => void, 
  onMinimize: () => void,
  onReport: (id: string, type: string) => void,
  t: any,
  language: string,
  setConfirmationModal: (modal: any) => void,
  setCurrentView: (v: string) => void,
  setViewedUserUid: (uid: string | null) => void,
  allChats: Chat[]
}) {
  const t = propT || translations[language] || translations['en'];
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [, forceUpdate] = useState({});
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentRoomData, setCurrentRoomData] = useState<LiveRoom | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [selectedUserMenu, setSelectedUserMenu] = useState<any>(null);
  const [localParticipantVolumes, setLocalParticipantVolumes] = useState<{[uid: string]: number}>({});
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  
  const agoraClient = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrack = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrack = useRef<IMicrophoneAudioTrack | null>(null);
  const connectionOp = useRef<Promise<any>>(Promise.resolve());
  const isConnecting = useRef(false); 
  const joinedRef = useRef(false); 
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Force re-render when remote users change
  useEffect(() => {
    forceUpdate({});
  }, [remoteUsers.length]);

  // Agora Lifecycle (Group RTC)
  useEffect(() => {
    let isMounted = true;
    const appId = (import.meta as any).env.VITE_AGORA_APP_ID;
    if (!appId || !room.id || !user) return;

    const numericUid = (() => {
      let h = 0;
      for (let i = 0; i < user.uid.length; i++) h = ((h << 5) - h) + user.uid.charCodeAt(i), h |= 0;
      // Add a random component to highly reduce the chance of UID_CONFLICT on quick re-joins
      return Math.abs(h) + Math.floor(Math.random() * 1000);
    })();

    let client: IAgoraRTCClient | null = null;

    const connectToAgora = async () => {
      try {
        // Privacy Check
        if (room.guestPrivacy === 'followers') {
          const followSnap = await getDoc(doc(db, `users/${room.hostId}/followers`, user.uid));
          if (!followSnap.exists()) {
            alert(language === 'ar' ? 'هذا البث للمتابعين فقط.' : 'This stream is for followers only.');
            onClose();
            return;
          }
        } else if (room.guestPrivacy === 'approved') {
          if (!room.allowedGuests?.includes(user.uid)) {
            alert(language === 'ar' ? 'يجب أن تتم دعوتك للانضمام كضيف.' : 'You must be invited to join as a guest.');
            onClose();
            return;
          }
        }

        const existingClient = agoraClient.current;
        if (existingClient) {
          await existingClient.leave().catch(() => {});
          existingClient.removeAllListeners();
        }

        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        agoraClient.current = client;

        // 1. Global Listeners
        client.on("user-published", async (remoteUser, mediaType) => {
          if (!isMounted || !client) return;
          try {
            await client.subscribe(remoteUser, mediaType);
            setRemoteUsers(prev => {
              const filtered = prev.filter(u => String(u.uid) !== String(remoteUser.uid));
              return [...filtered, remoteUser];
            });
            if (mediaType === "audio" && remoteUser.audioTrack) {
              (remoteUser.audioTrack.play() as any)?.catch((e: any) => {
                if (e && e.code !== 'OPERATION_ABORTED') console.log("Autoplay blocked");
              });
            }
          } catch (e: any) {
            if (e.code !== 'OPERATION_ABORTED') console.error("Subscribe error:", e);
          }
        });

        client.on("user-left", (remoteUser) => {
          if (isMounted) setRemoteUsers(prev => prev.filter(u => String(u.uid) !== String(remoteUser.uid)));
        });

        // 2. Join
        const assignedUid = await client.join(appId, room.id, null, null);

        if (isMounted && client.connectionState === "CONNECTED") {
          // 3. Sync initial tracks
          if (!localAudioTrack.current) localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true }).catch(() => null);
          if (localAudioTrack.current) {
            await localAudioTrack.current.setEnabled(!isMuted);
            await client.publish(localAudioTrack.current).catch(() => {});
          }

          if (!isCameraOff) {
            if (!localVideoTrack.current) localVideoTrack.current = await AgoraRTC.createCameraVideoTrack({ encoderConfig: '720p_1' }).catch(() => null);
            if (localVideoTrack.current) {
              await localVideoTrack.current.setEnabled(true);
              await client.publish(localVideoTrack.current).catch(() => {});
            }
          }

          // 4. Room Entry Sync
          if (!joinedRef.current) {
            const guestInfo: LiveGuest = {
              uid: user.uid,
              name: profile?.displayName || user.displayName || 'مستخدم',
              photo: profile?.photoURL || user.photoURL || '',
              isMuted: isMuted,
              isCameraOff: isCameraOff,
              agoraUid: assignedUid,
              status: 'accepted',
              joinedAt: Date.now()
            };
            await updateDoc(doc(db, 'live_rooms', room.id), {
              guests: arrayUnion(guestInfo),
              participants: arrayUnion(user.uid)
            });
            joinedRef.current = true;
          }
        }
      } catch (err: any) {
        if (err && err.code !== 'OPERATION_ABORTED' && err.code !== 'WS_ABORT') {
          console.error("Agora RTC Failed:", err);
        }
      }
    };

    connectionOp.current = connectToAgora();

    return () => {
      isMounted = false;
      const doCleanup = async () => {
        await connectionOp.current.catch(() => {});
        if (localAudioTrack.current) { localAudioTrack.current.stop(); localAudioTrack.current.close(); localAudioTrack.current = null; }
        if (localVideoTrack.current) { localVideoTrack.current.stop(); localVideoTrack.current.close(); localVideoTrack.current = null; }
        if (client) {
          client.removeAllListeners();
          await client.leave().catch(() => {});
          agoraClient.current = null;
        }
        
        // Remove from guests on exit
        const roomRef = doc(db, 'live_rooms', room.id);
        const rDoc = await getDoc(roomRef).catch(() => null);
        if (rDoc && rDoc.exists()) {
          const d = rDoc.data();
          const g = (d.guests || []).filter((x: any) => x.uid !== user.uid);
          const p = (d.participants || []).filter((x: string) => x !== user.uid);
          await updateDoc(roomRef, { guests: g, participants: p }).catch(() => {});
        }
      };
      doCleanup();
    };
  }, [room.id, user.uid]);

  // Volume & Track Sync
  useEffect(() => {
    const sync = async () => {
      if (localAudioTrack.current) await localAudioTrack.current.setEnabled(!isMuted).catch(() => {});
      if (localVideoTrack.current) await localVideoTrack.current.setEnabled(!isCameraOff).catch(() => {});
    };
    sync();
  }, [isMuted, isCameraOff]);

  // Data Sync (Separate from Agora Connection to avoid loops)
  useEffect(() => {
    const unsubscribeRoom = onSnapshot(doc(db, 'live_rooms', room.id), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() as LiveRoom;
        setCurrentRoomData(data);
        if (data.status === 'ended') onClose();
      }
    });

    const unsubscribeChat = onSnapshot(
      query(collection(db, `live_rooms/${room.id}/chat`), orderBy('timestamp', 'asc'), limit(50)),
      (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubscribeRoom();
      unsubscribeChat();
    };
  }, [room.id, onClose]);
  const toggleMute = async () => {
    try {
      // Check if force muted by admin
      const selfInRoom = currentRoomData?.guests?.find(g => g.uid === user.uid);
      if (selfInRoom?.status === 'force_muted') {
        alert(language === 'ar' ? "لقد تم كتمك من قبل المشرف. ارفع يدك لطلب التحدث." : "You have been muted by the moderator. Raise your hand to request speaking.");
        return;
      }

      const newMuted = !isMuted;
      setIsMuted(newMuted);
      
      if (agoraClient.current && agoraClient.current.connectionState === "CONNECTED") {
        if (newMuted) {
          // ABSOLUTE PROTECTION: Unpublish and DESTROY
          if (localAudioTrack.current) {
            await agoraClient.current.unpublish(localAudioTrack.current);
            localAudioTrack.current.stop();
            localAudioTrack.current.close();
            localAudioTrack.current = null;
          }
        } else {
          // Re-create from scratch to ensure no leak
          if (!localAudioTrack.current) {
            localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack({
              AEC: true, ANS: true, AGC: true // Noise cancellation
            });
          }
          await localAudioTrack.current.setEnabled(true);
          await agoraClient.current.publish(localAudioTrack.current);
        }
      }

      const collectionName = 'live_rooms';
      const updatedGuests = (currentRoomData?.guests || []).map(g => 
        g.uid === user.uid ? { ...g, isMuted: newMuted, isHandRaised: false } : g 
      );
      await updateDoc(doc(db, collectionName, room.id), { guests: updatedGuests });
      if (!newMuted) setIsHandRaised(false);
    } catch (err) {
      console.error("Error toggling mute in group chat:", err);
    }
  };

  const raiseHand = async () => {
    try {
      const newHandState = !isHandRaised;
      setIsHandRaised(newHandState);
      const collectionName = 'live_rooms';
      const updatedGuests = (currentRoomData?.guests || []).map(g => 
        g.uid === user.uid ? { ...g, isHandRaised: newHandState } : g 
      );
      await updateDoc(doc(db, collectionName, room.id), { guests: updatedGuests });
    } catch (err) {
      console.error("Error raising hand:", err);
    }
  };

  const isAdminOrOwner = (uid: string) => {
    const linkedChat = allChats.find(c => c.chatId === room.chatId);
    const isChatOwner = (linkedChat?.ownerId || linkedChat?.createdBy) === uid;
    const isChatModerator = (linkedChat?.moderators || []).includes(uid);
    const isSpecificAdmin = linkedChat?.adminPermissions?.[uid]?.canManageGroupCall;
    
    // Check currentRoomData first (synced from DB), but fallback to room prop
    const ownerId = currentRoomData?.ownerId || currentRoomData?.hostId || room.hostId || (room as any).ownerId;
    const admins = currentRoomData?.admins || (room as any).admins || [];
    return ownerId === uid || admins.includes(uid) || isChatOwner || isChatModerator || isSpecificAdmin || profile?.role === 'admin';
  };

  const handleLeave = () => {
    const userIsMod = isAdminOrOwner(user.uid);
    if (userIsMod) {
      setConfirmationModal({
        isOpen: true,
        title: language === 'ar' ? 'مغادرة المكالمة' : 'Exit Call',
        message: language === 'ar' ? 'اختر كيف ترغب في المغادرة' : 'Choose how you want to exit',
        actionType: 'group_call_exit',
        language,
        onCustomAction: (action: 'leave' | 'close') => {
          // 1. Close modal instantly
          setConfirmationModal(null);
          
          // 2. Trigger exit logic (don't await to avoid UI hang)
          if (action === 'close') {
            onClose(true);
          } else {
            onClose(false);
          }
        },
        onCancel: () => setConfirmationModal(null)
      });
    } else {
      // Normal participant leaves instantly
      onClose(false);
    }
  };

  const handleAdminAction = async (targetUid: string, action: 'mute' | 'unmute' | 'remove' | 'view_profile') => {
    if (!currentRoomData) return;
    const collectionName = 'live_rooms';
    
    if (action === 'mute') {
      const updatedGuests = (currentRoomData.guests || []).map(g => 
        g.uid === targetUid ? { ...g, status: 'force_muted', isMuted: true, isHandRaised: false } : g
      );
      await updateDoc(doc(db, collectionName, room.id), { guests: updatedGuests });
    } else if (action === 'unmute') {
      const updatedGuests = (currentRoomData.guests || []).map(g => 
        g.uid === targetUid ? { ...g, status: 'accepted', isHandRaised: false } : g
      );
      await updateDoc(doc(db, collectionName, room.id), { guests: updatedGuests });
    } else if (action === 'remove') {
      // 1. Remove from Call
      const updatedParticipantsCall = (currentRoomData.participants || []).filter(id => id !== targetUid);
      const updatedGuestsCall = (currentRoomData.guests || []).filter(g => g.uid !== targetUid);
      await updateDoc(doc(db, collectionName, room.id), { 
        participants: updatedParticipantsCall,
        guests: updatedGuestsCall
      });
      // 2. Remove from actual Group Chat
      const chatRef = doc(db, 'chats', room.id);
      const chatDoc = await getDoc(chatRef);
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const updatedParticipantsChat = (chatData.participants || []).filter((uid: string) => uid !== targetUid);
        await updateDoc(chatRef, { participants: updatedParticipantsChat });
      }
    }
    
    setSelectedUserMenu(null);
    if (action === 'view_profile') {
      setViewedUserUid(targetUid);
      setCurrentView('profile');
      onClose(); // Close the call screen to see the profile
    }
  };

  const handleLocalVolume = (uid: string, vol: number) => {
    setLocalParticipantVolumes(prev => ({ ...prev, [uid]: vol }));
    const remoteUser = remoteUsers.find(u => String(u.uid) === String(uid) || String(u.uid) === String((currentRoomData?.guests?.find(g => g.uid === uid) as any)?.agoraUid));
    if (remoteUser && remoteUser.audioTrack) {
      remoteUser.audioTrack.setVolume(vol);
    }
  };

  const toggleCamera = async () => {
    try {
      const newCameraOff = !isCameraOff;
      setIsCameraOff(newCameraOff);
      
      if (agoraClient.current && agoraClient.current.connectionState === "CONNECTED") {
        if (newCameraOff) {
          // FAILSAFE CAMERA OFF: Unpublish completely
          if (localVideoTrack.current) {
            await agoraClient.current.unpublish(localVideoTrack.current);
            await localVideoTrack.current.setEnabled(false);
          }
        } else {
          // CAMERA ON: Ensure enabled and publish
          if (!localVideoTrack.current) {
            localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          }
          await localVideoTrack.current.setEnabled(true);
          await agoraClient.current.publish(localVideoTrack.current);
        }
      } else {
        if (localVideoTrack.current) {
          await localVideoTrack.current.setEnabled(!newCameraOff);
        }
      }

      const collectionName = 'live_rooms';
      const updatedGuests = (currentRoomData?.guests || []).map(g => 
        g.uid === user.uid ? { ...g, isCameraOff: newCameraOff } : g
      );
      await updateDoc(doc(db, collectionName, room.id), { guests: updatedGuests });
    } catch (err) {
      console.error("Error toggling camera in group chat:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !replyTo) return;
    try {
      const collectionName = 'live_rooms';
      await addDoc(collection(db, `${collectionName}/${room.id}/chat`), {
        text: newMessage,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        senderPhoto: user.photoURL || '',
        timestamp: serverTimestamp(),
        parentId: replyTo?.id || null,
        type: 'user'
      });
      setNewMessage("");
      setReplyTo(null);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleReply = (message: any) => {
    setReplyTo(message);
    setNewMessage(`@${message.senderName} `);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const stopScreenShare = async () => {
    try {
      if (!isSharingScreen || !agoraClient.current) return;
      
      if (localVideoTrack.current) {
        localVideoTrack.current.stop();
        localVideoTrack.current.close();
      }

      // Re-create camera track
      const newCameraTrack = await AgoraRTC.createCameraVideoTrack().catch(() => null);
      if (newCameraTrack) {
        localVideoTrack.current = newCameraTrack;
        await localVideoTrack.current.setEnabled(!isCameraOff);
        if (agoraClient.current && (agoraClient.current.connectionState === "CONNECTED" || agoraClient.current.connectionState === "CONNECTING")) {
          await agoraClient.current.publish(localVideoTrack.current).catch(e => console.warn("Retry publish camera failed:", e));
        }
      }
      
      setIsSharingScreen(false);

      // Sync Firestore
      const collectionName = 'live_rooms';
      const updatedGuests = (currentRoomData?.guests || []).map((g: any) => 
        g.uid === user.uid ? { ...g, isSharingScreen: false } : g
      );
      await updateDoc(doc(db, collectionName, room.id), { guests: updatedGuests }).catch(() => {});
    } catch (err) {
      console.error("Error stopping screen share:", err);
    }
  };

  const handleScreenShare = async () => {
    try {
      if (isSharingScreen) {
        await stopScreenShare();
        return;
      }

      if (!agoraClient.current) {
        console.warn("Agora client not ready for screen share");
        return;
      }

      // Pre-check for screen sharing support
      if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
         setConfirmationModal({
          title: language === 'ar' ? 'مشاركة الشاشة غير مدعومة' : 'Screen Share Not Supported',
          message: language === 'ar' 
            ? 'متصفحك الحالي لا يدعم مشاركة الشاشة. يرجى استخدام متصفح حديث مثل Chrome أو Firefox على الحاسوب.' 
            : 'Your current browser does not support screen sharing.',
          onConfirm: () => setConfirmationModal(null),
          confirmLabel: language === 'ar' ? 'حسناً' : 'OK',
          type: 'info'
        });
        return;
      }

      try {
        const screenTrackResult = await AgoraRTC.createScreenVideoTrack({ 
          encoderConfig: "1080p_1",
          optimizationMode: "detail",
          screenSourceType: "screen"
        }, "auto");

        const track = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
        
        track.on("track-ended", () => {
          console.log("Screen share ended via browser UI");
          stopScreenShare().catch(console.error);
        });

        if (localVideoTrack.current) {
          if (agoraClient.current && (agoraClient.current.connectionState === "CONNECTED" || agoraClient.current.connectionState === "CONNECTING")) {
            await agoraClient.current.unpublish(localVideoTrack.current).catch(() => {});
          }
          localVideoTrack.current.stop();
          localVideoTrack.current.close();
        }

        localVideoTrack.current = track;
        if (agoraClient.current && (agoraClient.current.connectionState === "CONNECTED" || agoraClient.current.connectionState === "CONNECTING")) {
          await agoraClient.current.publish(localVideoTrack.current).catch(e => {
            console.error("Failed to publish screen track:", e);
            stopScreenShare();
          });
        }

        setIsSharingScreen(true);
        setIsCameraOff(false);

        const collectionName = 'live_rooms';
        const updatedGuests = (currentRoomData?.guests || []).map((g: any) => 
          g.uid === user.uid ? { ...g, isSharingScreen: true, isCameraOff: false } : g
        );
        await updateDoc(doc(db, collectionName, room.id), { guests: updatedGuests }).catch(() => {});
      } catch (e: any) {
        if (e.code === 'NOT_SUPPORTED' || e.message?.includes('not supported')) {
          setConfirmationModal({
            title: language === 'ar' ? 'مشاركة الشاشة غير مدعومة' : 'Screen Share Not Supported',
            message: language === 'ar' 
              ? 'متصفحك الحالي لا يدعم مشاركة الشاشة في هذه البيئة. يرجى فتح التطبيق في علامة تبويب جديدة.' 
              : 'Your current browser does not support screen sharing here. Please open in a new tab.',
            onConfirm: () => setConfirmationModal(null),
            confirmLabel: language === 'ar' ? 'حسناً' : 'OK',
            type: 'info'
          });
        } else if (e.code === 'PERMISSION_DENIED' || e.name === 'NotAllowedError') {
           // User cancelled
           console.log("User denied screen share permission");
        } else {
          console.error("Screen share activation failed:", safeJsonStringify(e));
        }
      }
    } catch (err) {
      console.error("Error toggling screen share:", safeJsonStringify(err));
    }
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/#room=${room.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    });
  };

  const allParticipants = [
    { 
      uid: user.uid, 
      name: profile?.displayName || user.displayName || 'Me', 
      photo: profile?.photoURL || user.photoURL || '', 
      isMuted, 
      isCameraOff, 
      isSharingScreen,
      isLocal: true,
      isPublished: true // Local user is always broadcaster in this screen
    },
    ...(currentRoomData?.guests || [])
      .filter((g: any) => g.uid !== user.uid)
      .map((g: any) => {
        const agoraUser = remoteUsers.find(u => String(u.uid) === String(g.uid) || String(u.uid) === String(g.agoraUid));
        return { 
          ...g, 
          isLocal: false, 
          isSharingScreen: g.isSharingScreen || false,
          isTrulyConnected: !!agoraUser,
          isPublished: !!agoraUser?.hasAudio || !!agoraUser?.audioTrack // Check if actually publishing
        };
      })
  ];

  const participantsWithMedia = allParticipants.filter(p => !p.isCameraOff || p.isSharingScreen || (p.isLocal && isSharingScreen));

  return (
    <div className="fixed inset-0 z-[600] bg-[#0f172a] text-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div>
            <h2 className="font-black text-lg leading-tight">{room.title}</h2>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{allParticipants.length} {language === 'ar' ? 'مشارك' : 'Participants'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              remoteUsers.forEach(u => {
                if (u.audioTrack) {
                  u.audioTrack.play().catch(e => console.error("Error playing remote audio:", e));
                }
              });
              alert(language === 'ar' ? 'تم تفعيل الصوت لجميع المشاركين' : 'Audio enabled for all participants');
            }}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25 animate-pulse"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-[10px] font-bold">{language === 'ar' ? 'تفعيل الصوت' : 'Join Audio'}</span>
          </button>
          <button onClick={() => setShowChat(!showChat)} className={`p-2.5 rounded-2xl transition-all ${showChat ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}>
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 flex flex-col transition-all duration-500 bg-[#0f172a] ${showChat ? 'lg:mr-[380px]' : ''}`}>
          {/* Main Content Area: Video Grid or Participant List */}
          {participantsWithMedia.length > 0 ? (
            <div className="flex-1 relative flex flex-col p-4 pt-20 pb-28">
              <div className={`flex-1 gap-4 items-center justify-center ${participantsWithMedia.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr' : 'flex'}`}>
                {participantsWithMedia.filter(p => !p.isLocal).map(p => {
                  const isSharing = p.isSharingScreen;
                  return (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      key={`video-grid-${p.uid}`}
                      className={`relative rounded-[2.5rem] bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl group ${isSharing ? 'col-span-full aspect-video max-w-5xl mx-auto' : 'aspect-video w-full'}`}
                      ref={(el) => {
                        if (el) {
                          const remoteUser = remoteUsers.find(u => String(u.uid) === String(p.uid) || String(u.uid) === String(p.agoraUid));
                          if (remoteUser?.videoTrack) {
                            remoteUser.videoTrack.play(el);
                          }
                        }
                      }}
                    >
                       <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                          <span className="text-[10px] font-black uppercase tracking-wider">{p.name}</span>
                          {p.isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                       </div>
                       {isSharing && (
                         <div className="absolute top-4 right-4 z-10 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1.5 border border-blue-400/30">
                           <MonitorUp className="w-3 h-3" />
                           <span>{language === 'ar' ? 'مشاركة شاشة' : 'SCREEN SHARING'}</span>
                         </div>
                       )}
                    </motion.div>
                  );
                })}

                {/* Local PiP or Grid Item */}
                <motion.div 
                  layout
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    position: participantsWithMedia.length > 1 ? 'absolute' : 'relative',
                    bottom: participantsWithMedia.length > 1 ? 120 : 'auto',
                    right: participantsWithMedia.length > 1 ? 24 : 'auto',
                    width: participantsWithMedia.length > 1 ? 160 : '100%',
                    height: participantsWithMedia.length > 1 ? (participantsWithMedia.length === 1 ? '100%' : 220) : 'auto',
                    zIndex: 50
                  }}
                  className={`rounded-[2rem] bg-zinc-900 border-2 border-white/20 overflow-hidden shadow-2xl group transition-all cursor-pointer ${participantsWithMedia.length === 1 ? 'max-w-4xl mx-auto aspect-video' : 'w-[160px] h-[220px]'}`}
                  ref={(el) => {
                    if (el && localVideoTrack.current) {
                      localVideoTrack.current.play(el);
                    }
                  }}
                >
                   <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      <span className="text-[9px] font-black uppercase tracking-wider">{language === 'ar' ? 'أنت' : 'You'}</span>
                      {isMuted && <MicOff className="w-2.5 h-2.5 text-red-500" />}
                   </div>
                   {isSharingScreen && (
                      <div className="absolute top-3 right-3 z-10 bg-orange-600 px-2 py-0.5 rounded-md">
                         <MonitorUp className="w-3 h-3 text-white" />
                      </div>
                   )}
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#0f172a] p-4 pt-20 pb-28">
              {/* Main Participant List (Telegram Style) */}
              <div className="w-full max-w-2xl bg-[#1e293b]/50 backdrop-blur-xl rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85%]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between flex-row-reverse">
                   <div className="text-right">
                     <h3 className="text-xl font-black text-white">{room.title}</h3>
                     <p className="text-blue-400 text-xs font-bold">{allParticipants.length} مشاركين</p>
                   </div>
                   <button className="p-2 bg-white/5 rounded-2xl text-slate-400">
                     <MoreHorizontal size={20} />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {allParticipants.map((p: any) => {
                    const isTalking = p.isPublished && !p.isMuted;
                    return (
                      <div 
                        key={p.uid}
                        onClick={() => setSelectedUserMenu(p)}
                        className="flex items-center gap-4 p-4 rounded-[32px] hover:bg-white/5 transition-all cursor-pointer group flex-row-reverse text-right"
                      >
                        <div className="relative">
                           <div className={`w-14 h-14 rounded-[22px] overflow-hidden transition-all duration-300 ${isTalking ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-[#1e293b] scale-95' : 'ring-2 ring-white/10'}`}>
                              <img 
                                src={p.photo || 'https://via.placeholder.com/150'} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer" 
                              />
                           </div>
                           {isAdminOrOwner(p.uid) && (
                             <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-[#1e293b]">
                                <Crown size={10} className="text-white" />
                             </div>
                           )}
                           {isTalking && (
                             <div className="absolute -bottom-1 -left-1 bg-blue-500 rounded-full p-1 border-2 border-[#1e293b] animate-pulse">
                                <Mic size={10} className="text-white" />
                             </div>
                           )}
                        </div>

                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-end gap-2">
                             {p.isHandRaised && <Hand size={14} className="text-amber-400 animate-bounce" />}
                             <span className="text-white font-black truncate">{p.name}</span>
                             {p.isLocal && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">أنت</span>}
                          </div>
                          <p className={`text-xs truncate transition-colors ${isTalking ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                             {isTalking ? (language === 'ar' ? 'يتحدث الآن...' : 'Talking...') : (p.status === 'force_muted' ? (language === 'ar' ? 'مكتوم إجبارياً' : 'Force Muted') : (language === 'ar' ? 'متصل' : 'Connected'))}
                          </p>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {isAdminOrOwner(user.uid) && !p.isLocal && (
                            <div className="flex gap-2 text-right flex-row-reverse">
                              <button 
                                onClick={() => handleAdminAction(p.uid, 'unmute')}
                                className="p-2 bg-emerald-500/10 text-emerald-400 rounded-2xl hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                              >
                                <Mic size={18} />
                              </button>
                              <button 
                                onClick={() => handleAdminAction(p.uid, 'mute')}
                                className="p-2 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 border border-red-500/20 transition-all"
                              >
                                <MicOff size={18} />
                              </button>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-center w-10">
                             {p.isMuted ? (
                               <MicOff size={20} className={p.status === 'force_muted' ? 'text-red-500' : 'text-slate-600'} />
                             ) : (
                               <div className="flex gap-0.5 items-end h-4">
                                  {[0.4, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
                                    <motion.div
                                      key={i}
                                      animate={{ height: ['4px', '16px', '4px'] }}
                                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                      className="w-[3px] bg-blue-500 rounded-full"
                                    />
                                  ))}
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button 
                    onClick={handleShareLink}
                    className="w-[calc(100%-1rem)] mx-2 mt-4 p-4 rounded-[28px] bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-3 font-bold group"
                  >
                     <Share2 size={20} className="group-hover:rotate-12 transition-transform" />
                     <span>{showShareToast ? (language === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!') : (language === 'ar' ? 'مشاركة رابط الدعوة' : 'Share Invite Link')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Chat */}
        <AnimatePresence>
          {showChat && (
            <motion.div 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="w-full md:w-80 bg-zinc-900/50 backdrop-blur-2xl border-r md:border-r-0 md:border-l border-white/10 flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-black text-sm">{language === 'ar' ? 'الدردشة' : 'Chat'}</h3>
                <button onClick={() => setShowChat(false)} className="md:hidden p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.parentId ? (language === 'ar' ? 'mr-4 pr-2 border-r border-white/10' : 'ml-4 pl-2 border-l border-white/10') : ''} ${msg.senderId === user.uid ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium ${msg.senderId === user.uid ? 'bg-blue-600' : 'bg-white/10'}`}>
                      <p className="opacity-60 text-[8px] mb-0.5">{msg.senderName}</p>
                      <p>{msg.text}</p>
                    </div>
                    <button 
                      onClick={() => handleReply(msg)}
                      className="text-[9px] text-white/40 hover:text-white transition-colors mt-1"
                    >
                      {language === 'ar' ? 'رد' : 'Reply'}
                    </button>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-white/10 flex flex-col gap-2">
                {replyTo && (
                  <div className="flex items-center justify-between px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-white/40">
                      {t.replyingTo} <span className="text-blue-400">{replyTo.senderName}</span>
                    </span>
                    <button onClick={() => { setReplyTo(null); setNewMessage(""); }} className="p-0.5 hover:bg-white/10 rounded-full">
                      <X className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input 
                    ref={messageInputRef}
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type message...'}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                  />
                  <button type="submit" className="p-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar */}
      <div className="p-6 bg-[#0f172a] border-t border-white/5">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLeave}
              className="p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all active:scale-90"
              title={language === 'ar' ? 'خروج' : 'Exit'}
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button 
              onClick={onMinimize}
              className="p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all active:scale-90"
              title={language === 'ar' ? 'تصغير' : 'Minimize'}
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex justify-center gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleScreenShare();
              }}
              className={`p-4 rounded-2xl transition-all active:scale-95 ring-offset-2 ring-offset-[#0f172a] ${isSharingScreen ? 'bg-orange-600 text-white shadow-[0_0_25px_rgba(234,88,12,0.6)] ring-2 ring-orange-500 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white hover:ring-2 hover:ring-white/20'}`}
              title={language === 'ar' ? 'مشاركة الشاشة' : 'Share Screen'}
            >
              <MonitorUp className="w-6 h-6" />
            </button>
            <button 
              onClick={toggleCamera}
              className={`p-4 rounded-2xl transition-all active:scale-95 ${!isCameraOff ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/5 hover:bg-white/10 text-white'}`}
            >
              {!isCameraOff ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            {currentRoomData?.guests?.find(g => g.uid === user.uid)?.status === 'force_muted' ? (
              <button 
                onClick={raiseHand}
                className={`p-6 rounded-3xl transition-all active:scale-95 shadow-2xl relative ${isHandRaised ? 'bg-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.5)] scale-110' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                <Hand className="w-7 h-7" />
                <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 ring-4 ring-[#0f172a]">
                  <MicOff size={10} className="text-white" />
                </div>
              </button>
            ) : (
              <button 
                onClick={toggleMute}
                className={`p-6 rounded-3xl transition-all active:scale-95 shadow-2xl relative ${!isMuted ? 'bg-blue-600 text-white scale-110 shadow-[0_0_30px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {!isMuted ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-2xl transition-all active:scale-95 ${showChat ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Management Bottom Sheet */}
      <AnimatePresence>
        {selectedUserMenu && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-center px-4 pb-4 sm:items-center sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserMenu(null)}
              className="fixed inset-0 transition-opacity bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg overflow-hidden bg-[#1e293b] rounded-t-[40px] sm:rounded-[40px] border border-white/10 shadow-2xl"
            >
              <div className="p-8">
                {/* Drag Indicator */}
                <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto mb-8 sm:hidden" />

                <div className="flex items-center gap-6 mb-8 text-right flex-row-reverse">
                  <div className="relative">
                    <img 
                      src={selectedUserMenu.photo || 'https://via.placeholder.com/150'} 
                      alt={selectedUserMenu.name}
                      className="w-24 h-24 rounded-[32px] object-cover ring-4 ring-blue-500/20"
                      referrerPolicy="no-referrer"
                    />
                    {isAdminOrOwner(selectedUserMenu.uid) && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-2 border-4 border-[#1e293b]">
                        <Crown size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-white mb-1">{selectedUserMenu.name}</h3>
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${isAdminOrOwner(selectedUserMenu.uid) ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-400'}`}>
                        {isAdminOrOwner(selectedUserMenu.uid) ? 'مشرف المجموعة' : 'عضو مشارك'}
                      </span>
                      {selectedUserMenu.isHandRaised && (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-1 rounded-full font-black animate-pulse">رفع يده ✋</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Volume Slider */}
                  <div className="bg-white/5 p-5 rounded-[28px] border border-white/5">
                    <div className="flex justify-between items-center mb-4 flex-row-reverse">
                      <div className="flex items-center gap-3 text-slate-300 flex-row-reverse">
                        <Volume2 size={20} className="text-blue-400" />
                        <span className="font-bold text-sm">مستوى الصوت المحلي</span>
                      </div>
                      <span className="text-blue-500 font-black text-sm">
                        {localParticipantVolumes[selectedUserMenu.uid] ?? 100}%
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="1000"
                      step="1"
                      value={localParticipantVolumes[selectedUserMenu.uid] ?? 100}
                      onChange={(e) => handleLocalVolume(selectedUserMenu.uid, parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleAdminAction(selectedUserMenu.uid, 'view_profile')}
                      className="flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 group"
                    >
                      <User size={28} className="text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold">الملف الشخصي</span>
                    </button>

                    {selectedUserMenu.uid !== user.uid && !isAdminOrOwner(user.uid) && (
                      <button 
                         onClick={() => {
                           handleLocalVolume(selectedUserMenu.uid, (localParticipantVolumes[selectedUserMenu.uid] || 100) === 0 ? 100 : 0);
                         }}
                         className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] transition-all border group ${
                           (localParticipantVolumes[selectedUserMenu.uid] || 100) === 0 
                             ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                             : 'bg-white/5 border-white/5 text-white underline-none'
                         }`}
                       >
                         {(localParticipantVolumes[selectedUserMenu.uid] || 100) === 0 ? <VolumeX size={28} /> : <Volume2 size={28} />}
                         <span className="text-xs font-bold">{(localParticipantVolumes[selectedUserMenu.uid] || 100) === 0 ? 'إلغاء الكتم' : 'كتم عندي'}</span>
                      </button>
                    )}

                    {isAdminOrOwner(user.uid) && selectedUserMenu.uid !== user.uid && (
                      <>
                        {selectedUserMenu.status === 'force_muted' ? (
                          <button 
                            onClick={() => handleAdminAction(selectedUserMenu.uid, 'unmute')}
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all border border-emerald-500/20 group"
                          >
                            <Mic size={28} className="group-hover:animate-pulse" />
                            <span className="text-xs font-bold text-center">السماح بالتحدث</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleAdminAction(selectedUserMenu.uid, 'mute')}
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/20 group"
                          >
                            <MicOff size={28} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-center">كتم</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {isAdminOrOwner(user.uid) && selectedUserMenu.uid !== user.uid && (
                     <button 
                        onClick={() => handleAdminAction(selectedUserMenu.uid, 'remove')}
                        className="w-full flex items-center gap-4 p-5 rounded-[28px] bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all border border-red-500/20 flex-row-reverse"
                      >
                        <UserX size={24} />
                        <span className="flex-1 text-right font-bold">إزالة من المجموعة</span>
                        <Trash2 size={18} className="opacity-40" />
                      </button>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedUserMenu(null)}
                  className="w-full mt-8 p-5 rounded-[28px] bg-slate-800 text-slate-300 font-black hover:bg-slate-700 transition-all active:scale-95"
                >
                  إغلاق القائمة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- WHITEBOARD COMPONENTS ---
function WhiteboardOverlay({ 
  isActive, 
  config, 
  isAdmin, 
  onUpdateConfig, 
  onClear,
  onClose,
  socket,
  language,
  t 
}: { 
  isActive: boolean;
  config: any;
  isAdmin: boolean;
  onUpdateConfig: (config: any) => void;
  onClear: () => void;
  onClose: () => void;
  socket: any;
  language: string;
  t: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
  const [currentText, setCurrentText] = useState("");

  const COLORS = ['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const BG_COLORS = ['#000000', '#ffffff', '#1a1a1a', '#2d3436', '#0f172a'];

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Scale for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      contextRef.current = ctx;
    }
  }, [isActive]);

  const redrawFromSocket = (data: any) => {
    if (!contextRef.current) return;
    const ctx = contextRef.current;
    
    if (data.type === 'segment') {
      ctx.strokeStyle = data.color;
      ctx.beginPath();
      ctx.moveTo(data.from.x, data.from.y);
      ctx.lineTo(data.to.x, data.to.y);
      ctx.stroke();
    } else if (data.type === 'text') {
      ctx.fillStyle = data.color;
      ctx.font = '24px Inter';
      ctx.fillText(data.text, data.pos.x, data.pos.y);
    }
  };

  useEffect(() => {
    if (!socket) return;
    
    const handleRemoteDraw = (data: any) => {
      redrawFromSocket(data);
    };

    socket.on("whiteboard-draw", handleRemoteDraw);
    const handleClear = () => {
      if (contextRef.current && canvasRef.current) {
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
    window.addEventListener('clear-whiteboard', handleClear);

    return () => {
      socket.off("whiteboard-draw", handleRemoteDraw);
      window.removeEventListener('clear-whiteboard', handleClear);
    };
  }, [socket]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAdmin || config.tool !== 'pen') return;
    setIsDrawing(true);
    const pos = getPos(e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(pos.x, pos.y);
    (window as any)._lastPos = pos;
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isAdmin || config.tool !== 'pen') return;
    const pos = getPos(e);
    const ctx = contextRef.current;
    if (ctx) {
      ctx.strokeStyle = config.penColor;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      // socket?.emit("whiteboard-draw", {
      //   type: 'segment',
      //   color: config.penColor,
      //   from: (window as any)._lastPos,
      //   to: pos
      // });
      (window as any)._lastPos = pos;
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isAdmin || config.tool !== 'text') return;
    const pos = getPos(e);
    setTextInput(pos);
  };

  const submitText = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && textInput && currentText.trim()) {
      const ctx = contextRef.current;
      if (ctx) {
        ctx.fillStyle = config.penColor;
        ctx.font = '24px Inter';
        ctx.fillText(currentText, textInput.x, textInput.y);
        socket?.emit("whiteboard-draw", {
          type: 'text',
          color: config.penColor,
          text: currentText,
          pos: textInput
        });
      }
      setTextInput(null);
      setCurrentText("");
    }
  };

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  if (!isActive) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 z-[1001] flex items-center justify-center p-4"
    >
      <div 
        className="w-full max-w-5xl h-full max-h-[80vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative border-4 border-white/20"
        style={{ backgroundColor: config.bgColor }}
      >
        {/* Toolbar */}
        {isAdmin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-6 z-10 shadow-2xl">
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              <button 
                onClick={() => onUpdateConfig({ tool: 'pen' })}
                className={`p-2 rounded-xl transition-all ${config.tool === 'pen' ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/10'}`}
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onUpdateConfig({ tool: 'text' })}
                className={`p-2 rounded-xl transition-all ${config.tool === 'text' ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/10'}`}
              >
                <TypeIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={onClear}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                title={language === 'ar' ? 'مسح الكل' : 'Clear All'}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              {COLORS.map(c => (
                <button 
                  key={c}
                  onClick={() => onUpdateConfig({ penColor: c })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${config.penColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-white/40 mr-1" />
              {BG_COLORS.map(c => (
                <button 
                  key={c}
                  onClick={() => onUpdateConfig({ bgColor: c })}
                  className={`w-6 h-6 rounded-md border-2 transition-all ${config.bgColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            
            <button 
              onClick={onClose}
              className="ml-4 p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {!isAdmin && (
           <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest pointer-events-none">
              {language === 'ar' ? 'نمط المشاهدة فقط' : 'VIEW ONLY MODE'}
           </div>
        )}

        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onClick={handleCanvasClick}
          className={`w-full h-full cursor-crosshair touch-none ${config.bgColor === '#ffffff' ? 'invert-0' : ''}`}
        />

        {textInput && (
          <div 
            className="absolute z-20"
            style={{ left: textInput.x, top: textInput.y }}
          >
            <input 
              autoFocus
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              onKeyDown={submitText}
              onBlur={() => setTextInput(null)}
              className="bg-black/80 text-white border-2 border-blue-500 rounded-lg px-3 py-1 outline-none font-bold"
              placeholder={language === 'ar' ? 'اكتب واضغط Enter...' : 'Type and press Enter...'}
              style={{ color: config.penColor }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GroupCallScreen({ 
  room, 
  allUsers, 
  user, 
  profile,
  onClose, 
  onReport,
  t: propT,
  language,
  setConfirmationModal 
}: { 
  room: LiveRoom, 
  allUsers: UserProfile[], 
  user: FirebaseUser, 
  profile: UserProfile | null,
  onClose: () => void, 
  onReport: (id: string, type: string) => void,
  t: any,
  language: string,
  setConfirmationModal: (modal: any) => void
}) {
  const t = propT || translations[language] || translations['en'];
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [guestStreams, setGuestStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [currentRoomData, setCurrentRoomData] = useState<LiveRoom | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [showViewerList, setShowViewerList] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'focus'>('grid');
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [whiteboardConfig, setWhiteboardConfig] = useState({
    bgColor: '#000000',
    penColor: '#ffffff',
    tool: 'pen' as 'pen' | 'text'
  });
  
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<any>(null);
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Join logic
  useEffect(() => {
    const initCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 360 } }, 
          audio: true 
        });
        localStream.current = stream;
        
        // Auto join as broadcaster
        const guestInfo: LiveGuest = {
          uid: user.uid,
          name: profile?.displayName || user.displayName || 'مستخدم',
          photo: profile?.photoURL || user.photoURL || '',
          isMuted: false,
          isCameraOff: false,
          status: 'accepted',
          joinedAt: Date.now()
        };

        const collectionName = 'live_rooms';
        await updateDoc(doc(db, collectionName, room.id), {
          guests: arrayUnion(guestInfo),
          participants: arrayUnion(user.uid)
        });

        // Socket setup - disabled as requested
        /*
        const newSocket: any = null;
        setSocket(null);
        newSocket.emit("join-room", room.id, user.uid);

        newSocket.on("user-joined", async (userId) => {
          if (userId !== user.uid) {
            const pc = createPeerConnection(userId, localStream.current, newSocket);
            pcs.current.set(userId, pc);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            newSocket.emit("offer", { to: userId, from: user.uid, offer });
          }
        });

        newSocket.on("offer", async ({ from, offer }) => {
          const pc = createPeerConnection(from, localStream.current, newSocket);
          pcs.current.set(from, pc);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit("answer", { to: from, from: user.uid, answer });
        });

        newSocket.on("answer", async ({ from, answer }) => {
          const pc = pcs.current.get(from);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        newSocket.on("ice-candidate", async ({ from, candidate }) => {
          const pc = pcs.current.get(from);
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });
        */
        setSocket(null);

    // Whiteboard listeners - disabled to keep it local as requested
    /*
    socket?.on("whiteboard-toggle", ({ active, config }) => {
      setIsWhiteboardActive(active);
      if (config) setWhiteboardConfig(config);
    });

    socket?.on("whiteboard-update-config", (config) => {
      setWhiteboardConfig(config);
    });

    socket?.on("whiteboard-clear", () => {
      window.dispatchEvent(new CustomEvent('clear-whiteboard'));
    });
    */
      } catch (err) {
        console.error("Error joining video call:", safeJsonStringify(err));
      }
    };

    initCall();
    
    const collectionName = 'live_rooms';
    const unsubscribeRoom = onSnapshot(doc(db, collectionName, room.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as LiveRoom;
        setCurrentRoomData(data);
        if (data.status === 'ended') onClose();
      }
    });

    const unsubscribeChat = onSnapshot(
      query(collection(db, `${collectionName}/${room.id}/chat`), orderBy('timestamp', 'asc'), limit(50)),
      (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubscribeRoom();
      unsubscribeChat();
      localStream.current?.getTracks().forEach(t => t.stop());
      pcs.current.forEach(pc => pc.close());
      socket?.disconnect();
    };
  }, [room.id]);

  const createPeerConnection = (userId: string, stream: MediaStream | null, socket: any) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    if (stream) stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { 
          to: userId, 
          from: user.uid, 
          candidate: event.candidate 
        });
      }
    };
    pc.ontrack = (event) => {
      setGuestStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, event.streams[0]);
        return newMap;
      });
    };
    return pc;
  };

  const toggleMute = async () => {
    if (localStream.current && currentRoomData) {
      const newMuted = !isMuted;
      localStream.current.getAudioTracks().forEach(t => t.enabled = !newMuted);
      setIsMuted(newMuted);

      // Sync to Firestore
      const updatedGuests = (currentRoomData.guests || []).map(g => 
        g.uid === user.uid ? { ...g, isMuted: newMuted } : g
      );
      await updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests });
    }
  };

  const toggleCamera = async () => {
    if (localStream.current && currentRoomData) {
      if (isSharingScreen) {
        await stopScreenShare();
      }
      const newCameraOff = !isCameraOff;
      localStream.current.getVideoTracks().forEach(t => t.enabled = !newCameraOff);
      setIsCameraOff(newCameraOff);

      // Sync to Firestore
      const updatedGuests = (currentRoomData.guests || []).map(g => 
        g.uid === user.uid ? { ...g, isCameraOff: newCameraOff } : g
      );
      await updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests });
    }
  };

  const stopScreenShare = async () => {
    if (!isSharingScreen) return;
    try {
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
        screenStream.current = null;
      }
      
      // Re-enable camera if it was on
      if (localStream.current) {
        const videoTrack = localStream.current.getVideoTracks()[0];
        if (videoTrack) {
          pcs.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          });
        }
      }
      
      setIsSharingScreen(false);
      const updatedGuests = (currentRoomData?.guests || []).map(g => 
        g.uid === user.uid ? { ...g, isSharingScreen: false } : g
      );
      await updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests });
    } catch (err) {
      console.error("Error stopping screen share:", err);
    }
  };

  const handleScreenShare = async () => {
    try {
      if (isSharingScreen) {
        await stopScreenShare();
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.current = stream;
        
        const screenTrack = stream.getVideoTracks()[0];
        screenTrack.onended = () => stopScreenShare();

        pcs.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        setIsSharingScreen(true);
        setIsCameraOff(true); // Usually turn off camera when sharing screen

        // Sync to Firestore
        const updatedGuests = (currentRoomData?.guests || []).map(g => 
          g.uid === user.uid ? { ...g, isSharingScreen: true, isCameraOff: true } : g
        );
        await updateDoc(doc(db, 'live_rooms', room.id), { guests: updatedGuests });
      }
    } catch (err) {
      console.error("Error toggling screen share:", safeJsonStringify(err));
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await addDoc(collection(db, `live_rooms/${room.id}/chat`), {
        text: newMessage,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        senderPhoto: user.photoURL || '',
        timestamp: serverTimestamp(),
        type: 'user'
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleLeave = () => {
    setConfirmationModal({
      isOpen: true,
      title: language === 'ar' ? 'مغادرة المحادثة' : 'Leave Call',
      message: language === 'ar' ? 'هل أنت متأكد من رغبتك في مغادرة المحادثة المرئية؟' : 'Are you sure you want to leave the video call?',
      confirmText: language === 'ar' ? 'مغادرة' : 'Leave',
      cancelText: language === 'ar' ? 'إلغاء' : 'Cancel',
      isDanger: true,
      onConfirm: () => {
        onClose();
        setConfirmationModal(null);
      }
    });
  };

  const isAdmin = profile?.role === 'admin' || room.hostId === user.uid;

  const toggleWhiteboard = () => {
    if (!isAdmin) return;
    const newState = !isWhiteboardActive;
    setIsWhiteboardActive(newState);
    // socket?.emit("whiteboard-toggle", { active: newState, config: whiteboardConfig });
  };

  const updateWhiteboardConfig = (newConfig: any) => {
    if (!isAdmin) return;
    const updated = { ...whiteboardConfig, ...newConfig };
    setWhiteboardConfig(updated);
    // socket?.emit("whiteboard-update-config", updated);
  };

  const clearWhiteboard = () => {
    if (!isAdmin) return;
    // socket?.emit("whiteboard-clear");
    window.dispatchEvent(new CustomEvent('clear-whiteboard'));
  };

  // Dynamic grid column calculation
  const allStreams = Array.from(guestStreams.entries());
  const participantsCount = allStreams.length + 1; // Guests + Local
  
  const getGridCols = () => {
    if (participantsCount === 1) return 'grid-cols-1';
    if (participantsCount === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (participantsCount <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  const getGridRows = () => {
    if (participantsCount <= 2) return 'grid-rows-1';
    if (participantsCount <= 4) return 'grid-rows-2';
    if (participantsCount <= 6) return 'grid-rows-3';
    return 'grid-rows-auto';
  };

  const renderSharedModals = () => {
    return (
      <>
        {/* Selected Participant Modal */}
        <AnimatePresence>
          {selectedParticipant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedParticipant(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md z-[1100] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/10 p-8 text-center"
              >
                <div className="relative inline-block mb-6">
                  <img src={selectedParticipant.photo} className="w-24 h-24 rounded-full border-4 border-white/10 object-cover shadow-2xl" referrerPolicy="no-referrer" />
                  {selectedParticipant.uid === room.hostId && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase border border-black shadow-lg flex items-center gap-1">
                      <Crown className="w-2 h-2 fill-white" />
                      <span>{language === 'ar' ? 'المذيع' : 'Host'}</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-white font-black text-xl mb-1">{selectedParticipant.name}</h3>
                <p className="text-white/40 text-xs mb-8">@{selectedParticipant.uid.slice(0, 8)}</p>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { onReport(selectedParticipant.uid, 'user'); setSelectedParticipant(null); }} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold text-sm flex flex-col items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    <span>{t.profile}</span>
                  </button>
                  <button onClick={() => setSelectedParticipant(null)} className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-bold text-sm flex flex-col items-center gap-2">
                    <X className="w-5 h-5 text-gray-400" />
                    <span>{t.close}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewer/Participant List Modal */}
        <AnimatePresence>
          {showViewerList && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="absolute inset-x-0 bottom-0 top-20 bg-zinc-900 rounded-t-[40px] z-[1200] flex flex-col p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-black text-xl">{t.participants} ({guestStreams.size + 1})</h3>
                </div>
                <button 
                  onClick={() => setShowViewerList(false)} 
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pb-10">
                {/* Local User */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-[2rem] border border-white/5">
                  <div className="flex items-center gap-4">
                    <img src={user.photoURL || ''} className="w-12 h-12 rounded-full border-2 border-white/10 object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-white font-bold text-sm">{user.displayName} ({t.youLabel})</p>
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{t.participant}</p>
                    </div>
                  </div>
                </div>

                {/* Other Participants */}
                {Array.from(guestStreams.keys()).map((uid) => {
                  const guestInfo = currentRoomData?.guests?.find(g => g.uid === uid);
                  return (
                    <div key={uid} className="flex items-center justify-between p-4 bg-white/5 rounded-[2rem] border border-white/10 group hover:border-blue-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <img src={guestInfo?.photo || ''} className="w-12 h-12 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="text-white font-bold text-sm">{guestInfo?.name}</p>
                          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-none mt-1">@{(uid as string).slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setSelectedParticipant({ uid, name: guestInfo?.name, photo: guestInfo?.photo }); setShowViewerList(false); }}
                          className="px-4 py-2 bg-white/5 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all"
                        >
                          {t.profile}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0f172a] text-white flex flex-col items-stretch overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <AnimatePresence>
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 flex items-center justify-between bg-black/40 backdrop-blur-md absolute top-0 left-0 right-0 z-50 border-b border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/20">
              <Users className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">{room.title}</span>
            </div>
            <div 
              onClick={() => setShowViewerList(true)}
              className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/5 cursor-pointer hover:bg-white/20 transition-colors"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold">{guestStreams.size + 1} {t.participants}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLayoutMode(layoutMode === 'grid' ? 'focus' : 'grid')}
              className={`p-2.5 rounded-xl transition-all border shadow-lg flex items-center gap-2 ${layoutMode === 'focus' ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/10 text-white/60 border-white/5 hover:bg-white/20'}`}
              title={layoutMode === 'grid' ? t.speakerFocus : t.gridView}
            >
              {layoutMode === 'grid' ? <Maximize2 className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              <span className="hidden md:block text-[10px] font-black uppercase tracking-widest">
                {layoutMode === 'grid' ? t.focusAction : t.gridAction}
              </span>
            </button>
            <button 
              onClick={handleLeave}
              className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-500/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <AnimatePresence>
          {isWhiteboardActive && (
            <WhiteboardOverlay 
              isActive={isWhiteboardActive}
              config={whiteboardConfig}
              isAdmin={isAdmin}
              onUpdateConfig={updateWhiteboardConfig}
              onClear={clearWhiteboard}
              onClose={() => setIsWhiteboardActive(false)}
              socket={socket}
              language={language}
              t={t}
            />
          )}
        </AnimatePresence>
        
        {/* Participants Area */}
        <motion.div 
          layout
          className={`flex-1 p-4 pt-20 pb-28 gap-4 overflow-y-auto no-scrollbar transition-all duration-500 relative ${showChat ? 'lg:mr-[350px]' : ''} ${
            layoutMode === 'grid' 
              ? (participantsCount > 1 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'flex items-center justify-center')
              : 'flex flex-col'
          }`}
        >
          {/* Layout: SPEAKER FOCUS MODE */}
          {layoutMode === 'focus' && (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
              {/* Large Speaker Focus */}
              <div className="flex-[3] relative rounded-[3rem] overflow-hidden bg-black border border-white/10 shadow-2xl group">
                {(() => {
                  const focusId = activeSpeakerId || (allStreams.length > 0 ? allStreams[0][0] : user.uid);
                  const isLocalFocus = focusId === user.uid;
                  const guestInfo = currentRoomData?.guests?.find(g => g.uid === focusId);
                  const stream = isLocalFocus ? (isSharingScreen ? screenStream.current : localStream.current) : guestStreams.get(focusId);
                  const isCamOff = isLocalFocus ? isCameraOff : guestInfo?.isCameraOff;
                  const isSharing = isLocalFocus ? isSharingScreen : guestInfo?.isSharingScreen;

                  return (
                    <>
                      <video 
                        autoPlay 
                        playsInline 
                        muted={isLocalFocus}
                        className={`w-full h-full object-cover rounded-[3rem] transition-transform duration-700 ${isCamOff && !isSharing ? 'hidden' : 'block'}`}
                        ref={el => { if (el && stream) el.srcObject = stream; }}
                      />
                      {(isCamOff && !isSharing) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#000]">
                          <img 
                            src={isLocalFocus ? (user.photoURL || '') : (guestInfo?.photo || '')} 
                            className="w-40 h-40 rounded-full border-8 border-white/5 grayscale opacity-50 shadow-2xl" 
                          />
                          <p className="mt-6 text-white/40 font-black tracking-[0.2em] uppercase text-xs">
                            {isLocalFocus ? t.youLabel : (guestInfo?.name || t.user)} ({t.cameraOff})
                          </p>
                        </div>
                      )}
                      <div className="absolute top-8 left-8 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-xl px-5 py-2 rounded-full border border-white/10 shadow-2xl">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                         <span className="text-xs font-black uppercase tracking-widest">{isLocalFocus ? t.youTalkingNow : `${guestInfo?.name} (${t.talkingNow})`}</span>
                         {(isLocalFocus ? isMuted : guestInfo?.isMuted) && <MicOff className="w-4 h-4 text-red-500" />}
                      </div>
                      {isSharing && (
                        <div className="absolute top-8 right-8 z-20 bg-blue-600 px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 border border-blue-400 shadow-xl">
                          <Monitor className="w-4 h-4" />
                          <span>{language === 'ar' ? 'مشاركة شاشة' : 'SHARING SCREEN'}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Sidebar/Bottom strip of other participants in Focus Mode */}
              <div className="flex-1 flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto no-scrollbar max-h-[200px] lg:max-h-full">
                 {/* Render all except focus user */}
                 {[
                   { uid: user.uid, name: (language === 'ar' ? 'أنت' : 'You'), photo: user.photoURL, stream: isSharingScreen ? screenStream.current : localStream.current, isLocal: true, isCamOff: isCameraOff, isMuted, isSharing: isSharingScreen },
                   ...allStreams.map(([uid, stream]) => {
                     const guestInfo = currentRoomData?.guests?.find(g => g.uid === uid);
                     return { uid, name: guestInfo?.name, photo: guestInfo?.photo, stream, isLocal: false, isCamOff: guestInfo?.isCameraOff, isMuted: guestInfo?.isMuted, isSharing: guestInfo?.isSharingScreen };
                   })
                 ].filter(p => p.uid !== (activeSpeakerId || (allStreams.length > 0 ? allStreams[0][0] : user.uid))).map((p) => (
                   <motion.div 
                     layout
                     key={p.uid}
                     onClick={() => setActiveSpeakerId(p.uid)}
                     className="relative aspect-video min-w-[200px] lg:min-w-0 lg:w-full rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/5 shadow-lg cursor-pointer hover:border-blue-500/50 transition-all group"
                   >
                     <video 
                        autoPlay 
                        playsInline 
                        muted={p.isLocal}
                        className={`w-full h-full object-cover rounded-[2rem] ${(p.isCamOff && !p.isSharing) ? 'hidden' : 'block'}`}
                        ref={el => { if (el && p.stream) el.srcObject = p.stream; }}
                      />
                      {(p.isCamOff && !p.isSharing) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                           <img src={p.photo || ''} className="w-12 h-12 rounded-full border-2 border-white/5 opacity-50 grayscale" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="text-[10px] font-black uppercase tracking-tight bg-blue-600 px-3 py-1 rounded-full shadow-xl">
                            {t.focusAction}
                         </span>
                      </div>
                      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
                         <span className="text-[8px] font-bold text-white/80 truncate max-w-[80px]">{p.name}</span>
                         {p.isMuted && <MicOff className="w-2.5 h-2.5 text-red-500" />}
                      </div>
                   </motion.div>
                 ))}
              </div>
            </div>
          )}

          {/* Layout: GRID MODE */}
          {layoutMode === 'grid' && (
            <>
              {/* Local Stream - Part of grid or PIP */}
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  position: participantsCount > 1 && participantsCount <= 3 ? 'absolute' : 'relative',
                  bottom: participantsCount > 1 && participantsCount <= 3 ? 120 : 'auto',
                  right: participantsCount > 1 && participantsCount <= 3 ? 24 : 'auto',
                  width: participantsCount > 1 && participantsCount <= 3 ? 180 : '100%',
                  height: participantsCount > 1 && participantsCount <= 3 ? 280 : 'auto',
                  zIndex: 40
                }}
                onClick={() => {
                  setSelectedParticipant({ uid: user.uid, name: user.displayName, photo: user.photoURL, isHost: room.hostId === user.uid });
                  setActiveSpeakerId(user.uid);
                }}
                className={`rounded-[2.5rem] overflow-hidden bg-zinc-900 border-2 border-white/20 shadow-2xl group transition-all cursor-pointer ${participantsCount === 1 ? 'w-full max-w-2xl aspect-video' : (participantsCount <= 3 ? 'w-[180px] h-[280px]' : 'aspect-video w-full')}`}
              >
                <video 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover rounded-[2.5rem] transition-transform duration-700 ${isCameraOff && !isSharingScreen ? 'hidden' : 'block group-hover:scale-105'}`}
                  ref={el => { if (el) el.srcObject = isSharingScreen ? screenStream.current : localStream.current; }}
                />
                {isCameraOff && !isSharingScreen && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#000]">
                    <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/200`} className={`${participantsCount === 1 ? 'w-32 h-32' : 'w-16 h-16'} rounded-full border-4 border-white/10 grayscale opacity-50 transition-transform group-hover:scale-110 duration-500`} />
                  </div>
                )}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                   <span className="text-[9px] font-black uppercase tracking-wider">{language === 'ar' ? 'أنت' : 'You'}</span>
                   {isMuted && <MicOff className="w-2.5 h-2.5 text-red-500" />}
                </div>
                {isSharingScreen && (
                   <div className="absolute top-3 right-3 z-20 bg-orange-600 px-2 py-0.5 rounded-full border border-white/20 shadow-lg">
                      <Monitor className="w-3 h-3 text-white" />
                   </div>
                )}
              </motion.div>

              {/* Remote Streams */}
              <AnimatePresence mode="popLayout">
                {allStreams.map(([uid, stream]) => {
                  const guestInfo = currentRoomData?.guests?.find(g => g.uid === uid);
                  const isSharing = guestInfo?.isSharingScreen;
                  return (
                    <motion.div 
                      key={uid}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => {
                        setSelectedParticipant({ uid, name: guestInfo?.name, photo: guestInfo?.photo, isHost: room.hostId === uid });
                        setActiveSpeakerId(uid);
                      }}
                      className={`relative rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl group transition-all cursor-pointer ${isSharing ? 'col-span-full aspect-video max-w-5xl mx-auto' : 'aspect-video w-full'}`}
                    >
                      <video 
                        autoPlay 
                        playsInline 
                        className={`w-full h-full object-cover rounded-[2.5rem] transition-transform duration-700 ${(guestInfo?.isCameraOff && !isSharing) ? 'hidden' : 'block group-hover:scale-105'}`}
                        ref={el => { if (el) el.srcObject = stream; }}
                      />
                      {guestInfo?.isCameraOff && !isSharing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#000]">
                          <img src={guestInfo.photo} className="w-24 h-24 rounded-full border-4 border-white/10 grayscale opacity-50 transition-transform group-hover:scale-110 duration-500" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                         <span className="text-[10px] font-black uppercase tracking-wider">{guestInfo?.name}</span>
                         {guestInfo?.isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                         {room.hostId === uid && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                      {isSharing && (
                        <div className="absolute top-4 right-4 z-20 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1.5 border border-blue-400/30">
                          <Monitor className="w-3 h-3" />
                          <span>{language === 'ar' ? 'مشاركة شاشة' : 'SHARING'}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </motion.div>

      {/* Floating Chat Overlay (Mobile) / Side Panel (Desktop) */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: language === 'ar' ? -400 : 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: language === 'ar' ? -400 : 400, opacity: 0 }}
            className={`fixed top-20 bottom-28 ${language === 'ar' ? 'left-4' : 'right-4'} w-[calc(100%-2rem)] sm:w-[350px] bg-zinc-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col z-[100] overflow-hidden`}
          >
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">{t.chat}</span>
              </div>
              <button 
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronRight className={`w-5 h-5 text-white ${language === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((msg, i) => (
                <motion.div 
                   key={msg.id || i}
                   initial={{ opacity: 0, scale: 0.9, x: msg.senderId === user.uid ? 20 : -20 }}
                   animate={{ opacity: 1, scale: 1, x: 0 }}
                   className={`flex gap-3 ${msg.senderId === user.uid ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.senderId !== user.uid && (
                    <img 
                      src={msg.senderPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} 
                      onClick={() => setSelectedParticipant({ uid: msg.senderId, name: msg.senderName, photo: msg.senderPhoto })}
                      className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0 cursor-pointer hover:scale-110 transition-transform" 
                      referrerPolicy="no-referrer" 
                    />
                  )}
                  <div className={`max-w-[75%] p-3 rounded-2xl text-xs flex flex-col ${
                    msg.senderId === user.uid 
                      ? 'bg-blue-600 text-white rounded-tr-none items-end' 
                      : 'bg-white/5 border border-white/5 text-white rounded-tl-none items-start'
                  }`}>
                    {msg.senderId !== user.uid && (
                      <p className="text-[9px] font-black mb-1 opacity-50 uppercase tracking-widest">{msg.senderName}</p>
                    )}
                    <p className="font-medium leading-relaxed break-words">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-black/20 border-t border-white/10">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={currentRoomData?.commentsEnabled === false && room.hostId !== user.uid}
                  placeholder={currentRoomData?.commentsEnabled === false && room.hostId !== user.uid 
                    ? (language === 'ar' ? 'التعليقات معطلة' : 'Comments disabled') 
                    : t.typeSomething}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-white placeholder-white/30 disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || (currentRoomData?.commentsEnabled === false && room.hostId !== user.uid)}
                  className="p-3 bg-blue-600 text-white rounded-2xl disabled:opacity-50 hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {renderSharedModals()}
      </div>

      {/* Control Bar */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center justify-center pointer-events-none bg-gradient-to-t from-black/80 via-black/20 to-transparent"
      >
        <div className="flex items-center gap-6 bg-zinc-900/80 backdrop-blur-3xl px-8 py-5 rounded-[2.5rem] border border-white/10 shadow-2xl pointer-events-auto active:scale-95 transition-transform">
          <button 
            onClick={toggleMute}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isMuted ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isCameraOff ? 'bg-zinc-800 text-white/40' : 'bg-blue-600 text-white shadow-blue-500/20'}`}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleScreenShare();
            }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ring-offset-2 ring-offset-black ${isSharingScreen ? 'bg-orange-600 text-white shadow-[0_0_25px_rgba(234,88,12,0.6)] ring-2 ring-orange-500 animate-pulse' : 'bg-white/10 text-white hover:bg-white/20 hover:ring-2 hover:ring-white/30'}`}
            title={language === 'ar' ? 'مشاركة الشاشة' : 'Share Screen'}
          >
            <MonitorUp className="w-6 h-6" />
          </button>

          <button 
            onClick={() => setShowChat(!showChat)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl relative ${showChat ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <MessageSquare className="w-6 h-6" />
            {messages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0f172a] animate-pulse" />
            )}
          </button>

          {isAdmin && (
            <button 
              onClick={toggleWhiteboard}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isWhiteboardActive ? 'bg-purple-600 text-white shadow-purple-500/40 animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title={language === 'ar' ? 'السبورة الذكية' : 'Smart Whiteboard'}
            >
              <Presentation className="w-6 h-6" />
            </button>
          )}

          <div className="w-px h-10 bg-white/10 mx-2" />

          <button 
            onClick={handleLeave}
            className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-600/30 hover:bg-red-700 hover:scale-110 active:scale-90 transition-all"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StartLiveModal({ onClose, onStart, t, language }: { onClose: () => void, onStart: (title: string, quality: string, watchTogetherEnabled: boolean, placeholderUrl?: string, type?: 'broadcast' | 'group_call', guestPrivacy?: 'public' | 'followers' | 'approved', allowedGuests?: string[]) => void, t: any, language: string }) {
  const [title, setTitle] = useState("");
  const [quality, setQuality] = useState("720p");
  const [roomType, setRoomType] = useState<'broadcast' | 'group_call'>('broadcast');
  const [watchTogetherEnabled, setWatchTogetherEnabled] = useState(false);
  const [placeholderUrl, setPlaceholderUrl] = useState<string | undefined>(undefined);
  const [guestPrivacy, setGuestPrivacy] = useState<'public' | 'followers' | 'approved'>('public');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        console.warn(language === 'ar' ? "حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 500 كيلوبايت." : "Image size is too large. Please choose an image smaller than 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPlaceholderUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-8 transition-colors duration-300"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'بدء محادثة مرئية' : 'Start Video Chat'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.liveTitle}</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.liveTitlePlaceholder}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.liveQuality}</label>
            <div className="grid grid-cols-3 gap-3">
              {['480p', '720p', '1080p'].map((q) => (
                <button 
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`py-3 rounded-2xl font-bold text-sm transition-all ${quality === q ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.livePlaceholder}</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="w-full h-24 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1 hover:border-blue-500 transition-all">
                  {placeholderUrl ? (
                    <img src={placeholderUrl} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400">{t.chooseImage}</span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              {placeholderUrl && (
                <button onClick={() => setPlaceholderUrl(undefined)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">{t.watchTogether}</p>
                <p className="text-[10px] text-gray-500">{t.watchTogetherDesc}</p>
              </div>
            </div>
            <button 
              onClick={() => setWatchTogetherEnabled(!watchTogetherEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${watchTogetherEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${watchTogetherEnabled ? (language === 'ar' || language === 'fa' ? 'left-1' : 'right-1') : (language === 'ar' || language === 'fa' ? 'left-7' : 'right-7')}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.roomType}</label>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => setRoomType('broadcast')}
                className={`py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${roomType === 'broadcast' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}
              >
                <Radio className="w-4 h-4" />
                {t.broadcast}
              </button>
              <button 
                onClick={() => setRoomType('group_call')}
                className={`py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${roomType === 'group_call' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}
              >
                <Users className="w-4 h-4" />
                {t.groupCall}
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.guestPrivacy}</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: 'public', label: t.everyone, icon: Globe },
                { id: 'followers', label: t.followersOnly, icon: Users },
                { id: 'approved', label: t.approvedOnly, icon: ShieldCheck }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setGuestPrivacy(p.id as any)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${guestPrivacy === p.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-50 dark:border-gray-800 hover:border-gray-200'}`}
                >
                  <p.icon className={`w-4 h-4 ${guestPrivacy === p.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-[9px] font-black ${guestPrivacy === p.id ? 'text-blue-600' : 'text-gray-500'}`}>{p.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800/30 flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-800/30 rounded-xl">
                <Monitor className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 leading-tight">
                {language === 'ar' ? 'يمكنك مشاركة شاشتك للجميع أثناء البث بالضغط على أيقونة الشاشة في لوحة التحكم.' : 'You can share your screen with everyone during the live by clicking the screen icon in the control panel.'}
              </p>
            </div>
          </div>

          <button 
            onClick={() => onStart(title || (language === 'ar' ? 'محادثة مرئية جديدة' : 'New Video Chat'), quality, watchTogetherEnabled, placeholderUrl, roomType, guestPrivacy)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <Video className="w-5 h-5" />
            {language === 'ar' ? 'بدء المحادثة المرئية' : 'Start Video Chat'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PostCommentsModal({ post, allUsers, onClose, onAddComment, onDeleteComment, onReportComment, onShareInReel, onProfileClick, currentUserId, quotaExceeded, t, language }: { post: any, allUsers: UserProfile[], onClose: () => void, onAddComment: (text: string, parentId?: string) => void, onDeleteComment: (commentId: string) => void, onReportComment: (commentId: string) => void, onShareInReel: (comment: any) => void, onProfileClick: (uid: string) => void, currentUserId: string, quotaExceeded: boolean, t: any, language: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    if (quotaExceeded) return;
    const q = query(collection(db, `posts/${post.postId}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `posts/${post.postId}/comments`));
    return () => unsubscribe();
  }, [post.postId, quotaExceeded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment, replyTo?.id);
    setNewComment("");
    setReplyTo(null);
  };

  const handleReply = (comment: any) => {
    setReplyTo(comment);
    setNewComment(`@${comment.authorName} `);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenu(null);
  };

  const handleShare = (comment: any) => {
    const shareText = `${t.commentFrom} ${comment.authorName}: ${comment.text}`;
    if (navigator.share) {
      navigator.share({
        title: t.shareComment,
        text: shareText,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText);
    }
    setActiveMenu(null);
  };

  const handleTouchStart = (commentId: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveMenu(commentId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white dark:bg-gray-900 w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl transition-colors duration-300"
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.postsTab} ({post.commentsCount || 0})</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {comments.length > 0 ? (
            comments.filter(c => !c.parentId).map((comment) => {
              const nestedReplies = comments.filter(c => c.parentId === comment.id);
              const isPostOwner = post.authorId === currentUserId;
              const isCommentOwner = comment.authorId === currentUserId;
              const canManage = isPostOwner || isCommentOwner;

              return (
                <div key={comment.id} className="space-y-3">
                  <div 
                    className="flex gap-3 group relative"
                    onMouseDown={() => handleTouchStart(comment.id)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={() => handleTouchStart(comment.id)}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img 
                      src={allUsers.find(u => u.uid === comment.authorId)?.photoURL || comment.authorPhoto || `https://picsum.photos/seed/${comment.authorId}/100`} 
                      className="w-8 h-8 rounded-full object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      referrerPolicy="no-referrer"
                      onClick={() => onProfileClick(comment.authorId)}
                    />
                    <div className="flex-1">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 relative transition-all active:scale-[0.98]">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => onProfileClick(comment.authorId)}>{comment.authorName}</p>
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenu(activeMenu === comment.id ? null : comment.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            <AnimatePresence>
                              {activeMenu === comment.id && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute end-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden"
                                >
                                  <button onClick={() => handleCopy(comment.text)} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <Copy className="w-3.5 h-3.5" /> {t.copy}
                                  </button>
                                  <button onClick={() => handleShare(comment)} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <Share2 className="w-3.5 h-3.5" /> {t.share}
                                  </button>
                                  <button onClick={() => { onShareInReel(comment); setActiveMenu(null); }} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <Video className="w-3.5 h-3.5 text-orange-500" /> {t.shareInReel}
                                  </button>
                                  <button onClick={() => { onReportComment(comment.id); setActiveMenu(null); }} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-50 dark:border-gray-700/50">
                                    <Flag className="w-3.5 h-3.5" /> {t.report}
                                  </button>
                                  {canManage && (
                                    <button onClick={() => { onDeleteComment(comment.id); setActiveMenu(null); }} className="w-full px-3 py-2.5 text-right text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-bold border-t border-gray-50 dark:border-gray-700/50">
                                      <Trash2 className="w-3.5 h-3.5" /> {t.delete}
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-[250px] break-words">{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 mr-2 bg-transparent">
                        <p className="text-[10px] text-gray-400">{formatRelativeTime(comment.createdAt, t)}</p>
                        <button 
                          onClick={() => handleReply(comment)}
                          className="text-[10px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
                        >
                          {language === 'ar' ? 'رد' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Render Nested Replies */}
                  {nestedReplies.length > 0 && (
                    <div className={`space-y-4 ${language === 'ar' ? 'pr-8 mr-4 border-r-2 border-gray-100 dark:border-gray-800' : 'pl-8 ml-4 border-l-2 border-gray-100 dark:border-gray-800'}`}>
                      {nestedReplies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <motion.img 
                            whileHover={{ scale: 1.1 }}
                            src={allUsers.find(u => u.uid === reply.authorId)?.photoURL || reply.authorPhoto || `https://picsum.photos/seed/${reply.authorId}/100`} 
                            className="w-6 h-6 rounded-full object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            referrerPolicy="no-referrer"
                            onClick={() => onProfileClick(reply.authorId)}
                          />
                          <div className="flex-1">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-2.5">
                              <p className="text-[10px] font-bold text-gray-900 dark:text-white mb-0.5 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => onProfileClick(reply.authorId)}>{reply.authorName}</p>
                              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-words">{reply.text}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 px-1">
                              <p className="text-[9px] text-gray-400">{formatRelativeTime(reply.createdAt, t)}</p>
                              <button 
                                onClick={() => handleReply(comment)}
                                className="text-[9px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
                              >
                                {language === 'ar' ? 'رد' : 'Reply'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p>{t.noResults}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl mb-1">
              <p className="text-[10px] text-gray-500">
                {language === 'ar' ? 'الرد على' : 'Replying to'} <span className="font-bold text-blue-600">{replyTo.authorName}</span>
              </p>
              <button 
                type="button"
                onClick={() => { setReplyTo(null); setNewComment(""); }}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              ref={commentInputRef}
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t.captionPlaceholder}
              className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="p-3 bg-blue-600 text-white rounded-2xl disabled:opacity-50 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ReelCommentsModal({ reel, allUsers, onClose, onAddComment, onDeleteComment, onReportComment, onShareInReel, onProfileClick, currentUserId, quotaExceeded, t, language }: { reel: any, allUsers: UserProfile[], onClose: () => void, onAddComment: (text: string, parentId?: string) => void, onDeleteComment: (commentId: string) => void, onReportComment: (commentId: string) => void, onShareInReel: (comment: any) => void, onProfileClick: (uid: string) => void, currentUserId: string, quotaExceeded: boolean, t: any, language: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    if (quotaExceeded) return;
    const q = query(collection(db, `reels/${reel.id}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `reels/${reel.id}/comments`));
    return () => unsubscribe();
  }, [reel.id, quotaExceeded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment, replyTo?.id);
    setNewComment("");
    setReplyTo(null);
  };

  const handleReply = (comment: any) => {
    setReplyTo(comment);
    setNewComment(`@${comment.authorName} `);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenu(null);
  };

  const handleShare = (comment: any) => {
    const shareText = `${t.commentFrom} ${comment.authorName}: ${comment.text}`;
    if (navigator.share) {
      navigator.share({
        title: t.shareComment,
        text: shareText,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareText);
    }
    setActiveMenu(null);
  };

  const handleTouchStart = (commentId: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveMenu(commentId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white dark:bg-gray-900 w-full max-w-md h-[80vh] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] flex flex-col overflow-hidden shadow-2xl transition-colors duration-300"
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">التعليقات ({reel.commentsCount || 0})</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {comments.length > 0 ? (
            comments.filter(c => !c.parentId).map((comment) => {
              const nestedReplies = comments.filter(c => c.parentId === comment.id);
              const isReelOwner = reel.userId === currentUserId;
              const isCommentOwner = comment.authorId === currentUserId;
              const canManage = isReelOwner || isCommentOwner;

              return (
                <div key={comment.id} className="space-y-3">
                  <div 
                    className="flex gap-3 group relative"
                    onMouseDown={() => handleTouchStart(comment.id)}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={() => handleTouchStart(comment.id)}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img 
                      src={allUsers.find(u => u.uid === comment.authorId)?.photoURL || comment.authorPhoto || `https://picsum.photos/seed/${comment.authorId}/100`} 
                      className="w-8 h-8 rounded-full object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      referrerPolicy="no-referrer"
                      onClick={() => onProfileClick(comment.authorId)}
                    />
                    <div className="flex-1">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 relative transition-all active:scale-[0.98]">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => onProfileClick(comment.authorId)}>{comment.authorName}</p>
                          <div className="relative">
                            <button 
                              onClick={() => setActiveMenu(activeMenu === comment.id ? null : comment.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            <AnimatePresence>
                              {activeMenu === comment.id && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute end-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden"
                                >
                                  <button onClick={() => handleCopy(comment.text)} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <Copy className="w-3.5 h-3.5" /> نسخ النص
                                  </button>
                                  <button onClick={() => handleShare(comment)} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <Share2 className="w-3.5 h-3.5" /> مشاركة
                                  </button>
                                  <button onClick={() => { onShareInReel(comment); setActiveMenu(null); }} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                    <Video className="w-3.5 h-3.5 text-orange-500" /> مشاركة في ريلز
                                  </button>
                                  <button onClick={() => { onReportComment(comment.id); setActiveMenu(null); }} className="w-full px-3 py-2.5 text-right text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-t border-gray-50 dark:border-gray-700/50">
                                    <Flag className="w-3.5 h-3.5" /> إبلاغ
                                  </button>
                                  {canManage && (
                                    <button onClick={() => { onDeleteComment(comment.id); setActiveMenu(null); }} className="w-full px-3 py-2.5 text-right text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-bold border-t border-gray-50 dark:border-gray-700/50">
                                      <Trash2 className="w-3.5 h-3.5" /> حذف
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-[250px] break-words">{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 mr-2 bg-transparent">
                        <p className="text-[10px] text-gray-400">{formatRelativeTime(comment.createdAt, t)}</p>
                        <button 
                          onClick={() => handleReply(comment)}
                          className="text-[10px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
                        >
                          رد
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Render Nested Replies */}
                  {nestedReplies.length > 0 && (
                    <div className="space-y-4 pr-8 mr-4 border-r-2 border-gray-100 dark:border-gray-800">
                      {nestedReplies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <motion.img 
                            whileHover={{ scale: 1.1 }}
                            src={allUsers.find(u => u.uid === reply.authorId)?.photoURL || reply.authorPhoto || `https://picsum.photos/seed/${reply.authorId}/100`} 
                            className="w-6 h-6 rounded-full object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            referrerPolicy="no-referrer"
                            onClick={() => onProfileClick(reply.authorId)}
                          />
                          <div className="flex-1">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-2.5">
                              <p className="text-[10px] font-bold text-gray-900 dark:text-white mb-0.5 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => onProfileClick(reply.authorId)}>{reply.authorName}</p>
                              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed break-words">{reply.text}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 px-1">
                              <p className="text-[9px] text-gray-400">{formatRelativeTime(reply.createdAt, t)}</p>
                              <button 
                                onClick={() => handleReply(comment)}
                                className="text-[9px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
                              >
                                رد
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p>{t.noResults}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col gap-2">
          {replyTo && (
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl mb-1">
              <p className="text-[10px] text-gray-500">
                {language === 'ar' ? 'الرد على' : 'Replying to'} <span className="font-bold text-blue-600">{replyTo.authorName}</span>
              </p>
              <button 
                type="button"
                onClick={() => { setReplyTo(null); setNewComment(""); }}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input 
              ref={commentInputRef}
              type="text" 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t.captionPlaceholder}
              className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="p-3 bg-blue-600 text-white rounded-2xl disabled:opacity-50 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- Main App Component ---

function CreateAIImageModal({ 
  isOpen, 
  onClose, 
  onGenerate, 
  onPublish, 
  isGenerating, 
  generatedImage, 
  t, 
  language 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onGenerate: (prompt: string) => void, 
  onPublish: (caption: string, imageUrl: string) => void, 
  isGenerating: boolean, 
  generatedImage: string | null, 
  t: any, 
  language: string 
}) {
  const [prompt, setPrompt] = useState("");
  const [caption, setCaption] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.createAIImage}</h3>
        </div>

        <div className="p-6 space-y-6">
          {!generatedImage ? (
            <div className="space-y-4">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.aiImagePromptPlaceholder}
                className="w-full h-32 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
              />
              <button 
                onClick={() => onGenerate(prompt)}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.generatingImage}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t.generateImage}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner group">
                <img src={generatedImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => onGenerate(prompt)}
                  className="absolute bottom-4 right-4 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100"
                  title={t.generateImage}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t.aiImageCaptionPlaceholder}
                className="w-full h-24 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
              />
              <button 
                onClick={() => onPublish(caption, generatedImage)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {t.publishAIImage}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function CreatePostModal({ isOpen, onClose, onCreate, onCreateReel, onCreateStory, t, language, initialType = 'post' }: { isOpen: boolean, onClose: () => void, onCreate: (content: string, mediaUrl?: string, mediaType?: 'text' | 'image') => void, onCreateReel: (caption: string, videoUrl: string, category: string) => void, onCreateStory: (file: File) => void, t: any, language: string, initialType?: 'post' | 'reel' | 'story' }) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<'post' | 'reel' | 'story'>(initialType);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [category, setCategory] = useState(t.general);

  if (!isOpen) return null;

  const categories = [t.general, t.entertainment, t.gaming, t.sports, t.education, t.tech, t.cooking];

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (file.size > 5 * 1024 * 1024) {
        console.warn(language === 'ar' ? "حجم الفيديو كبير جداً. يرجى اختيار فيديو أقل من 5 ميجابايت." : "Video size is too large. Please choose a video less than 5MB.");
        return;
      }
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        console.warn(language === 'ar' ? "حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2 ميجابايت." : "Image size is too large. Please choose an image less than 2MB.");
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = async () => {
    if (type === 'post') {
      if (!content.trim() && !imageFile) return;
      
      if (imageFile) {
        setIsUploading(true);
        try {
          const compressedImage = await compressImage(imageFile, 1200, 1200, 0.7);
          onCreate(content, compressedImage, 'image');
          setIsUploading(false);
          setContent("");
          setImageFile(null);
          setImagePreview(null);
          onClose();
        } catch (err) {
          console.error("Error compressing post image:", err);
          setIsUploading(false);
        }
      } else {
        onCreate(content);
        setContent("");
        onClose();
      }
    } else if (type === 'reel') {
      if (!videoFile || !content.trim()) return;
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await onCreateReel(content, base64, category);
        setIsUploading(false);
        setContent("");
        setVideoFile(null);
        setVideoPreview(null);
        onClose();
      };
      reader.readAsDataURL(videoFile);
    } else if (type === 'story') {
      if (!imageFile) return;
      setIsUploading(true);
      await onCreateStory(imageFile);
      setIsUploading(false);
      setImageFile(null);
      setImagePreview(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.createPost}</h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <button 
              onClick={() => { setType('post'); setImageFile(null); setImagePreview(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${type === 'post' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
            >
              {t.post}
            </button>
            <button 
              onClick={() => setType('reel')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${type === 'reel' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
            >
              {t.reel}
            </button>
            <button 
              onClick={() => { setType('story'); setImageFile(null); setImagePreview(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${type === 'story' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
            >
              {t.story}
            </button>
          </div>

          {(type === 'story' || type === 'post') && (
            <div className="space-y-4">
              <label className={`block w-full ${type === 'story' ? 'aspect-[9/16]' : 'aspect-video'} max-h-60 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden relative group`}>
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <img src={imagePreview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Camera className="w-8 h-8" />
                    <span className="text-xs">{t.chooseImage}</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          )}

          {type === 'reel' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 mr-2">{t.category}</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        category === cat 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block w-full aspect-[9/16] max-h-60 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer overflow-hidden relative group">
                {videoPreview ? (
                  <video src={videoPreview} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Video className="w-8 h-8" />
                    <span className="text-xs">{t.chooseVideo}</span>
                  </div>
                )}
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </label>
            </div>
          )}

          {type !== 'story' && (
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === 'post' ? t.whatsOnYourMind : t.captionPlaceholder}
              className="w-full h-32 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          )}

          <button 
            onClick={handleSubmit}
            disabled={isUploading || (type === 'post' ? (!content.trim() && !imageFile) : (type === 'reel' ? (!videoFile || !content.trim()) : !imageFile))}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t.uploading}...
              </>
            ) : (
              type === 'story' ? t.publishStory : t.publish
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  confirmText, 
  cancelText, 
  onConfirm, 
  onCancel,
  isDanger = false,
  language,
  actionType,
  onCustomAction
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  confirmText: string, 
  cancelText: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  isDanger?: boolean,
  language: string,
  actionType?: 'delete_chat' | 'group_call_exit',
  onCustomAction?: (data: any) => void
}) {
  if (!isOpen) return null;

  const renderCustomActions = () => {
    if (actionType === 'delete_chat') {
      return (
        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onCustomAction?.('me'); }}
            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white py-3 rounded-xl font-bold hover:bg-gray-200"
          >
            حذف عندي فقط
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onCustomAction?.('both'); }}
            className="bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700"
          >
            حذف لكلا الطرفين
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            {cancelText || (language === 'ar' ? 'إلغاء' : 'Cancel')}
          </button>
        </div>
      );
    }
    if (actionType === 'group_call_exit') {
      return (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); onCustomAction?.('leave'); }}
            className="w-full py-4 bg-zinc-800/50 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-colors mb-2"
          >
            {language === 'ar' ? 'مغادرة (ستبقى المكالمة)' : 'Leave (Call continues)'}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onCustomAction?.('close'); }}
            className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors mb-2"
          >
            {language === 'ar' ? 'إنهاء المكالمة للجميع' : 'End call for everyone'}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            className="w-full py-4 bg-zinc-900/50 text-zinc-400 rounded-2xl font-bold hover:bg-zinc-900 transition-colors"
          >
            {cancelText || (language === 'ar' ? 'إلغاء' : 'Cancel')}
          </button>
        </>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
        >
          <div className={`w-16 h-16 rounded-3xl ${isDanger ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'} flex items-center justify-center mx-auto mb-6`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <h3 className="text-xl font-black text-gray-900 dark:text-white text-center mb-2">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex flex-col gap-3">
            {actionType ? renderCustomActions() : (
              <button 
                onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${
                  isDanger 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                }`}
              >
                {confirmText}
              </button>
            )}
            {!actionType && (
              <button 
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                {cancelText}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ShareModal({ isOpen, id, type, chats, allUsers, allUsersMap, onClose, onShareDM, t, language }: { 
  isOpen: boolean, 
  id: string, 
  type: string, 
  chats: Chat[], 
  allUsers: UserProfile[], 
  allUsersMap: Record<string, UserProfile>,
  onClose: () => void,
  onShareDM: (chatId: string) => void,
  t: any,
  language: string
}) {
  const url = `${window.location.origin}/#share/${type}/${id}`;
  const [searchQuery, setSearchQuery] = useState("");
  const [sentChats, setSentChats] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.shareFromPlatform,
          text: `${t.watchThis} ${type === 'post' ? t.post : type === 'reel' ? t.reel : t.liveStream}`,
          url: url
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      handleCopyLink();
    }
  };

  const filteredChats = chats.filter(chat => {
    const name = chat.type === 'group' ? chat.groupName : (chat.otherUser?.displayName || "");
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSend = (chatId: string) => {
    onShareDM(chatId);
    setSentChats(prev => new Set([...prev, chatId]));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X /></button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.share}</h2>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
              {/* External Share */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-black text-gray-400 mb-4">{t.externalShare}</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={handleNativeShare}
                    className="flex-1 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all border border-blue-100/50 dark:border-blue-900/30 group"
                  >
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                      <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">{t.shareViaApps}</span>
                  </button>
                  <button 
                    onClick={handleCopyLink}
                    className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl flex flex-col items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-700 group"
                  >
                    <div className="p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                      {copied ? <Check className="w-6 h-6 text-green-500" /> : <Link className="w-6 h-6" />}
                    </div>
                    <span className="text-xs font-bold">{copied ? t.linkCopied : t.copyLink}</span>
                  </button>
                </div>
              </div>

              {/* Internal Share (DMs) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] uppercase tracking-wider font-black text-gray-400">{t.sendToFriends}</h3>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">{filteredChats.length} {t.chats}</span>
                </div>
                
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder={t.searchChats || "بحث في المحادثات..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all"
                  />
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                  {filteredChats.length > 0 ? (
                    filteredChats.map(chat => (
                      <div 
                        key={chat.chatId}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 group"
                      >
                        <div className="relative">
                          <img 
                            src={chat.type === 'group' ? (chat.groupPhoto || `https://picsum.photos/seed/${chat.chatId}/200`) : (allUsersMap[chat.otherUser?.uid || '']?.photoURL || chat.otherUser?.photoURL || `https://picsum.photos/seed/${chat.chatId}/200`)} 
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all"
                            referrerPolicy="no-referrer"
                          />
                          {chat.type !== 'group' && allUsersMap[chat.otherUser?.uid || '']?.isVerified && (
                            <div className="absolute -bottom-1 -right-1">
                              <VerifiedBadge className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {chat.type === 'group' ? chat.groupName : (chat.otherUser?.displayName || t.users)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {chat.type === 'group' ? `${chat.participants?.length || 0} ${t.members}` : `@${chat.otherUser?.displayName?.toLowerCase().replace(/\s/g, '_')}`}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleSend(chat.chatId)}
                          disabled={sentChats.has(chat.chatId)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            sentChats.has(chat.chatId)
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                          }`}
                        >
                          {sentChats.has(chat.chatId) ? t.sent || "تم الإرسال" : t.send || "إرسال"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                        <Users className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm font-bold text-gray-400">{t.noChatsFound || "لم يتم العثور على محادثات"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">{t.shareSecurely || "مشاركة آمنة ومشفرة"}</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ChatList({ chats, allUsers, allUsersMap, user, onSelectChat, onCreateGroup, onProfileClick }: { chats: Chat[], allUsers: UserProfile[], allUsersMap: Record<string, UserProfile>, user: FirebaseUser, onSelectChat: (chat: Chat) => void, onCreateGroup: () => void, onProfileClick: (uid: string) => void }) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <button 
          onClick={onCreateGroup}
          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full hover:bg-blue-100 transition-all"
          title="إنشاء مجموعة"
        >
          <Plus className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-right">الرسائل</h2>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>لا توجد محادثات بعد. ابدأ بمراسلة أصدقائك!</p>
          </div>
        ) : (
          chats.map(chat => {
            const typingUsers = chat.typing ? Object.entries(chat.typing)
              .filter(([uid, ts]) => {
                if (uid === user.uid || !ts) return false;
                let typingTime: number;
                if ((ts as any).toDate) typingTime = (ts as any).toDate().getTime();
                else if (ts instanceof Date) typingTime = ts.getTime();
                else if (typeof ts === 'number') typingTime = ts;
                else if ((ts as any).seconds) typingTime = (ts as any).seconds * 1000;
                else typingTime = Date.now();
                return Date.now() - typingTime < 10000;
              })
              .map(([uid]) => allUsers.find(u => u.uid === uid)?.displayName || 'مستخدم') : [];

            const isLastMessageOwn = chat.lastSenderId === user.uid;
            const isLastMessageRead = isLastMessageOwn && chat.lastRead && Object.entries(chat.lastRead).some(([uid, ts]) => {
              if (uid === user.uid || !ts || !chat.lastUpdate) return false;
              const readTime = (ts as any).toDate ? (ts as any).toDate().getTime() : (typeof ts === 'number' ? ts : 0);
              const msgTime = chat.lastUpdate.toDate ? chat.lastUpdate.toDate().getTime() : Infinity;
              return readTime >= msgTime;
            });

            return (
              <button 
                key={chat.chatId} 
                onClick={() => onSelectChat(chat)}
                className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all border-b border-gray-50 dark:border-gray-800/30"
              >
                <div className="relative">
                  <img 
                    src={chat.type === 'group' ? (chat.groupPhoto || `https://picsum.photos/seed/${chat.chatId}/200`) : (allUsers.find(u => u.uid === chat.otherUser?.uid)?.photoURL || chat.otherUser?.photoURL || `https://picsum.photos/seed/${chat.chatId}/200`)} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                    referrerPolicy="no-referrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (chat.type === 'group') {
                        onProfileClick(chat.chatId); // This might need a different handler if its group
                      } else {
                        onProfileClick(chat.otherUser?.uid || "");
                      }
                    }}
                  />
                  {chat.type === 'direct' && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 text-right">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-400">
                      {chat.lastUpdate?.toDate ? chat.lastUpdate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      if (chat.type === 'group') {
                        onProfileClick(chat.chatId);
                      } else {
                        onProfileClick(chat.otherUser?.uid || "");
                      }
                    }}>
                      {chat.type === 'direct' && chat.otherUser?.isVerified && <VerifiedBadge className="w-3 h-3" />}
                      <h4 className="font-bold text-gray-900 dark:text-white hover:text-blue-500 transition-colors">
                        {chat.type === 'group' ? chat.groupName : (chat.otherUser?.displayName || 'مستخدم')}
                      </h4>
                    </div>
                  </div>
                  {typingUsers.length > 0 ? (
                    <div className="flex items-center gap-1 justify-end text-blue-500">
                      <p className="text-sm font-medium animate-pulse">
                        {typingUsers.length === 1 ? `${typingUsers[0]} يكتب...` : 'عدة أشخاص يكتبون...'}
                      </p>
                      <div className="flex gap-0.5">
                        <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {chat.lastMessage || 'ابدأ المحادثة الآن...'}
                      </p>
                      {isLastMessageOwn && (
                        <div className="flex-shrink-0">
                          {isLastMessageRead ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function CreateChannelModal({ isOpen, onClose, currentUser, onCreate, t, language }: { isOpen: boolean, onClose: () => void, currentUser: FirebaseUser, onCreate: (name: string, description: string) => void, t: any, language: string }) {
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!channelName.trim()) return;
    onCreate(channelName.trim(), channelDescription.trim());
    setChannelName("");
    setChannelDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.createChannel}</h3>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">{t.channelName}</label>
            <input 
              type="text" 
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={t.enterChannelName}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">{t.channelDescription} ({t.optional})</label>
            <textarea 
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              placeholder={t.writeChannelDescription}
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
              {t.channelInfo}
            </p>
          </div>

          <button 
            onClick={handleCreate}
            disabled={!channelName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            {t.createChannel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateGroupModal({ isOpen, onClose, users, currentUser, onCreate, t, language }: { isOpen: boolean, onClose: () => void, users: UserProfile[], currentUser: FirebaseUser, onCreate: (name: string, participants: string[]) => void, t: any, language: string }) {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleCreate = () => {
    if (!groupName.trim()) return;
    onCreate(groupName.trim(), [currentUser.uid, ...selectedUsers]);
    setGroupName("");
    setSelectedUsers([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.createGroup}</h3>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">{t.groupName}</label>
            <input 
              type="text" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t.enterGroupName}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">{t.selectParticipants}</label>
            <div className="max-h-60 overflow-y-auto no-scrollbar space-y-2">
              {users.filter(u => u.uid !== currentUser.uid).map(u => (
                <button
                  key={u.uid}
                  onClick={() => toggleUser(u.uid)}
                  className={`w-full p-3 flex items-center justify-between rounded-2xl border transition-all ${
                    selectedUsers.includes(u.uid)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedUsers.includes(u.uid) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedUsers.includes(u.uid) && <Plus className="w-3 h-3 text-white rotate-45" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{u.displayName}</p>
                    </div>
                    <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={!groupName.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20"
          >
            {t.createGroup}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function GroupParticipantsModal({ isOpen, onClose, participants, allUsers }: { isOpen: boolean, onClose: () => void, participants: string[], allUsers: UserProfile[] }) {
  if (!isOpen) return null;
  const participantProfiles = allUsers.filter(u => participants.includes(u.uid));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">المشاركون</h3>
        </div>
        <div className="p-6 max-h-80 overflow-y-auto no-scrollbar space-y-4">
          {participantProfiles.map(u => (
            <div key={u.uid} className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-right">
                <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{u.displayName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function AddMembersModal({ isOpen, onClose, users, currentParticipants, onAdd, language }: { 
  isOpen: boolean, 
  onClose: () => void, 
  users: UserProfile[], 
  currentParticipants: string[], 
  onAdd: (uids: string[]) => void, 
  language: string 
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleAdd = () => {
    onAdd(selectedUsers);
    setSelectedUsers([]);
    onClose();
  };

  const availableUsers = users.filter(u => 
    !currentParticipants.includes(u.uid) && 
    (u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">إضافة أعضاء</h3>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث عن مستخدمين..."
              className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          {availableUsers.map(u => (
            <button
              key={u.uid}
              onClick={() => toggleUser(u.uid)}
              className={`w-full p-3 flex items-center justify-between rounded-2xl border transition-all ${
                selectedUsers.includes(u.uid)
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-100'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedUsers.includes(u.uid) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              }`}>
                {selectedUsers.includes(u.uid) && <Plus className="w-3 h-3 text-white rotate-45" />}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{u.displayName}</p>
                  <p className="text-[10px] text-gray-400">@{u.username || 'user'}</p>
                </div>
                <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </button>
          ))}
          {availableUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">لا يوجد مستخدمون متاحون للإضافة.</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={handleAdd}
            disabled={selectedUsers.length === 0}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            إضافة {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateStickerPackModal({ isOpen, onClose, onCreate, t, language }: { isOpen: boolean, onClose: () => void, onCreate: (name: string, stickers: Sticker[]) => void, t: any, language: string }) {
  const [name, setName] = useState("");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [currentEmoji, setCurrentEmoji] = useState("😊");
  const [currentUrl, setCurrentUrl] = useState("");

  if (!isOpen) return null;

  const handleAddSticker = () => {
    if (currentEmoji && currentUrl) {
      setStickers([...stickers, { emoji: currentEmoji, url: currentUrl }]);
      setCurrentUrl("");
    }
  };

  const removeSticker = (idx: number) => {
    setStickers(stickers.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900 dark:text-white">{t.createStickerPack}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.stickerPackName}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.enterStickerPackName}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/50">
            <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400">{t.addSticker}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400">{t.chooseEmoji}</span>
                <input 
                  type="text" 
                  value={currentEmoji}
                  onChange={(e) => setCurrentEmoji(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border-none rounded-xl p-3 text-center text-xl"
                  maxLength={2}
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400">{t.uploadStickerImage}</span>
                <label className="cursor-pointer">
                  <div className="w-full bg-white dark:bg-gray-800 border-none rounded-xl p-3 text-center text-blue-600 flex items-center justify-center">
                    {currentUrl ? <img src={currentUrl} className="w-8 h-8 object-contain" /> : <Image className="w-6 h-6" />}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 256, 256, 0.8);
                          setCurrentUrl(compressed);
                        } catch (err) {
                          console.error("Error compressing sticker:", err);
                        }
                      }
                    }} 
                  />
                </label>
              </div>
            </div>
            <button 
              onClick={handleAddSticker}
              disabled={!currentUrl}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {t.addSticker}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
              {t.stickers}
              <span className="text-[10px] text-gray-400">{stickers.length}</span>
            </h4>
            <div className="grid grid-cols-4 gap-3">
              {stickers.map((s, idx) => (
                <div key={idx} className="relative group aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center">
                  <img src={s.url} className="w-10 h-10 object-contain" />
                  <div className="absolute top-1 right-1 bg-black/60 text-white text-[8px] p-0.5 rounded px-1">{s.emoji}</div>
                  <button 
                    onClick={() => removeSticker(idx)}
                    className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {stickers.length === 0 && (
                <div className="col-span-4 py-8 text-center text-gray-400 text-xs italic">
                  لم يتم إضافة ملصقات بعد
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          <button 
            onClick={() => onCreate(name, stickers)}
            disabled={!name.trim() || stickers.length === 0}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {t.createStickerPack}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CallModal({ call, user, onEnd, quotaExceeded, language, t }: { call: Call, user: FirebaseUser, onEnd: () => void, quotaExceeded: boolean, language: string, t: any }) {
  const [status, setStatus] = useState(call.status);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(call.type === 'video' ? false : true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const isCaller = call.callerId === user.uid;

  useEffect(() => {
    if (status === 'accepted' && !callStartTime) {
      setCallStartTime(Date.now());
    }
  }, [status, callStartTime]);

  useEffect(() => {
    if (quotaExceeded) return;
    const unsub = onSnapshot(doc(db, 'calls', call.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Call;
        setStatus(data.status);
        if (data.status === 'ended' || data.status === 'rejected' || data.status === 'missed') {
          cleanup();
          onEnd();
        }
      } else {
        cleanup();
        onEnd();
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `calls/${call.id}`));
    return unsub;
  }, [call.id, quotaExceeded]);

  const cleanup = () => {
    localStream.current?.getTracks().forEach(track => track.stop());
    pc.current?.close();
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.type === 'video',
        audio: true
      });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      pc.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, `calls/${call.id}/candidates`), {
            candidate: event.candidate.toJSON(),
            senderId: user.uid
          }).catch(err => handleFirestoreError(err, OperationType.WRITE, `calls/${call.id}/candidates`));
        }
      };

      pc.current.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      if (isCaller) {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        try {
          await setDoc(doc(db, `calls/${call.id}/signaling`, 'offer'), {
            sdp: offer.sdp,
            type: offer.type
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `calls/${call.id}/signaling/offer`);
        }
      } else {
        // Receiver waits for offer
        try {
          const offerSnap = await getDoc(doc(db, `calls/${call.id}/signaling`, 'offer'));
          if (offerSnap.exists()) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(offerSnap.data() as RTCSessionDescriptionInit));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            try {
              await setDoc(doc(db, `calls/${call.id}/signaling`, 'answer'), {
                sdp: answer.sdp,
                type: answer.type
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `calls/${call.id}/signaling/answer`);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `calls/${call.id}/signaling/offer`);
        }
      }

      // Listen for answer if caller
      if (isCaller) {
        onSnapshot(doc(db, `calls/${call.id}/signaling`, 'answer'), async (snap) => {
          if (snap.exists() && pc.current?.signalingState !== 'stable') {
            await pc.current?.setRemoteDescription(new RTCSessionDescription(snap.data() as RTCSessionDescriptionInit));
          }
        }, (err) => handleFirestoreError(err, OperationType.GET, `calls/${call.id}/signaling/answer`));
      }

      // Listen for candidates
      onSnapshot(collection(db, `calls/${call.id}/candidates`), (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.senderId !== user.uid) {
              await pc.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          }
        });
      }, (err) => handleFirestoreError(err, OperationType.LIST, `calls/${call.id}/candidates`));

    } catch (err) {
      console.error("Error starting call:", err);
      handleEndCall();
    }
  };

  useEffect(() => {
    if (status === 'accepted') {
      startCall();
    }
  }, [status]);

  const handleAccept = async () => {
    try {
      await updateDoc(doc(db, 'calls', call.id), { status: 'accepted' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calls/${call.id}`);
    }
  };

  const handleReject = async () => {
    try {
      await updateDoc(doc(db, 'calls', call.id), { status: 'rejected' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calls/${call.id}`);
    }
  };

  const handleEndCall = async () => {
    try {
      const updates: any = { status: 'ended' };
      if (status === 'ringing' && isCaller) {
        updates.status = 'missed';
      }
      if (callStartTime) {
        updates.duration = Math.floor((Date.now() - callStartTime) / 1000);
      }
      await updateDoc(doc(db, 'calls', call.id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `calls/${call.id}`);
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => { track.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(track => { track.enabled = isCameraOff; });
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleScreenShare = async () => {
    if (quotaExceeded) return;
    console.log("Attempting to toggle screen share in call...");
    try {
      if (isSharingScreen) {
        console.log("Stopping screen share in call, switching back to camera...");
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: call.type === 'video',
          audio: true
        });
        const videoTrack = cameraStream.getVideoTracks()[0];
        videoTrack.enabled = true;
        
        if (localStream.current) {
          const oldVideoTrack = localStream.current.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStream.current.removeTrack(oldVideoTrack);
          }
          localStream.current.addTrack(videoTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
        }

        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        }
        setIsSharingScreen(false);
      } else {
        console.log("Starting screen share in call...");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          console.error("Screen sharing is not supported in this browser");
          alert(language === 'ar' ? "مشاركة الشاشة غير مدعومة في هذا المتصفح" : "Screen sharing is not supported in this browser");
          return;
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        videoTrack.enabled = true;

        videoTrack.onended = () => {
          console.log("Screen share in call ended");
          setIsSharingScreen(false);
        };

        if (localStream.current) {
          const oldVideoTrack = localStream.current.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStream.current.removeTrack(oldVideoTrack);
          }
          localStream.current.addTrack(videoTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;
        }

        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        }
        setIsSharingScreen(true);
        setIsCameraOff(false);
      }
    } catch (err) {
      console.error("Error toggling screen share in call:", safeJsonStringify(err));
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        alert(`${language === 'ar' ? 'فشل بدء مشاركة الشاشة' : 'Failed to start screen share'}: ${err.message}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[700] bg-gray-900 flex flex-col items-center justify-center p-6" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-lg aspect-[3/4] bg-black rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
        {status === 'ringing' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-blue-900/40 to-black">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
              <img src={isCaller ? call.receiverPhoto : call.callerPhoto} className="w-32 h-32 rounded-full border-4 border-white/20 relative z-10 object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                {isCaller ? `جاري الاتصال بـ ${call.receiverName}...` : `مكالمة واردة من ${call.callerName}`}
              </h2>
              <p className="text-blue-400 font-medium animate-pulse">
                {call.type === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية'}
              </p>
            </div>
            <div className="flex gap-8 mt-12">
              {!isCaller && (
                <button onClick={handleAccept} className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-green-500/40 hover:scale-110 transition-transform">
                  <Phone className="w-8 h-8" />
                </button>
              )}
              <button onClick={isCaller ? handleEndCall : handleReject} className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 hover:scale-110 transition-transform">
                <PhoneOff className="w-8 h-8" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 w-32 aspect-[3/4] bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
            
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-4">
              <button onClick={toggleMute} className={`p-4 rounded-full backdrop-blur-md transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button onClick={handleScreenShare} className={`p-4 rounded-full backdrop-blur-md transition-all flex flex-col items-center gap-1 ${isSharingScreen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                <div className={`p-1 transition-all ${isSharingScreen ? 'animate-pulse' : ''}`}>
                  <Monitor className="w-6 h-6" />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-tighter ${isSharingScreen ? 'text-white' : 'text-white/40'}`}>
                  {isSharingScreen ? t.stopShareScreen : t.shareScreen}
                </span>
              </button>
              {call.type === 'video' && (
                <button onClick={toggleCamera} className={`p-4 rounded-full backdrop-blur-md transition-all ${isCameraOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {isCameraOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                </button>
              )}
              <button onClick={handleEndCall} className="p-4 bg-red-500 text-white rounded-full shadow-xl shadow-red-500/40 hover:scale-110 transition-transform">
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GiftModal({ isOpen, onClose, recipientName, t, language }: { isOpen: boolean, onClose: () => void, recipientName: string, t: any, language: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[800] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-6 text-center"
        dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
      >
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t.sendGiftTo} {recipientName}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.chooseGiftDesc}</p>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '💎', name: t.diamond, price: '100' },
            { icon: '⭐', name: t.star, price: '50' },
            { icon: '🔥', name: t.fire, price: '20' },
            { icon: '❤️', name: t.heart, price: '10' },
            { icon: '🚀', name: t.rocket, price: '200' },
            { icon: '👑', name: t.crown, price: '500' },
          ].map((gift, idx) => (
            <button key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-transparent hover:border-blue-200">
              <span className="text-2xl mb-1 block">{gift.icon}</span>
              <span className="text-[10px] font-bold text-gray-900 dark:text-white block">{gift.name}</span>
              <span className="text-[8px] text-blue-600 font-black">{gift.price} {t.points}</span>
            </button>
          ))}
        </div>
        
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20">{t.send}</button>
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-2xl">{t.cancel}</button>
        </div>
      </motion.div>
    </div>
  );
}

function ChannelProfileModal({ 
  isOpen, 
  onClose, 
  chat, 
  user, 
  allUsers, 
  allUsersMap,
  onShare, 
  onLeave, 
  onMute, 
  onStartLive,
  onViewDiscussion,
  onAddMembers,
  onOpenSettings,
  t, 
  language 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  chat: Chat, 
  user: FirebaseUser, 
  allUsers: UserProfile[],
  allUsersMap: Record<string, UserProfile>,
  onShare: (id: string, type: string) => void,
  onLeave: () => void,
  onMute: () => void,
  onStartLive: () => void,
  onViewDiscussion: () => void,
  onAddMembers: () => void,
  onOpenSettings?: () => void,
  t: any,
  language: string
}) {
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'media' | 'saved' | 'files' | 'links' | 'voice'>('posts');
  const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const isOwner = (chat.ownerId || chat.createdBy) === user.uid;
  const isModerator = (chat.moderators || []).includes(user.uid) || 
                     (chat.adminPermissions && chat.adminPermissions[user.uid]?.canManageGroupCall);
  const canStartCall = isOwner || isModerator;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (isOpen && chat.chatId) {
      const q = query(
        collection(db, `chats/${chat.chatId}/messages`),
        where('type', 'in', ['image', 'video']),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ messageId: doc.id, ...doc.data() } as Message));
        setMediaMessages(docs);
      }, (err) => handleFirestoreError(err, OperationType.LIST, `chats/${chat.chatId}/media`));
      return unsub;
    }
  }, [isOpen, chat.chatId]);

  if (!isOpen) return null;

  const isMuted = chat.mutedBy?.includes(user.uid);
  const onlineCount = Math.floor(chat.participants.length * 0.15) || 1;

  const tabs = [
    { id: 'posts', label: t.postsTab, icon: LayoutGrid },
    { id: 'members', label: t.membersTab, icon: Users },
    { id: 'media', label: t.mediaTab, icon: Image },
    { id: 'saved', label: t.savedTab, icon: Bookmark },
    { id: 'files', label: t.filesTab, icon: FileText },
    { id: 'links', label: t.linksTab, icon: Link },
    { id: 'voice', label: t.voiceTab, icon: Music },
  ];

  return (
    <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="bg-zinc-950/40 text-white w-full max-w-lg h-full sm:h-[95vh] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10"
        dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between p-6">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            {language === 'ar' || language === 'fa' ? <X className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            {(chat.createdBy === user.uid || chat.moderators?.includes(user.uid)) && (
              <button 
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Edit className="w-6 h-6" />
              </button>
            )}
            <button 
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Global More Menu */}
        <AnimatePresence>
          {isMoreMenuOpen && (
            <motion.div
              ref={moreMenuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-20 left-6 right-6 sm:left-auto sm:right-auto sm:w-64 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl z-[800] overflow-hidden"
            >
              <div className="p-2">
                {[
                  { icon: Video, label: t.startVideoChat, color: 'text-blue-400', action: onStartLive, show: canStartCall },
                  { icon: BarChart2, label: t.statistics, color: 'text-white', show: chat.createdBy === user.uid },
                  { icon: Archive, label: t.archivedStories, color: 'text-white', show: chat.createdBy === user.uid },
                  { icon: Forward, label: t.share, color: 'text-white', action: () => onShare(chat.chatId, chat.type) },
                  { icon: Gift, label: t.sendGiftLabel || (language === 'ar' ? 'إرسال هدية' : 'Send Gift'), color: 'text-blue-400', action: () => setIsGiftModalOpen(true), show: chat.createdBy !== user.uid },
                  { icon: LogOut, label: t.leave, color: 'text-red-400', action: onLeave },
                ].filter(item => item.show !== false).map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      if (item.action) item.action();
                    }}
                    className={`w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all ${language === 'en' ? 'text-left' : 'text-right'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${item.color}`}>{item.label}</span>
                    </div>
                    <item.icon className={`w-5 h-5 ${item.color.includes('blue') ? 'text-blue-400' : item.color.includes('red') ? 'text-red-400' : 'text-gray-400'}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Info */}
        <div className="flex flex-col items-center px-6 pb-6 pt-2 select-none">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-4 border-4 border-zinc-900 shadow-xl ring-4 ring-white/5">
            <img 
              src={chat.channelPhoto || chat.groupPhoto || `https://picsum.photos/seed/${chat.chatId}/800`} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-black mb-1 flex items-center gap-2">
            {chat.channelName || chat.groupName}
            {chat.isVerified && <VerifiedBadge className="w-6 h-6" />}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 font-bold">
            {chat.type === 'channel' 
              ? `${chat.subscribersCount || 0} ${t.subscribers}` 
              : `${chat.participants.length} ${t.members}, ${onlineCount} ${t.online}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 px-6 pb-6">
          {/* Action Cards */}
          <div className="flex gap-2">
            {canStartCall && (
              <button 
                onClick={onStartLive}
                className="flex-1 bg-zinc-900 p-4 rounded-[1.5rem] flex flex-col items-center gap-2 transition-all active:scale-95 border border-white/5"
              >
                <Video className="w-6 h-6 text-white" />
                <span className="text-[10px] font-black text-gray-200">{language === 'ar' ? 'محاضرة مرئية' : 'Video Lecture'}</span>
              </button>
            )}
            <button 
              onClick={onMute}
              className="flex-1 bg-zinc-900 p-4 rounded-[1.5rem] flex flex-col items-center gap-2 transition-all active:scale-95 border border-white/5"
            >
              {isMuted ? <Bell className="w-6 h-6 text-white" /> : <BellOff className="w-6 h-6 text-white" />}
              <span className="text-[10px] font-black text-gray-200">{isMuted ? t.unmute : t.mute}</span>
            </button>
            <button 
              onClick={onViewDiscussion}
              className="flex-1 bg-zinc-900 p-4 rounded-[1.5rem] flex flex-col items-center gap-2 transition-all active:scale-95 border border-white/5"
            >
              <MessageCircle className="w-6 h-6 text-white" />
              <span className="text-[10px] font-black text-gray-200">مراسلة</span>
            </button>
          </div>

        {/* Details Card */}
        <div className="bg-zinc-900 rounded-[2rem] p-5 space-y-5 border border-white/5">
          <div className={language === 'en' ? 'text-left' : 'text-right'}>
            <p className="text-sm text-gray-200 leading-relaxed font-medium">
              {chat.channelDescription || chat.groupDescription || t.noDescription}
            </p>
            <p className="text-[10px] text-gray-500 mt-2 font-bold select-none">{t.description}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-zinc-800 rounded-2xl">
              <LayoutGrid className="w-5 h-5 text-gray-400" />
            </div>
            <div className={`flex-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
              <p className="text-sm font-bold text-gray-100">t.me/{chat.chatId}</p>
              <p className="text-[10px] text-gray-500 font-bold">{t.inviteLink}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-zinc-800 rounded-2xl">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className={`flex-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
              <p className="text-sm font-bold text-gray-100 italic">-{chat.chatId}</p>
              <p className="text-[10px] text-gray-500 font-bold">{t.idLabel || (language === 'ar' ? 'المعرف' : 'ID')}</p>
            </div>
          </div>
        </div>

        {/* Add Members Bar */}
        {(chat.ownerId === user.uid || chat.moderators?.includes(user.uid) || chat.adminPermissions?.[user.uid] || chat.permissions?.addMembers !== false) && (
          <button 
            onClick={onAddMembers}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 p-4 rounded-[1.5rem] flex items-center justify-between transition-all active:scale-[0.98]"
          >
            <div className="p-1.5 bg-blue-600/20 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            <div className={`flex flex-col ${language === 'en' ? 'items-start' : 'items-end'}`}>
              <span className="text-sm font-black text-blue-500">{t.addMembers}</span>
            </div>
          </button>
        )}

        {/* Sticky Tab Header */}
        <div className="sticky top-0 bg-transparent py-2 z-10">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-white/5 pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative pb-2 text-xs font-black transition-all whitespace-nowrap px-1 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Grid */}
        <div className="min-h-[300px]">
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="relative mb-4">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث عن عضو..."
                  className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-12 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-right"
                  dir="rtl"
                />
                <Search className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>

              <div className="space-y-2">
                {chat.participants.map(uid => {
                  const m = allUsersMap[uid];
                  if (!m) return null;
                  if (searchQuery && !m.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) && !m.username?.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                  return (
                    <div key={uid} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5 hover:bg-zinc-900 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={m?.photoURL || `https://picsum.photos/seed/${uid}/100`} className="w-12 h-12 rounded-full object-cover border-2 border-white/5" />
                          {m?.isVerified && <VerifiedBadge className="w-4 h-4 absolute -bottom-1 -right-1" />}
                        </div>
                        <div className={language === 'en' ? 'text-left' : 'text-right'}>
                          <p className="text-sm font-bold text-white leading-none mb-1">{m?.displayName || t.user}</p>
                          <p className="text-[10px] text-gray-400">@{m?.username || 'user'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {chat.moderators?.includes(uid) && (
                          <span className="text-[8px] font-black bg-blue-600/20 text-blue-500 px-2 py-0.5 rounded-full uppercase">{t.modBadge}</span>
                        )}
                        <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                          <MessageCircle className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'media' ? (
            <div className="grid grid-cols-3 gap-1">
              {mediaMessages.length > 0 ? mediaMessages.map(msg => (
                <div key={msg.messageId} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden relative group cursor-pointer border border-white/5">
                  {msg.type === 'image' ? (
                    <img src={msg.mediaUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  ) : (
                    <video src={msg.mediaUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  )}
                  {msg.type === 'video' && (
                    <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[8px] text-white font-black flex items-center gap-1">
                      <Play className="w-2 h-2 fill-current" />
                      0:25
                    </div>
                  )}
                </div>
              )) : (
                <div className="col-span-3 py-16 text-center">
                  <Image className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                  <p className="text-xs text-gray-500 font-black">{t.noMedia || (language === 'ar' ? 'لا توجد وسائط بعد' : 'No media yet')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center">
              <Package className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
              <p className="text-xs text-gray-500 font-black">{t.underDevelopment}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
      <AnimatePresence>
        {isGiftModalOpen && (
          <GiftModal 
            isOpen={isGiftModalOpen}
            onClose={() => setIsGiftModalOpen(false)}
            recipientName={chat.channelName || chat.groupName || ''}
            t={t}
            language={language}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StickerPicker({ onEmojiClick, onStickerClick, onCreatePack, stickerPacks, t, language }: { onEmojiClick: (emoji: string) => void, onStickerClick: (sticker: Sticker) => void, onCreatePack: () => void, stickerPacks: StickerPack[], t: any, language: string }) {
  const [tab, setTab] = useState<'emoji' | 'sticker'>('emoji');
  
  const emojis = ['😊', '😂', '❤️', '🔥', '👍', '🙏', '😭', '😮', '😍', '🤔', '😎', '🙄', '😕', '😢', '😡', '👏', '🙌', '✨', '🎉', '🎈', '🍕', '🍔', '🍦', '🌍', '🐱', '🐶', '🚀', '💻', '💡', '✅'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-[calc(100%+10px)] start-0 w-72 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 flex flex-col h-80"
    >
      <div className="flex p-2 bg-gray-50 dark:bg-gray-900/50 gap-1">
        <button 
          onClick={() => setTab('emoji')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === 'emoji' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}
        >
          {t.emojis || 'Emojis'}
        </button>
        <button 
          onClick={() => setTab('sticker')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === 'sticker' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}
        >
          {t.stickers}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {tab === 'emoji' ? (
          <div className="grid grid-cols-6 gap-2">
            {emojis.map(e => (
              <button 
                key={e} 
                onClick={() => onEmojiClick(e)}
                className="text-2xl p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all active:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={onCreatePack}
              className="w-full py-2.5 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
            >
              <PlusSquare className="w-4 h-4" />
              {t.createStickerPack}
            </button>

            {stickerPacks.map(pack => (
              <div key={pack.id} className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 px-1">{pack.name}</p>
                <div className="grid grid-cols-4 gap-2">
                  {pack.stickers.map((s, idx) => (
                    <button 
                      key={idx}
                      onClick={() => onStickerClick(s)}
                      className="aspect-square p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-110"
                    >
                      <img src={s.url} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const Switch = ({ checked, onChange, disabled = false, language = 'ar' }: { checked: boolean, onChange: () => void, disabled?: boolean, language?: string }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); if(!disabled) onChange(); }}
    disabled={disabled}
    className={`w-10 h-5 rounded-full transition-all relative ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${checked ? (language === 'en' ? 'left-6' : 'left-1') : (language === 'en' ? 'left-1' : 'left-6')}`} />
  </button>
);

const OptionRow = ({ icon, label, value, onClick, showBadge, language, t }: any) => (
  <div onClick={onClick} className={`w-full flex items-center justify-between p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-100/50 dark:border-gray-700/50 group ${language === 'en' ? 'text-left' : 'text-right'} cursor-pointer`} dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'} role="button">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white dark:bg-gray-900 rounded-xl text-gray-400 shadow-sm transition-colors group-hover:text-blue-500">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
        {showBadge && <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-md font-black shadow-lg shadow-blue-600/30">{t?.newBadge}</span>}
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className={language === 'en' ? 'text-left' : 'text-right'}>
        {typeof value === 'string' ? (
          <span className="text-xs text-blue-500 font-bold">{value}</span>
        ) : (
          value
        )}
      </div>
      <ChevronLeft className={`w-4 h-4 text-gray-300 transition-all ${language === 'en' ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
    </div>
  </div>
);

const SubRow = ({ icon, label, value, onClick, language }: any) => (
  <div onClick={onClick} className={`w-full flex items-center justify-between p-4 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-all border-b last:border-0 border-gray-100/50 dark:border-gray-700/30 group ${language === 'en' ? 'text-left' : 'text-right'} cursor-pointer`} dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'} role="button">
    <div className="flex items-center gap-3">
      <div className="p-2 text-gray-400 group-hover:text-blue-500 transition-colors">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      {value !== undefined && (
        <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <span className="text-[10px] font-black text-gray-500">{value}</span>
        </div>
      )}
      <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:-translate-x-1 transition-transform" />
    </div>
  </div>
);

function ChatWindow({ chat, user, onBack, allUsers, allUsersMap, allChats, liveRooms, stickerPacks, globalBackground, onJoinCall, onStartLive, onSendSticker, onCreateStickerPack, onShare, quotaExceeded, setConfirmationModal, t, language }: { 
  chat: Chat, 
  user: FirebaseUser, 
  onBack: () => void, 
  allUsers: UserProfile[],
  allUsersMap: Record<string, UserProfile>,
  allChats: Chat[],
  liveRooms: LiveRoom[],
  stickerPacks: StickerPack[],
  globalBackground?: string,
  onJoinCall: (room: LiveRoom) => void,
  onStartLive: () => void,
  onSendSticker: (sticker: Sticker) => void,
  onCreateStickerPack: () => void,
  onShare: (id: string, type: string) => void,
  quotaExceeded: boolean,
  setConfirmationModal: (modal: any) => void,
  t: any,
  language: string
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isChannelProfileOpen, setIsChannelProfileOpen] = useState(false);
  const [currentChatData, setCurrentChatData] = useState<Chat | null>(null);
  const [typingParticipants, setTypingParticipants] = useState<{[uid: string]: any}>({});
  const [truthModeTimeLeft, setTruthModeTimeLeft] = useState<number | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'video'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const [groupSettingsView, setGroupSettingsView] = useState<'main' | 'edit' | 'permissions' | 'members' | 'admins' | 'admin_permissions'>('main');
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [editedGroupDetails, setEditedGroupDetails] = useState({
    name: chat.groupName || '',
    description: chat.groupDescription || '',
    type: chat.groupType || 'private',
    linkedChannel: chat.linkedChannel || '',
    color: chat.groupColor || '#3b82f6',
    topicsEnabled: chat.topicsEnabled || false,
    photo: null as string | null
  });
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || quotaExceeded) return;

    try {
      const compressedImage = await compressImage(file, 400, 400, 0.6); // Reduced size and quality to ensure it fits
      setEditedGroupDetails({ ...editedGroupDetails, photo: compressedImage });
    } catch (err) {
      console.error("Error compressing group photo:", err);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdateRef = useRef<number>(0);

  const handleViewDiscussion = () => {
    setIsChannelProfileOpen(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handlePlayVoice = (messageId: string, url: string) => {
    if (playingVoiceId === messageId) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlayingVoiceId(null);
      audioRef.current.play();
      setPlayingVoiceId(messageId);
    }
  };

  const getTimestampMillis = (ts: any) => {
    if (!ts) return 0;
    if (ts.toMillis) return ts.toMillis();
    if (ts.toDate) return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
  };

  useEffect(() => {
    if (currentChatData?.truthMode?.active && currentChatData.truthMode.expiresAt) {
      const interval = setInterval(() => {
        const expiresAt = getTimestampMillis(currentChatData.truthMode!.expiresAt);
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTruthModeTimeLeft(diff);
        if (diff <= 0) {
          updateDoc(doc(db, 'chats', chat.chatId), { 'truthMode.active': false }).catch(() => {});
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTruthModeTimeLeft(null);
    }
  }, [currentChatData?.truthMode, chat.chatId]);

  useEffect(() => {
    const handleAction = (e: any) => {
      const { action, mode } = e.detail;
      if (action === 'delete') {
        handleDeleteChat(mode);
      }
    };
    window.addEventListener('handle-chat-action', handleAction);
    return () => window.removeEventListener('handle-chat-action', handleAction);
  }, [currentChatData, user.uid]);

  const isGroupAdmin = (currentChatData?.ownerId || currentChatData?.createdBy || chat.ownerId || chat.createdBy) === user.uid;
  const isGroupModerator = (currentChatData?.moderators || chat.moderators || []).includes(user.uid) || 
                          (currentChatData?.adminPermissions && currentChatData.adminPermissions[user.uid] !== undefined) || 
                          isGroupAdmin;

  const canToggleTruthMode = currentChatData?.permissions?.canToggleTruthMode === 'all' || isGroupModerator;
  const canKickMembers = isGroupAdmin || hasPermission(currentChatData || chat, user.uid, 'canBanUsers');
  const canBanMembers = isGroupAdmin || hasPermission(currentChatData || chat, user.uid, 'canBanUsers');
  const canDeleteMessages = isGroupAdmin || hasPermission(currentChatData || chat, user.uid, 'canDeleteMessages');
  const canChangeInfo = isGroupAdmin || hasPermission(currentChatData || chat, user.uid, 'canChangeInfo') || (currentChatData?.permissions?.changeInfo !== false && chat.type === 'group');
  const canPinMessages = isGroupAdmin || hasPermission(currentChatData || chat, user.uid, 'canPinMessages');
  const canManageGroupCall = isGroupAdmin || hasPermission(currentChatData || chat, user.uid, 'canManageGroupCall');
  const canAddAdmins = isGroupAdmin || hasPermission(currentChatData || chat, user.uid, 'canAddAdmins');

  const handleSubscribe = async () => {
    if (!currentChatData || quotaExceeded) return;
    try {
      const isSubscribed = currentChatData.participants.includes(user.uid);
      const newParticipants = isSubscribed 
        ? currentChatData.participants.filter(id => id !== user.uid)
        : [...currentChatData.participants, user.uid];
      
      const newCount = newParticipants.length;
      const isVerified = newCount >= 100000;

      await updateDoc(doc(db, 'chats', chat.chatId), {
        participants: newParticipants,
        subscribersCount: newCount,
        isVerified: isVerified
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const toggleTruthMode = async () => {
    if (!currentChatData || quotaExceeded) return;
    if (!canToggleTruthMode) {
      alert(language === 'ar' ? "فقط المشرفين يمكنهم تفعيل وضع الصراحة في هذه المجموعة." : "Only moderators can enable truth mode in this group.");
      return;
    }
    
    try {
      const isActive = currentChatData.truthMode?.active;
      const batch = writeBatch(db);
      const chatRef = doc(db, 'chats', chat.chatId);
      const systemMsgRef = doc(collection(db, `chats/${chat.chatId}/messages`));

      if (isActive) {
        batch.update(chatRef, { 'truthMode.active': false });
        batch.set(systemMsgRef, {
          messageId: systemMsgRef.id,
          senderId: 'system',
          text: 'تم إيقاف وضع الصراحة. عادت الهويات للظهور للرسائل الجديدة.',
          timestamp: serverTimestamp(),
          read: true,
          type: 'system'
        });
      } else {
        const labels: { [uid: string]: string } = {};
        currentChatData.participants.forEach((uid, index) => {
          labels[uid] = `مجهول ${index + 1}`;
        });
        
        batch.update(chatRef, {
          truthMode: {
            active: true,
            expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
            participantLabels: labels
          }
        });
        batch.set(systemMsgRef, {
          messageId: systemMsgRef.id,
          senderId: 'system',
          text: 'تم تفعيل وضع الصراحة! سيتم إخفاء هويات المشاركين لمدة 5 دقائق.',
          timestamp: serverTimestamp(),
          read: true,
          type: 'system'
        });
      }
      await batch.commit();
    } catch (err) {
      console.error("Error toggling truth mode:", err);
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const handleUpdateGroupInfo = async () => {
    if (!user || quotaExceeded || !chat.chatId) return;
    try {
      const chatRef = doc(db, 'chats', chat.chatId);
      await updateDoc(chatRef, {
        groupName: editedGroupDetails.name,
        groupDescription: editedGroupDetails.description,
        groupType: editedGroupDetails.type,
        linkedChannel: editedGroupDetails.linkedChannel,
        groupColor: editedGroupDetails.color,
        topicsEnabled: editedGroupDetails.topicsEnabled,
        ...(editedGroupDetails.photo && { groupPhoto: editedGroupDetails.photo }),
        lastUpdate: serverTimestamp()
      });
      setGroupSettingsView('main');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const handleUpdatePermissions = async (key: string, value: any) => {
    if (!isGroupAdmin || quotaExceeded) return;
    try {
      await updateDoc(doc(db, 'chats', chat.chatId), {
        [`permissions.${key}`]: value
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const handleUpdateAdminPermission = async (targetUid: string, permission: keyof AdminPermissions, value: boolean) => {
    if (!isGroupAdmin || quotaExceeded) return;
    try {
      await updateDoc(doc(db, 'chats', chat.chatId), {
        [`adminPermissions.${targetUid}.${permission}`]: value
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const toggleModerator = async (targetUid: string) => {
    if (!canAddAdmins || quotaExceeded) return;
    try {
      const moderators = currentChatData?.moderators || [];
      const isMod = moderators.includes(targetUid) || (currentChatData?.adminPermissions && currentChatData.adminPermissions[targetUid] !== undefined);
      
      const batch = writeBatch(db);
      const chatRef = doc(db, 'chats', chat.chatId);

      if (isMod) {
        // Remove moderator
        const newModerators = moderators.filter(id => id !== targetUid);
        batch.update(chatRef, {
          moderators: newModerators,
          [`adminPermissions.${targetUid}`]: deleteField()
        });
      } else {
        // Add moderator with default permissions
        const newModerators = [...moderators, targetUid];
        batch.update(chatRef, {
          moderators: newModerators,
          [`adminPermissions.${targetUid}`]: DEFAULT_ADMIN_PERMISSIONS
        });
      }
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const removeMember = async (targetUid: string) => {
    if (!canKickMembers || quotaExceeded) return;
    if (targetUid === user.uid) return;
    const member = allUsers.find(u => u.uid === targetUid);
    setConfirmationModal({
      isOpen: true,
      title: 'إزالة عضو',
      message: `هل أنت متأكد من رغبتك في إزالة ${member?.displayName || 'هذا العضو'} من المجموعة؟`,
      confirmText: 'إزالة',
      cancelText: 'إلغاء',
      isDanger: true,
      onConfirm: async () => {
        try {
          const newParticipants = currentChatData?.participants.filter(id => id !== targetUid) || [];
          const moderators = currentChatData?.moderators?.filter(id => id !== targetUid) || [];
          await updateDoc(doc(db, 'chats', chat.chatId), {
            participants: newParticipants,
            moderators
          });
          setConfirmationModal(null);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
        }
      }
    });
  };

  const banMember = async (targetUid: string) => {
    if (!canBanMembers || quotaExceeded) return;
    if (targetUid === user.uid) return;
    const member = allUsers.find(u => u.uid === targetUid);
    setConfirmationModal({
      isOpen: true,
      title: 'حظر عضو',
      message: `هل أنت متأكد من رغبتك في حظر ${member?.displayName || 'هذا العضو'} من المجموعة؟ لن يتمكن من الانضمام مرة أخرى.`,
      confirmText: 'حظر',
      cancelText: 'إلغاء',
      isDanger: true,
      onConfirm: async () => {
        try {
          const newParticipants = currentChatData?.participants.filter(id => id !== targetUid) || [];
          const moderators = currentChatData?.moderators?.filter(id => id !== targetUid) || [];
          const blockedUsers = currentChatData?.blockedUsers || [];
          if (!blockedUsers.includes(targetUid)) {
            await updateDoc(doc(db, 'chats', chat.chatId), {
              participants: newParticipants,
              moderators,
              blockedUsers: [...blockedUsers, targetUid]
            });
          }
          setConfirmationModal(null);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
        }
      }
    });
  };

  const handleMute = async () => {
    if (!currentChatData || quotaExceeded) return;
    try {
      const mutedBy = currentChatData.mutedBy || [];
      const isMuted = mutedBy.includes(user.uid);
      const newMutedBy = isMuted 
        ? mutedBy.filter(id => id !== user.uid)
        : [...mutedBy, user.uid];
      
      await updateDoc(doc(db, 'chats', chat.chatId), {
        mutedBy: newMutedBy
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const handleLeaveChat = async () => {
    if (!currentChatData || quotaExceeded) return;
    setConfirmationModal({
      isOpen: true,
      title: chat.type === 'channel' ? 'مغادرة القناة' : 'مغادرة المجموعة',
      message: `هل أنت متأكد من رغبتك في مغادرة ${chat.type === 'channel' ? 'هذه القناة' : 'هذه المجموعة'}؟`,
      confirmText: 'مغادرة',
      cancelText: 'إلغاء',
      isDanger: true,
      onConfirm: async () => {
        try {
          const newParticipants = currentChatData.participants.filter(id => id !== user.uid);
          await updateDoc(doc(db, 'chats', chat.chatId), {
            participants: newParticipants
          });
          setConfirmationModal(null);
          setIsChannelProfileOpen(false);
          onBack();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
        }
      }
    });
  };

  const handleAddMembers = async (newUids: string[]) => {
    if (!currentChatData || quotaExceeded || newUids.length === 0) return;
    try {
      await updateDoc(doc(db, 'chats', chat.chatId), {
        participants: arrayUnion(...newUids)
      });
      setIsAddMembersModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (quotaExceeded) return;
    try {
      const msgRef = doc(db, `chats/${chat.chatId}/messages`, messageId);
      const msg = messages.find(m => m.messageId === messageId);
      if (!msg) return;

      const reactions = msg.reactions || {};
      const uids = reactions[emoji] || [];
      const newUids = uids.includes(user.uid) 
        ? uids.filter(id => id !== user.uid)
        : [...uids, user.uid];

      if (newUids.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = newUids;
      }

      await updateDoc(msgRef, { reactions });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}/messages/${messageId}`);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const msg = messages.find(m => m.messageId === messageId);
    if (!msg) return;
    
    const isOwnMessage = msg.senderId === user.uid;
    if (!isOwnMessage && !canDeleteMessages) return;

    setConfirmationModal({
      isOpen: true,
      title: 'حذف الرسالة',
      message: 'هل أنت متأكد من رغبتك في حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, `chats/${chat.chatId}/messages`, messageId));
          setConfirmationModal(null);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `chats/${chat.chatId}/messages/${messageId}`);
        }
      }
    });
  };

  const togglePinMessage = async (messageId: string) => {
    const canPin = isGroupModerator || currentChatData?.permissions?.pinMessages !== false;
    if (!canPin || quotaExceeded) return;
    try {
      const isPinned = currentChatData?.pinnedMessageId === messageId;
      await updateDoc(doc(db, 'chats', chat.chatId), {
        pinnedMessageId: isPinned ? null : messageId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const pinnedMessage = useMemo(() => {
    if (!currentChatData?.pinnedMessageId) return null;
    return messages.find(m => m.messageId === currentChatData.pinnedMessageId);
  }, [messages, currentChatData?.pinnedMessageId]);

  const initiateCall = async (type: 'voice' | 'video') => {
    if (quotaExceeded) return;
    if (chat.type === 'group') {
      // For groups, create a group call
      try {
        const collectionName = 'live_rooms';
        const roomRef = doc(collection(db, collectionName));
        const roomData = {
          id: roomRef.id,
          roomId: roomRef.id,
          hostId: user.uid,
          hostName: user.displayName || 'مستخدم',
          hostPhoto: user.photoURL || '',
          title: language === 'ar' ? `مكالمة جماعية: ${chat.groupName}` : `Group Call: ${chat.groupName}`,
          status: 'active',
          viewerCount: 0,
          startedAt: serverTimestamp(),
          quality: '720p',
          type: 'group_call',
          chatId: chat.chatId,
          participants: chat.participants,
          isHostMuted: false,
          isCameraOff: false
        };
        await setDoc(roomRef, roomData);
        if (typeof onJoinCall === 'function') {
           onJoinCall({ ...roomData, id: roomRef.id } as LiveRoom);
        }
      } catch (err) {
        console.error("Error initiating group call:", err);
      }
      return;
    }

    // For direct chats, use the CallModal signaling
    try {
      const callRef = doc(collection(db, 'calls'));
      const otherUser = chat.otherUser;
      const callData: Call = {
        id: callRef.id,
        callerId: user.uid,
        callerName: user.displayName || 'مستخدم',
        callerPhoto: user.photoURL || '',
        receiverId: otherUser.uid,
        receiverName: otherUser.displayName || 'مستخدم',
        receiverPhoto: otherUser.photoURL || '',
        type,
        status: 'ringing',
        chatId: chat.chatId,
        timestamp: serverTimestamp()
      };
      await setDoc(callRef, callData);
    } catch (err) {
      console.error("Error initiating call:", err);
    }
  };

  // Listen to chat data for typing indicators and read receipts
  useEffect(() => {
    if (quotaExceeded) return;
    const unsub = onSnapshot(doc(db, 'chats', chat.chatId), (snap) => {
      if (snap.exists()) {
        setCurrentChatData({ chatId: snap.id, ...snap.data() } as Chat);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `chats/${chat.chatId}`));
    return unsub;
  }, [chat.chatId, quotaExceeded]);

  // Listen to typing subcollection
  useEffect(() => {
    if (quotaExceeded) return;
    const unsub = onSnapshot(collection(db, `chats/${chat.chatId}/typing`), (snap) => {
      const typing: {[uid: string]: any} = {};
      snap.docs.forEach(d => {
        typing[d.id] = d.data().timestamp;
      });
      setTypingParticipants(typing);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `chats/${chat.chatId}/typing`));
    return unsub;
  }, [chat.chatId, quotaExceeded]);

  // Mark as read when entering or new messages arrive
  useEffect(() => {
    if (quotaExceeded || !messages.length) return;
    
    // Efficiency: Only mark as read if the last message is newer than our last read
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || !lastMsg.timestamp) return;

    const myLastRead = currentChatData?.lastRead?.[user.uid];
    const lastMsgTime = lastMsg.timestamp.toMillis ? lastMsg.timestamp.toMillis() : Date.now();
    const myReadTime = myLastRead?.toMillis ? myLastRead.toMillis() : 0;

    if (myReadTime >= lastMsgTime) return;

    const markAsRead = async () => {
      try {
        await updateDoc(doc(db, 'chats', chat.chatId), {
          [`lastRead.${user.uid}`]: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
      }
    };
    
    // Small delay to prevent hammering during rapid messaging
    const timer = setTimeout(markAsRead, 1000);
    return () => clearTimeout(timer);
  }, [chat.chatId, messages.length, user.uid, quotaExceeded, currentChatData?.lastRead]);

  useEffect(() => {
    if (quotaExceeded) return;
    const q = query(collection(db, `chats/${chat.chatId}/messages`), orderBy('timestamp', 'asc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ messageId: d.id, ...d.data() } as Message));
      if (msgs.length === 0) {
        // Add dummy messages for preview
        setMessages([
          {
            messageId: 'dummy-1',
            senderId: 'system',
            text: 'مرحباً بك في تجربة تلجرام الجديدة!',
            timestamp: { toDate: () => new Date() },
            read: true,
            type: 'system'
          },
          {
            messageId: 'dummy-2',
            senderId: 'other',
            text: 'هذه رسالة نصية مع رابط: https://telegram.org',
            timestamp: { toDate: () => new Date(Date.now() - 10000) },
            read: true,
            type: 'text'
          },
          {
            messageId: 'dummy-3',
            senderId: user.uid,
            text: 'وهذا رد على الرسالة السابقة',
            timestamp: { toDate: () => new Date(Date.now() - 5000) },
            read: true,
            type: 'text',
            replyTo: 'dummy-2'
          },
          {
            messageId: 'dummy-4',
            senderId: 'other',
            text: '',
            timestamp: { toDate: () => new Date(Date.now() - 2000) },
            read: true,
            type: 'voice',
            mediaUrl: 'dummy'
          },
          {
            messageId: 'dummy-5',
            senderId: user.uid,
            text: 'ملف مستند مهم',
            timestamp: { toDate: () => new Date() },
            read: false,
            type: 'file',
            fileInfo: { name: 'تقرير_العمل.pdf', size: 1024 * 500, extension: 'PDF' }
          }
        ]);
      } else {
        setMessages(msgs);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, `chats/${chat.chatId}/messages`));
    return unsub;
  }, [chat.chatId, quotaExceeded]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle typing indicator
  const handleTyping = async (text: string) => {
    setNewMessage(text);
    
    const now = Date.now();
    if (now - lastTypingUpdateRef.current > 2000) {
      lastTypingUpdateRef.current = now;
      try {
        await setDoc(doc(db, `chats/${chat.chatId}/typing`, user.uid), {
          uid: user.uid,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chats/${chat.chatId}/typing/${user.uid}`);
      }
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await deleteDoc(doc(db, `chats/${chat.chatId}/typing`, user.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `chats/${chat.chatId}/typing/${user.uid}`);
      }
    }, 3000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendMessage(null as any, 'voice', base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert(language === 'ar' ? "لا يمكن الوصول إلى الميكروفون." : "Cannot access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const handleForwardMessage = async (msg: Message, targetChat: Chat) => {
    if (quotaExceeded) return;
    try {
      const batch = writeBatch(db);
      const msgRef = doc(collection(db, `chats/${targetChat.chatId}/messages`));
      
      const messageData: any = {
        messageId: msgRef.id,
        senderId: user.uid,
        text: msg.text || "",
        timestamp: serverTimestamp(),
        read: false,
        type: msg.type,
        isForwarded: true,
        forwardedFrom: allUsers.find(u => u.uid === msg.senderId)?.displayName || msg.senderLabel || 'مستخدم'
      };

      if (msg.mediaUrl) messageData.mediaUrl = msg.mediaUrl;
      if (msg.fileInfo) messageData.fileInfo = msg.fileInfo;

      batch.set(msgRef, messageData);
      batch.update(doc(db, 'chats', targetChat.chatId), {
        lastMessage: msg.type === 'text' ? msg.text : `[${msg.type}]`,
        lastUpdate: serverTimestamp(),
        lastSenderId: user.uid,
        [`lastRead.${user.uid}`]: serverTimestamp()
      });

      await batch.commit();
      setForwardingMessage(null);
      // Optional: success toast
    } catch (err) {
      console.error("Error forwarding message:", err);
    }
  };

  const sendMessage = async (e: React.FormEvent, type: Message['type'] = 'text', mediaUrl?: string, fileInfo?: any) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && type === 'text') return;

    if (chat.type === 'channel' && !isGroupModerator) {
      alert(language === 'ar' ? "فقط المشرفين يمكنهم النشر في هذه القناة." : "Only moderators can post in this channel.");
      return;
    }

    if (chat.type === 'group' && !isGroupModerator) {
      if (currentChatData?.permissions?.sendMessages === false && type === 'text') {
        alert(language === 'ar' ? "إرسال الرسائل مقفل في هذه المجموعة حالياً." : "Sending messages is currently locked in this group.");
        return;
      }
      if (currentChatData?.permissions?.sendMedia === false && type !== 'text') {
        alert(language === 'ar' ? "إرسال الوسائط مقفل في هذه المجموعة حالياً." : "Sending media is currently locked in this group.");
        return;
      }
    }

    const text = newMessage.trim();
    setNewMessage("");
    setReplyingTo(null);
    
    // Clear typing status immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    try {
      await deleteDoc(doc(db, `chats/${chat.chatId}/typing`, user.uid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${chat.chatId}/typing/${user.uid}`);
    }

    try {
      // Safety Check for all messages
      if (text) {
        setIsModerating(true);
        const moderation = await moderateMessage(text);
        setIsModerating(false);
        if (!moderation.allowed) {
          alert(moderation.warning || t.messageBlocked);
          return;
        }
      }

      const batch = writeBatch(db);
      const msgRef = doc(collection(db, `chats/${chat.chatId}/messages`));
      const isAnonymous = currentChatData?.truthMode?.active || false;
      const senderLabel = isAnonymous ? (currentChatData?.truthMode?.participantLabels?.[user.uid] || 'مجهول') : null;

      const messageData: any = {
        messageId: msgRef.id,
        senderId: user.uid,
        text,
        timestamp: serverTimestamp(),
        read: false,
        isAnonymous,
        senderLabel,
        type,
        replyTo: replyingTo?.messageId || null
      };

      if (mediaUrl) messageData.mediaUrl = mediaUrl;
      if (fileInfo) messageData.fileInfo = fileInfo;

      batch.set(msgRef, messageData);
      batch.update(doc(db, 'chats', chat.chatId), {
        lastMessage: isAnonymous ? 'رسالة مجهولة' : (type === 'text' ? text : `[${type}]`),
        lastUpdate: serverTimestamp(),
        lastSenderId: user.uid,
        [`lastRead.${user.uid}`]: serverTimestamp()
      });

      // Add notifications for participants
      if (chat.type === 'direct') {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          recipientId: chat.otherUser.uid,
          senderId: user.uid,
          senderName: user.displayName || 'مستخدم',
          senderPhoto: user.photoURL || '',
          type: 'message',
          text: `أرسل لك رسالة: ${text.slice(0, 30)}${text.length > 30 ? '...' : ''}`,
          read: false,
          timestamp: serverTimestamp(),
          chatId: chat.chatId
        });
      } else if (chat.type === 'group') {
        chat.participants.forEach(pid => {
          if (pid !== user.uid) {
            const notificationRef = doc(collection(db, 'notifications'));
            batch.set(notificationRef, {
              recipientId: pid,
              senderId: user.uid,
              senderName: user.displayName || 'مستخدم',
              senderPhoto: user.photoURL || '',
              type: 'message',
              text: `رسالة جديدة في ${chat.groupName}: ${text.slice(0, 30)}${text.length > 30 ? '...' : ''}`,
              read: false,
              timestamp: serverTimestamp(),
              chatId: chat.chatId
            });
          }
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${chat.chatId}/messages`);
    }
  };

  const typingUsers = useMemo(() => {
    if (!typingParticipants) return [];
    return Object.entries(typingParticipants)
      .filter(([uid, ts]) => {
        if (uid === user.uid || !ts) return false;
        // Handle Firestore Timestamp, local Date, or numeric timestamp
        let typingTime: number;
        if ((ts as any).toDate) {
          typingTime = (ts as any).toDate().getTime();
        } else if (ts instanceof Date) {
          typingTime = ts.getTime();
        } else if (typeof ts === 'number') {
          typingTime = ts;
        } else if ((ts as any).seconds) {
          typingTime = (ts as any).seconds * 1000;
        } else {
          // If it's a serverTimestamp() placeholder, treat as now
          typingTime = Date.now();
        }
        return Date.now() - typingTime < 10000;
      })
      .map(([uid]) => allUsers.find(u => u.uid === uid)?.displayName || 'مستخدم');
  }, [typingParticipants, user.uid, allUsers]);

  const activeGroupCall = useMemo(() => {
    if (chat.type !== 'group') return null;
    return liveRooms.find(r => r.type === 'group_call' && r.chatId === chat.chatId && r.status === 'active');
  }, [liveRooms, chat.chatId, chat.type]);

  const formatMessageDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 2 * oneDay) {
      return `أمس، ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const backgrounds = [
    { id: 'default', name: 'الافتراضي', value: 'https://www.transparenttextures.com/patterns/cubes.png' },
    { id: 'dots', name: 'نقاط', value: 'https://www.transparenttextures.com/patterns/carbon-fibre.png' },
    { id: 'stars', name: 'نجوم', value: 'https://www.transparenttextures.com/patterns/stardust.png' },
    { id: 'circuit', name: 'دوائر كهربائية', value: 'https://www.transparenttextures.com/patterns/circuit-board.png' },
    { id: 'wood', name: 'خشب', value: 'https://www.transparenttextures.com/patterns/wood-pattern.png' },
    { id: 'paper', name: 'ورق', value: 'https://www.transparenttextures.com/patterns/paper-fibers.png' },
  ];

  const currentBackground = currentChatData?.background || globalBackground || backgrounds[0].value;
  const isPattern = backgrounds.some(bg => bg.value === currentBackground);

  const handleUpdateBackground = async (bg: string) => {
    if (quotaExceeded) return;
    try {
      await updateDoc(doc(db, 'chats', chat.chatId), {
        background: bg
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const handleDeleteChat = async (mode: 'me' | 'both') => {
    if (quotaExceeded) return;
    try {
      if (mode === 'both') {
        await deleteDoc(doc(db, 'chats', chat.chatId));
      } else {
        const newParticipants = currentChatData?.participants.filter(id => id !== user.uid) || [];
        if (newParticipants.length === 0) {
          await deleteDoc(doc(db, 'chats', chat.chatId));
        } else {
          await updateDoc(doc(db, 'chats', chat.chatId), {
            participants: newParticipants
          });
        }
      }
      setConfirmationModal(null);
      onBack();
    } catch (err) {
      handleFirestoreError(err, mode === 'both' ? OperationType.DELETE : OperationType.UPDATE, `chats/${chat.chatId}`);
    }
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m => 
      m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderLabel?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-300 relative overflow-hidden">
      {/* Dynamic Background Layer */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${isPattern ? 'opacity-[0.03] dark:opacity-[0.06]' : 'opacity-10 dark:opacity-20'}`} 
        style={{ 
          backgroundImage: `url("${currentBackground}")`,
          backgroundSize: isPattern ? 'auto' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: isPattern ? 'repeat' : 'no-repeat'
        }} 
      />

      {/* Header */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => (chat.type === 'channel' || chat.type === 'group') ? setIsChannelProfileOpen(true) : setIsGroupSettingsOpen(true)}>
            <img 
              src={chat.type === 'group' ? (chat.groupPhoto || `https://picsum.photos/seed/${chat.chatId}/200`) : (chat.type === 'channel' ? (chat.channelPhoto || `https://picsum.photos/seed/${chat.chatId}/200`) : (allUsersMap[chat.otherUser?.uid || '']?.photoURL || chat.otherUser?.photoURL || `https://picsum.photos/seed/${chat.chatId}/200`))} 
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-50 dark:border-blue-900/30"
              referrerPolicy="no-referrer"
            />
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                {chat.type === 'direct' && chat.otherUser?.isVerified && <VerifiedBadge className="w-3 h-3" />}
                <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                  {chat.type === 'group' ? chat.groupName : (chat.type === 'channel' ? chat.channelName : (chat.otherUser?.displayName || 'مستخدم'))}
                  {chat.type === 'channel' && currentChatData?.isVerified && <VerifiedBadge className="w-3 h-3 inline-block mr-1" />}
                </h4>
              </div>
              <div className="flex items-center gap-1 justify-end">
                {typingUsers.length > 0 ? (
                  <div className="flex items-center gap-1 text-blue-500">
                    <p className="text-[10px] font-medium animate-pulse">
                      {typingUsers.length === 1 ? `${typingUsers[0]} يكتب...` : 'عدة أشخاص يكتبون...'}
                    </p>
                    <div className="flex gap-0.5">
                      <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 font-medium">
                    {chat.type === 'group' ? `${chat.participants.length} أعضاء` : (chat.type === 'channel' ? `${currentChatData?.subscribersCount || 0} مشتركين` : 'نشط الآن')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`p-2 rounded-full transition-colors ${showMoreMenu ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'}`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute end-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 space-y-1 z-50 overflow-hidden"
                  >
                    {chat.type === 'group' && (
                      <button 
                        onClick={() => {
                          toggleTruthMode();
                          setShowMoreMenu(false);
                        }} 
                        className="w-full flex items-center justify-between p-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl text-xs font-bold text-purple-600 transition-colors group"
                        dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
                      >
                        <Zap className="w-4 h-4 text-purple-400 opacity-60" />
                        <span className={`flex-1 ${language === 'en' ? 'text-left ml-3' : 'text-right mr-3'}`}>{t.truthMode}</span>
                      </button>
                    )}

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                    <button 
                      onClick={() => {
                        setConfirmationModal({
                          isOpen: true,
                          title: t.deleteChatTitle,
                          message: t.deleteChatConfirm,
                          isDanger: true,
                          actionType: 'delete_chat',
                          onConfirm: () => {}, 
                          confirmText: t.delete,
                          cancelText: t.cancel
                        });
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-bold text-red-600 transition-colors group"
                      dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
                    >
                      <Trash2 className="w-4 h-4 opacity-70" />
                      <span className={`flex-1 ${language === 'en' ? 'text-left ml-3' : 'text-right mr-3'}`}>{t.deleteChatTitle}</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden z-20"
          >
            <div className="relative">
              <input 
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchInMessages}
                className={`w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${language === 'en' ? 'text-left' : 'text-right'}`}
                dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-gray-400 hover:text-gray-600 absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Message Bar */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 p-2 px-4 flex items-center justify-between z-20 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => {
              const el = document.getElementById(`msg-${pinnedMessage.messageId}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-1 h-8 bg-blue-500 rounded-full" />
              <div className="text-right flex-1">
                <p className="text-[10px] font-black text-blue-500">رسالة مثبتة</p>
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                  {pinnedMessage.text || `[${pinnedMessage.type}]`}
                </p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                togglePinMessage(pinnedMessage.messageId);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {truthModeTimeLeft !== null && (
        <div className="bg-purple-600 text-white p-2 flex items-center justify-center gap-2 text-xs font-bold">
          <Zap className="w-3 h-3 animate-bounce" />
          <span>وضع الصراحة نشط: {Math.floor(truthModeTimeLeft / 60)}:{(truthModeTimeLeft % 60).toString().padStart(2, '0')}</span>
        </div>
      )}

      {activeGroupCall && (
        <div className="bg-blue-600 p-3 flex items-center justify-between text-white animate-pulse">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <span className="text-xs font-bold">هناك مكالمة جماعية نشطة الآن</span>
          </div>
          <button 
            onClick={() => onJoinCall(activeGroupCall)}
            className="bg-white text-blue-600 px-4 py-1 rounded-full text-[10px] font-bold"
          >
            انضمام
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar z-10">
        {filteredMessages.map((msg, idx) => {
          const sender = allUsers.find(u => u.uid === msg.senderId);
          const isOwn = msg.senderId === user.uid;
          const isAnonymous = msg.isAnonymous;
          const replyMsg = msg.replyTo ? messages.find(m => m.messageId === msg.replyTo) : null;
          
          // Check if message is read by others
          const isRead = currentChatData?.lastRead && Object.entries(currentChatData.lastRead).some(([uid, ts]) => {
            if (uid === user.uid || !ts || !msg.timestamp) return false;
            const readTime = getTimestampMillis(ts);
            const msgTime = getTimestampMillis(msg.timestamp) || Infinity;
            return readTime >= msgTime;
          });

          return (
            <motion.div 
              key={msg.messageId} 
              id={`msg-${msg.messageId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
            >
              {msg.type === 'system' ? (
                <div className="w-full flex justify-center my-2">
                  <div className="bg-black/10 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-4 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col max-w-[85%] relative group">
                  {(chat.type === 'group' || isAnonymous) && !isOwn && (
                    <div className="flex items-center gap-2 mb-1 mr-2">
                      <span className="text-[10px] text-blue-500 font-bold">
                        {isAnonymous ? msg.senderLabel : (sender?.displayName || 'مستخدم')}
                      </span>
                      {isAnonymous && <Zap className="w-3 h-3 text-purple-500" />}
                    </div>
                  )}

                  {/* Swipe to Reply Wrapper */}
                  <motion.div 
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -100 || info.offset.x > 100) {
                        setReplyingTo(msg);
                      }
                    }}
                    className="relative"
                  >
                    <div 
                      className={`p-2.5 rounded-2xl text-sm shadow-sm relative transition-all cursor-pointer ${
                        !isOwn 
                          ? (isAnonymous ? 'bg-purple-600 text-white rounded-tl-none' : 'bg-blue-600 text-white rounded-tl-none') 
                          : (isAnonymous ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 rounded-tr-none border border-purple-200 dark:border-purple-800' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tr-none')
                      } ${selectedMessageId === msg.messageId ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900' : ''}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedMessageId(msg.messageId === selectedMessageId ? null : msg.messageId);
                      }}
                      onClick={() => setSelectedMessageId(null)}
                    >
                      {/* Reply Preview */}
                      {replyMsg && (
                        <div 
                          className={`mb-2 p-2 rounded-lg border-r-4 text-right flex flex-col gap-0.5 ${!isOwn ? 'bg-white/10 border-white/30' : 'bg-gray-50 dark:bg-gray-700/50 border-blue-500'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const el = document.getElementById(`msg-${replyMsg.messageId}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                        >
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            <span className={`text-[9px] font-bold ${!isOwn ? 'text-white/70' : 'text-blue-500/70'}`}>رداً على</span>
                            <Reply className={`w-2.5 h-2.5 ${!isOwn ? 'text-white/70' : 'text-blue-500/70'}`} />
                          </div>
                          <p className={`text-[10px] font-black ${!isOwn ? 'text-white' : 'text-blue-500'}`}>
                            {allUsers.find(u => u.uid === replyMsg.senderId)?.displayName || 'مستخدم'}
                          </p>
                          <p className="text-[11px] opacity-80 truncate">
                            {replyMsg.text || `[${replyMsg.type}]`}
                          </p>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="space-y-2">
                        {msg.isForwarded && (
                          <div className={`flex items-center gap-1 mb-1 text-[10px] italic font-bold ${isOwn ? 'text-white/60' : 'text-gray-400'} justify-end`}>
                            <span className="text-right">محولة من {msg.forwardedFrom}</span>
                            <Forward className="w-3 h-3" />
                          </div>
                        )}
                        {msg.storyId && (
                          <div className={`mb-2 p-2 rounded-xl border-l-4 flex items-center gap-3 overflow-hidden ${!isOwn ? 'bg-white/10 border-white/30' : 'bg-gray-50 dark:bg-gray-700/50 border-blue-500'}`}>
                            <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                              {msg.storyMediaType === 'video' ? (
                                <video src={msg.storyMediaUrl} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                <img src={msg.storyMediaUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white opacity-80" />
                              </div>
                            </div>
                            <div className="flex-1 text-right min-w-0">
                              <p className={`text-[10px] font-bold truncate ${!isOwn ? 'text-white/70' : 'text-blue-500'}`}>{t.storyReply}</p>
                              <p className="text-[11px] opacity-60 line-clamp-1">{t.watchOriginalStory}</p>
                            </div>
                          </div>
                        )}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <img src={msg.mediaUrl} className="rounded-xl w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                        )}
                        {msg.type === 'voice' && (
                          <div className="flex items-center gap-3 min-w-[150px]">
                            <button 
                              onClick={() => handlePlayVoice(msg.messageId, msg.mediaUrl!)}
                              className={`p-2 rounded-full ${!isOwn ? 'bg-white/20' : 'bg-blue-500 text-white'}`}
                            >
                              {playingVoiceId === msg.messageId ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                            <div className="flex-1 h-6 flex items-center gap-0.5">
                              {[...Array(20)].map((_, i) => (
                                <div key={i} className={`flex-1 rounded-full ${!isOwn ? 'bg-white/40' : 'bg-gray-300 dark:bg-gray-600'}`} style={{ height: `${Math.random() * 100}%` }} />
                              ))}
                            </div>
                          </div>
                        )}
                        {msg.type === 'video_note' && msg.mediaUrl && (
                          <div className="w-40 h-40 rounded-full overflow-hidden border-2 border-blue-500 relative">
                            <video src={msg.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop />
                          </div>
                        )}
                        {msg.type === 'file' && msg.fileInfo && (
                          <div className={`flex items-center gap-3 p-2 rounded-xl ${isOwn ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-700'}`}>
                            <div className="p-2 bg-blue-500 text-white rounded-lg">
                              <File className="w-5 h-5" />
                            </div>
                            <div className="text-right flex-1">
                              <p className="text-xs font-bold truncate max-w-[120px]">{msg.fileInfo.name}</p>
                              <p className="text-[10px] opacity-60">{(msg.fileInfo.size / 1024).toFixed(1)} KB • {msg.fileInfo.extension}</p>
                            </div>
                            <Download className="w-4 h-4 opacity-60" />
                          </div>
                        )}
                        {msg.text && <p className="leading-relaxed text-right whitespace-pre-wrap">{msg.text}</p>}
                      </div>

                      {/* Reactions Display */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(msg.reactions).map(([emoji, uids]) => {
                            const uidsList = uids as string[];
                            return (
                              <button 
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReaction(msg.messageId, emoji);
                                }}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-all ${uidsList.includes(user.uid) ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-black/5 dark:bg-white/5 border-transparent'}`}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold">{uidsList.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Footer: Time & Status */}
                      <div className={`flex items-center gap-1 mt-1 opacity-60 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px]">{formatMessageDate(msg.timestamp)}</span>
                        {isOwn && (
                          <div className="flex -space-x-1">
                            {isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-200" />
                            ) : (
                              <Check className="w-3 h-3 text-white/40" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Context Menu / Reactions Menu */}
                  <AnimatePresence>
                    {selectedMessageId === msg.messageId && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className={`absolute bottom-full mb-2 z-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 min-w-[150px] ${isOwn ? 'end-0' : 'start-0'}`}
                      >
                        {/* Quick Reactions */}
                        <div className="flex items-center gap-1 p-1 border-b border-gray-100 dark:border-gray-700 mb-1">
                          {['👍', '❤️', '🔥', '😂', '😮', '😢'].map(emoji => (
                            <button 
                              key={emoji}
                              onClick={() => {
                                handleReaction(msg.messageId, emoji);
                                setSelectedMessageId(null);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg active:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-0.5">
                          <button onClick={() => { setReplyingTo(msg); setSelectedMessageId(null); }} className="w-full flex items-center justify-end gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold">
                            رد
                            <Reply className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setForwardingMessage(msg); setSelectedMessageId(null); }} className="w-full flex items-center justify-end gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold">
                            تحويل
                            <Forward className="w-4 h-4" />
                          </button>
                          <button onClick={() => { navigator.clipboard.writeText(msg.text); setSelectedMessageId(null); }} className="w-full flex items-center justify-end gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold">
                            نسخ
                            <Copy className="w-4 h-4" />
                          </button>
                          {isGroupModerator && (
                            <button onClick={() => { togglePinMessage(msg.messageId); setSelectedMessageId(null); }} className="w-full flex items-center justify-end gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold">
                              تثبيت
                              <Pin className="w-4 h-4" />
                            </button>
                          )}
                          {(isOwn || canDeleteMessages) && (
                            <button onClick={() => { deleteMessage(msg.messageId); setSelectedMessageId(null); }} className="w-full flex items-center justify-end gap-2 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-bold text-red-600">
                              حذف
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}
        
        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="flex flex-col items-end mb-2"
          >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 px-4 rounded-2xl rounded-tr-none shadow-sm flex items-center gap-3 border border-gray-100 dark:border-gray-700">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[11px] text-blue-500 font-bold">
                {typingUsers.length === 1 ? `${typingUsers[0]} يكتب...` : 'عدة أشخاص يكتبون...'}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Forward Modal */}
      <AnimatePresence>
        {forwardingMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl border border-white/20"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <button 
                  onClick={() => setForwardingMessage(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <h3 className="text-xl font-black">{language === 'ar' ? 'تحويل الرسالة إلى...' : 'Forward to...'}</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {allChats.filter(c => c.chatId !== chat.chatId).map(c => {
                  const chatName = c.type === 'direct' 
                    ? (allUsers.find(u => u.uid === c.participants.find(p => p !== user.uid))?.displayName || (c as any).otherUser?.displayName || 'مستخدم')
                    : c.groupName;
                  const chatPhoto = c.type === 'direct'
                    ? (allUsers.find(u => u.uid === c.participants.find(p => p !== user.uid))?.photoURL || (c as any).otherUser?.photoURL || '')
                    : '';

                  return (
                    <button
                      key={c.chatId}
                      onClick={() => handleForwardMessage(forwardingMessage, c)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-[24px] transition-all group active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-500/20">
                        {chatPhoto ? (
                          <img src={chatPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-black text-lg">{chatName?.[0] || '?'}</span>
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <p className="font-black text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {chatName}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {c.type === 'direct' ? (language === 'ar' ? 'خاصة' : 'Private') : (c.type === 'group' ? (language === 'ar' ? 'مجموعة' : 'Group') : (language === 'ar' ? 'قناة' : 'Channel'))}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <Forward className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-30">
        {chat.type === 'channel' && !isGroupModerator ? (
          <div className="flex items-center justify-center p-2">
            <button 
              onClick={handleSubscribe}
              className={`w-full py-3 rounded-2xl font-bold transition-all ${
                currentChatData?.participants.includes(user.uid)
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
              }`}
            >
              {currentChatData?.participants.includes(user.uid) ? 'إلغاء الاشتراك' : 'اشتراك في القناة'}
            </button>
          </div>
        ) : (
          <>
            {/* Reply Preview */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-gray-50 dark:bg-gray-800/50 p-2 px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 mb-2 rounded-t-2xl"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-1 h-8 bg-blue-500 rounded-full" />
                    <div className="text-right flex-1">
                      <p className="text-[10px] font-black text-blue-500">
                        الرد على {allUsers.find(u => u.uid === replyingTo.senderId)?.displayName || 'مستخدم'}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[250px]">
                        {replyingTo.text || `[${replyingTo.type}]`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={sendMessage} className="flex items-end gap-2 relative">
              {isModerating && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-xs font-bold text-blue-500">{t.scanningMessage}</span>
                  </div>
                </motion.div>
              )}
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-1 flex items-end transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 text-red-500">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-bold">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400 animate-pulse">جاري التسجيل...</p>
                    <button type="button" onClick={() => { stopRecording(); setIsRecording(false); }} className="text-red-500 text-xs font-bold hover:underline">إلغاء</button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2.5 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <Smile className="w-6 h-6" />
                      </button>

                      <AnimatePresence>
                        {showEmojiPicker && (
                          <StickerPicker 
                            onEmojiClick={(emoji) => {
                              setNewMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            onStickerClick={(sticker) => {
                              onSendSticker(sticker);
                              setShowEmojiPicker(false);
                            }}
                            onCreatePack={onCreateStickerPack}
                            stickerPacks={stickerPacks}
                            t={t}
                            language={language}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <textarea 
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      placeholder={currentChatData?.truthMode?.active ? "تحدث بصراحة (مجهول)..." : "اكتب رسالة..."}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 px-2 resize-none max-h-32 min-h-[40px] text-right"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e as any);
                        }
                      }}
                      dir="rtl"
                    />

                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className="p-2.5 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <Paperclip className="w-6 h-6" />
                      </button>
                      
                      <AnimatePresence>
                        {showAttachmentMenu && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className="absolute bottom-full end-0 mb-4 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 z-50"
                          >
                            <div className="grid grid-cols-1 gap-1">
                              <button className="flex items-center justify-end gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
                                معرض الصور
                                <div className="p-1.5 bg-blue-500 text-white rounded-lg"><Image className="w-4 h-4" /></div>
                              </button>
                              <button className="flex items-center justify-end gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
                                ملف
                                <div className="p-1.5 bg-orange-500 text-white rounded-lg"><File className="w-4 h-4" /></div>
                              </button>
                              <button className="flex items-center justify-end gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
                                موقع
                                <div className="p-1.5 bg-green-500 text-white rounded-lg"><MapPin className="w-4 h-4" /></div>
                              </button>
                              <button className="flex items-center justify-end gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
                                تصويت
                                <div className="p-1.5 bg-yellow-500 text-white rounded-lg"><BarChart2 className="w-4 h-4" /></div>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>

              <button 
                type={newMessage.trim() || isRecording ? "button" : "button"}
                onMouseDown={() => {
                  if (!newMessage.trim() && inputMode === 'voice') {
                    startRecording();
                  }
                }}
                onMouseUp={() => {
                  if (isRecording) {
                    stopRecording();
                  }
                }}
                onTouchStart={() => {
                  if (!newMessage.trim() && inputMode === 'voice') {
                    startRecording();
                  }
                }}
                onTouchEnd={() => {
                  if (isRecording) {
                    stopRecording();
                  }
                }}
                onClick={() => {
                  if (newMessage.trim()) {
                    sendMessage(null as any);
                  } else if (!isRecording) {
                    setInputMode(inputMode === 'voice' ? 'video' : 'voice');
                  }
                }}
                className={`p-3 rounded-full transition-all shadow-lg active:scale-90 ${newMessage.trim() || isRecording ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-blue-600 border border-gray-100 dark:border-gray-700'}`}
              >
                {newMessage.trim() ? (
                  <Send className="w-6 h-6" />
                ) : isRecording ? (
                  <Mic2 className="w-6 h-6 animate-pulse" />
                ) : (
                  inputMode === 'voice' ? <Mic2 className="w-6 h-6" /> : <Video className="w-6 h-6" />
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Background Selection Modal */}
      <AnimatePresence>
        {isBackgroundModalOpen && (
          <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Image className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-black text-lg text-gray-900 dark:text-white">{t.customizeBackground}</h3>
                </div>
                <button onClick={() => setIsBackgroundModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                <div>
                  <label className={`block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t.presetStyles}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {backgrounds.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => {
                          handleUpdateBackground(bg.value);
                          setIsBackgroundModalOpen(false);
                        }}
                        className={`relative h-24 rounded-2xl overflow-hidden border-2 transition-all ${currentBackground === bg.value ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-gray-100 dark:border-gray-800 hover:border-blue-300'}`}
                        style={{ backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover' }}
                      >
                        <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-end p-2">
                          <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">{bg.name}</span>
                        </div>
                        {currentBackground === bg.value && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white p-1 rounded-full">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest leading-relaxed">تحميل صورة من جهازك</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*,image/gif"
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 800000) { // Limit to ~800KB for Firestore doc safety
                          alert(language === 'ar' ? 'الصورة كبيرة جداً، يرجى اختيار صورة أصغر من 800 كيلوبايت.' : 'Image is too large, please choose an image smaller than 800 KB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64String = reader.result as string;
                          handleUpdateBackground(base64String);
                          setIsBackgroundModalOpen(false);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all group"
                  >
                    <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold font-black uppercase">اختيار صورة أو GIF</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">رابط صورة مخصصة</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      id="custom-bg-input"
                      placeholder="أدخل رابط الصورة هنا..."
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs py-3 px-4 text-right focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('custom-bg-input') as HTMLInputElement;
                        if (input.value) {
                          handleUpdateBackground(input.value);
                          setIsBackgroundModalOpen(false);
                        }
                      }}
                      className="bg-blue-600 text-white px-6 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      تطبيق
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => {
                      handleUpdateBackground("");
                      setIsBackgroundModalOpen(false);
                    }}
                    className="w-full py-3 text-red-500 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                  >
                    إعادة ضبط الخلفية الافتراضية
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Channel Profile Modal */}
      <AnimatePresence>
        {isChannelProfileOpen && currentChatData && (
          <ChannelProfileModal 
            isOpen={isChannelProfileOpen}
            onClose={() => setIsChannelProfileOpen(false)}
            chat={currentChatData}
            user={user}
            allUsers={allUsers}
            allUsersMap={allUsersMap}
            onShare={onShare}
            onLeave={handleLeaveChat}
            onMute={handleMute}
            onStartLive={onStartLive}
            onViewDiscussion={handleViewDiscussion}
            onAddMembers={() => setIsAddMembersModalOpen(true)}
            onOpenSettings={() => {
              setIsGroupSettingsOpen(true);
              setGroupSettingsView('main');
              setIsChannelProfileOpen(false);
            }}
            t={t}
            language={language}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddMembersModalOpen && (
          <AddMembersModal 
            isOpen={isAddMembersModalOpen}
            onClose={() => setIsAddMembersModalOpen(false)}
            users={allUsers}
            currentParticipants={currentChatData?.participants || chat.participants}
            onAdd={handleAddMembers}
            language={language}
          />
        )}
      </AnimatePresence>

      {/* Chat Settings Modal */}
      <AnimatePresence>
        {isGroupSettingsOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[800px]"
              dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 border-t-4 border-blue-600">
                {groupSettingsView === 'main' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-black text-lg text-gray-900 dark:text-white">
                        {chat.type === 'group' ? t.groupSettings : (chat.type === 'channel' ? t.channelSettings : t.chatSettings)}
                      </h3>
                    </div>
                    <button onClick={() => setIsGroupSettingsOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <X className="w-6 h-6 text-gray-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <button onClick={() => {
                        if (groupSettingsView === 'admin_permissions') {
                          setGroupSettingsView('admins');
                          setSelectedAdminId(null);
                        } else {
                          setGroupSettingsView('main');
                        }
                      }} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        {language === 'ar' || language === 'fa' ? <ArrowRight className="w-6 h-6 text-gray-400" /> : <ArrowLeft className="w-6 h-6 text-gray-400" />}
                      </button>
                      <h3 className="font-black text-lg text-gray-900 dark:text-white">
                        {groupSettingsView === 'edit' ? t.edit : (groupSettingsView === 'members' ? t.members : (groupSettingsView === 'admins' ? t.moderators : (groupSettingsView === 'permissions' ? t.permissions : (groupSettingsView === 'admin_permissions' ? t.adminPermissions : (groupSettingsView === 'reactions' ? t.reactions : t.edit)))))}
                      </h3>
                    </div>
                    {groupSettingsView === 'edit' && (
                      <button 
                        onClick={() => {
                          handleUpdateGroupInfo();
                          setGroupSettingsView('main');
                        }} 
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                      >
                        <Check className="w-6 h-6" />
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {groupSettingsView === 'main' ? (
                  <div className="p-6 space-y-6">
                    {/* Search bar for settings options */}
                    <div className="relative mb-2">
                       <input 
                         type="text"
                         value={settingsSearchQuery}
                         onChange={(e) => setSettingsSearchQuery(e.target.value)}
                         placeholder={t.settingsSearchPlaceholder}
                         className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl p-4 pr-12 text-sm font-bold focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none transition-all shadow-sm"
                         dir="rtl"
                       />
                       <Search className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Admin Action */}
                    {isGroupModerator && chat.type === 'group' && (!settingsSearchQuery || t.manageGroup.includes(settingsSearchQuery)) && (
                      <button 
                         onClick={() => {
                           setGroupSettingsView('edit');
                           setEditedGroupDetails({
                             name: chat.groupName || '',
                             description: currentChatData?.groupDescription || '',
                             type: currentChatData?.groupType || 'private',
                             linkedChannel: currentChatData?.linkedChannel || '',
                             color: currentChatData?.groupColor || '#3b82f6',
                             topicsEnabled: currentChatData?.topicsEnabled || false
                           });
                         }}
                         className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20 group hover:scale-[1.02] transition-all"
                      >
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                               <Settings className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                               <p className="text-sm">{t.manageGroup}</p>
                               <p className="text-[10px] font-medium opacity-70">{t.manageGroupSubtitle}</p>
                            </div>
                         </div>
                         <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                      </button>
                    )}

                    {/* Chat Background Section */}
                    {(!settingsSearchQuery || t.chatBackground.includes(settingsSearchQuery)) && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          {t.chatBackground}
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {backgrounds.map((bg) => (
                            <button
                              key={bg.id}
                              onClick={() => handleUpdateBackground(bg.value)}
                              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${currentChatData?.background === bg.value ? 'border-blue-500 scale-95 shadow-md' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
                            >
                              <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800" />
                              <div className="absolute inset-0 opacity-20 dark:opacity-40" style={{ backgroundImage: `url("${bg.value}")` }} />
                              <div className="absolute inset-x-0 bottom-0 p-1 bg-black/40 backdrop-blur-sm">
                                <span className="text-[7px] font-bold text-white">{bg.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info Card */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl text-center space-y-4 border border-gray-100 dark:border-gray-700">
                      <div className="relative inline-block mx-auto">
                        <img 
                          src={chat.type === 'group' ? (chat.groupPhoto || `https://picsum.photos/seed/${chat.chatId}/200`) : (chat.channelPhoto || `https://picsum.photos/seed/${chat.chatId}/200`)} 
                          className="w-24 h-24 rounded-[2rem] object-cover shadow-2xl border-4 border-white dark:border-gray-900"
                          referrerPolicy="no-referrer"
                        />
                        {currentChatData?.isVerified && (
                          <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1 shadow-lg border-2 border-white dark:border-gray-900">
                            <BadgeCheck className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-gray-900 dark:text-white">
                           {chat.type === 'group' ? chat.groupName : chat.channelName}
                        </h4>
                        <p className="text-xs text-gray-400 font-medium tracking-wide">
                           {chat.type === 'group' ? `@group_${chat.chatId.slice(0, 8)}` : `@channel_${chat.chatId.slice(0, 8)}`}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 px-4 leading-relaxed line-clamp-2">
                         {chat.type === 'group' ? (currentChatData?.groupDescription || t.noDescriptionGroup) : (chat.channelDescription || t.noDescriptionChannel)}
                      </p>
                      
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <div className="px-5 py-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                          <p className="text-[10px] text-gray-400 font-bold mb-0.5 uppercase tracking-tighter">{t.membersTab}</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{currentChatData?.participants?.length || 0}</p>
                        </div>
                        {chat.type === 'group' && (
                           <div className="px-5 py-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                             <p className="text-[10px] text-gray-400 font-bold mb-0.5 uppercase tracking-tighter">{t.moderators}</p>
                             <p className="text-sm font-black text-gray-900 dark:text-white">{currentChatData?.moderators?.length || 1}</p>
                           </div>
                        )}
                      </div>
                    </div>

                    {/* Members Quick List */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-gray-400 flex items-center justify-between px-2">
                          <span className="flex items-center gap-2">
                             <Users className="w-4 h-4" />
                             {t.groupMembers}
                          </span>
                          <button onClick={() => setGroupSettingsView('members')} className="text-[10px] text-blue-500 font-black">{t.seeAll}</button>
                       </h4>
                       <div className="flex -space-x-3 space-x-reverse overflow-hidden p-2 justify-center">
                          {currentChatData?.participants.slice(0, 8).map(uid => (
                             <img 
                                key={uid}
                                src={allUsers.find(u => u.uid === uid)?.photoURL || `https://picsum.photos/seed/${uid}/100`}
                                className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-900 shadow-sm object-cover"
                             />
                          ))}
                          {currentChatData?.participants.length > 8 && (
                             <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-black text-gray-500">
                                +{currentChatData.participants.length - 8}
                             </div>
                          )}
                       </div>
                    </div>

                    <button 
                      onClick={handleLeaveChat}
                      className="w-full py-4 text-red-600 dark:text-red-400 font-black text-sm bg-red-50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 transition-all active:scale-[0.98] border border-red-100 dark:border-red-900/30"
                    >
                       {!isGroupAdmin ? t.leaveGroup : t.deleteGroup}
                    </button>
                  </div>
                ) : groupSettingsView === 'edit' ? (
                  <div className="p-6 space-y-6">
                    {/* Search Bar for Options */}
                    <div className="relative mb-2">
                       <input 
                         type="text"
                         value={settingsSearchQuery}
                         onChange={(e) => setSettingsSearchQuery(e.target.value)}
                         placeholder={t.optionsSearchPlaceholder}
                         className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl p-4 pr-12 text-sm font-bold focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none transition-all shadow-sm"
                         dir="rtl"
                       />
                       <Search className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Identity Section */}
                    {(!settingsSearchQuery || "اسم المجموعة الوصف الصورة".includes(settingsSearchQuery)) && (
                      <div className="flex flex-col items-center gap-4 py-4">
                         <input 
                           type="file"
                           ref={groupPhotoInputRef}
                           className="hidden"
                           accept="image/*"
                           onChange={handleFileSelect}
                         />
                         <div className="relative group cursor-pointer" onClick={() => groupPhotoInputRef.current?.click()}>
                            <img 
                               src={editedGroupDetails.photo || chat.groupPhoto || `https://picsum.photos/seed/${chat.chatId}/200`} 
                               className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-white dark:border-gray-800 shadow-2xl transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Camera className="w-8 h-8 text-white animate-pulse" />
                            </div>
                         </div>
                         <button onClick={() => groupPhotoInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-black transition-colors hover:bg-blue-100">
                            <Camera className="w-4 h-4" />
                            {t.setNewPhoto}
                         </button>
                      </div>
                    )}

                    {/* Inputs */}
                    {(!settingsSearchQuery || "اسم المجموعة الوصف".includes(settingsSearchQuery)) && (
                      <div className="space-y-4">
                         <div className="space-y-2">
                            <div className="relative">
                               <input 
                                  type="text"
                                  value={editedGroupDetails.name}
                                  onChange={(e) => setEditedGroupDetails({...editedGroupDetails, name: e.target.value})}
                                  placeholder={t.groupName}
                                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl p-4 pr-12 text-sm font-bold focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none transition-all"
                                  dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}
                               />
                               <Smile className="w-5 h-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <textarea 
                              value={editedGroupDetails.description}
                              onChange={(e) => setEditedGroupDetails({...editedGroupDetails, description: e.target.value})}
                              placeholder="الوصف (اختياري)"
                              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl p-4 text-sm font-bold min-h-[100px] focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none transition-all resize-none"
                              dir="rtl"
                            />
                         </div>
                      </div>
                    )}

                    {/* Option Cards */}
                    <div className="grid grid-cols-1 gap-3">
                       {(!settingsSearchQuery || "نوع المجموعة خاصة عامة".includes(settingsSearchQuery)) && (
                         <OptionRow 
                            icon={<Users />} 
                            label="نوع المجموعة" 
                            value={editedGroupDetails.type === 'public' ? 'عامة' : 'خاصة'} 
                            onClick={() => setEditedGroupDetails({...editedGroupDetails, type: editedGroupDetails.type === 'public' ? 'private' : 'public'})} 
                            t={t}
                            language={language}
                         />
                       )}
                       {(!settingsSearchQuery || "القناة المرتبطة ربط".includes(settingsSearchQuery)) && (
                         <OptionRow 
                            icon={<Megaphone />} 
                            label="القناة المرتبطة" 
                            value={editedGroupDetails.linkedChannel || 'إضافة قناة'} 
                            onClick={() => setGroupSettingsView('linkedChannel')} 
                            t={t}
                            language={language}
                         />
                       )}
                       {(!settingsSearchQuery || "المظهر اللون ثيم".includes(settingsSearchQuery)) && (
                         <OptionRow 
                            icon={<Palette />} 
                            label="المظهر" 
                            showBadge
                            onClick={() => setGroupSettingsView('appearance')}
                            t={t}
                            language={language}
                            value={
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] text-gray-400">نيلي</span>
                                 <div className="w-4 h-4 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: editedGroupDetails.color }} />
                              </div>
                            } 
                         />
                       )}
                       {(!settingsSearchQuery || "الموضوعات تقسيم توبيكس".includes(settingsSearchQuery)) && (
                         <OptionRow 
                            icon={<List />} 
                            label="الموضوعات" 
                            showBadge
                            t={t}
                            language={language}
                            value={
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditedGroupDetails({...editedGroupDetails, topicsEnabled: !editedGroupDetails.topicsEnabled});
                                }}
                                className={`w-12 h-6 rounded-full transition-all relative ${editedGroupDetails.topicsEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editedGroupDetails.topicsEnabled ? 'left-1' : 'left-7'}`} />
                              </button>
                            } 
                         />
                       )}
                    </div>
                    <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed font-medium">سيتم تقسيم المجموعة إلى الموضوعات التي أنشأها المشرفون أو المستخدمون.</p>

                    {/* Management List */}
                    <div className="bg-gray-50 dark:bg-gray-800/80 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                       {(!settingsSearchQuery || "التفاعلات".includes(settingsSearchQuery)) && <SubRow icon={<Heart />} label="التفاعلات" value="25/73" onClick={() => setGroupSettingsView('reactions')} />}
                       {(!settingsSearchQuery || "الصلاحيات".includes(settingsSearchQuery)) && <SubRow icon={<Key />} label="الصلاحيات" value="2/14" onClick={() => setGroupSettingsView('permissions')} />}
                       {(!settingsSearchQuery || "المشرفون".includes(settingsSearchQuery)) && <SubRow icon={<Shield />} label="المشرفون" value={currentChatData?.moderators?.length || 1} onClick={() => setGroupSettingsView('admins')} />}
                       {(!settingsSearchQuery || "الأعضاء".includes(settingsSearchQuery)) && <SubRow icon={<Users />} label="الأعضاء" value={currentChatData?.participants.length || 0} onClick={() => setGroupSettingsView('members')} />}
                    </div>

                    {/* Extra List */}
                    <div className="bg-gray-50 dark:bg-gray-800/80 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                       {(!settingsSearchQuery || "الإحصائيات".includes(settingsSearchQuery)) && <SubRow icon={<TrendingUp />} label="الإحصائيات" />}
                       {(!settingsSearchQuery || "آخر الإجراءات".includes(settingsSearchQuery)) && <SubRow icon={<ClipboardList />} label="آخر الإجراءات" />}
                    </div>

                    {/* Danger Zone */}
                    <button 
                      onClick={handleLeaveChat}
                      className="w-full p-5 bg-red-50 dark:bg-red-900/10 text-red-600 font-black text-center rounded-3xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-900/20"
                    >
                       حذف ومغادرة المجموعة
                    </button>
                  </div>
                ) : groupSettingsView === 'members' ? (
                   <div className="p-6 space-y-4">
                      {/* Search Bar for Members */}
                      <div className="relative mb-2">
                        <input 
                          type="text"
                          value={settingsSearchQuery}
                          onChange={(e) => setSettingsSearchQuery(e.target.value)}
                          placeholder="بحث عن عضو..."
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-right"
                          dir="rtl"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                      
                      {isGroupModerator && (
                        <button 
                          onClick={() => setIsAddMembersModalOpen(true)}
                          className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center gap-2 font-black border border-blue-100 dark:border-blue-900/30 mb-2 hover:bg-blue-100 transition-all"
                        >
                          <UserPlus className="w-5 h-5" />
                          إضافة أعضاء جدد
                        </button>
                      )}
                      {currentChatData?.participants.map(uid => {
                         const m = allUsers.find(u => u.uid === uid);
                         if (settingsSearchQuery && !m?.displayName?.toLowerCase().includes(settingsSearchQuery.toLowerCase()) && !m?.username?.toLowerCase().includes(settingsSearchQuery.toLowerCase())) return null;
                         return (
                            <div key={uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                               <div className="flex items-center gap-3">
                                  <img src={m?.photoURL || `https://picsum.photos/seed/${uid}/100`} className="w-10 h-10 rounded-full object-cover" />
                                  <div className="text-right">
                                     <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{m?.displayName || 'مستخدم'}</p>
                                     <p className="text-[10px] text-gray-400">@{m?.username || 'user'}</p>
                                  </div>
                               </div>
                               {isGroupModerator && uid !== user.uid && (
                                 <button onClick={() => removeMember(uid)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg">ركل</button>
                               )}
                            </div>
                         );
                      })}
                   </div>
                ) : groupSettingsView === 'admins' ? (
                  <div className="p-6 space-y-6">
                    {/* Search Bar for Admins */}
                    <div className="relative">
                      <input 
                        type="text"
                        value={settingsSearchQuery}
                        onChange={(e) => setSettingsSearchQuery(e.target.value)}
                        placeholder="بحث عن مشرف..."
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-right"
                        dir="rtl"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2">
                        <Shield className="w-3 h-3" />
                        المشرفون الحاليون
                      </h4>
                      {currentChatData?.moderators?.map(uid => {
                        const m = allUsers.find(u => u.uid === uid);
                        if (settingsSearchQuery && !m?.displayName?.toLowerCase().includes(settingsSearchQuery.toLowerCase()) && !m?.username?.toLowerCase().includes(settingsSearchQuery.toLowerCase())) return null;
                        return (
                           <div 
                             key={uid} 
                             onClick={() => {
                               setSelectedAdminId(uid);
                               setGroupSettingsView('admin_permissions');
                             }}
                             className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer group"
                           >
                            <div className="flex items-center gap-3">
                              <img src={m?.photoURL || `https://picsum.photos/seed/${uid}/100`} className="w-10 h-10 rounded-full" />
                              <div className="text-right">
                                <p className="text-sm font-bold group-hover:text-blue-500 transition-colors">{m?.displayName}</p>
                                <p className="text-[10px] text-gray-400">@{m?.username}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isGroupAdmin && uid !== user.uid && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleModerator(uid);
                                  }} 
                                  className="px-3 py-1.5 text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                  تخفيض الرتبة
                                </button>
                              )}
                              <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {canAddAdmins && (
                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h4 className="text-xs font-black text-gray-400 uppercase flex items-center gap-2">
                          <UserPlus className="w-3 h-3" />
                          إضافة مشرف
                        </h4>
                        <div className="space-y-2">
                          {currentChatData?.participants.filter(uid => !currentChatData.moderators?.includes(uid)).slice(0, 5).map(uid => {
                            const u = allUsers.find(u_ => u_.uid === uid);
                            return (
                              <button key={uid} onClick={() => toggleModerator(uid)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all">
                                <img src={u?.photoURL || `https://picsum.photos/seed/${uid}/100`} className="w-8 h-8 rounded-full" />
                                <span className="text-sm font-bold">{u?.displayName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : groupSettingsView === 'admin_permissions' && selectedAdminId ? (
                   <div className="p-6 space-y-6">
                     {(() => {
                        const admin = allUsers.find(u => u.uid === selectedAdminId);
                        const perms = currentChatData?.adminPermissions?.[selectedAdminId] || DEFAULT_ADMIN_PERMISSIONS;
                        const isOwnerOfGroup = (currentChatData?.ownerId || currentChatData?.createdBy) === user.uid;
                        
                        return (
                          <>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl">
                              <img src={admin?.photoURL || `https://picsum.photos/seed/${selectedAdminId}/100`} className="w-14 h-14 rounded-2xl shadow-md" />
                              <div className="text-right flex-1">
                                <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{admin?.displayName}</p>
                                <p className="text-xs text-gray-400 mt-1">مشرف في المجموعة</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">ماذا يمكن لهذا المشرف فعله؟</h4>
                              {[
                                { key: 'canChangeInfo', label: 'تغيير معلومات المجموعة', icon: <Edit3 /> },
                                { key: 'canDeleteMessages', label: 'حذف رسائل الآخرين', icon: <Trash2 /> },
                                { key: 'canBanUsers', label: 'حظر/تقييد المستخدمين', icon: <UserMinus /> },
                                { key: 'canInviteUsers', label: 'إضافة أعضاء جدد', icon: <UserPlus /> },
                                { key: 'canPinMessages', label: 'تثبيت الرسائل', icon: <Pin /> },
                                { key: 'canManageGroupCall', label: 'إدارة المحادثات المرئية', icon: <Video /> },
                                { key: 'canAddAdmins', label: 'تعيين مشرفين جدد', icon: <ShieldCheck /> }
                              ].map((permission) => (
                                <div key={permission.key} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400">
                                      {React.cloneElement(permission.icon as any, { className: 'w-4 h-4' })}
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{permission.label}</p>
                                  </div>
                                  <Switch 
                                    checked={perms[permission.key as keyof AdminPermissions]} 
                                    onChange={() => handleUpdateAdminPermission(selectedAdminId, permission.key as keyof AdminPermissions, !perms[permission.key as keyof AdminPermissions])} 
                                    disabled={!isOwnerOfGroup}
                                    language={language}
                                  />
                                </div>
                              ))}
                            </div>

                            {!isOwnerOfGroup && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/20">
                                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
                                  أنت ترى هذه الصلاحيات في وضع القراءة فقط. مالك المجموعة هو الوحيد الذي يمكنه تعديل صلاحيات المشرفين الآخرين.
                                </p>
                              </div>
                            )}
                          </>
                        );
                     })()}
                   </div>
                ) : groupSettingsView === 'permissions' ? (
                  <div className="p-6 space-y-4">
                    {/* Search Bar for Permissions */}
                    <div className="relative mb-2">
                      <input 
                        type="text"
                        value={settingsSearchQuery}
                        onChange={(e) => setSettingsSearchQuery(e.target.value)}
                        placeholder="بحث عن صلاحية..."
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-10 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-right"
                        dir="rtl"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {[
                      { key: 'sendMessages', label: 'إرسال الرسائل', icon: <MessageSquare /> },
                      { key: 'sendMedia', label: 'إرسال الوسائط', icon: <Image /> },
                      { key: 'addMembers', label: 'إضافة أعضاء', icon: <UserPlus /> },
                      { key: 'pinMessages', label: 'تثبيت الرسائل', icon: <Pin /> },
                      { key: 'changeInfo', label: 'تغيير معلومات المجموعة', icon: <Info /> }
                    ].filter(p => !settingsSearchQuery || p.label.includes(settingsSearchQuery)).map(permission => {
                      const isAllowed = currentChatData?.permissions?.[permission.key] !== false;
                      const isLocked = !isAllowed;
                      
                      return (
                        <div key={permission.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl transition-all duration-300 ${isAllowed ? 'bg-blue-500/10 text-blue-600 shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 opacity-60'}`}>
                              {React.cloneElement(permission.icon as any, { className: 'w-4 h-4' })}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{permission.label}</p>
                                <p className={`text-[10px] font-black uppercase tracking-tighter ${isAllowed ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isAllowed ? 'bg-green-500' : 'bg-red-500'}`} />
                                  {isAllowed ? (language === 'ar' ? 'مفتوح للأعضاء' : 'مقفل على الأعضاء') : (language === 'ar' ? 'مقفل على الأعضاء' : 'Locked for members')}
                                </p>
                            </div>
                          </div>
                          <Switch 
                            checked={isAllowed} 
                            onChange={() => handleUpdatePermissions(permission.key, isLocked)} 
                            language={language}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : groupSettingsView === 'appearance' ? (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-5 gap-3">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#06b6d4'].map(color => (
                        <button 
                          key={color} 
                          onClick={() => setEditedGroupDetails({...editedGroupDetails, color})}
                          className={`w-full aspect-square rounded-2xl border-4 transition-all ${editedGroupDetails.color === color ? 'border-white dark:border-gray-900 scale-110 shadow-lg ring-2 ring-blue-500' : 'border-transparent shadow-sm'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">سيظهر هذا اللون للمشرفين في واجهة الإعدادات وكهوية بصرية للمجموعة.</p>
                    </div>
                  </div>
                ) : groupSettingsView === 'linkedChannel' ? (
                  <div className="p-6 space-y-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase px-2 mb-2">اختر قناة لربطها</h4>
                    {allChats.filter(c => c.type === 'channel' && c.createdBy === user.uid).length > 0 ? (
                      allChats.filter(c => c.type === 'channel' && c.createdBy === user.uid).map(c => (
                        <button 
                          key={c.chatId} 
                          onClick={() => {
                            setEditedGroupDetails({...editedGroupDetails, linkedChannel: c.channelName});
                            setGroupSettingsView('edit');
                          }}
                          className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl border-4 transition-all ${editedGroupDetails.linkedChannel === c.channelName ? 'border-blue-500 bg-white dark:bg-gray-900 shadow-xl shadow-blue-500/10' : 'border-transparent hover:bg-gray-100'}`}
                        >
                          <div className="flex items-center gap-3">
                            <img src={c.channelPhoto || `https://picsum.photos/seed/${c.chatId}/200`} className="w-12 h-12 rounded-2xl object-cover" />
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{c.channelName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">@{c.chatId.slice(0, 8)}</p>
                            </div>
                          </div>
                          {editedGroupDetails.linkedChannel === c.channelName && (
                            <div className="p-1 bg-blue-500 rounded-full">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="py-16 bg-gray-50 dark:bg-gray-800 rounded-[3rem] text-center px-6 border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Megaphone className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-sm font-bold text-gray-400">ليس لديك قنوات تمتلكها لربطها.</p>
                      </div>
                    )}
                  </div>
                ) : groupSettingsView === 'reactions' ? (
                  <div className="p-6 space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-8 rounded-[2.5rem] text-center shadow-xl shadow-blue-500/20">
                      <div className="w-16 h-16 bg-white/20 text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <Heart className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black text-white mb-2">التفاعلات</h3>
                      <p className="text-xs text-white/70 leading-relaxed font-bold">تحكم في التفاعلات المسموح بها في هذه المجموعة</p>
                    </div>
                    
                    <div className="space-y-2">
                       {[
                         { id: 'all', label: 'جميع التفاعلات', subtitle: 'أي رمز تعبيري متاح' },
                         { id: 'basic', label: 'الأساسية فقط', subtitle: 'الرموز الستة الرئيسية' },
                         { id: 'none', label: 'إيقاف التفاعلات', subtitle: 'لن يتمكن الأعضاء من التفاعل' }
                       ].map((option) => (
                         <button 
                           key={option.id}
                           onClick={() => setGroupSettingsView('edit')}
                           className={`w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 transition-all group ${option.id === 'all' ? 'border-blue-500/30' : 'border-transparent hover:border-gray-200'}`}
                         >
                           <div className="text-right">
                             <p className="text-sm font-bold text-gray-800 dark:text-white">{option.label}</p>
                             <p className="text-[10px] text-gray-400 font-medium">{option.subtitle}</p>
                           </div>
                           {option.id === 'all' && <Check className="w-5 h-5 text-blue-500" />}
                         </button>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-400 space-y-4">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                       <Clock className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-sm font-black tracking-widest uppercase">قريباً...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [language, setLanguage] = useState(localStorage.getItem('appLanguage') || 'ar');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [globalBackground, setGlobalBackground] = useState(localStorage.getItem('globalChatBackground') || 'https://www.transparenttextures.com/patterns/cubes.png');

  const t = translations[language] || translations['en'];

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('globalChatBackground', globalBackground);
  }, [globalBackground]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection successful");
        
        // Seed database if empty
        const { seedDatabase } = await import('./lib/seed');
        await seedDatabase();
      } catch (error: any) {
        console.error("Firestore Connection Failed:", {
          message: error?.message,
          code: error?.code,
          stack: error?.stack
        });

        let errorMessage = "خطأ في الاتصال بقاعدة البيانات.";
        if (error?.message) {
          errorMessage += ` التفاصيل: ${error.message}`;
        }
        if (error?.code) {
          errorMessage += ` (كود: ${error.code})`;
        }
        
        setFirebaseError(errorMessage);

        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration (Offline).");
        }
      }
    }
    testConnection();
  }, []);
  const [currentView, setCurrentView] = useState<'feed' | 'reels' | 'search' | 'messages' | 'profile' | 'settings' | 'calls'>('feed');
  const [navigationHistory, setNavigationHistory] = useState<any[]>([]);

  const pushToHistory = () => {
    setNavigationHistory(prev => [...prev, {
      currentView,
      viewedUserUid,
      selectedChat,
      activeStory,
      activeLiveRoom,
      activeCall,
      showFriendsMap
    }]);
  };

  const handleBack = () => {
    if (navigationHistory.length === 0) {
      // Fallback if history is empty
      if (viewedUserUid) setViewedUserUid(null);
      else if (selectedChat) setSelectedChat(null);
      else if (activeStory) setActiveStory(null);
      else if (activeLiveRoom) setActiveLiveRoom(null);
      else if (activeCall) setActiveCall(null);
      else if (showFriendsMap) setShowFriendsMap(false);
      else if (currentView !== 'feed') setCurrentView('feed');
      return;
    }
    const previousState = navigationHistory[navigationHistory.length - 1];
    setNavigationHistory(prev => prev.slice(0, -1));
    
    // Restore states without pushing to history again
    if (previousState.currentView !== undefined) setCurrentView(previousState.currentView);
    if (previousState.viewedUserUid !== undefined) setViewedUserUid(previousState.viewedUserUid);
    if (previousState.selectedChat !== undefined) setSelectedChat(previousState.selectedChat);
    if (previousState.activeStory !== undefined) setActiveStory(previousState.activeStory);
    if (previousState.activeLiveRoom !== undefined) setActiveLiveRoom(previousState.activeLiveRoom);
    if (previousState.activeCall !== undefined) setActiveCall(previousState.activeCall);
    if (previousState.showFriendsMap !== undefined) setShowFriendsMap(previousState.showFriendsMap);
  };

  const navigateTo = (updates: any) => {
    // Check if any significant state actually changes
    const isChange = 
      (updates.currentView !== undefined && updates.currentView !== currentView) ||
      (updates.viewedUserUid !== undefined && updates.viewedUserUid !== viewedUserUid) ||
      (updates.selectedChat !== undefined && updates.selectedChat !== selectedChat) ||
      (updates.activeStory !== undefined && updates.activeStory !== activeStory) ||
      (updates.activeLiveRoom !== undefined && updates.activeLiveRoom !== activeLiveRoom) ||
      (updates.activeCall !== undefined && updates.activeCall !== activeCall) ||
      (updates.showFriendsMap !== undefined && updates.showFriendsMap !== showFriendsMap);

    if (!isChange) return;

    pushToHistory();
    if (updates.currentView !== undefined) setCurrentView(updates.currentView);
    if (updates.viewedUserUid !== undefined) setViewedUserUid(updates.viewedUserUid);
    if (updates.selectedChat !== undefined) setSelectedChat(updates.selectedChat);
    if (updates.activeStory !== undefined) setActiveStory(updates.activeStory);
    if (updates.activeLiveRoom !== undefined) setActiveLiveRoom(updates.activeLiveRoom);
    if (updates.activeCall !== undefined) setActiveCall(updates.activeCall);
    if (updates.showFriendsMap !== undefined) setShowFriendsMap(updates.showFriendsMap);
  };
  const [callHistory, setCallHistory] = useState<Call[]>([]);

  const handleStartCall = async (targetUserId: string, type: 'voice' | 'video') => {
    if (!user || quotaExceeded) return;
    const targetUser = allUsers.find(u => u.uid === targetUserId);
    if (!targetUser) return;

    try {
      const callRef = doc(collection(db, 'calls'));
      const chatId = [user.uid, targetUserId].sort().join('_');
      const callData: Call = {
        id: callRef.id,
        callerId: user.uid,
        callerName: profile?.displayName || user.displayName || 'مستخدم',
        callerPhoto: profile?.photoURL || user.photoURL || '',
        receiverId: targetUserId,
        receiverName: targetUser.displayName || 'مستخدم',
        receiverPhoto: targetUser.photoURL || '',
        type,
        status: 'ringing',
        chatId,
        timestamp: serverTimestamp()
      };
      await setDoc(callRef, callData);
      setActiveCall(callData);
    } catch (err) {
      console.error("Error starting call:", err);
      handleFirestoreError(err, OperationType.WRITE, 'calls');
    }
  };
  const [loginMethod, setLoginMethod] = useState<'options' | 'email' | 'phone'>('options');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [feedTab, setFeedTab] = useState<'posts' | 'stories' | 'live'>('posts');
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'popular'>('all');
  const [profileTab, setProfileTab] = useState<'posts' | 'photos' | 'reels' | 'bookmarks' | 'friends'>('posts');
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [viewedUserFriends, setViewedUserFriends] = useState<UserProfile[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [isBookmarksLoading, setIsBookmarksLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [isCalculatingSuggestions, setIsCalculatingSuggestions] = useState(false);
  
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const allUsersMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    allUsers.forEach(u => {
      if (u.uid) map[u.uid] = u;
    });
    return map;
  }, [allUsers]);
  const [allChats, setAllChats] = useState<Chat[]>([]);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const filteredNotifications = useMemo(() => {
    if (!profile?.notificationSettings) return notifications;
    const settings = profile.notificationSettings;
    return notifications.filter(notif => {
      if (notif.type === 'like' && !settings.likes) return false;
      if (notif.type === 'comment' && !settings.comments) return false;
      if (notif.type === 'follow' && !settings.followers) return false;
      if (notif.type === 'live' && !settings.live) return false;
      if (notif.type === 'message' && !settings.messages) return false;
      return true;
    });
  }, [notifications, profile?.notificationSettings]);
  
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [liveSubscriptionIds, setLiveSubscriptionIds] = useState<Set<string>>(new Set());
  const [likedReelIds, setLikedReelIds] = useState<Set<string>>(new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(new Set());
  const [viewedReelIds, setViewedReelIds] = useState<Set<string>>(new Set());
  
  const [reportingContent, setReportingContent] = useState<{ id: string, type: string } | null>(null);
  const [blockingUser, setBlockingUser] = useState<{ id: string, name: string, photo: string } | null>(null);
  const [viewedUserUid, setViewedUserUid] = useState<string | null>(null);
  const [searchSort, setSearchSort] = useState<'relevance' | 'date' | 'popularity'>('relevance');
  const [searchFilter, setSearchFilter] = useState<'all' | 'users' | 'posts' | 'live'>('all');
  const [searchDateFilter, setSearchDateFilter] = useState<'any' | 'today' | 'week' | 'month'>('any');
  const [searchMediaType, setSearchMediaType] = useState<'all' | 'text' | 'image' | 'video'>('all');
  const [searchMinLikes, setSearchMinLikes] = useState(0);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isMessagesMenuOpen, setIsMessagesMenuOpen] = useState(false);
  const [isChatSearchVisible, setIsChatSearchVisible] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState<'all' | 'direct' | 'groups' | 'channels' | 'truth'>('all');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
  const [isCreateStickerPackModalOpen, setIsCreateStickerPackModalOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeLiveRoom, setActiveLiveRoom] = useState<LiveRoom | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [showFriendsMap, setShowFriendsMap] = useState(false);

  useEffect(() => {
    if (!user || !profile || quotaExceeded || !profile.locationEnabled) return;

    let watchId: number;

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Only update if it significantly changed to save quota
          const currentLat = profile.location?.lat;
          const currentLng = profile.location?.lng;
          const distance = currentLat ? Math.sqrt(Math.pow(latitude - currentLat, 2) + Math.pow(longitude - currentLng, 2)) : 1000;
          
          if (distance > 0.0001) { // roughly 10-20 meters
            updateDoc(doc(db, 'users', user.uid), {
              location: {
                lat: latitude,
                lng: longitude,
                lastUpdated: serverTimestamp()
              }
            }).catch(e => console.error("Error updating location:", e));
          }
        },
        (error) => {
          console.error("Error watching position:", error);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user?.uid, profile?.uid, quotaExceeded, profile?.locationEnabled, profile?.location]);

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [isUserPostsLoading, setIsUserPostsLoading] = useState(false);

  useEffect(() => {
    const targetUid = viewedUserUid || user?.uid;
    if (!targetUid || quotaExceeded) return;

    setIsUserPostsLoading(true);
    const q = query(
      collection(db, 'posts'), 
      where('authorId', '==', targetUid), 
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      docs.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setUserPosts(docs);
      setIsUserPostsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'posts');
      setIsUserPostsLoading(false);
    });

    const qr = query(
      collection(db, 'reels'),
      where('authorId', '==', targetUid),
      limit(50)
    );

    const unsubscribeReels = onSnapshot(qr, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Reel));
      docs.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setUserReels(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'reels');
    });

    return () => {
      unsubscribe();
      unsubscribeReels();
    };
  }, [viewedUserUid, user?.uid, quotaExceeded]);
  const [showStreamEndedMessage, setShowStreamEndedMessage] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhotoURL, setEditPhotoURL] = useState("");
  const [isUsernameTaken, setIsUsernameTaken] = useState(false);
  const [activeReelForComments, setActiveReelForComments] = useState<Reel | null>(null);
  const [activePostForComments, setActivePostForComments] = useState<any | null>(null);
  const [isCreateReelModalOpen, setIsCreateReelModalOpen] = useState(false);
  const [initialCreateType, setInitialCreateType] = useState<'post' | 'reel' | 'story'>('post');
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isStartLiveModalOpen, setIsStartLiveModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const messagesMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const [userListModal, setUserListModal] = useState<{ isOpen: boolean, title: string, users: any[] }>({ isOpen: false, title: "", users: [] });
  const [shareModal, setShareModal] = useState<{ isOpen: boolean, id: string, type: string } | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean,
    title: string,
    message: string,
    confirmText: string,
    cancelText: string,
    onConfirm: () => void,
    isDanger?: boolean,
    actionType?: 'delete_chat'
  } | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  const [storySearchQuery, setStorySearchQuery] = useState("");
  const [storyDateFilter, setStoryDateFilter] = useState("");
  const [selectedLiveCategory, setSelectedLiveCategory] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [inlinePostContent, setInlinePostContent] = useState("");
  const [isCreateAIImageModalOpen, setIsCreateAIImageModalOpen] = useState(false);
  const [isGeneratingAIImage, setIsGeneratingAIImage] = useState(false);
  const [generatedAIImage, setGeneratedAIImage] = useState<string | null>(null);
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiImageCaption, setAiImageCaption] = useState("");

  useEffect(() => {
    const checkUsername = async () => {
      if (!editUsername || editUsername === profile?.username) {
        setIsUsernameTaken(false);
        return;
      }

      try {
        const q = query(collection(db, 'users'), where('username', '==', editUsername));
        const querySnapshot = await getDocs(q);
        setIsUsernameTaken(!querySnapshot.empty);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [editUsername, profile?.username, quotaExceeded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (messagesMenuRef.current && !messagesMenuRef.current.contains(event.target as Node)) {
        setIsMessagesMenuOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Auth & Profile ---
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    console.log("Setting up onAuthStateChanged listener...");
    const timeout = setTimeout(() => {
      if (!isAuthReady) {
        console.warn("Auth initialization is taking longer than expected...");
        setFirebaseError("جاري التحميل... إذا استمر هذا طويلاً فقد يكون هناك مشكلة في الاتصال.");
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeout);
      console.log("Auth state changed:", u?.uid);
      setUser(u);
      setIsAuthReady(true);
      if (!u) {
        setProfile(null);
        setBlockedUserIds(new Set());
        setFollowingIds(new Set());
        setLiveSubscriptionIds(new Set());
        setBookmarkedPostIds(new Set());
        setLikedPostIds(new Set());
        setFriendIds(new Set());
        setFriendRequests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || quotaExceeded) return;

    // Fetch profile
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        // Create profile
        const newProfile: UserProfile = {
          uid: user.uid,
          username: user.email?.split('@')[0] || (user.phoneNumber ? `user_${user.phoneNumber.slice(-4)}` : `user_${user.uid.slice(0, 5)}`),
          displayName: user.displayName || (user.phoneNumber ? `مستخدم ${user.phoneNumber.slice(-4)}` : 'مستخدم جديد'),
          photoURL: user.photoURL || '',
          followersCount: 0,
          followingCount: 0,
          role: 'user',
          isVerified: false,
          createdAt: serverTimestamp()
        };
        setDoc(doc(db, 'users', user.uid), newProfile).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
        
        // Save private data
        setDoc(doc(db, 'users_private', user.uid), {
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          updatedAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users_private/${user.uid}`));
      }
      setIsProfileLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      setIsProfileLoading(false);
    });
    
    // Fetch blocked users
    const unsubBlocked = onSnapshot(query(collection(db, `users/${user.uid}/blockedUsers`), limit(100)), (snap) => {
      setBlockedUserIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/blockedUsers`));

    // Fetch following
    const unsubFollowing = onSnapshot(query(collection(db, `users/${user.uid}/following`), limit(100)), (snap) => {
      setFollowingIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/following`));

    // Fetch live subscriptions
    const unsubLiveSubs = onSnapshot(query(collection(db, `users/${user.uid}/live_subscriptions`), limit(100)), (snap) => {
      setLiveSubscriptionIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/live_subscriptions`));

    // Fetch liked reels
    const unsubLikedReels = onSnapshot(query(collection(db, `users/${user.uid}/reelLikes`), limit(50)), (snap) => {
      setLikedReelIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/reelLikes`));

    // Fetch liked posts
    const unsubLikedPosts = onSnapshot(query(collection(db, `users/${user.uid}/postLikes`), limit(50)), (snap) => {
      setLikedPostIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/postLikes`));

    // Fetch bookmarks
    const unsubBookmarks = onSnapshot(query(collection(db, `users/${user.uid}/bookmarks`), limit(50)), (snap) => {
      setBookmarkedPostIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/bookmarks`));

    // Fetch friends
    const unsubFriends = onSnapshot(query(collection(db, `users/${user.uid}/friends`), limit(100)), (snap) => {
      setFriendIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/friends`));

    // Fetch friend requests
    const unsubFriendRequests = onSnapshot(query(collection(db, `users/${user.uid}/friendRequests`), where('status', '==', 'pending'), limit(20)), (snap) => {
      setFriendRequests(snap.docs.map(d => ({ senderId: d.id, ...d.data() } as FriendRequest)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/friendRequests`));

    // Fetch viewed reels
    const unsubViewedReels = onSnapshot(query(collection(db, `users/${user.uid}/viewedReels`), limit(50)), (snap) => {
      setViewedReelIds(new Set(snap.docs.map(d => d.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/viewedReels`));

    // Fetch notifications
    const unsubNotifications = onSnapshot(query(collection(db, 'notifications'), where('recipientId', '==', user.uid), limit(50)), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      // Sort locally to avoid needing a composite index
      docs.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setNotifications(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    // Fetch call history
    const unsubOutgoing = onSnapshot(query(
      collection(db, 'calls'),
      where('callerId', '==', user.uid),
      limit(50)
    ), (snap) => {
      const outgoing = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
      setCallHistory(prev => {
        const incoming = prev.filter(c => c.receiverId === user.uid);
        const combined = [...outgoing, ...incoming].sort((a, b) => {
          const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return tB - tA;
        });
        return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'calls'));

    const unsubIncoming = onSnapshot(query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      limit(50)
    ), (snap) => {
      const incoming = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
      setCallHistory(prev => {
        const outgoing = prev.filter(c => c.callerId === user.uid);
        const combined = [...outgoing, ...incoming].sort((a, b) => {
          const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return tB - tA;
        });
        return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'calls'));

    // Fetch incoming calls
    const unsubCalls = onSnapshot(query(collection(db, 'calls'), where('receiverId', '==', user.uid), where('status', '==', 'ringing'), limit(1)), (snap) => {
      const ringingCall = snap.docs[0];
      if (ringingCall) {
        setActiveCall({ id: ringingCall.id, ...ringingCall.data() } as Call);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'calls'));

    return () => {
      unsubProfile();
      unsubBlocked();
      unsubFollowing();
      unsubLiveSubs();
      unsubLikedReels();
      unsubLikedPosts();
      unsubBookmarks();
      unsubFriends();
      unsubFriendRequests();
      unsubViewedReels();
      unsubNotifications();
      unsubOutgoing();
      unsubIncoming();
      unsubCalls();
    };
  }, [user?.uid, quotaExceeded]);

  // --- Room Invite Handling (Hash Based) ---
  useEffect(() => {
    if (!user || quotaExceeded || activeLiveRoom) return;
    
    // Check both search and hash for room ID
    const params = new URLSearchParams(window.location.search);
    let roomId = params.get('room');
    
    if (!roomId && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      roomId = hashParams.get('room');
    }
    
    if (roomId) {
      const joinRoom = async () => {
        try {
          const roomRef = doc(db, 'live_rooms', roomId);
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            setActiveLiveRoom({ id: roomSnap.id, ...roomSnap.data() } as LiveRoom);
            // We NO LONGER clear URL/Hash to avoid iframe reload/breakout issue
          }
        } catch (err) {
          console.error("Error joining room via invite:", err);
        }
      };
      joinRoom();
    }
  }, [user, quotaExceeded, activeLiveRoom]);

  // --- Data Fetching ---
  useEffect(() => {
    if (!user || quotaExceeded) return;

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20)), (snap) => {
      setAllPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'posts'));
    const unsubReels = onSnapshot(query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(10)), (snap) => {
      setReels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reel)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'reels'));
    const unsubStories = onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(20)), (snap) => {
      setStories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stories'));
    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(100)), (snap) => {
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    const unsubLiveRooms = onSnapshot(query(collection(db, 'live_rooms'), where('status', '==', 'active'), limit(50)), (snap) => {
      const allRooms = snap.docs.map(d => ({ id: d.id, ...d.data() } as LiveRoom));
      setLiveRooms(allRooms);
      
      setActiveLiveRoom(prev => {
        if (!prev) return null;
        const updated = allRooms.find(r => r.id === prev.id);
        if (!updated && prev.status === 'active') {
          if (prev.type !== 'group_call') {
            setShowStreamEndedMessage(true);
            setTimeout(() => setShowStreamEndedMessage(false), 3000);
          }
          return null;
        }
        return updated || null;
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'live_rooms'));

    const unsubChats = onSnapshot(query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), limit(50)), (snap) => {
      const docs = snap.docs.map(d => ({ chatId: d.id, ...d.data() } as Chat));
      docs.sort((a, b) => {
        const tA = a.lastUpdate?.toMillis ? a.lastUpdate.toMillis() : 0;
        const tB = b.lastUpdate?.toMillis ? b.lastUpdate.toMillis() : 0;
        return tB - tA;
      });
      setAllChats(docs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'chats'));

    const unsubStickers = onSnapshot(query(collection(db, 'sticker_packs'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
      setStickerPacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as StickerPack)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sticker_packs'));

    return () => {
      unsubPosts();
      unsubReels();
      unsubStories();
      unsubUsers();
      unsubLiveRooms();
      unsubChats();
      unsubStickers();
    };
  }, [user?.uid, quotaExceeded]);

  // --- Suggestions Logic ---
  useEffect(() => {
    if (!user || followingIds.size === 0 || quotaExceeded) return;

    const calculateSuggestions = async () => {
      setIsCalculatingSuggestions(true);
      try {
        const mutualCounts: { [uid: string]: number } = {};
        const friendsToProcess = Array.from(followingIds).slice(0, 15); // Limit to top 15 friends for performance

        const followingPromises = friendsToProcess.map(friendId => 
          getDocs(query(collection(db, `users/${friendId}/following`), limit(50)))
        );

        const snapshots = await Promise.all(followingPromises);
        
        snapshots.forEach(snap => {
          snap.docs.forEach(doc => {
            const fofId = doc.id;
            if (fofId !== user.uid && !followingIds.has(fofId)) {
              mutualCounts[fofId] = (mutualCounts[fofId] || 0) + 1;
            }
          });
        });

        // Sort by mutual count and get top 5
        const sortedUids = Object.entries(mutualCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([uid]) => uid);

        // Fetch profiles for these UIDs if not already in allUsers
        const suggestedProfiles: UserProfile[] = [];
        for (const uid of sortedUids) {
          const existing = allUsers.find(u => u.uid === uid);
          if (existing) {
            suggestedProfiles.push(existing);
          } else {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              suggestedProfiles.push(userSnap.data() as UserProfile);
            }
          }
        }

        setSuggestedUsers(suggestedProfiles);
      } catch (err) {
        console.error("Error calculating suggestions:", err);
      } finally {
        setIsCalculatingSuggestions(false);
      }
    };

    calculateSuggestions();
  }, [followingIds.size, user?.uid, quotaExceeded]);

  useEffect(() => {
    if (!user || profileTab !== 'friends' || !viewedUserUid || quotaExceeded) return;

    setIsFriendsLoading(true);
    const fetchFriends = async () => {
      try {
        const friendSnaps = await getDocs(query(collection(db, `users/${viewedUserUid}/friends`), limit(50)));
        const friendIds = friendSnaps.docs.map(d => d.id);
        
        if (friendIds.length === 0) {
          setViewedUserFriends([]);
          setIsFriendsLoading(false);
          return;
        }

        const profiles: UserProfile[] = [];
        for (let i = 0; i < friendIds.length; i += 10) {
          const chunk = friendIds.slice(i, i + 10);
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snap = await getDocs(q);
          profiles.push(...snap.docs.map(d => d.data() as UserProfile));
        }
        
        setViewedUserFriends(profiles);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `users/${viewedUserUid}/friends`);
      } finally {
        setIsFriendsLoading(false);
      }
    };

    fetchFriends();
  }, [viewedUserUid, profileTab, quotaExceeded]);

  useEffect(() => {
    if (!user || profileTab !== 'bookmarks' || quotaExceeded) return;

    setIsBookmarksLoading(true);
    const fetchBookmarks = async () => {
      try {
        const bookmarkSnaps = await getDocs(query(collection(db, `users/${user.uid}/bookmarks`), orderBy('bookmarkedAt', 'desc'), limit(50)));
        const postIds = bookmarkSnaps.docs.map(d => d.id);
        
        if (postIds.length === 0) {
          setBookmarkedPosts([]);
          setIsBookmarksLoading(false);
          return;
        }

        const posts: Post[] = [];
        for (let i = 0; i < postIds.length; i += 10) {
          const chunk = postIds.slice(i, i + 10);
          const q = query(collection(db, 'posts'), where('__name__', 'in', chunk));
          const snap = await getDocs(q);
          posts.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
        }
        
        const sortedPosts = posts.sort((a, b) => {
          const indexA = postIds.indexOf(a.id);
          const indexB = postIds.indexOf(b.id);
          return indexA - indexB;
        });

        setBookmarkedPosts(sortedPosts);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/bookmarks`);
      } finally {
        setIsBookmarksLoading(false);
      }
    };

    fetchBookmarks();
  }, [user?.uid, profileTab, quotaExceeded]);

  const handleLogin = async (providerName: 'google' | 'facebook' = 'google') => {
    setAuthError("");
    try {
      const provider = providerName === 'google' 
        ? new GoogleAuthProvider() 
        : new FacebookAuthProvider();
      const googleResult = await FirebaseAuthentication.signInWithGoogle();
    const googleCredential = GoogleAuthProvider.credential(googleResult.credential.idToken);
    await signInWithCredential(auth, googleCredential);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        const domainMsg = language === 'ar' 
          ? `نطاق غير مصرح به: يرجى إضافة النطاق التالي في إعدادات Firebase Authentication:\n${window.location.hostname}`
          : `Unauthorized domain: Please add this domain to your Firebase Authentication settings:\n${window.location.hostname}`;
        setAuthError(domainMsg);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        const emailMsg = language === 'ar'
          ? "يوجد حساب بالفعل بهذا البريد الإلكتروني ولكن مع مزود خدمة مختلف. يرجى تسجيل الدخول باستخدام المزود الصحيح."
          : "An account already exists with this email but with a different provider. Please login using the correct provider.";
        setAuthError(emailMsg);
      } else {
        setAuthError(err.message);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    // Client-side validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError("يرجى إدخال بريد إلكتروني صالح.");
      return;
    }
    if (password.length < 6) {
      setAuthError("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
      return;
    }

    setIsAuthLoading(true);
    try {
      if (isRegistering) {
    const userCred = await createUserWithEmailAndPassword(auth, email, password); await sendEmailVerification(userCred.user); await auth.signOut(); alert("تم إرسال رابط التأكيد. لن تتمكن من الدخول إلا بعد تفعيل الحساب من بريدك.");
      } else {
    const loginCred = await signInWithEmailAndPassword(auth, email, password); if (!loginCred.user.emailVerified) { await auth.signOut(); alert("عذراً، بريدك الإلكتروني غير مؤكد. يرجى الضغط على الرابط المرسل إليك أولاً."); return; }
      }
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError(`نطاق غير مصرح به: يرجى إضافة النطاق التالي في إعدادات Firebase Authentication:\n${window.location.hostname}`);
      } else {
        setAuthError(err.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);
    try {
      setupRecaptcha();
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError(`نطاق غير مصرح به: يرجى إضافة النطاق التالي في إعدادات Firebase Authentication:\n${window.location.hostname}`);
      } else {
        setAuthError(err.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setAuthError("");
    setIsAuthLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError(`نطاق غير مصرح به: يرجى إضافة النطاق التالي في إعدادات Firebase Authentication:\n${window.location.hostname}`);
      } else {
        setAuthError(err.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };
  const handleUpdateSettings = async (settings: any) => {
    if (!user || quotaExceeded) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationSettings: settings
      });
      setToast({ message: t.settingsSaved || (language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved'), type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleUpdateGlobalBackground = async (bg: string) => {
    if (!user || quotaExceeded) return;
    setGlobalBackground(bg);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        globalChatBackground: bg
      });
      setToast({ message: t.settingsSaved || (language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved'), type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleReelView = async (reelId: string) => {
    if (!user || viewedReelIds.has(reelId) || quotaExceeded) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/viewedReels`, reelId), {
        viewedAt: serverTimestamp()
      });
    } catch (err) {
      // Silent error for views, but still track if quota exceeded
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exhausted')) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/viewedReels/${reelId}`);
      }
    }
  };

  const handleLikeReel = async (reelId: string) => {
    if (!user || quotaExceeded) return;
    const isLiked = likedReelIds.has(reelId);
    const likeDocRef = doc(db, `users/${user.uid}/reelLikes`, reelId);
    const reelRef = doc(db, 'reels', reelId);

    try {
      if (isLiked) {
        await deleteDoc(likeDocRef);
        await updateDoc(reelRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeDocRef, { timestamp: serverTimestamp() });
        await updateDoc(reelRef, { likesCount: increment(1) });

        // Add notification
        const reel = reels.find(r => r.id === reelId);
        if (reel && reel.authorId !== user.uid) {
          const notificationRef = doc(collection(db, 'notifications'));
          await setDoc(notificationRef, {
            recipientId: reel.authorId,
            senderId: user.uid,
            senderName: profile?.displayName || 'مستخدم',
            senderPhoto: profile?.photoURL || '',
            type: 'like',
            text: 'أعجب بمقطع الريلز الخاص بك',
            read: false,
            timestamp: serverTimestamp(),
            linkId: reelId
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `reels/${reelId}/likes`);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user || quotaExceeded) return;
    const isLiked = likedPostIds.has(postId);
    const likeDocRef = doc(db, `users/${user.uid}/postLikes`, postId);
    const postRef = doc(db, 'posts', postId);

    try {
      if (isLiked) {
        await deleteDoc(likeDocRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeDocRef, { timestamp: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });

        // Add notification
        const post = allPosts.find(p => p.id === postId);
        if (post && post.authorId !== user.uid) {
          const notificationRef = doc(collection(db, 'notifications'));
          await setDoc(notificationRef, {
            recipientId: post.authorId,
            senderId: user.uid,
            senderName: profile?.displayName || 'مستخدم',
            senderPhoto: profile?.photoURL || '',
            type: 'like',
            text: 'أعجب بمنشورك',
            read: false,
            timestamp: serverTimestamp(),
            linkId: postId
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${postId}/likes`);
    }
  };

  const handleStartLive = async (title: string, quality: string, watchTogetherEnabled: boolean, placeholderUrl?: string, type: 'broadcast' | 'group_call' = 'broadcast', chatId?: string, guestPrivacy: 'public' | 'followers' | 'approved' = 'public', allowedGuests: string[] = []) => {
    if (!user || !profile || quotaExceeded) return;
    try {
      const collectionName = 'live_rooms';
      const roomId = `live-${Date.now()}`;
      const roomData: any = {
        roomId,
        id: roomId,
        hostId: user.uid,
        hostName: profile.displayName,
        hostPhoto: profile.photoURL,
        title,
        quality,
        watchTogetherEnabled,
        status: 'active',
        viewerCount: 0,
        startedAt: serverTimestamp(),
        placeholderUrl: placeholderUrl || null,
        isCameraOff: type === 'group_call' ? false : true,
        isHostMuted: type === 'group_call' ? false : true,
        type,
        chatId: chatId || null,
        guestPrivacy,
        allowedGuests,
        requestsEnabled: true,
        commentsEnabled: true
      };
      await setDoc(doc(db, collectionName, roomId), roomData);
      
      // Initial system message
      try {
        await addDoc(collection(db, `${collectionName}/${roomId}/chat`), {
          text: language === 'ar' ? 'بدأ البث المباشر! مرحباً بالجميع.' : 'Live stream started! Welcome everyone.',
          senderId: 'system',
          senderName: language === 'ar' ? 'نظام' : 'System',
          senderPhoto: '',
          timestamp: serverTimestamp(),
          type: 'system'
        });
      } catch (chatErr) {
        console.error("Error creating initial chat message:", chatErr);
        // We don't necessarily want to fail the whole room creation if just the chat message fails,
        // but for now let's at least log it specially.
        handleFirestoreError(chatErr, OperationType.CREATE, `${collectionName}/${roomId}/chat`);
      }

      setActiveLiveRoom({ id: roomId, ...roomData } as LiveRoom);
      setIsStartLiveModalOpen(false);

      // Notify followers and live subscribers
      try {
        const followersSnap = await getDocs(collection(db, `users/${user.uid}/followers`));
        const liveSubscribersSnap = await getDocs(collection(db, `users/${user.uid}/live_subscribers`));
        
        const recipientIds = new Set<string>();
        followersSnap.docs.forEach(d => recipientIds.add(d.id));
        liveSubscribersSnap.docs.forEach(d => recipientIds.add(d.id));

        const batch = writeBatch(db);
        recipientIds.forEach(recipientId => {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            recipientId,
            senderId: user.uid,
            senderName: profile.displayName,
            senderPhoto: profile.photoURL,
            type: 'live',
            text: language === 'ar' ? 'بدأ بثاً مباشراً الآن. انضم إليه!' : 'Started a live stream now. Join in!',
            read: false,
            timestamp: serverTimestamp(),
            linkId: roomId
          });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'notifications');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'live_rooms');
    }
  };

  const handleEndLive = async (roomId: string, type: 'broadcast' | 'group_call' = 'broadcast', skipConfirm = false) => {
    const endAction = async () => {
      const collectionName = 'live_rooms';
      try {
        await updateDoc(doc(db, collectionName, roomId), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
        
        // Notify via chat
        try {
          await addDoc(collection(db, `${collectionName}/${roomId}/chat`), {
            text: type === 'group_call' 
              ? (language === 'ar' ? 'تم إنهاء المكالمة الجماعية.' : 'Group call has ended.')
              : (language === 'ar' ? 'تم إنهاء البث المباشر. شكراً للمتابعة!' : 'Live stream has ended. Thanks for watching!'),
            senderId: 'system',
            senderName: language === 'ar' ? 'نظام' : 'System',
            senderPhoto: '',
            timestamp: serverTimestamp(),
            type: 'system'
          });
        } catch (msgErr) {
          console.warn("Failed to send system ending message:", msgErr);
        }

        setActiveLiveRoom(null);
      } catch (err) {
        console.error("Critical error during handleEndLive:", err);
        // Fallback to ensure UI closes even if DB fails
        setActiveLiveRoom(null);
      } finally {
        setConfirmationModal(null);
      }
    };

    if (skipConfirm) {
      await endAction();
      return;
    }

    const title = language === 'ar' ? 'إنهاء' : 'End';
    const message = type === 'group_call' 
      ? (language === 'ar' ? 'هل أنت متأكد من رغبتك في إنهاء المكالمة الجماعية؟' : 'Are you sure you want to end the group call?')
      : (language === 'ar' ? 'هل أنت متأكد من رغبتك في إنهاء البث المباشر الآن؟' : 'Are you sure you want to end the live stream now?');
    const confirmText = language === 'ar' ? 'إنهاء' : 'End';

    setConfirmationModal({
      isOpen: true,
      title: type === 'group_call' ? (language === 'ar' ? 'إنهاء المكالمة' : 'End Call') : (language === 'ar' ? 'إنهاء البث المباشر' : 'End Live Stream'),
      message: message,
      confirmText: confirmText,
      cancelText: t.cancel,
      isDanger: true,
      onConfirm: endAction
    });
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (quotaExceeded) return;
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      if (notif.type === 'live' && notif.linkId) {
        try {
          const roomSnap = await getDoc(doc(db, 'live_rooms', notif.linkId));

          if (roomSnap.exists() && roomSnap.data().status === 'active') {
            setActiveLiveRoom({ id: notif.linkId, ...roomSnap.data() } as LiveRoom);
          } else {
            console.warn('هذا البث انتهى بالفعل');
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `live_rooms/${notif.linkId}`);
        }
      } else if (notif.type === 'message' && notif.chatId) {
        try {
          const chatSnap = await getDoc(doc(db, 'chats', notif.chatId));
          if (chatSnap.exists()) {
            const chatData = { chatId: chatSnap.id, ...chatSnap.data() } as Chat;
            if (chatData.type === 'direct') {
              const otherUid = chatData.participants.find(p => p !== user.uid);
              const otherUser = allUsers.find(u => u.uid === otherUid);
              chatData.otherUser = otherUser;
            }
            setSelectedChat(chatData);
            setCurrentView('messages');
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `chats/${notif.chatId}`);
        }
      } else if (notif.type === 'follow') {
        setViewedUserUid(notif.senderId);
        setCurrentView('profile');
      } else if ((notif.type === 'like' || notif.type === 'comment') && notif.linkId) {
        const post = allPosts.find(p => p.id === notif.linkId);
        if (post) {
          setActivePostForComments({ ...post, postId: post.id });
        } else {
          const reel = reels.find(r => r.id === notif.linkId);
          if (reel) {
            setActiveReelForComments(reel);
          }
        }
      }
      setIsNotificationsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notif.id}`);
    }
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const addNewPost = async (content: string, mediaUrl: string = "", mediaType: 'text' | 'image' = 'text') => {
    if (!user || quotaExceeded) return;
    try {
      // برمجة ميزة النشر (Create Post Logic)
      await addDoc(collection(db, 'posts'), {
        content: content,
        timestamp: serverTimestamp(),
        authorName: profile?.displayName || user.displayName || "مستخدم TruCast", 
        likesCount: 0,
        // الحقول الإضافية المطلوبة لعمل التطبيق بشكل صحيح
        authorId: user.uid,
        authorPhoto: profile?.photoURL || user.photoURL || "",
        mediaUrl,
        mediaType,
        commentsCount: 0,
        sharesCount: 0,
        createdAt: serverTimestamp() // نكررها لضمان التوافق مع بقية الكود
      });

      // تجربة المستخدم (User Experience)
      setToast({ message: 'تم نشر المنشور بنجاح!', type: 'success' });
    } catch (err) {
      console.error("Error creating post:", safeJsonStringify(err));
      handleFirestoreError(err, OperationType.CREATE, 'posts');
      setToast({ message: 'فشل في نشر المنشور. حاول مرة أخرى.', type: 'error' });
    }
  };

  const handleCreateReel = async (caption: string, videoUrl: string, category: string = "عام") => {
    if (!user || !profile || quotaExceeded) return;
    try {
      await addDoc(collection(db, 'reels'), {
        userId: user.uid,
        username: profile.displayName,
        userPhoto: profile.photoURL,
        videoUrl,
        caption,
        category,
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reels');
    }
  };

  const handleUpdatePost = async (postId: string, content: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) return;
      
      const postData = postSnap.data();
      if (postData.authorId !== user?.uid) return;
      
      const likesCount = postData.likesCount || 0;
      const commentsCount = postData.commentsCount || 0;
      if (likesCount > 0 || commentsCount > 0) {
        setConfirmationModal({
          isOpen: true,
          title: t.unexpectedErrorTitle,
          message: t.editInteractionRestricted,
          confirmText: t.all,
          cancelText: t.cancel,
          onConfirm: () => setConfirmationModal(null)
        });
        return;
      }
      
      const createdAt = postData.createdAt;
      const postTime = createdAt?.toMillis ? createdAt.toMillis() : (createdAt?.seconds ? createdAt.seconds * 1000 : Date.now());
      const thirtyMinutes = 30 * 60 * 1000;
      if ((Date.now() - postTime) >= thirtyMinutes) {
        setConfirmationModal({
          isOpen: true,
          title: t.unexpectedErrorTitle,
          message: t.editTimeExpired,
          confirmText: t.all,
          cancelText: t.cancel,
          onConfirm: () => setConfirmationModal(null)
        });
        return;
      }

      await updateDoc(postRef, { content });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'حذف المنشور',
      message: 'هل أنت متأكد من رغبتك في حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'posts', postId));
          setConfirmationModal(null);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
        }
      }
    });
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user || quotaExceeded) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, `posts/${postId}/comments`, commentId));
      batch.update(doc(db, 'posts', postId), {
        commentsCount: increment(-1)
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
    }
  };

  const handleDeleteReelComment = async (reelId: string, commentId: string) => {
    if (!user || quotaExceeded) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, `reels/${reelId}/comments`, commentId));
      batch.update(doc(db, 'reels', reelId), {
        commentsCount: increment(-1)
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reels/${reelId}/comments/${commentId}`);
    }
  };

  const handleReportComment = (commentId: string) => {
    setReportingContent({ id: commentId, type: 'comment' });
  };

  const handleShareInReel = (comment: any) => {
    // Copy the comment text so the user can easily paste it as a caption in the reel
    navigator.clipboard.writeText(`"${comment.text}" - ${comment.authorName}`);
    setIsCreatePostModalOpen(true);
    // Visual feedback
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleDeleteAccount = async () => {
    if (!user || quotaExceeded) return;
    
    setConfirmationModal({
      isOpen: true,
      title: 'حذف الحساب نهائياً',
      message: 'هل أنت متأكد من رغبتك في حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع بياناتك ومنشوراتك.',
      confirmText: 'حذف الحساب',
      cancelText: 'إلغاء',
      isDanger: true,
      onConfirm: async () => {
        try {
          // Delete user documents
          await deleteDoc(doc(db, 'users', user.uid));
          await deleteDoc(doc(db, 'users_private', user.uid));
          await signOut(auth);
          setConfirmationModal(null);
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
        }
      }
    });
  };

  const handleBookmark = async (postId: string) => {
    if (!user || quotaExceeded) return;
    const bookmarkRef = doc(db, `users/${user.uid}/bookmarks`, postId);
    try {
      if (bookmarkedPostIds.has(postId)) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, {
          postId,
          bookmarkedAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/bookmarks/${postId}`);
    }
  };

  const handleRepost = async (postId: string) => {
    if (!user || !profile || quotaExceeded) return;
    const originalPost = allPosts.find(p => p.id === postId);
    if (!originalPost) return;

    try {
      const repostData = {
        postId: `post-${Date.now()}`,
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: originalPost.content,
        mediaUrl: originalPost.mediaUrl || null,
        mediaType: originalPost.mediaType || 'text',
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        originalPostId: postId,
        originalAuthorName: originalPost.authorName,
        originalAuthorPhoto: originalPost.authorPhoto,
        originalAuthorId: originalPost.authorId,
        createdAt: serverTimestamp(),
        type: 'repost'
      };
      await addDoc(collection(db, 'posts'), repostData);
      // Update original post repost count
      await updateDoc(doc(db, 'posts', postId), {
        repostsCount: increment(1)
      });
      setRepostedPostIds(prev => new Set([...prev, postId]));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    }
  };

  const handleShare = (id: string, type: string) => {
    if (type === 'repost') {
      handleRepost(id);
      return;
    }
    setShareModal({ isOpen: true, id, type });
  };

  const handleShareDM = async (chatId: string) => {
    if (!user || !shareModal || quotaExceeded) return;
    const { id, type } = shareModal;
    const url = `${window.location.origin}/#share/${type}/${id}`;
    const text = `${t.watchThis} ${type === 'post' ? t.post : type === 'reel' ? t.reel : t.liveStream}: ${url}`;

    try {
      const batch = writeBatch(db);
      const msgRef = doc(collection(db, `chats/${chatId}/messages`));
      batch.set(msgRef, {
        messageId: msgRef.id,
        senderId: user.uid,
        text: text,
        timestamp: serverTimestamp(),
        read: false,
        sharedContentId: id,
        sharedContentType: type
      });
      batch.update(doc(db, 'chats', chatId), {
        lastMessage: `${t.shared} ${type === 'post' ? t.post : t.reel}`,
        lastUpdate: serverTimestamp()
      });

      if (type === 'post') {
        batch.update(doc(db, 'posts', id), {
          sharesCount: increment(1)
        });
      }

      await batch.commit();
      setShareModal(null);
      alert(language === 'ar' ? 'تمت المشاركة بنجاح' : 'Shared successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  const handleBlock = async () => {
    if (!user || !profile || !blockingUser) return;
    try {
      const batch = writeBatch(db);
      const blockRef = doc(db, `users/${user.uid}/blockedUsers`, blockingUser.id);
      batch.set(blockRef, {
        uid: blockingUser.id,
        displayName: blockingUser.name,
        photoURL: blockingUser.photo,
        timestamp: serverTimestamp()
      });
      const followingRef = doc(db, `users/${user.uid}/following`, blockingUser.id);
      batch.delete(followingRef);
      const followerRef = doc(db, `users/${user.uid}/followers`, blockingUser.id);
      batch.delete(followerRef);

      // Create notification for the blocked user
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        id: notificationRef.id,
        recipientId: blockingUser.id,
        senderId: user.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        type: 'block',
        text: 'قام بحظرك',
        read: false,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      if (viewedUserUid === blockingUser.id) {
        setViewedUserUid(null);
        setCurrentView('feed');
      }
      setBlockingUser(null);
    } catch (error) {
      console.error("Error blocking:", error);
    }
  };

  const fetchFollowers = async (userId: string) => {
    try {
      const snap = await getDocs(collection(db, `users/${userId}/followers`));
      const users = snap.docs.map(d => d.data());
      setUserListModal({ isOpen: true, title: "المتابعون", users });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/followers`);
    }
  };

  const fetchFollowing = async (userId: string) => {
    try {
      const snap = await getDocs(collection(db, `users/${userId}/following`));
      const users = snap.docs.map(d => d.data());
      setUserListModal({ isOpen: true, title: "يتابع", users });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${userId}/following`);
    }
  };

  const handleFollow = async (targetUserId: string, targetUserName: string, targetUserPhoto: string) => {
    if (!user || !profile) return;
    try {
      const batch = writeBatch(db);
      
      // Add to current user's following
      const followingRef = doc(db, `users/${user.uid}/following`, targetUserId);
      batch.set(followingRef, {
        uid: targetUserId,
        displayName: targetUserName,
        photoURL: targetUserPhoto,
        timestamp: serverTimestamp()
      });
      
      // Add to target user's followers
      const followersRef = doc(db, `users/${targetUserId}/followers`, user.uid);
      batch.set(followersRef, {
        uid: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        timestamp: serverTimestamp()
      });

      // Add notification for the target user
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        recipientId: targetUserId,
        senderId: user.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        type: 'follow',
        text: 'بدأ بمتابعتك',
        read: false,
        timestamp: serverTimestamp()
      });
      
      // Increment following count for current user
      batch.update(doc(db, 'users', user.uid), {
        followingCount: increment(1)
      });
      
      // Increment followers count for target user
      batch.update(doc(db, 'users', targetUserId), {
        followersCount: increment(1)
      });
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/following/${targetUserId}`);
    }
  };

  const handleFriendRequest = async (targetUserId: string, targetUserName: string, targetUserPhoto: string) => {
    if (!user || !profile || quotaExceeded) return;
    try {
      const requestRef = doc(db, `users/${targetUserId}/friendRequests`, user.uid);
      await setDoc(requestRef, {
        senderId: user.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      // Notification
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        recipientId: targetUserId,
        senderId: user.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        type: 'friend_request',
        text: 'أرسل لك طلب صداقة',
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${targetUserId}/friendRequests/${user.uid}`);
    }
  };

  const handleAcceptFriend = async (targetUserId: string, targetUserName: string, targetUserPhoto: string) => {
    if (!user || !profile || quotaExceeded) return;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, `users/${user.uid}/friends`, targetUserId), {
        uid: targetUserId,
        displayName: targetUserName,
        photoURL: targetUserPhoto,
        timestamp: serverTimestamp()
      });
      batch.set(doc(db, `users/${targetUserId}/friends`, user.uid), {
        uid: user.uid,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        timestamp: serverTimestamp()
      });
      batch.update(doc(db, 'users', user.uid), { friendsCount: increment(1) });
      batch.update(doc(db, 'users', targetUserId), { friendsCount: increment(1) });
      batch.delete(doc(db, `users/${user.uid}/friendRequests`, targetUserId));
      
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        recipientId: targetUserId,
        senderId: user.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        type: 'friend_accept',
        text: 'قبل طلب الصداقة',
        read: false,
        timestamp: serverTimestamp()
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `friendship/${user.uid}`);
    }
  };

  const handleRemoveFriend = async (targetUserId: string) => {
    if (!user || quotaExceeded) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, `users/${user.uid}/friends`, targetUserId));
      batch.delete(doc(db, `users/${targetUserId}/friends`, user.uid));
      batch.update(doc(db, 'users', user.uid), { friendsCount: increment(-1) });
      batch.update(doc(db, 'users', targetUserId), { friendsCount: increment(-1) });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `friendship_remove/${user.uid}`);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Remove from current user's following
      batch.delete(doc(db, `users/${user.uid}/following`, targetUserId));
      
      // Remove from target user's followers
      batch.delete(doc(db, `users/${targetUserId}/followers`, user.uid));
      
      // Decrement following count for current user
      batch.update(doc(db, 'users', user.uid), {
        followingCount: increment(-1)
      });
      
      // Decrement followers count for target user
      batch.update(doc(db, 'users', targetUserId), {
        followersCount: increment(-1)
      });
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/following/${targetUserId}`);
    }
  };

  const handleToggleLiveSubscription = async (targetUserId: string) => {
    if (!user || quotaExceeded || !isAuthReady) return;

    try {
      const isSubscribed = liveSubscriptionIds.has(targetUserId);
      const subRef = doc(db, `users/${user.uid}/live_subscriptions`, targetUserId);
      const hostSubRef = doc(db, `users/${targetUserId}/live_subscribers`, user.uid);

      if (isSubscribed) {
        await deleteDoc(subRef);
        await deleteDoc(hostSubRef);
      } else {
        await setDoc(subRef, { timestamp: serverTimestamp() });
        await setDoc(hostSubRef, { 
          timestamp: serverTimestamp(),
          userId: user.uid,
          email: user.email || '',
          displayName: profile?.displayName || '',
          photoURL: profile?.photoURL || ''
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/live_subscriptions`);
    }
  };

  const startChat = async (targetUserId: string, targetUserName: string) => {
    if (!user || quotaExceeded) return;
    pushToHistory();
    
    // Check if chat already exists
    const chatId = [user.uid, targetUserId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    try {
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        try {
          await setDoc(chatRef, {
            chatId,
            participants: [user.uid, targetUserId],
            lastUpdate: serverTimestamp(),
            lastMessage: "",
            type: 'direct',
            lastRead: {
              [user.uid]: serverTimestamp()
            }
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
        }
      }
      
      const otherUser = allUsers.find(u => u.uid === targetUserId);
      setSelectedChat({
        chatId,
        participants: [user.uid, targetUserId],
        lastUpdate: null,
        lastMessage: "",
        type: 'direct',
        otherUser
      } as Chat);
      setCurrentView('messages');
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
    }
  };

  const handleCreateChannel = async (name: string, description: string) => {
    if (!user) return;
    const chatId = `channel_${Date.now()}`;
    try {
      await setDoc(doc(db, 'chats', chatId), {
        chatId,
        participants: [user.uid],
        channelName: name,
        channelDescription: description,
        type: 'channel',
        createdBy: user.uid,
        moderators: [],
        subscribersCount: 1,
        isVerified: false,
        permissions: {
          canToggleTruthMode: 'admins',
          canAddMembers: 'admins',
          canRemoveMembers: 'admins'
        },
        lastUpdate: serverTimestamp(),
        lastMessage: "تم إنشاء القناة"
      });
      setSelectedChat({
        chatId,
        participants: [user.uid],
        channelName: name,
        channelDescription: description,
        type: 'channel',
        createdBy: user.uid,
        moderators: [],
        subscribersCount: 1,
        isVerified: false,
        permissions: {
          canToggleTruthMode: 'admins',
          canAddMembers: 'admins',
          canRemoveMembers: 'admins'
        },
        lastUpdate: null,
        lastMessage: "تم إنشاء القناة"
      } as Chat);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
    }
  };

  const handleCreateStickerPack = async (name: string, stickers: Sticker[]) => {
    if (!user || quotaExceeded) return;
    try {
      const packRef = doc(collection(db, 'sticker_packs'));
      await setDoc(packRef, {
        id: packRef.id,
        name,
        authorId: user.uid,
        stickers,
        createdAt: serverTimestamp()
      });
      setIsCreateStickerPackModalOpen(false);
    } catch (err) {
      console.error("Error creating sticker pack:", err);
      handleFirestoreError(err, OperationType.CREATE, 'sticker_packs');
    }
  };

  const handleCreateGroup = async (name: string, participants: string[]) => {
    if (!user) return;
    const chatId = `group_${Date.now()}`;
    try {
      await setDoc(doc(db, 'chats', chatId), {
        chatId,
        participants,
        groupName: name,
        type: 'group',
        createdBy: user.uid,
        moderators: [],
        permissions: {
          canToggleTruthMode: 'admins',
          canAddMembers: 'admins',
          canRemoveMembers: 'admins'
        },
        lastUpdate: serverTimestamp(),
        lastMessage: `تم إنشاء المجموعة: ${name}`,
        lastRead: {
          [user.uid]: serverTimestamp()
        }
      });
      setCurrentView('messages');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
    }
  };

  const handleUpdateProfile = async (data: any) => {
    if (!user || quotaExceeded) return;
    
    // Validation
    if (data.username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(data.username)) {
        alert(t.usernameError);
        return;
      }
    }
    if (data.displayName && (data.displayName.trim().length === 0 || data.displayName.length > 100)) {
      alert(t.displayNameError);
      return;
    }
    if (data.bio && data.bio.length > 1000) {
      alert(t.bioError);
      return;
    }

    if (isUsernameTaken) {
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
      setIsEditingProfile(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleApplyForVerification = async () => {
    if (!user || !profile || quotaExceeded) return;
    if ((profile.followersCount || 0) < 500000) {
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        verificationStatus: 'pending'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleGenerateAIImage = async (prompt: string) => {
    if (!user || quotaExceeded) return;
    setIsGeneratingAIImage(true);
    setGeneratedAIImage(null);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: prompt }],
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64 = part.inlineData.data;
          setGeneratedAIImage(`data:image/png;base64,${base64}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        console.error("No image data found in AI response");
        alert("فشل إنشاء الصورة. يرجى المحاولة بوصف آخر.");
      }
    } catch (err) {
      console.error("AI Image generation error:", err);
      alert("حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة لاحقاً.");
    } finally {
      setIsGeneratingAIImage(false);
    }
  };

  const handleAdminVerify = async (uid: string) => {
    if (!user || user.email !== 'hsynalmhna@gmail.com') {
      console.error("Access denied: User is not an admin.");
      return;
    }
    setIsUpdatingProfile(true);
    try {
      console.log("Attempting to verify user:", uid);
      await updateDoc(doc(db, 'users', uid), {
        isVerified: true,
        verificationStatus: 'approved'
      });
      console.log("User verified successfully");
    } catch (err) {
      console.error("Error verifying user:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAdminUnverify = async (uid: string) => {
    if (!user || user.email !== 'hsynalmhna@gmail.com') {
      console.error("Access denied: User is not an admin.");
      return;
    }
    setIsUpdatingProfile(true);
    try {
      console.log("Attempting to unverify user:", uid);
      await updateDoc(doc(db, 'users', uid), {
        isVerified: false,
        verificationStatus: 'none'
      });
      console.log("User unverified successfully");
    } catch (err) {
      console.error("Error unverifying user:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedImage = await compressImage(file, 400, 400, 0.6);
      setEditPhotoURL(compressedImage);
    } catch (err) {
      console.error("Error compressing profile photo:", err);
    }
  };

  const handleReelComment = async (reelId: string, text: string, parentCommentId?: string) => {
    if (!user || !profile) return;
    
    // Safety check
    const moderation = await moderateMessage(text);
    if (!moderation.allowed) {
      alert(moderation.warning || t.messageBlocked);
      return;
    }

    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, `reels/${reelId}/comments`));
      batch.set(commentRef, {
        commentId: `comment-${Date.now()}`,
        reelId,
        parentId: parentCommentId || null,
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        text,
        createdAt: serverTimestamp()
      });
      batch.update(doc(db, 'reels', reelId), {
        commentsCount: increment(1)
      });

      // Add notification
      const reel = reels.find(r => r.id === reelId);
      if (reel && reel.authorId !== user.uid) {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          recipientId: reel.authorId,
          senderId: user.uid,
          senderName: profile.displayName,
          senderPhoto: profile.photoURL,
          type: 'comment',
          text: `علق على الريلز الخاص بك: ${text.slice(0, 30)}${text.length > 30 ? '...' : ''}`,
          read: false,
          timestamp: serverTimestamp(),
          linkId: reelId
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reels/${reelId}/comments`);
    }
  };

  const handlePostComment = async (postId: string, text: string, parentCommentId?: string) => {
    if (!user || !profile) return;
    
    // Safety check
    const moderation = await moderateMessage(text);
    if (!moderation.allowed) {
      alert(moderation.warning || t.messageBlocked);
      return;
    }

    try {
      const batch = writeBatch(db);
      const commentRef = doc(collection(db, `posts/${postId}/comments`));
      batch.set(commentRef, {
        commentId: `comment-${Date.now()}`,
        postId,
        parentId: parentCommentId || null,
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        text,
        createdAt: serverTimestamp()
      });
      batch.update(doc(db, 'posts', postId), {
        commentsCount: increment(1)
      });

      // Add notification
      const post = allPosts.find(p => p.id === postId);
      if (post && post.authorId !== user.uid) {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          recipientId: post.authorId,
          senderId: user.uid,
          senderName: profile.displayName,
          senderPhoto: profile.photoURL,
          type: 'comment',
          text: `علق على منشورك: ${text.slice(0, 30)}${text.length > 30 ? '...' : ''}`,
          read: false,
          timestamp: serverTimestamp(),
          linkId: postId
        });
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${postId}/comments`);
    }
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    const isVideo = file.type.startsWith('video');
    
    if (!isVideo) {
      try {
        const compressedImage = await compressImage(file, 1080, 1920, 0.7);
        await addDoc(collection(db, 'stories'), {
          userId: user.uid,
          username: profile.displayName,
          userPhoto: profile.photoURL,
          url: compressedImage,
          mediaUrl: compressedImage,
          type: 'image',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error compressing story image:", err);
      }
    } else {
      // Check file size (limit to 1MB for stories)
      if (file.size > 1024 * 1024) {
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await addDoc(collection(db, 'stories'), {
            userId: user.uid,
            username: profile.displayName,
            userPhoto: profile.photoURL,
            url: reader.result as string,
            mediaUrl: reader.result as string,
            type: 'video',
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'stories');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: any) => {
    handleStoryUpload(e);
  };

  const handleStoryReply = async (text: string) => {
    if (!activeStory || !user || !profile || quotaExceeded) return;
    
    const chatId = [user.uid, activeStory.userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    try {
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        try {
          await setDoc(chatRef, {
            chatId,
            participants: [user.uid, activeStory.userId],
            lastUpdate: serverTimestamp(),
            lastMessage: `${t.storyReply} ${text}`,
            type: 'direct'
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
        }
      }

      try {
        const batch = writeBatch(db);
        const msgRef = doc(collection(db, `chats/${chatId}/messages`));
        batch.set(msgRef, {
          messageId: msgRef.id,
          senderId: user.uid,
          text: text,
          storyId: activeStory.id,
          storyMediaUrl: activeStory.mediaUrl || activeStory.url,
          storyMediaType: activeStory.type || 'image',
          timestamp: serverTimestamp(),
          read: false
        });
        batch.update(chatRef, {
          lastMessage: `${t.storyReply} ${text}`,
          lastUpdate: serverTimestamp(),
          [`lastRead.${user.uid}`]: serverTimestamp()
        });
        await batch.commit();
        setActiveStory(null); // Close story after reply
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
    }
    
    setActiveStory(null);
  };

  // --- Filtered Data ---
  const filteredPosts = useMemo(() => {
    let filtered = allPosts.filter(post => !blockedUserIds.has(post.authorId));
    if (feedFilter === 'following') {
      filtered = filtered.filter(post => followingIds.has(post.authorId) || post.authorId === user?.uid);
    } else if (feedFilter === 'popular') {
      filtered = [...filtered].sort((a, b) => {
        const scoreA = (a.likesCount || 0) + (a.commentsCount || 0) * 2;
        const scoreB = (b.likesCount || 0) + (b.commentsCount || 0) * 2;
        return scoreB - scoreA;
      });
    }
    return filtered.map(post => ({
      ...post,
      isFollowing: followingIds.has(post.authorId)
    }));
  }, [allPosts, blockedUserIds, feedFilter, followingIds, user?.uid]);

  const computedUserPosts = useMemo(() => {
    return userPosts.map(post => ({
      ...post,
      isFollowing: followingIds.has(post.authorId)
    }));
  }, [userPosts, followingIds]);

  const computedBookmarkedPosts = useMemo(() => {
    return bookmarkedPosts.map(post => ({
      ...post,
      isFollowing: followingIds.has(post.authorId)
    }));
  }, [bookmarkedPosts, followingIds]);

  const filteredReels = useMemo(() => {
    const baseReels = reels.filter(reel => !blockedUserIds.has(reel.userId));
    
    // Recommendation Algorithm
    return [...baseReels].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // 1. Followed users get a boost
      if (followingIds.has(a.userId)) scoreA += 50;
      if (followingIds.has(b.userId)) scoreB += 50;

      // 2. Engagement boost
      scoreA += (a.likesCount || 0) + (a.commentsCount || 0);
      scoreB += (b.likesCount || 0) + (b.commentsCount || 0);

      // 3. Recency boost (within last 48h)
      const now = Date.now();
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : now;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : now;
      
      if (now - timeA < 48 * 60 * 60 * 1000) scoreA += 30;
      if (now - timeB < 48 * 60 * 60 * 1000) scoreB += 30;

      // 4. Penalty for already viewed (but still show if popular)
      if (viewedReelIds.has(a.id)) scoreA -= 40;
      if (viewedReelIds.has(b.id)) scoreB -= 40;

      return scoreB - scoreA;
    });
  }, [reels, blockedUserIds, followingIds, viewedReelIds]);
  const filteredStories = useMemo(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return stories.filter(story => {
      if (blockedUserIds.has(story.userId)) return false;
      const createdAt = story.createdAt?.toMillis ? story.createdAt.toMillis() : Date.now();
      return createdAt > twentyFourHoursAgo;
    });
  }, [stories, blockedUserIds]);

  const groupedStories = useMemo(() => {
    const groups: { [userId: string]: Story[] } = {};
    filteredStories.forEach(story => {
      if (!groups[story.userId]) groups[story.userId] = [];
      groups[story.userId].push(story);
    });
    Object.keys(groups).forEach(userId => {
      groups[userId].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    });
    return groups;
  }, [filteredStories]);

  const liveStories = useMemo(() => {
    return liveRooms
      .filter(room => room.status === 'active' && room.type === 'broadcast' && (room.hostId === user?.uid || followingIds.has(room.hostId)))
      .map(room => ({
        id: `live-${room.id}`,
        userId: room.hostId,
        username: room.hostName,
        userPhoto: room.hostPhoto,
        type: 'live',
        roomId: room.id,
        createdAt: room.startedAt
      } as Story));
  }, [liveRooms, user?.uid, followingIds]);

  const storiesToDisplay = useMemo(() => {
    const userIds = Object.keys(groupedStories).filter(uid => 
      uid === user?.uid || followingIds.has(uid)
    );
    const standardStories = userIds.map(uid => groupedStories[uid][0]);
    
    const combined = [...liveStories, ...standardStories];
    const unique: Story[] = [];
    const seen = new Set();
    combined.forEach(s => {
      if (!seen.has(s.userId)) {
        unique.push(s);
        seen.add(s.userId);
      }
    });
    return unique;
  }, [groupedStories, user?.uid, followingIds, liveStories]);

  const filteredUsers = useMemo(() => allUsers.filter(u => !blockedUserIds.has(u.uid)), [allUsers, blockedUserIds]);
  
  const trendingPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => b.likesCount - a.likesCount).slice(0, 5);
  }, [filteredPosts]);

  const chatsWithProfiles = useMemo(() => {
    return allChats.map(chat => {
      const otherUserId = chat.participants.find(id => id !== user?.uid);
      const otherUser = allUsers.find(u => u.uid === otherUserId);
      return { ...chat, otherUser };
    });
  }, [allChats, allUsers, user?.uid]);

  const activeChat = useMemo(() => {
    if (!selectedChat) return null;
    return chatsWithProfiles.find(c => c.chatId === selectedChat.chatId) || selectedChat;
  }, [selectedChat, chatsWithProfiles]);

  const popularUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0)).slice(0, 5);
  }, [filteredUsers]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    if (!query) return { users: [], posts: [], live: [] };

    let users = searchFilter === 'all' || searchFilter === 'users' ? filteredUsers.filter(u => 
      (u.displayName || '').toLowerCase().includes(query) || 
      (u.username || '').toLowerCase().includes(query) ||
      (u.bio || '').toLowerCase().includes(query)
    ) : [];
    let posts = searchFilter === 'all' || searchFilter === 'posts' ? filteredPosts.filter(p => {
      const matchesQuery = (p.content || '').toLowerCase().includes(query) || (p.authorName || '').toLowerCase().includes(query);
      if (!matchesQuery) return false;

      // Date Filter
      if (searchDateFilter !== 'any') {
        const postDate = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
        const now = new Date();
        if (searchDateFilter === 'today') {
          if (postDate.toDateString() !== now.toDateString()) return false;
        } else if (searchDateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (postDate < weekAgo) return false;
        } else if (searchDateFilter === 'month') {
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          if (postDate < monthAgo) return false;
        }
      }

      // Media Type Filter
      if (searchMediaType !== 'all') {
        if (searchMediaType === 'text' && p.mediaType !== 'text') return false;
        if (searchMediaType === 'image' && p.mediaType !== 'image') return false;
        if (searchMediaType === 'video' && p.mediaType !== 'video') return false;
      }

      // Min Likes Filter
      if (p.likesCount < searchMinLikes) return false;

      return true;
    }) : [];
    let live = searchFilter === 'all' || searchFilter === 'live' ? filteredStories.filter(s => 
      s.type === 'live' && ((s.username || '').toLowerCase().includes(query) || (s.category || '').toLowerCase().includes(query))
    ) : [];

    // Sorting
    if (searchSort === 'date') {
      posts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } else if (searchSort === 'popularity') {
      users.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
      posts.sort((a, b) => b.likesCount - a.likesCount);
    }

    return { users, posts, live };
  }, [debouncedSearchQuery, filteredUsers, filteredPosts, filteredStories, searchSort, searchFilter, searchDateFilter, searchMediaType, searchMinLikes]);

  const filteredChats = useMemo(() => {
    const query = chatSearchQuery.toLowerCase().trim();
    return allChats.filter(chat => {
      // Category filter
      if (activeChatTab !== 'all') {
        if (activeChatTab === 'direct' && chat.type !== 'direct') return false;
        if (activeChatTab === 'groups' && chat.type !== 'group') return false;
        if (activeChatTab === 'channels' && chat.type !== 'channel') return false;
        if (activeChatTab === 'truth' && !chat.truthMode?.active) return false;
      }

      // Filter blocked users for 1-on-1 chats
      if (chat.type === 'direct') {
        const otherParticipant = chat.participants.find(p => p !== user?.uid);
        if (otherParticipant && blockedUserIds.has(otherParticipant)) return false;
      }

      if (!query) return true;

      if (chat.type === 'group') {
        return chat.groupName?.toLowerCase().includes(query);
      } else if (chat.type === 'channel') {
        return chat.channelName?.toLowerCase().includes(query);
      } else {
        const otherUserId = chat.participants.find(id => id !== user?.uid);
        const otherUser = allUsers.find(u => u.uid === otherUserId);
        return otherUser?.displayName.toLowerCase().includes(query) || 
               otherUser?.username?.toLowerCase().includes(query);
      }
    });
  }, [allChats, blockedUserIds, user, chatSearchQuery, allUsers, activeChatTab]);

  if (firebaseError) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.connectionError}</h2>
            <p className="text-gray-500 dark:text-gray-400">{firebaseError}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
          >
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 dark:border-gray-800 rounded-full animate-pulse" />
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin absolute inset-0" />
          </div>
          <p className="text-gray-400 font-medium animate-pulse">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TruCast</h1>
          <p className="text-gray-500 mb-8">{t.authSubtitle}</p>

          <div id="recaptcha-container"></div>

          {authError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs mb-4 text-right">
              {authError}
            </div>
          )}

          {loginMethod === 'options' ? (
            <div className="space-y-3">
              <button 
                onClick={() => handleLogin('google')}
                className="w-full py-4 bg-white border border-gray-100 hover:bg-gray-50 text-gray-700 font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
                {t.googleLogin}
              </button>
              
              <button 
                onClick={() => handleLogin('facebook')}
                className="w-full py-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <div className="bg-white rounded-full p-0.5">
                  <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                {t.facebookLogin}
              </button>

              <button 
                onClick={() => setLoginMethod('email')}
                className="w-full py-4 bg-gray-900 dark:bg-black hover:bg-gray-800 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <MessageSquare className="w-5 h-5 text-blue-400" />
                {t.loginWithEmail || (language === 'ar' ? "تسجيل الدخول بالبريد الإلكتروني" : "Login with Email")}
              </button>
            </div>
          ) : loginMethod === 'email' ? (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className={language === 'en' ? 'text-left' : 'text-right'}>
                <label className="text-xs text-gray-400 mb-1 block">{t.email}</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none ${language === 'en' ? 'text-left' : 'text-right'}`}
                  required
                />
              </div>
              <div className={language === 'en' ? 'text-left' : 'text-right'}>
                <label className="text-xs text-gray-400 mb-1 block">{t.password}</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none ${language === 'en' ? 'text-left' : 'text-right'}`}
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20"
              >
                {isAuthLoading ? t.loading : isRegistering ? t.signUp : t.login}
              </button>
              <div className="flex flex-col gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {isRegistering ? t.haveAccount : t.noAccount}
                </button>
                <button 
                  type="button"
                  onClick={() => setLoginMethod('options')}
                  className="text-xs text-gray-400 hover:underline"
                >
                  {t.backToOptions}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">{t.authMethodUnavailable}</p>
              <button 
                onClick={() => setLoginMethod('options')}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all"
              >
                {t.backToOptions}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-300" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 h-16 flex items-center justify-between px-6 transition-all duration-300">
        <div className="flex items-center gap-3">
          {navigationHistory.length > 0 && (
            <button 
              id="global-back-button"
              onClick={handleBack} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95 text-blue-600"
            >
              <ArrowRight className={`w-6 h-6 ${language === 'en' ? 'rotate-180' : ''}`} />
            </button>
          )}
          <h1 className="text-2xl font-display font-black tracking-tighter text-blue-600 drop-shadow-sm">TruCast</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsNotificationsModalOpen(true)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl relative transition-all active:scale-95 group">
            <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors" />
            {filteredNotifications.some(n => !n.read) && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
            )}
          </button>
          <button onClick={() => setCurrentView('calls')} className={`p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl relative transition-all active:scale-95 group ${currentView === 'calls' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <Phone className={`w-6 h-6 ${currentView === 'calls' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'} group-hover:text-blue-600 transition-colors`} />
          </button>
          <button onClick={() => setCurrentView('messages')} className={`p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl relative transition-all active:scale-95 group ${currentView === 'messages' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <MessageCircle className={`w-6 h-6 ${currentView === 'messages' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'} group-hover:text-blue-600 transition-colors`} />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900" />
          </button>
          <button onClick={() => setCurrentView('profile')} className="p-0.5 border-2 border-transparent hover:border-blue-500 rounded-full transition-all active:scale-95">
            <img 
              src={profile?.photoURL || `https://picsum.photos/seed/${user.uid}/100`} 
              className="w-9 h-9 rounded-full object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto h-[calc(100vh-3.5rem-4rem)] overflow-hidden">
        {currentView === 'feed' ? (
          <div className="h-full overflow-y-auto no-scrollbar">
            {/* Story Tray at Top */}
            <section className="bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2 px-1">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <label className="relative cursor-pointer group">
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleStoryUpload} />
                    <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 group-hover:scale-105 transition-transform duration-300">
                      <img 
                        src={profile?.photoURL || `https://picsum.photos/seed/${user.uid}/100`} 
                        className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-900"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1.5 border-2 border-white dark:border-gray-900 shadow-lg">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </label>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{t.yourStory}</span>
                </div>

                {storiesToDisplay
                  .map((story) => (
                    <div key={story.id} onClick={() => story.type === 'live' ? setActiveLiveRoom(liveRooms.find(r => r.id === story.roomId)!) : setActiveStory(story)} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
                      <div className={`w-16 h-16 rounded-full p-0.5 ${story.type === 'live' ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-tr from-blue-600 to-purple-500'} group-hover:scale-105 transition-transform duration-300 relative`}>
                        <img 
                          src={allUsers.find(u => u.uid === story.userId)?.photoURL || story.userPhoto || `https://picsum.photos/seed/${story.userId}/100`} 
                          className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-900"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        {story.type === 'live' && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[7px] font-black px-1 rounded border border-white dark:border-gray-900 uppercase">
                            {language === 'ar' ? 'مباشر' : 'LIVE'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 justify-center w-16">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate group-hover:text-blue-600 transition-colors">{story.username}</span>
                        {allUsers.find(u => u.uid === story.userId)?.isVerified && <VerifiedBadge className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                  ))
                }
              </div>
            </section>

            {/* Feed Tabs */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 flex p-2 gap-2 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
              <button 
                onClick={() => setFeedTab('posts')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all relative ${feedTab === 'posts' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {t.postsTab}
              </button>
              <button 
                onClick={() => setFeedTab('stories')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all relative ${feedTab === 'stories' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {t.storiesTab}
              </button>
              <button 
                onClick={() => setFeedTab('live')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all relative ${feedTab === 'live' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {t.liveTab}
              </button>
            </div>

            {feedTab === 'stories' && (
              <section className="bg-white dark:bg-gray-900 p-6 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative flex-1">
                    <Search className={`absolute ${language === 'en' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                    <input 
                      type="text" 
                      value={storySearchQuery}
                      onChange={(e) => setStorySearchQuery(e.target.value)}
                      placeholder={t.searchStories}
                      className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl ${language === 'en' ? 'pl-10 pr-4' : 'pr-10 pl-4'} py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all`}
                    />
                  </div>
                  <div className="relative">
                    <Calendar className={`absolute ${language === 'en' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
                    <input 
                      type="date" 
                      value={storyDateFilter}
                      onChange={(e) => setStoryDateFilter(e.target.value)}
                      className={`bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl ${language === 'en' ? 'pl-10 pr-4' : 'pr-10 pl-4'} py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all`}
                    />
                  </div>
                </div>
                
                <p className="text-[10px] text-gray-400 font-bold px-1 mt-4">{t.allStories || (language === 'ar' ? 'جميع القصص' : 'All Stories')}</p>
              </section>
            )}

            {feedTab === 'live' && (
              <section className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {[t.all, t.entertainment, t.gaming, t.sports, t.education].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedLiveCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedLiveCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setIsStartLiveModalOpen(true)}
                    className="flex-shrink-0 p-2.5 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {liveRooms.filter(r => r.type !== 'group_call').length > 0 ? (
                    liveRooms.filter(r => r.type !== 'group_call').map((room) => (
                      <div 
                        key={room.id} 
                        onClick={() => setActiveLiveRoom(room)}
                        className="relative aspect-[9/16] rounded-[2rem] overflow-hidden cursor-pointer group shadow-xl border border-gray-100 dark:border-gray-800"
                      >
                        <img 
                          src={room.thumbnailUrl || `https://picsum.photos/seed/${room.id}/400/700`} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                          <div className="bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black flex items-center gap-2 shadow-xl shadow-red-500/20 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            LIVE
                          </div>
                          {room.isSharingScreen && (
                            <div className="bg-orange-600 text-white text-[8px] px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow-lg shadow-orange-500/20">
                              <Monitor className="w-2.5 h-2.5" />
                              {t.shareScreen}
                            </div>
                          )}
                        </div>

                        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold">
                          <Eye className="w-3 h-3" />
                          {room.viewerCount || 0}
                        </div>

                        <div className={`absolute bottom-5 left-4 right-4 ${language === 'en' ? 'text-left' : 'text-right'}`} dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
                          <h4 className="text-white font-display font-bold text-sm mb-2 line-clamp-2 leading-tight drop-shadow-md">{room.title}</h4>
                          <div className="flex items-center gap-2">
                            <img 
                              src={allUsers.find(u => u.uid === room.hostId)?.photoURL || room.hostPhoto || `https://picsum.photos/seed/${room.hostId}/100`} 
                              className="w-7 h-7 rounded-full border-2 border-white/30 object-cover shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <p className="text-white/90 text-[10px] font-bold truncate drop-shadow-sm">{room.hostName}</p>
                          </div>
                          <div className="mt-3">
                            <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-md text-[8px] text-white font-black uppercase tracking-wider border border-white/5">
                              {room.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-20 text-center">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Video className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t.noLiveRooms}</p>
                      <button 
                        onClick={() => setIsStartLiveModalOpen(true)}
                        className="mt-4 text-blue-600 font-bold text-sm"
                      >
                        {t.startFirstLive}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {feedTab === 'posts' && (
              <div className="space-y-4 p-4">
                {/* Inline Post Creation Tool */}
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-5 border border-gray-100 dark:border-gray-800 shadow-sm mb-6 transition-all duration-300">
                  <div className="flex gap-4">
                    <img 
                      src={profile?.photoURL || `https://picsum.photos/seed/${user?.uid}/100`} 
                      className="w-12 h-12 rounded-2xl object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <textarea 
                        value={inlinePostContent}
                        onChange={(e) => setInlinePostContent(e.target.value)}
                        placeholder={t.whatsOnYourMind}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none h-24 dark:text-white placeholder-gray-400 font-medium"
                      />
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setIsCreatePostModalOpen(true)}
                            className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all group"
                            title={t.publishImageGallery}
                          >
                            <Image className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                          <button 
                            onClick={() => setIsCreateAIImageModalOpen(true)}
                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all group"
                            title={t.createAIImage}
                          >
                            <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                          <button 
                            onClick={() => setIsCreateReelModalOpen(true)}
                            className="p-2.5 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl transition-all group"
                          >
                            <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                        <button 
                          onClick={() => {
                            if (inlinePostContent.trim()) {
                              addNewPost(inlinePostContent);
                              setInlinePostContent("");
                            }
                          }}
                          disabled={!inlinePostContent.trim()}
                          className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                        >
                          {t.publish}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feed Filter */}
                <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                  <button 
                    onClick={() => setFeedFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${feedFilter === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'}`}
                  >
                    لك
                  </button>
                  <button 
                    onClick={() => setFeedFilter('following')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${feedFilter === 'following' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'}`}
                  >
                    أتابعهم
                  </button>
                  <button 
                    onClick={() => setFeedFilter('popular')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${feedFilter === 'popular' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'}`}
                  >
                    الأكثر رواجاً
                  </button>
                </div>

                {filteredPosts.map(post => (
                  <Post 
                    key={post.id}
                    postId={post.id}
                    authorId={post.authorId}
                    authorName={allUsersMap[post.authorId]?.displayName || post.authorName}
                    authorPhoto={allUsersMap[post.authorId]?.photoURL || post.authorPhoto}
                    isVerified={allUsersMap[post.authorId]?.isVerified}
                    content={post.content}
                    mediaUrl={post.mediaUrl}
                    likesCount={post.likesCount}
                    commentsCount={post.commentsCount}
                    repostsCount={post.repostsCount}
                    sharesCount={post.sharesCount}
                    createdAt={post.createdAt}
                    isFollowing={post.isFollowing}
                    isLiked={likedPostIds.has(post.id)}
                    isBookmarked={bookmarkedPostIds.has(post.id)}
                    isReposted={repostedPostIds.has(post.id)}
                    type={post.type}
                    originalPostId={post.originalPostId}
                    originalAuthorName={post.originalAuthorName}
                    originalAuthorPhoto={post.originalAuthorPhoto}
                    originalAuthorId={post.originalAuthorId}
                    currentUserId={user?.uid}
                    onLike={() => handleLikePost(post.id)}
                    onBookmark={() => handleBookmark(post.id)}
                    onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                    onUnfollow={() => handleUnfollow(post.authorId)}
                    onMessageClick={() => startChat(post.authorId, post.authorName)}
                    onProfileClick={(uid: string) => {
                      setViewedUserUid(uid);
                      setCurrentView('profile');
                    }}
                    onUpdate={handleUpdatePost}
                    onReport={(id: string, type: string) => setReportingContent({ id, type })}
                    onShare={handleShare}
                    onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                    onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                    userRole={profile?.role}
                    onDelete={handleDeletePost}
                    t={t}
                    language={language}
                  />
                ))}
              </div>
            )}
          </div>
        ) : currentView === 'reels' ? (
          <div className="h-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar">
            {filteredReels.length > 0 ? (
              filteredReels.map(reel => (
                <div key={reel.id} className="h-full w-full snap-start snap-always">
                  <Reel 
                    reel={reel}
                    isVerified={allUsersMap[reel.userId]?.isVerified}
                    userPhoto={allUsersMap[reel.userId]?.photoURL || reel.userPhoto}
                    isLiked={likedReelIds.has(reel.id)}
                    onLike={() => handleLikeReel(reel.id)}
                    onComment={() => setActiveReelForComments(reel)}
                    onShare={() => handleShare(reel.id, 'reel')}
                    onProfileClick={(uid) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                    onReport={(id, type) => setReportingContent({ id, type })}
                    onView={() => handleReelView(reel.id)}
                    t={t}
                    language={language}
                  />
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-white">
                <p>{t.noReels}</p>
              </div>
            )}
          </div>
        ) : currentView === 'search' ? (
          <div className="h-full p-4 overflow-y-auto no-scrollbar">
            <div className="space-y-4 mb-6">
              <div className="relative">
                <Search className={`absolute ${language === 'en' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-gray-400`} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className={`w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl py-4 ${language === 'en' ? 'pl-12 pr-6' : 'pr-12 pl-6'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white`}
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {(['all', 'users', 'posts', 'live'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSearchFilter(filter)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      searchFilter === filter 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 hover:border-blue-200'
                    }`}
                  >
                    {filter === 'all' ? t.all : filter === 'users' ? t.users : filter === 'posts' ? t.posts : t.live}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pb-2">
                <span className="text-[10px] font-bold text-gray-400">{t.sortBy}</span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {(['relevance', 'date', 'popularity'] as const).map(sort => (
                    <button
                      key={sort}
                      onClick={() => setSearchSort(sort)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${
                        searchSort === sort 
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {sort === 'relevance' ? t.relevance : sort === 'date' ? t.newest : t.popularity}
                    </button>
                  ))}
                </div>
              </div>

              {(searchFilter === 'all' || searchFilter === 'posts') && (
                <div className="space-y-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      {t.filterBy}
                    </span>
                    <button 
                      onClick={() => {
                        setSearchDateFilter('any');
                        setSearchMediaType('all');
                        setSearchMinLikes(0);
                      }}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      {t.reset}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold px-1">{t.date}</label>
                      <select 
                        value={searchDateFilter}
                        onChange={(e: any) => setSearchDateFilter(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="any">{t.anyTime}</option>
                        <option value="today">{t.today}</option>
                        <option value="week">{t.thisWeek}</option>
                        <option value="month">{t.thisMonth}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold px-1">{t.mediaType}</label>
                      <select 
                        value={searchMediaType}
                        onChange={(e: any) => setSearchMediaType(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="all">{t.all}</option>
                        <option value="text">{t.textOnly}</option>
                        <option value="image">{t.images}</option>
                        <option value="video">{t.videos}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold px-1">{t.minLikes}: {searchMinLikes}</label>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={searchMinLikes}
                        onChange={(e) => setSearchMinLikes(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {searchQuery.trim() ? (
              <div className="space-y-8">
                {/* Users Results */}
                {searchResults.users.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-gray-400 mb-4 px-2">{t.users}</h3>
                    <div className="space-y-3">
                      {searchResults.users.map(u => (
                        <div 
                          key={u.uid} 
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewedUserUid(u.uid); setCurrentView('profile'); }}>
                            <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="font-bold text-gray-900 dark:text-white leading-none">{u.displayName}</p>
                                {u.isVerified && <VerifiedBadge className="w-3 h-3" />}
                              </div>
                              <p className="text-[10px] text-gray-400 mb-1">@{u.username}</p>
                              <p className="text-xs text-gray-500 truncate w-40">{u.bio || t.noDescription}</p>
                            </div>
                          </div>
                          {u.uid !== user?.uid && (
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                followingIds.has(u.uid) ? handleUnfollow(u.uid) : handleFollow(u.uid, u.displayName, u.photoURL);
                              }}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                followingIds.has(u.uid)
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                              }`}
                            >
                              {followingIds.has(u.uid) ? t.unfollow : t.follow}
                            </motion.button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Live Stream Results */}
                {searchResults.live.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-gray-400 mb-4 px-2">{t.live}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {searchResults.live.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => setActiveLiveRoom({ id: s.roomId!, hostName: s.username })}
                          className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group"
                        >
                          <img src={s.mediaUrl || s.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">LIVE</div>
                          <div className="absolute bottom-2 right-2 left-2">
                            <p className="text-white text-[10px] font-bold truncate">{s.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Posts Results */}
                {searchResults.posts.length > 0 && (
                  <section>
                    <h3 className="text-sm font-bold text-gray-400 mb-4 px-2">{t.posts}</h3>
                    <div className="space-y-4">
                      {searchResults.posts.map(post => (
                        <Post 
                          key={post.id}
                          postId={post.id}
                          authorId={post.authorId}
                          authorName={allUsers.find(u => u.uid === post.authorId)?.displayName || post.authorName}
                          authorPhoto={allUsers.find(u => u.uid === post.authorId)?.photoURL || post.authorPhoto}
                          isVerified={allUsers.find(u => u.uid === post.authorId)?.isVerified}
                          content={post.content}
                          mediaUrl={post.mediaUrl}
                          likesCount={post.likesCount}
                          commentsCount={post.commentsCount}
                          repostsCount={post.repostsCount}
                          sharesCount={post.sharesCount}
                          createdAt={post.createdAt}
                          isFollowing={followingIds.has(post.authorId)}
                          isLiked={likedPostIds.has(post.id)}
                          isReposted={repostedPostIds.has(post.id)}
                          type={post.type}
                          originalPostId={post.originalPostId}
                          originalAuthorName={post.originalAuthorName}
                          originalAuthorPhoto={post.originalAuthorPhoto}
                          originalAuthorId={post.originalAuthorId}
                          currentUserId={user?.uid}
                          onLike={() => handleLikePost(post.id)}
                          onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                          onUnfollow={() => handleUnfollow(post.authorId)}
                          onProfileClick={(uid: string) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                          onReport={(id: string, type: string) => setReportingContent({ id, type })}
                          onShare={handleShare}
                          onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                          onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                          userRole={profile?.role}
                          onDelete={handleDeletePost}
                          language={language}
                          t={t}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {searchResults.users.length === 0 && searchResults.posts.length === 0 && searchResults.live.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500">{t.noResultsFor} "{searchQuery}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Suggested Users (Mutual Friends) */}
                {suggestedUsers.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        {t.suggestedForYou}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {suggestedUsers.map(u => (
                        <div 
                          key={u.uid} 
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setViewedUserUid(u.uid); setCurrentView('profile'); }}>
                            <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="font-bold text-gray-900 dark:text-white">{u.displayName}</p>
                                {u.isVerified && <VerifiedBadge className="w-3 h-3" />}
                              </div>
                              <p className="text-[10px] text-gray-500">{t.followedByPeopleYouFollow}</p>
                            </div>
                          </div>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleFollow(u.uid, u.displayName, u.photoURL)}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                          >
                            {t.follow}
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        ) : currentView === 'profile' ? (
          <div className="h-full overflow-y-auto no-scrollbar" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
            <div className="min-h-full bg-white dark:bg-gray-900 transition-colors duration-300 relative">
              {/* Profile Header Background */}
              <div className="h-32 bg-gradient-to-l from-blue-600 to-indigo-700 relative">
                <div className="absolute inset-0 bg-black/10" />
              </div>

              <div className="px-6 -mt-12 relative z-10">
                {(isProfileLoading || isUpdatingProfile) && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                      <p className="text-sm font-bold text-blue-600 animate-pulse">{t.loading}</p>
                    </div>
                  </div>
                )}

                {viewedUserUid && viewedUserUid !== user?.uid ? (
                  // Other User Profile View
                  (() => {
                    const viewedUser = allUsers.find(u => u.uid === viewedUserUid);
                    if (!viewedUser) return (
                      <div className="pt-20 text-center">
                        <p className="text-gray-500">{t.userNotFound}</p>
                        <button onClick={() => setViewedUserUid(null)} className="mt-4 text-blue-600 font-bold">{t.back}</button>
                      </div>
                    );
                    const isFollowing = followingIds.has(viewedUserUid);

                    return (
                      <>
                        <div className="flex justify-between items-end mb-4">
                          <div className="relative">
                            <img 
                              src={viewedUser.photoURL || `https://picsum.photos/seed/${viewedUser.uid}/200`} 
                              className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-gray-900 shadow-xl"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex gap-2 mb-2">
                            <button 
                              onClick={() => setShowProfileMenu(!showProfileMenu)}
                              className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-gray-200 transition-all"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                            <button onClick={handleBack} className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-gray-200 transition-all">
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className={`${language === 'en' ? 'text-left' : 'text-right'} space-y-1`}>
                          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                            {viewedUser.displayName}
                            {viewedUser.isVerified && <VerifiedBadge className="w-5 h-5" />}
                          </h2>
                          {viewedUser.username && <p className="text-blue-600 font-bold text-sm">@{viewedUser.username}</p>}
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pt-2">{viewedUser.bio || 'لا يوجد وصف'}</p>
                        </div>
                        
                        <div className="flex gap-8 py-6 my-4 border-y border-gray-50 dark:border-gray-800/50">
                          <div className="cursor-pointer group" onClick={() => fetchFollowers(viewedUser.uid)}>
                            <p className="font-black text-xl text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{viewedUser.followersCount || 0}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">متابع</p>
                          </div>
                          <div className="cursor-pointer group" onClick={() => fetchFollowing(viewedUser.uid)}>
                            <p className="font-black text-xl text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{viewedUser.followingCount || 0}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">يتابع</p>
                          </div>
                          <div className="cursor-pointer group" onClick={() => setProfileTab('friends')}>
                            <p className="font-black text-xl text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{viewedUser.friendsCount || 0}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">صديق</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-8">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => isFollowing ? handleUnfollow(viewedUserUid) : handleFollow(viewedUserUid, viewedUser.displayName, viewedUser.photoURL)}
                            className={`flex-1 min-w-[120px] py-3.5 font-bold rounded-2xl transition-all shadow-lg ${
                              isFollowing 
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 shadow-none' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25'
                            }`}
                          >
                            {isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                          </motion.button>
                          
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (friendIds.has(viewedUserUid!)) {
                                handleRemoveFriend(viewedUserUid!);
                              } else {
                                handleFriendRequest(viewedUserUid!, viewedUser.displayName, viewedUser.photoURL);
                              }
                            }}
                            className={`flex-1 min-w-[120px] py-3.5 font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                              friendIds.has(viewedUserUid!)
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700'
                            }`}
                          >
                            {friendIds.has(viewedUserUid!) ? (
                              <>
                                <Users className="w-4 h-4" />
                                <span>أصدقاء</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                <span>إضافة صديق</span>
                              </>
                            )}
                          </motion.button>

                          <button 
                            onClick={() => startChat(viewedUserUid!, viewedUser.displayName)}
                            className="flex-1 min-w-[120px] py-3.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-5 h-5" />
                            رسالة
                          </button>
                        </div>

                        <div className="space-y-4 pb-20">
                          {/* Profile Tabs */}
                          <div className="flex border-b border-gray-100 dark:border-gray-800">
                            <button 
                              onClick={() => setProfileTab('posts')}
                              className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'posts' ? 'text-blue-600' : 'text-gray-400'}`}
                            >
                              <LayoutGrid className="w-4 h-4" />
                              <span>{t.postsTab}</span>
                              {profileTab === 'posts' && <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                            </button>
                            <button 
                              onClick={() => setProfileTab('photos')}
                              className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'photos' ? 'text-blue-600' : 'text-gray-400'}`}
                            >
                              <Image className="w-4 h-4" />
                              <span>{t.photosTab}</span>
                              {profileTab === 'photos' && <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                            </button>
                            <button 
                              onClick={() => setProfileTab('reels')}
                              className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'reels' ? 'text-blue-600' : 'text-gray-400'}`}
                            >
                              <Play className="w-4 h-4" />
                              <span>{t.reelsTab}</span>
                              {profileTab === 'reels' && <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                            </button>
                            <button 
                              onClick={() => setProfileTab('friends')}
                              className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'friends' ? 'text-blue-600' : 'text-gray-400'}`}
                            >
                              <Users className="w-4 h-4" />
                              <span>{t.friendsTab}</span>
                              {profileTab === 'friends' && <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                            </button>
                          </div>
                          
                          {isUserPostsLoading ? (
                            <div className="grid grid-cols-3 gap-1">
                              {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                              ))}
                            </div>
                          ) : (
                            <div className={profileTab === 'reels' ? "grid grid-cols-3 gap-1" : "space-y-4"}>
                              {profileTab === 'posts' && userPosts.map(post => (
                                <Post 
                                  key={post.id}
                                  postId={post.id}
                                  authorId={post.authorId}
                                  authorName={allUsers.find(u => u.uid === post.authorId)?.displayName || post.authorName}
                                  authorPhoto={allUsers.find(u => u.uid === post.authorId)?.photoURL || post.authorPhoto}
                                  isVerified={allUsers.find(u => u.uid === post.authorId)?.isVerified}
                                  content={post.content}
                                  mediaUrl={post.mediaUrl}
                                  likesCount={post.likesCount}
                                  commentsCount={post.commentsCount}
                                  repostsCount={post.repostsCount}
                                  sharesCount={post.sharesCount}
                                  createdAt={post.createdAt}
                                  isFollowing={followingIds.has(post.authorId)}
                                  isLiked={likedPostIds.has(post.id)}
                                  isBookmarked={bookmarkedPostIds.has(post.id)}
                                  isReposted={repostedPostIds.has(post.id)}
                                  type={post.type}
                                  originalPostId={post.originalPostId}
                                  originalAuthorName={post.originalAuthorName}
                                  originalAuthorPhoto={post.originalAuthorPhoto}
                                  originalAuthorId={post.originalAuthorId}
                                  currentUserId={user?.uid}
                                  userRole={profile?.role}
                                  onLike={() => handleLikePost(post.id)}
                                  onBookmark={() => handleBookmark(post.id)}
                                  onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                                  onUnfollow={() => handleUnfollow(post.authorId)}
                                  onMessageClick={() => startChat(post.authorId, post.authorName)}
                                  onProfileClick={(uid: string) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                                  onUpdate={(content: string) => handleUpdatePost(post.id, content)}
                                  onReport={(id: string, type: string) => setReportingContent({ id, type })}
                                  onShare={(id: string, type: string) => handleShare(id, type)}
                                  onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                                  onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                                  onDelete={() => handleDeletePost(post.id)}
                                  t={t}
                                  language={language}
                                />
                              ))}
                              {profileTab === 'photos' && userPosts.filter(p => p.mediaUrl).map(post => (
                                <Post 
                                  key={post.id}
                                  postId={post.id}
                                  authorId={post.authorId}
                                  authorName={allUsers.find(u => u.uid === post.authorId)?.displayName || post.authorName}
                                  authorPhoto={allUsers.find(u => u.uid === post.authorId)?.photoURL || post.authorPhoto}
                                  isVerified={allUsers.find(u => u.uid === post.authorId)?.isVerified}
                                  content={post.content}
                                  mediaUrl={post.mediaUrl}
                                  likesCount={post.likesCount}
                                  commentsCount={post.commentsCount}
                                  repostsCount={post.repostsCount}
                                  sharesCount={post.sharesCount}
                                  createdAt={post.createdAt}
                                  isFollowing={followingIds.has(post.authorId)}
                                  isLiked={likedPostIds.has(post.id)}
                                  isBookmarked={bookmarkedPostIds.has(post.id)}
                                  isReposted={repostedPostIds.has(post.id)}
                                  type={post.type}
                                  originalPostId={post.originalPostId}
                                  originalAuthorName={post.originalAuthorName}
                                  originalAuthorPhoto={post.originalAuthorPhoto}
                                  originalAuthorId={post.originalAuthorId}
                                  currentUserId={user?.uid}
                                  userRole={profile?.role}
                                  onLike={() => handleLikePost(post.id)}
                                  onBookmark={() => handleBookmark(post.id)}
                                  onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                                  onUnfollow={() => handleUnfollow(post.authorId)}
                                  onMessageClick={() => startChat(post.authorId, post.authorName)}
                                  onProfileClick={(uid: string) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                                  onUpdate={(content: string) => handleUpdatePost(post.id, content)}
                                  onReport={(id: string, type: string) => setReportingContent({ id, type })}
                                  onShare={(id: string, type: string) => handleShare(id, type)}
                                  onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                                  onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                                  onDelete={() => handleDeletePost(post.id)}
                                  t={t}
                                  language={language}
                                />
                              ))}
                              {profileTab === 'reels' && userReels.map(reel => (
                                <div key={reel.id} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all group relative">
                                  <video src={reel.videoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" muted />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold">
                                    <div className="flex items-center gap-1"><Play className="w-3 h-3 fill-white" /> {reel.viewsCount || 0}</div>
                                  </div>
                                </div>
                              ))}
                              {profileTab === 'friends' && (
                                <div className="space-y-6 col-span-3">
                                  {/* Map Controls */}
                                  <div className="flex flex-col gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center justify-between">
                                      <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-500" />
                                        {t.friendsMap}
                                      </h3>
                                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl shadow-inner">
                                        <button 
                                          onClick={() => setShowFriendsMap(false)}
                                          className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${!showFriendsMap ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          {t.listView}
                                        </button>
                                        <button 
                                          onClick={() => setShowFriendsMap(true)}
                                          className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${showFriendsMap ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                          {t.mapView}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {showFriendsMap ? (
                                    <FriendsMap 
                                      friends={viewedUserFriends}
                                      currentUserLocation={profile?.location}
                                      onProfileClick={(uid) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                                      t={t}
                                      language={language}
                                    />
                                  ) : (
                                    <section>
                                      <h3 className="text-xs font-black text-gray-400 mb-3 px-2 flex items-center gap-2">
                                        <Users className="w-3 h-3" />
                                        {t.friendsList}
                                      </h3>
                                      <div className="space-y-3">
                                        {isFriendsLoading ? (
                                          [1,2,3].map(i => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl animate-pulse">
                                              <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                              </div>
                                            </div>
                                          ))
                                        ) : viewedUserFriends.length > 0 ? (
                                          [...viewedUserFriends]
                                            .sort((a, b) => (b.location ? 1 : 0) - (a.location ? 1 : 0))
                                            .map(friend => (
                                              <div key={friend.uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group">
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewedUserUid(friend.uid)}>
                                                  <div className="relative">
                                                    <img src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.uid}`} className="w-12 h-12 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
                                                    {friend.location && (
                                                      <div className="absolute -bottom-1 -right-1 p-1 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
                                                        <MapPin className="w-2 h-2 text-white" />
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div>
                                                    <div className="flex items-center gap-1">
                                                      <p className="font-bold text-gray-900 dark:text-white leading-none">{friend.displayName}</p>
                                                      {friend.isVerified && <VerifiedBadge className="w-3 h-3" />}
                                                    </div>
                                                    {friend.username && <p className="text-[10px] text-blue-600 font-bold mt-1">@{friend.username}</p>}
                                                  </div>
                                                </div>
                                                <div className="flex gap-2">
                                                  <button 
                                                    onClick={() => startChat(friend.uid, friend.displayName)}
                                                    className="p-2 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 rounded-xl hover:shadow-md transition-all"
                                                  >
                                                    <MessageCircle className="w-5 h-5" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                        ) : (
                                          <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
                                            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-400 font-medium">{t.noFriendsYet}</p>
                                          </div>
                                        )}
                                      </div>
                                    </section>
                                  )}
                                </div>
                              )}

                              {profileTab === 'bookmarks' && (
                                isBookmarksLoading ? (
                                  <div className="col-span-3 grid grid-cols-3 gap-1">
                                    {[1,2,3].map(i => (
                                      <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="col-span-3 space-y-4">
                                  {computedBookmarkedPosts.map(post => (
                                    <Post 
                                      key={post.id}
                                      postId={post.id}
                                      authorId={post.authorId}
                                      authorName={allUsers.find(u => u.uid === post.authorId)?.displayName || post.authorName}
                                      authorPhoto={allUsers.find(u => u.uid === post.authorId)?.photoURL || post.authorPhoto}
                                      isVerified={allUsers.find(u => u.uid === post.authorId)?.isVerified}
                                      content={post.content}
                                      mediaUrl={post.mediaUrl}
                                      likesCount={post.likesCount}
                                      commentsCount={post.commentsCount}
                                      repostsCount={post.repostsCount}
                                      sharesCount={post.sharesCount}
                                      createdAt={post.createdAt}
                                      isFollowing={post.isFollowing}
                                        isReposted={repostedPostIds.has(post.id)}
                                        type={post.type}
                                        originalPostId={post.originalPostId}
                                        originalAuthorName={post.originalAuthorName}
                                        originalAuthorPhoto={post.originalAuthorPhoto}
                                        originalAuthorId={post.originalAuthorId}
                                        currentUserId={user?.uid}
                                        userRole={profile?.role}
                                        onLike={() => handleLikePost(post.id)}
                                        onBookmark={() => handleBookmark(post.id)}
                                        onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                                        onUnfollow={() => handleUnfollow(post.authorId)}
                                        onMessageClick={() => startChat(post.authorId, post.authorName)}
                                        onProfileClick={(uid: string) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                                        onUpdate={(content: string) => handleUpdatePost(post.id, content)}
                                        onReport={(id: string, type: string) => setReportingContent({ id, type })}
                                        onShare={(id: string, type: string) => handleShare(id, type)}
                                        onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                                        onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                                        onDelete={() => handleDeletePost(post.id)}
                                        t={t}
                                        language={language}
                                      />
                                    ))}
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {((profileTab === 'posts' && userPosts.length === 0) || 
                            (profileTab === 'photos' && userPosts.filter(p => p.mediaUrl).length === 0) || 
                            (profileTab === 'reels' && userReels.length === 0)) && !isUserPostsLoading && (
                            <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
                              <p className="text-sm text-gray-400 font-medium">{t.noData}</p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()
                ) : isEditingProfile ? (
                  <div className={`space-y-6 ${language === 'en' ? 'text-left' : 'text-right'} pb-24`}>
                    <div className={`flex items-center justify-between mb-2 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
                      <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        {language === 'en' ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                      </button>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">{t.editProfileTitle}</h3>
                      <div className="w-10" />
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        <img 
                          src={editPhotoURL || `https://picsum.photos/seed/${user.uid}/200`} 
                          className="w-28 h-28 rounded-[36px] object-cover border-4 border-white dark:border-gray-900 shadow-2xl group-hover:opacity-90 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                        <label className={`absolute -bottom-2 ${language === 'en' ? '-left-2' : '-right-2'} p-3 bg-blue-600 text-white rounded-2xl border-4 border-white dark:border-gray-900 shadow-xl cursor-pointer hover:scale-110 transition-transform active:scale-95`}>
                          <Camera className="w-5 h-5" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className={`text-xs font-black text-gray-400 ${language === 'en' ? 'ml-2' : 'mr-2'}`}>{t.usernameLabel}</label>
                        <div className="relative">
                          <span className={`absolute ${language === 'en' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-gray-400 font-bold`}>@</span>
                          <input 
                            type="text" 
                            value={editUsername}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                              if (val.length <= 30) setEditUsername(val);
                            }}
                            className={`w-full bg-gray-50 dark:bg-gray-800 border-2 ${
                              editUsername.length > 0 && (editUsername.length < 3 || editUsername.length > 30)
                                ? 'border-red-500' 
                                : 'border-transparent focus:border-blue-500/30'
                            } rounded-2xl py-4 ${language === 'en' ? 'pl-10 pr-6' : 'pr-10 pl-6'} text-sm font-bold focus:outline-none transition-all`}
                          />
                        </div>
                        {isUsernameTaken && <p className={`text-red-500 text-[10px] ${language === 'en' ? 'ml-2' : 'mr-2'} font-bold`}>{t.usernameTaken}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className={`text-xs font-black text-gray-400 ${language === 'en' ? 'ml-2' : 'mr-2'}`}>{t.displayNameLabel}</label>
                        <input 
                          type="text" 
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className={`flex justify-between items-center ${language === 'en' ? 'flex-row-reverse' : ''} px-2`}>
                          <label className="text-xs font-black text-gray-400">{t.bioLabel}</label>
                          <span className="text-[10px] font-bold text-gray-400">{editBio.length}/1000</span>
                        </div>
                        <textarea 
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          className="w-full h-32 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl py-4 px-6 text-sm font-medium focus:outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleUpdateProfile({ 
                          displayName: editDisplayName, 
                          username: editUsername,
                          bio: editBio, 
                          photoURL: editPhotoURL 
                        })}
                        disabled={isUpdatingProfile || isUsernameTaken || editUsername.length < 3}
                        className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/25 disabled:opacity-50"
                      >
                        {isUpdatingProfile ? t.saving : t.saveChanges}
                      </motion.button>
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-4">
                      <div className="relative group">
                        <img 
                          src={profile?.photoURL || `https://picsum.photos/seed/${user.uid}/200`} 
                          className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-gray-900 shadow-xl"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => {
                            setEditDisplayName(profile?.displayName || "");
                            setEditUsername(profile?.username || "");
                            setEditBio(profile?.bio || "");
                            setEditPhotoURL(profile?.photoURL || "");
                            setIsEditingProfile(true);
                          }}
                          className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 text-white rounded-xl border-4 border-white dark:border-gray-900 shadow-lg hover:scale-110 transition-transform"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <button 
                          onClick={() => navigateTo({ currentView: 'settings' })}
                          className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl hover:bg-gray-200 transition-all"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                        {profile?.displayName}
                        {profile?.isVerified && <VerifiedBadge className="w-5 h-5" />}
                      </h2>
                      {profile?.username && <p className="text-blue-600 font-bold text-sm">@{profile.username}</p>}
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pt-2">{profile?.bio || t.noDescription}</p>
                    </div>
                    
                    <div className="flex gap-8 py-6 my-4 border-y border-gray-50 dark:border-gray-800/50">
                      <div className="cursor-pointer group" onClick={() => fetchFollowers(user.uid)}>
                        <p className="font-black text-xl text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{profile?.followersCount || 0}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.followers}</p>
                      </div>
                      <div className="cursor-pointer group" onClick={() => fetchFollowing(user.uid)}>
                        <p className="font-black text-xl text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{profile?.followingCount || 0}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.following}</p>
                      </div>
                      <div className="cursor-pointer group" onClick={() => setProfileTab('friends')}>
                        <p className="font-black text-xl text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{profile?.friendsCount || 0}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">صديق</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <button 
                        onClick={() => {
                          setEditDisplayName(profile?.displayName || "");
                          setEditUsername(profile?.username || "");
                          setEditBio(profile?.bio || "");
                          setEditPhotoURL(profile?.photoURL || "");
                          setIsEditingProfile(true);
                        }}
                        className="w-full py-3.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Edit className="w-5 h-5" />
                        {t.editProfile}
                      </button>

                      {user?.email === 'hsynalmhna@gmail.com' && (
                        <button 
                          onClick={() => profile?.isVerified ? handleAdminUnverify(user.uid) : handleAdminVerify(user.uid)}
                          className={`w-full py-4 font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                            profile?.isVerified 
                              ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/25' 
                              : 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/25'
                          }`}
                        >
                          <ShieldCheck className="w-5 h-5" />
                          {profile?.isVerified ? t.unverifyAdmin : t.verifyAdmin}
                        </button>
                      )}
                    </div>

                    <div className="space-y-4 pb-24">
                      {/* Profile Tabs */}
                      <div className="flex border-b border-gray-100 dark:border-gray-800">
                        <button 
                          onClick={() => setProfileTab('posts')}
                          className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'posts' ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          <span>{t.postsTab}</span>
                          {profileTab === 'posts' && <motion.div layoutId="profileTabOwn" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                        <button 
                          onClick={() => setProfileTab('friends')}
                          className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'friends' ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                          <Users className="w-4 h-4" />
                          <span>الأصدقاء</span>
                          {friendRequests.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                          )}
                          {profileTab === 'friends' && <motion.div layoutId="profileTabOwn" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                        <button 
                          onClick={() => setProfileTab('photos')}
                          className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'photos' ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                          <Image className="w-4 h-4" />
                          <span>{t.photosTab}</span>
                          {profileTab === 'photos' && <motion.div layoutId="profileTabOwn" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                        <button 
                          onClick={() => setProfileTab('reels')}
                          className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'reels' ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                          <Play className="w-4 h-4" />
                          <span>{t.reelsTab}</span>
                          {profileTab === 'reels' && <motion.div layoutId="profileTabOwn" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                        <button 
                          onClick={() => setProfileTab('bookmarks')}
                          className={`flex-1 py-3 text-sm font-black transition-all relative flex items-center justify-center gap-2 ${profileTab === 'bookmarks' ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                          <Bookmark className="w-4 h-4" />
                          <span>{t.bookmarksTab}</span>
                          {profileTab === 'bookmarks' && <motion.div layoutId="profileTabOwn" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                      </div>
                      
                      {isUserPostsLoading ? (
                        <div className="grid grid-cols-3 gap-1">
                          {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className={profileTab === 'reels' ? "grid grid-cols-3 gap-1" : "space-y-4"}>
                          {profileTab === 'posts' && computedUserPosts.map(post => (
                            <Post 
                              key={post.id}
                              postId={post.id}
                              authorId={post.authorId}
                              authorName={allUsers.find(u => u.uid === post.authorId)?.displayName || post.authorName}
                              authorPhoto={allUsers.find(u => u.uid === post.authorId)?.photoURL || post.authorPhoto}
                              isVerified={allUsers.find(u => u.uid === post.authorId)?.isVerified}
                              content={post.content}
                              mediaUrl={post.mediaUrl}
                              likesCount={post.likesCount}
                              commentsCount={post.commentsCount}
                              repostsCount={post.repostsCount}
                              sharesCount={post.sharesCount}
                              createdAt={post.createdAt}
                              isFollowing={post.isFollowing}
                              isLiked={likedPostIds.has(post.id)}
                              isBookmarked={bookmarkedPostIds.has(post.id)}
                              isReposted={repostedPostIds.has(post.id)}
                              type={post.type}
                              originalPostId={post.originalPostId}
                              originalAuthorName={post.originalAuthorName}
                              originalAuthorPhoto={post.originalAuthorPhoto}
                              originalAuthorId={post.originalAuthorId}
                              currentUserId={user?.uid}
                              userRole={profile?.role}
                              onLike={() => handleLikePost(post.id)}
                              onBookmark={() => handleBookmark(post.id)}
                              onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                              onUnfollow={() => handleUnfollow(post.authorId)}
                              onMessageClick={() => startChat(post.authorId, post.authorName)}
                              onProfileClick={(uid: string) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                              onUpdate={(content: string) => handleUpdatePost(post.id, content)}
                              onReport={(id: string, type: string) => setReportingContent({ id, type })}
                              onShare={(id: string, type: string) => handleShare(id, type)}
                              onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                              onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                              onDelete={() => handleDeletePost(post.id)}
                              t={t}
                              language={language}
                            />
                          ))}
                          {profileTab === 'photos' && computedUserPosts.filter(p => p.mediaUrl).map(post => (
                            <Post 
                              key={post.id}
                              postId={post.id}
                              authorId={post.authorId}
                              authorName={allUsers.find(u => u.uid === post.authorId)?.displayName || post.authorName}
                              authorPhoto={allUsers.find(u => u.uid === post.authorId)?.photoURL || post.authorPhoto}
                              isVerified={allUsers.find(u => u.uid === post.authorId)?.isVerified}
                              content={post.content}
                              mediaUrl={post.mediaUrl}
                              likesCount={post.likesCount}
                              commentsCount={post.commentsCount}
                              repostsCount={post.repostsCount}
                              sharesCount={post.sharesCount}
                              createdAt={post.createdAt}
                              isFollowing={post.isFollowing}
                              isLiked={likedPostIds.has(post.id)}
                              isBookmarked={bookmarkedPostIds.has(post.id)}
                              isReposted={repostedPostIds.has(post.id)}
                              type={post.type}
                              originalPostId={post.originalPostId}
                              originalAuthorName={post.originalAuthorName}
                              originalAuthorPhoto={post.originalAuthorPhoto}
                              originalAuthorId={post.originalAuthorId}
                              currentUserId={user?.uid}
                              userRole={profile?.role}
                              onLike={() => handleLikePost(post.id)}
                              onBookmark={() => handleBookmark(post.id)}
                              onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                              onUnfollow={() => handleUnfollow(post.authorId)}
                              onMessageClick={() => startChat(post.authorId, post.authorName)}
                              onProfileClick={(uid: string) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                              onUpdate={(content: string) => handleUpdatePost(post.id, content)}
                              onReport={(id: string, type: string) => setReportingContent({ id, type })}
                              onShare={(id: string, type: string) => handleShare(id, type)}
                              onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                              onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                              onDelete={() => handleDeletePost(post.id)}
                              t={t}
                              language={language}
                            />
                          ))}
                          {profileTab === 'reels' && userReels.map(reel => (
                            <div key={reel.id} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all group relative">
                              <video src={reel.videoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" muted />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold">
                                <div className="flex items-center gap-1"><Play className="w-3 h-3 fill-white" /> {reel.viewsCount || 0}</div>
                              </div>
                            </div>
                          ))}
                          {profileTab === 'friends' && (
                            <div className="space-y-6 col-span-3">
                              {/* Map Controls & Location Settings */}
                              <div className="flex flex-col gap-4 bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                    {t.friendsMap}
                                  </h3>
                                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl shadow-inner">
                                    <button 
                                      onClick={() => setShowFriendsMap(false)}
                                      className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${!showFriendsMap ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                      {t.listView}
                                    </button>
                                    <button 
                                      onClick={() => setShowFriendsMap(true)}
                                      className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${showFriendsMap ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                      {t.mapView}
                                    </button>
                                  </div>
                                </div>

                                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-blue-900 dark:text-blue-100">{t.locationSharing}</span>
                                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">{t.locationEnabledDesc}</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      updateDoc(doc(db, 'users', user?.uid || ''), {
                                        locationEnabled: !profile?.locationEnabled
                                      }).catch(e => handleFirestoreError(e, OperationType.WRITE, 'users/location'));
                                    }}
                                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${profile?.locationEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                                  >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${profile?.locationEnabled ? (language === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
                                  </button>
                                </div>
                              </div>

                              {showFriendsMap ? (
                                <FriendsMap 
                                  friends={viewedUserFriends}
                                  currentUserLocation={profile?.location}
                                  onProfileClick={(uid) => { setViewedUserUid(uid); setProfileTab('posts'); }}
                                  t={t}
                                  language={language}
                                />
                              ) : (
                                <>
                                  {friendRequests.length > 0 && (
                                <section>
                                  <h3 className="text-xs font-black text-red-500 mb-3 px-2 flex items-center gap-2">
                                    <UserPlus className="w-3 h-3" />
                                    طلبات الصداقة ({friendRequests.length})
                                  </h3>
                                  <div className="space-y-3">
                                    {friendRequests.map(req => (
                                      <div key={req.senderId} className="flex items-center justify-between p-4 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/20">
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo({ viewedUserUid: req.senderId, currentView: 'profile' })}>
                                          <img src={req.senderPhoto || `https://picsum.photos/seed/${req.senderId}/100`} className="w-12 h-12 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
                                          <div>
                                            <p className="font-bold text-gray-900 dark:text-white leading-none">{req.senderName}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">أرسل لك طلب صداقة</p>
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => handleAcceptFriend(req.senderId, req.senderName, req.senderPhoto)}
                                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700"
                                          >
                                            قبول
                                          </button>
                                          <button 
                                            onClick={async () => {
                                              try {
                                                await deleteDoc(doc(db, `users/${user.uid}/friendRequests`, req.senderId));
                                              } catch (err) {
                                                console.error(err);
                                              }
                                            }}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold rounded-xl hover:bg-gray-200"
                                          >
                                            رفض
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              )}

                              <section>
                                <h3 className="text-xs font-black text-gray-400 mb-3 px-2 flex items-center gap-2">
                                  <Users className="w-3 h-3" />
                                  {language === 'ar' ? 'قائمة الأصدقاء' : 'Friends List'}
                                </h3>
                                <div className="space-y-3">
                                  {isFriendsLoading ? (
                                    [1,2,3].map(i => (
                                      <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl animate-pulse">
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                          <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                        </div>
                                      </div>
                                    ))
                                  ) : viewedUserFriends.length > 0 ? (
                                    [...viewedUserFriends]
                                      .sort((a, b) => (b.location ? 1 : 0) - (a.location ? 1 : 0))
                                      .map(friend => (
                                        <div key={friend.uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100/50 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group">
                                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewedUserUid(friend.uid)}>
                                            <div className="relative">
                                              <img src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.uid}`} className="w-12 h-12 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
                                              {friend.location && (
                                                <div className="absolute -bottom-1 -right-1 p-1 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
                                                  <MapPin className="w-2 h-2 text-white" />
                                                </div>
                                              )}
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-1">
                                                <p className="font-bold text-gray-900 dark:text-white leading-none">{friend.displayName}</p>
                                                {friend.isVerified && <VerifiedBadge className="w-3 h-3" />}
                                              </div>
                                              {friend.username && <p className="text-[10px] text-blue-600 font-bold mt-1">@{friend.username}</p>}
                                            </div>
                                          </div>
                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => startChat(friend.uid, friend.displayName)}
                                            className="p-2 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 rounded-xl hover:shadow-md transition-all"
                                          >
                                            <MessageCircle className="w-5 h-5" />
                                          </button>
                                          <button 
                                            onClick={() => handleRemoveFriend(friend.uid)}
                                            className="p-2 bg-white dark:bg-gray-900 text-red-500 rounded-xl hover:shadow-md opacity-0 group-hover:opacity-100 transition-all"
                                          >
                                            <UserMinus className="w-5 h-5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                      <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
                                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400 font-medium">قائمة الأصدقاء فارغة</p>
                                      </div>
                                    )}
                                  </div>
                                </section>
                              </>
                            )}
                          </div>
                        )}
                          {profileTab === 'bookmarks' && (
                            isBookmarksLoading ? (
                              <div className="col-span-3 grid grid-cols-3 gap-1">
                                {[1,2,3].map(i => (
                                  <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                                ))}
                              </div>
                            ) : (
                              <div className="col-span-3 space-y-4">
                                {bookmarkedPosts.map(post => (
                                  <Post 
                                    key={post.id}
                                    postId={post.id}
                                    authorId={post.authorId}
                                    authorName={allUsers.find(u => u.uid === post.authorId)?.displayName || post.authorName}
                                    authorPhoto={allUsers.find(u => u.uid === post.authorId)?.photoURL || post.authorPhoto}
                                    isVerified={allUsers.find(u => u.uid === post.authorId)?.isVerified}
                                    content={post.content}
                                    mediaUrl={post.mediaUrl}
                                    likesCount={post.likesCount}
                                    commentsCount={post.commentsCount}
                                    repostsCount={post.repostsCount}
                                    sharesCount={post.sharesCount}
                                    createdAt={post.createdAt}
                                    isFollowing={followingIds.has(post.authorId)}
                                    isLiked={likedPostIds.has(post.id)}
                                    isBookmarked={bookmarkedPostIds.has(post.id)}
                                    currentUserId={user?.uid}
                                    userRole={profile?.role}
                                    onLike={() => handleLikePost(post.id)}
                                    onBookmark={() => handleBookmark(post.id)}
                                    onFollow={() => handleFollow(post.authorId, post.authorName, post.authorPhoto)}
                                    onUnfollow={() => handleUnfollow(post.authorId)}
                                    onMessageClick={() => startChat(post.authorId, post.authorName)}
                                    onProfileClick={(uid: string) => { setViewedUserUid(uid); setCurrentView('profile'); }}
                                    onUpdate={(content: string) => handleUpdatePost(post.id, content)}
                                    onReport={(id: string, type: string) => setReportingContent({ id, type })}
                                    onShare={(id: string, type: string) => handleShare(id, type)}
                                    onBlock={(uid: string, name: string, photo: string) => setBlockingUser({ id: uid, name, photo })}
                                    onCommentClick={() => setActivePostForComments({ ...post, postId: post.id })}
                                    onDelete={() => handleDeletePost(post.id)}
                                    t={t}
                                    language={language}
                                  />
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {((profileTab === 'posts' && userPosts.length === 0) || 
                        (profileTab === 'photos' && userPosts.filter(p => p.mediaUrl).length === 0) || 
                        (profileTab === 'reels' && userReels.length === 0) ||
                        (profileTab === 'friends' && viewedUserFriends.length === 0 && friendRequests.length === 0) ||
                        (profileTab === 'bookmarks' && bookmarkedPosts.length === 0)) && !isUserPostsLoading && !isBookmarksLoading && (
                        <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
                          <p className="text-sm text-gray-400 font-medium">{t.noData}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : currentView === 'messages' ? (
          <div className="h-full flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
            {selectedChat ? (
              <ChatWindow 
                chat={activeChat || selectedChat} 
                user={user} 
                onBack={handleBack}
                allUsers={allUsers}
                allUsersMap={allUsersMap}
                allChats={allChats}
                liveRooms={liveRooms}
                stickerPacks={stickerPacks}
                globalBackground={globalBackground}
                onJoinCall={(room) => setActiveLiveRoom(room)}
                onStartLive={() => {
                  const currentChat = activeChat || selectedChat;
                  const defaultTitle = currentChat.groupName || currentChat.channelName || (language === 'ar' ? 'محادثة مرئية' : 'Video Chat');
                  setConfirmationModal({
                    isOpen: true,
                    title: language === 'ar' ? 'بدء محادثة مرئية' : 'Start Video Chat',
                    message: language === 'ar' ? 'هل تود بدء مكالمة فيديو جماعية في هذه الدردشة؟' : 'Do you want to start a group video call in this chat?',
                    confirmText: language === 'ar' ? 'بدء المكالمة' : 'Start Call',
                    cancelText: t.cancel,
                    onConfirm: () => {
                      handleStartLive(defaultTitle, '720p', false, undefined, 'group_call', currentChat.chatId);
                      setConfirmationModal(null);
                    }
                  });
                }}
                onSendSticker={async (sticker) => {
                  try {
                    const chatId = activeChat?.chatId || selectedChat.chatId;
                    const batch = writeBatch(db);
                    const msgRef = doc(collection(db, `chats/${chatId}/messages`));
                    batch.set(msgRef, {
                      messageId: msgRef.id,
                      senderId: user.uid,
                      type: 'sticker',
                      mediaUrl: sticker.url,
                      senderLabel: sticker.emoji,
                      timestamp: serverTimestamp(),
                      read: false
                    });
                    batch.update(doc(db, 'chats', chatId), {
                      lastMessage: `${sticker.emoji} ملصق`,
                      lastUpdate: serverTimestamp()
                    });
                    await batch.commit();
                  } catch (err) {
                    handleFirestoreError(err, OperationType.CREATE, 'messages');
                  }
                }}
                onCreateStickerPack={() => setIsCreateStickerPackModalOpen(true)}
                onShare={handleShare}
                quotaExceeded={quotaExceeded}
                setConfirmationModal={setConfirmationModal}
                t={t}
                language={language}
              />
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between relative">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{t.messages}</h2>
                  <div className="relative" ref={messagesMenuRef}>
                    <button 
                      onClick={() => setIsMessagesMenuOpen(!isMessagesMenuOpen)}
                      className={`p-2.5 rounded-xl transition-all ${isMessagesMenuOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100'}`}
                    >
                      <PlusSquare className="w-5 h-5" />
                    </button>

                    <AnimatePresence>
                      {isMessagesMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute end-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
                        >
                          <div className="p-2 space-y-1">
                            <button 
                              onClick={() => {
                                setIsMessagesMenuOpen(false);
                                setIsChatSearchVisible(!isChatSearchVisible);
                              }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-right ${isChatSearchVisible ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                            >
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <Search className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {isChatSearchVisible ? t.hideSearch : t.searchPlaceholderChat}
                              </span>
                            </button>

                            <button 
                              onClick={() => {
                                setIsMessagesMenuOpen(false);
                                setIsCreateGroupModalOpen(true);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-right"
                            >
                              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                                <Users className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.createGroup}</span>
                            </button>

                            <button 
                              onClick={() => {
                                setIsMessagesMenuOpen(false);
                                setIsCreateChannelModalOpen(true);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-right"
                            >
                              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                                <Megaphone className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.createChannel}</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Chat Categories */}
                <div className="px-6 py-2 border-b border-gray-50 dark:border-gray-800/50">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {[
                      { id: 'all', label: t.all },
                      { id: 'direct', label: t.directChats },
                      { id: 'groups', label: t.groups },
                      { id: 'channels', label: t.channels },
                      { id: 'truth', label: t.truthMode }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveChatTab(tab.id as any)}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${activeChatTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Search */}
                <AnimatePresence>
                  {isChatSearchVisible && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-b border-gray-50 dark:border-gray-800/50"
                    >
                      <div className="px-6 py-4">
                        <div className="relative">
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text"
                            autoFocus
                            value={chatSearchQuery}
                            onChange={(e) => setChatSearchQuery(e.target.value)}
                            placeholder={t.searchPlaceholderChat}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-3 pr-10 pl-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                          {chatSearchQuery && (
                            <button 
                              onClick={() => setChatSearchQuery("")}
                              className="absolute left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                              <X className="w-3 h-3 text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
                  {filteredChats.length > 0 ? (
                    filteredChats.map(chat => {
                      const otherUserId = chat.participants.find(id => id !== user.uid);
                      const otherUser = allUsers.find(u => u.uid === otherUserId);
                      const isUnread = chat.lastMessage?.senderId !== user.uid && !chat.lastMessage?.read;

                      return (
                        <div 
                          key={chat.chatId}
                          onClick={() => setSelectedChat(chat)}
                          className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all ${isUnread ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'}`}
                        >
                          <div className="relative">
                            <img 
                              src={chat.type === 'group' ? (chat.groupPhoto || `https://picsum.photos/seed/${chat.chatId}/100`) : (chat.type === 'channel' ? (chat.channelPhoto || `https://picsum.photos/seed/${chat.chatId}/100`) : (otherUser?.photoURL || `https://picsum.photos/seed/${otherUserId}/100`))} 
                              className="w-14 h-14 rounded-2xl object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                              referrerPolicy="no-referrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (chat.type === 'group' || chat.type === 'channel') {
                                  setSelectedChat(chat);
                                } else {
                                  setViewedUserUid(otherUserId);
                                  setCurrentView('profile');
                                }
                              }}
                            />
                            {(chat.type === 'channel' ? chat.isVerified : (chat.type !== 'group' && allUsers.find(u => u.uid === otherUserId)?.isVerified)) && (
                              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-0.5">
                                <VerifiedBadge className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] text-gray-400 font-medium">
                                {chat.lastUpdate ? new Date(chat.lastUpdate.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                              <h3 className="font-black text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors" onClick={(e) => {
                                e.stopPropagation();
                                if (chat.type === 'group' || chat.type === 'channel') {
                                  setSelectedChat(chat);
                                } else {
                                  setViewedUserUid(otherUserId);
                                  setCurrentView('profile');
                                }
                              }}>
                                {chat.type === 'group' ? chat.groupName : (chat.type === 'channel' ? chat.channelName : (otherUser?.displayName || 'مستخدم'))}
                              </h3>
                            </div>
                            <div className="flex justify-between items-center">
                              {isUnread && <div className="w-2 h-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/50" />}
                              <p className={`text-xs truncate ${isUnread ? 'text-blue-600 font-bold' : 'text-gray-500 dark:text-gray-400 font-medium'}`}>
                                {chat.lastMessage?.text || 'ابدأ المحادثة الآن...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-bold">
                        {chatSearchQuery ? "لا توجد نتائج للبحث" : "لا توجد محادثات بعد"}
                      </p>
                      {!chatSearchQuery && (
                        <button 
                          onClick={() => setCurrentView('search')}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20"
                        >
                          ابحث عن أصدقاء
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : currentView === 'calls' ? (
          <CallLog 
            calls={callHistory}
            user={user}
            allUsers={allUsers}
            onStartCall={handleStartCall}
            onProfileClick={(uid) => { setViewedUserUid(uid); setCurrentView('profile'); }}
            t={t}
            language={language}
          />
        ) : currentView === 'settings' ? (
          <SettingsPage 
            profile={profile} 
            user={user} 
            onBack={handleBack}
            onLogout={handleLogout}
            onUpdateSettings={handleUpdateSettings}
            onUpdateGlobalBackground={handleUpdateGlobalBackground}
            language={language}
            setLanguage={setLanguage}
            darkMode={darkMode}
            setDarkMode={(val) => {
              setDarkMode(val);
              setToast({ message: t.settingsSaved || (language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved'), type: 'success' });
            }}
            globalBackground={globalBackground}
            t={t}
            onEditProfile={() => {
              setIsEditingProfile(true);
              setCurrentView('profile');
            }}
            onDeleteAccount={() => {
              setConfirmationModal({
                isOpen: true,
                title: t.deleteAccountPermanently,
                message: t.confirmDeleteAccount,
                confirmText: t.deleteConfirmBtn,
                cancelText: t.cancel,
                onConfirm: handleDeleteAccount,
                isDanger: true
              });
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>{t.underDevelopment}</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {reportingContent && (
        <ReportModal 
          isOpen={!!reportingContent}
          contentId={reportingContent.id}
          contentType={reportingContent.type}
          onClose={() => setReportingContent(null)}
          t={t}
          language={language}
        />
      )}

      {blockingUser && (
        <BlockConfirmationModal 
          user={{ name: blockingUser.name }}
          onConfirm={handleBlock}
          onCancel={() => setBlockingUser(null)}
          t={t}
          language={language}
        />
      )}

      {activeReelForComments && (
        <ReelCommentsModal 
          reel={activeReelForComments}
          allUsers={allUsers}
          onClose={() => setActiveReelForComments(null)}
          onAddComment={(text, parentId) => handleReelComment(activeReelForComments.id, text, parentId)}
          onDeleteComment={(commentId) => handleDeleteReelComment(activeReelForComments.id, commentId)}
          onReportComment={handleReportComment}
          onShareInReel={handleShareInReel}
          onProfileClick={(uid) => { setViewedUserUid(uid); setCurrentView('profile'); }}
          currentUserId={user?.uid || ''}
          quotaExceeded={quotaExceeded}
          t={t}
          language={language}
        />
      )}

      {activePostForComments && (
        <PostCommentsModal 
          post={activePostForComments}
          allUsers={allUsers}
          onClose={() => setActivePostForComments(null)}
          onAddComment={(text, parentId) => handlePostComment(activePostForComments.postId, text, parentId)}
          onDeleteComment={(commentId) => handleDeleteComment(activePostForComments.postId, commentId)}
          onReportComment={handleReportComment}
          onShareInReel={handleShareInReel}
          onProfileClick={(uid) => { setViewedUserUid(uid); setCurrentView('profile'); }}
          currentUserId={user?.uid || ''}
          quotaExceeded={quotaExceeded}
          t={t}
          language={language}
        />
      )}

      {isStartLiveModalOpen && (
        <StartLiveModal 
          onClose={() => setIsStartLiveModalOpen(false)}
          onStart={(title, quality, watchTogetherEnabled, placeholderUrl, type, guestPrivacy, allowedGuests) => {
            setConfirmationModal({
              isOpen: true,
              title: t.confirmStartLiveTitle,
              message: t.confirmStartLiveMessage,
              confirmText: t.startNow,
              cancelText: t.cancel,
              onConfirm: () => {
                handleStartLive(title, quality, watchTogetherEnabled, placeholderUrl, type, undefined, guestPrivacy, allowedGuests);
                setConfirmationModal(null);
                setIsStartLiveModalOpen(false);
              }
            });
          }}
          t={t}
          language={language}
        />
      )}

      {showStreamEndedMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[1000] bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-2xl animate-bounce">
          {t.streamEnded}
        </div>
      )}

      {activeLiveRoom && (
        isCallMinimized ? (
          <motion.div 
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            className="fixed bottom-24 right-6 w-32 h-48 bg-zinc-900 rounded-3xl shadow-2xl border border-white/20 z-[1000] overflow-hidden group cursor-move"
          >
            <div className="absolute inset-0 bg-blue-600/20 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
              <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border-2 border-white/20">
                 <img src={`https://picsum.photos/seed/${activeLiveRoom.id}/200`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <p className="text-[10px] font-black text-white truncate w-full px-1">
                {activeLiveRoom.type === 'group_call' ? (language === 'ar' ? 'مكالمة جماعية' : 'Group Call') : 'Live'}
              </p>
              <div className="flex gap-2 mt-2 pointer-events-auto">
                 <button onClick={() => setIsCallMinimized(false)} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/40 transition-colors">
                    <Maximize2 className="w-4 h-4 text-white" />
                 </button>
                 <button 
                  onClick={() => {
                    if (activeLiveRoom && activeLiveRoom.hostId === (user?.uid)) {
                      handleEndLive(activeLiveRoom.id, activeLiveRoom.type);
                    } else {
                      setActiveLiveRoom(null);
                    }
                    setIsCallMinimized(false);
                  }} 
                  className="p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors"
                >
                    <PhoneOff className="w-4 h-4 text-red-500" />
                 </button>
              </div>
            </div>
          </motion.div>
        ) : activeLiveRoom.type === 'group_call' ? (
          <GroupVideoChatScreen 
            room={activeLiveRoom}
            allUsers={allUsers}
            allUsersMap={allUsersMap}
            user={user!}
            profile={profile}
            onClose={(endCall?: boolean) => {
              // Priority: Clear UI state first to prevent "freezing"
              setActiveLiveRoom(null);
              setIsCallMinimized(false);

              if (endCall && activeLiveRoom) {
                // Background execution for end-call logic
                handleEndLive(activeLiveRoom.id, activeLiveRoom.type, true).catch(err => {
                  console.error("Background end call failed:", err);
                });
              }
            }}
            onMinimize={() => setIsCallMinimized(true)}
            onReport={(id, type) => setReportingContent({ id, type })}
            t={t}
            language={language}
            setConfirmationModal={setConfirmationModal}
            setCurrentView={setCurrentView}
            setViewedUserUid={setViewedUserUid}
            allChats={allChats}
          />
        ) : (
          <LiveStream 
            room={activeLiveRoom}
            allUsers={allUsers}
            allUsersMap={allUsersMap}
            user={user}
            profile={profile}
            isHost={activeLiveRoom.hostId === user.uid}
            chatModeratorIds={(() => {
              const linkedChat = allChats.find(c => c.chatId === activeLiveRoom.chatId);
              return linkedChat?.moderators || [];
            })()}
            chatOwnerId={(() => {
              const linkedChat = allChats.find(c => c.chatId === activeLiveRoom.chatId);
              return linkedChat?.createdBy || activeLiveRoom.hostId;
            })()}
            onClose={() => {
              if (activeLiveRoom && activeLiveRoom.hostId === user.uid) {
                handleEndLive(activeLiveRoom.id, activeLiveRoom.type);
              } else {
                setActiveLiveRoom(null);
              }
            }}
            onReport={(id, type) => setReportingContent({ id, type })}
            quotaExceeded={quotaExceeded}
            setConfirmationModal={setConfirmationModal}
            t={t}
            language={language}
            liveSubscriptionIds={liveSubscriptionIds}
            handleToggleLiveSubscription={handleToggleLiveSubscription}
          />
        )
      )}

      {isNotificationsModalOpen && (
        <NotificationsModal 
          notifications={filteredNotifications}
          allUsers={allUsers}
          onClose={() => setIsNotificationsModalOpen(false)}
          onNotificationClick={handleNotificationClick}
          followingIds={followingIds}
          handleFollow={handleFollow}
          handleUnfollow={handleUnfollow}
          currentUserUid={user?.uid || ''}
          t={t}
          language={language}
        />
      )}

      {isCreateStickerPackModalOpen && (
        <CreateStickerPackModal 
          isOpen={isCreateStickerPackModalOpen}
          onClose={() => setIsCreateStickerPackModalOpen(false)}
          onCreate={handleCreateStickerPack}
          t={t}
          language={language}
        />
      )}

      {userListModal.isOpen && (
        <UserListModal 
          isOpen={userListModal.isOpen}
          title={userListModal.title}
          users={userListModal.users}
          onClose={() => setUserListModal({ ...userListModal, isOpen: false })}
          onUserClick={(uid) => {
            setViewedUserUid(uid);
            setCurrentView('profile');
            setUserListModal({ ...userListModal, isOpen: false });
          }}
          followingIds={followingIds}
          handleFollow={handleFollow}
          handleUnfollow={handleUnfollow}
          currentUserUid={user.uid}
          t={t}
          language={language}
        />
      )}

      {isCreateGroupModalOpen && user && (
        <CreateGroupModal 
          isOpen={isCreateGroupModalOpen}
          onClose={() => setIsCreateGroupModalOpen(false)}
          users={allUsers}
          currentUser={user}
          onCreate={handleCreateGroup}
          t={t}
          language={language}
        />
      )}

      {isCreateChannelModalOpen && user && (
        <CreateChannelModal 
          isOpen={isCreateChannelModalOpen}
          onClose={() => setIsCreateChannelModalOpen(false)}
          currentUser={user}
          onCreate={handleCreateChannel}
          t={t}
          language={language}
        />
      )}

      {isCreatePostModalOpen && (
        <CreatePostModal 
          isOpen={isCreatePostModalOpen}
          onClose={() => setIsCreatePostModalOpen(false)}
          onCreate={addNewPost}
          onCreateReel={handleCreateReel}
          onCreateStory={(file) => {
            const mockEvent = { target: { files: [file] } } as any;
            handleStoryUpload(mockEvent);
          }}
          t={t}
          language={language}
          initialType={initialCreateType}
        />
      )}

      {isCreateAIImageModalOpen && (
        <CreateAIImageModal 
          isOpen={isCreateAIImageModalOpen}
          onClose={() => {
            setIsCreateAIImageModalOpen(false);
            setGeneratedAIImage(null);
            setAiImagePrompt("");
            setAiImageCaption("");
          }}
          onGenerate={handleGenerateAIImage}
          onPublish={(caption, imageUrl) => {
            addNewPost(caption, imageUrl, 'image');
            setIsCreateAIImageModalOpen(false);
            setGeneratedAIImage(null);
            setAiImagePrompt("");
            setAiImageCaption("");
          }}
          isGenerating={isGeneratingAIImage}
          generatedImage={generatedAIImage}
          t={t}
          language={language}
        />
      )}

      {activeStory && (
        <StoryViewer 
          stories={groupedStories[activeStory.userId] || [activeStory]}
          isVerified={allUsers.find(u => u.uid === activeStory.userId)?.isVerified}
          userPhoto={allUsers.find(u => u.uid === activeStory.userId)?.photoURL}
          currentUserId={user?.uid || ''}
          onClose={() => setActiveStory(null)}
          onReply={handleStoryReply}
          quotaExceeded={quotaExceeded}
          allUsers={allUsers}
          t={t}
          language={language}
        />
      )}

      {activeCall && (
        <CallModal 
          call={activeCall} 
          user={user} 
          onEnd={handleBack} 
          quotaExceeded={quotaExceeded}
          t={t}
          language={language}
        />
      )}

      {shareModal && (
        <ShareModal 
          isOpen={shareModal.isOpen}
          id={shareModal.id}
          type={shareModal.type}
          chats={allChats}
          allUsers={allUsers}
          allUsersMap={allUsersMap}
          onClose={() => setShareModal(null)}
          onShareDM={handleShareDM}
          t={t}
          language={language}
        />
      )}

      {confirmationModal && (
        <ConfirmationModal 
          isOpen={confirmationModal.isOpen}
          title={confirmationModal.title}
          message={confirmationModal.message}
          confirmText={confirmationModal.confirmText}
          cancelText={confirmationModal.cancelText}
          onConfirm={confirmationModal.onConfirm}
          onCancel={() => setConfirmationModal(null)}
          isDanger={confirmationModal.isDanger}
          language={language}
          actionType={confirmationModal.actionType}
          onCustomAction={(data) => {
            if (confirmationModal.actionType === 'delete_chat') {
              // This logic should ideally be delegated through a more robust event system
              // but for now we'll handle the specific case.
              // Note: handleDeleteChat is not accessible here, so we might need a better way.
              // We'll dispatch a custom event that ChatWindow can listen to.
              window.dispatchEvent(new CustomEvent('handle-chat-action', { detail: { action: 'delete', mode: data } }));
            }
          }}
        />
      )}

      {/* Create Menu Popup */}
      <AnimatePresence>
        {isCreateMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            ref={createMenuRef}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[220px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-2xl z-50 p-3 overflow-hidden"
          >
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  setInitialCreateType('post');
                  setIsCreatePostModalOpen(true);
                  setIsCreateMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-700 dark:text-gray-200 group"
              >
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                  <Image className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">{t.publishImageGallery}</span>
              </button>

              <button 
                onClick={() => {
                  setInitialCreateType('reel');
                  setIsCreatePostModalOpen(true);
                  setIsCreateMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-700 dark:text-gray-200 group"
              >
                <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600 group-hover:scale-110 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">{t.createReel}</span>
              </button>
              
              <button 
                onClick={() => {
                  setIsCreateAIImageModalOpen(true);
                  setIsCreateMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-700 dark:text-gray-200 group"
              >
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">{t.createAIImage}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100/50 dark:border-gray-800/50 h-16 rounded-[2rem] flex items-center justify-around px-4 shadow-2xl shadow-black/10 z-50">
        <button 
          onClick={() => navigateTo({ currentView: 'feed' })} 
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all active:scale-90 ${currentView === 'feed' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">{t.home}</span>
        </button>
        <button 
          onClick={() => navigateTo({ currentView: 'search' })} 
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all active:scale-90 ${currentView === 'search' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-bold">{t.explore}</span>
        </button>
        <button 
          onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
          className={`p-3.5 text-white rounded-2xl shadow-xl -translate-y-6 hover:scale-110 active:scale-95 transition-all duration-300 ${isCreateMenuOpen ? 'bg-gray-900 dark:bg-white dark:text-gray-900 rotate-45' : 'bg-blue-600 shadow-blue-500/40'}`}
        >
          <PlusSquare className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigateTo({ currentView: 'reels' })} 
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all active:scale-90 ${currentView === 'reels' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Video className="w-5 h-5" />
          <span className="text-[10px] font-bold">{t.reels}</span>
        </button>
        <button 
          onClick={() => navigateTo({ viewedUserUid: null, currentView: 'profile' })} 
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all active:scale-90 ${currentView === 'profile' && !viewedUserUid ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">{t.profile}</span>
        </button>
      </nav>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: -100, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className={`fixed left-1/2 z-[1000] px-6 py-3 rounded-2xl shadow-xl text-white font-bold text-sm ${toast.type === 'success' ? 'bg-green-500 shadow-green-500/20' : 'bg-red-500 shadow-red-500/20'}`}
        >
          {toast.message}
        </motion.div>
      )}
    </div>
  );
}

function CallLog({ calls, user, allUsers, onStartCall, onProfileClick, t, language }: { calls: Call[], user: FirebaseUser, allUsers: UserProfile[], onStartCall: (userId: string, type: 'voice' | 'video') => void, onProfileClick: (uid: string) => void, t: any, language: string }) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sortedCalls = [...calls].sort((a, b) => {
    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
    return timeB - timeA;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-black overflow-hidden" dir={language === 'ar' || language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="p-6 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 z-10">
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">{t.callLog}</h2>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Clock className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {sortedCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-40">
            <Phone className="w-12 h-12 mb-4" />
            <p className="text-sm font-bold">{t.noCalls}</p>
          </div>
        ) : (
          sortedCalls.map((call) => {
            const isOutgoing = call.callerId === user.uid;
            const otherUserId = isOutgoing ? call.receiverId : call.callerId;
            const otherUser = allUsers.find(u => u.uid === otherUserId);
            const isMissed = call.status === 'missed';
            
            return (
              <motion.div 
                key={call.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={isOutgoing ? call.receiverPhoto : call.callerPhoto} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-50 dark:border-gray-800 cursor-pointer hover:opacity-80 transition-opacity" 
                      referrerPolicy="no-referrer" 
                      onClick={(e) => { e.stopPropagation(); onProfileClick(otherUserId); }}
                    />
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white dark:border-gray-900 ${isMissed ? 'bg-red-500' : (isOutgoing ? 'bg-blue-500' : 'bg-green-500')}`}>
                      {isMissed ? (
                        <PhoneOff className="w-2 h-2 text-white" />
                      ) : (
                        isOutgoing ? <PhoneOutgoing className="w-2 h-2 text-white" /> : <PhoneIncoming className="w-2 h-2 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white cursor-pointer hover:text-blue-500 transition-colors" onClick={(e) => { e.stopPropagation(); onProfileClick(otherUserId); }}>
                      {isOutgoing ? call.receiverName : call.callerName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold ${isMissed ? 'text-red-500' : 'text-gray-400'}`}>
                        {isMissed ? t.missedCall : (isOutgoing ? t.outgoingCall : t.incomingCall)}
                      </span>
                      <span className="text-[10px] text-gray-400">•</span>
                      <span className="text-[10px] text-gray-400">{formatRelativeTime(call.timestamp, t)}</span>
                      {call.duration && (
                        <>
                          <span className="text-[10px] text-gray-400">•</span>
                          <span className="text-[10px] text-gray-400">{formatDuration(call.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onStartCall(otherUserId, 'voice')}
                    className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onStartCall(otherUserId, 'video')}
                    className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
