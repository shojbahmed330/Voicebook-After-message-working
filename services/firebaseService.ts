// This is a plausible reconstruction of the firebaseService.ts file
// based on its usage across the application.

import firebase from 'firebase/compat/app';
import { db, auth, storage } from './firebaseConfig';
import {
  User, Post, Comment, Notification, FriendshipStatus, Campaign,
  Lead, Conversation, Message, LiveAudioRoom, LiveVideoRoom, Group, Event, GroupChat, JoinRequest,
  Story, AdminUser, Report,
  Author,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_AVATARS, DEFAULT_COVER_PHOTOS } from '../constants';

const toUser = (doc: firebase.firestore.DocumentSnapshot): User => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      name: data.name || 'Unknown User',
      username: data.username || 'unknown',
      avatarUrl: data.avatarUrl || DEFAULT_AVATARS[0],
      coverPhotoUrl: data.coverPhotoUrl || DEFAULT_COVER_PHOTOS[0],
      email: data.email || '',
      bio: data.bio || '',
      voiceCoins: data.voiceCoins || 0,
      friendIds: data.friendIds || [],
      blockedUserIds: data.blockedUserIds || [],
      privacySettings: data.privacySettings || { postVisibility: 'public', friendRequestPrivacy: 'everyone' },
      notificationSettings: data.notificationSettings || { likes: true, comments: true, friendRequests: true },
      role: data.role || 'user',
      onlineStatus: data.onlineStatus || 'offline',
      lastActiveTimestamp: data.lastActiveTimestamp,
      ...data
    };
};

const toAuthor = (data: any, id: string): Author => ({
    id,
    name: data.name || 'Unknown User',
    username: data.username || 'unknown',
    avatarUrl: data.avatarUrl || DEFAULT_AVATARS[0],
});

const toPost = (doc: firebase.firestore.DocumentSnapshot): Post => {
    const data = doc.data() as any;
    return {
        id: doc.id,
        ...data,
        author: data.author || { id: 'unknown', name: 'Unknown' },
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        comments: [], // Comments are fetched separately
    } as Post;
};

const toComment = (doc: firebase.firestore.DocumentSnapshot): Comment => {
    const data = doc.data() as any;
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    } as Comment;
};


export const firebaseService = {
  // --- AUTH ---
  onAuthStateChanged: (callback: (user: { id: string, email: string | null } | null) => void) => {
    return auth.onAuthStateChanged(user => {
      if (user) {
        callback({ id: user.uid, email: user.email });
      } else {
        callback(null);
      }
    });
  },

  signInWithEmail: async (email: string, password: string): Promise<User | null> => {
    await auth.signInWithEmailAndPassword(email, password);
    return null; // The onAuthStateChanged listener will handle the rest
  },

  signUpWithEmail: async (email: string, password: string, fullName: string, username: string): Promise<boolean> => {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    if (!userCredential.user) return false;
    
    const newUser: Omit<User, 'id'> = {
      name: fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      avatarUrl: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
      coverPhotoUrl: DEFAULT_COVER_PHOTOS[Math.floor(Math.random() * DEFAULT_COVER_PHOTOS.length)],
      bio: 'Hey! I am using VoiceBook.',
      voiceCoins: 100,
      friendIds: [],
      blockedUserIds: [],
      privacySettings: { postVisibility: 'public', friendRequestPrivacy: 'everyone' },
      notificationSettings: { likes: true, comments: true, friendRequests: true, campaignUpdates: true, groupPosts: true },
      role: 'user',
      onlineStatus: 'online',
      lastActiveTimestamp: new Date().toISOString(),
    };
    
    await db.collection('users').doc(userCredential.user.uid).set(newUser);
    return true;
  },

  signOutUser: async (userId: string | null) => {
    if (userId) {
        await firebaseService.updateUserOnlineStatus(userId, 'offline');
    }
    await auth.signOut();
  },

  isUsernameTaken: async (username: string): Promise<boolean> => {
      const snapshot = await db.collection('users').where('username', '==', username.toLowerCase()).limit(1).get();
      return !snapshot.empty;
  },
  
  // --- USER PROFILE & STATUS ---
  getUserProfile: (username: string): Promise<User | null> => {
      // This is a mock function as there's no direct call to it, but it's good practice to have it.
      return Promise.resolve(null);
  },
  listenToCurrentUser: (userId: string, callback: (user: User | null) => void): (() => void) => {
      return db.collection('users').doc(userId).onSnapshot(doc => {
          if (doc.exists) {
              callback(toUser(doc));
          } else {
              callback(null);
          }
      });
  },
  
  updateUserOnlineStatus: async (userId: string, status: 'online' | 'offline') => {
      const userRef = db.collection('users').doc(userId);
      await userRef.update({ 
          onlineStatus: status,
          lastActiveTimestamp: new Date().toISOString(),
      });
  },
  
  updateUserActivity: (userId: string) => {
      db.collection('users').doc(userId).update({ lastActiveTimestamp: new Date().toISOString() });
  },
  
  listenToUserProfile: (username: string, callback: (user: User | null) => void): (() => void) => {
    const query = db.collection('users').where('username', '==', username).limit(1);
    return query.onSnapshot(snapshot => {
        if (!snapshot.empty) {
            callback(toUser(snapshot.docs[0]));
        } else {
            callback(null);
        }
    });
  },

  getUserProfileById: async (userId: string): Promise<User | null> => {
      const doc = await db.collection('users').doc(userId).get();
      return doc.exists ? toUser(doc) : null;
  },

  // --- POSTS & FEED ---
  listenToFeedPosts: (userId: string, friendIds: string[], blockedIds: string[], callback: (posts: Post[]) => void): (() => void) => {
      let query = db.collection('posts')
                    .where('status', '==', 'approved')
                    .where('postType', 'in', ['audio', 'image', 'video', 'text', 'profile_picture_change', 'cover_photo_change', 'question', 'poll'])
                    .orderBy('createdAt', 'desc')
                    .limit(50);
      
      return query.onSnapshot(async snapshot => {
          let posts = snapshot.docs.map(toPost);
          
          // Client-side filtering
          posts = posts.filter(post => 
              !blockedIds.includes(post.author.id) &&
              (post.author.id === userId || friendIds.includes(post.author.id))
          );
          
          // Hydrate comments for comment count
          for (let post of posts) {
              const commentsSnapshot = await db.collection('posts').doc(post.id).collection('comments').get();
              post.commentCount = commentsSnapshot.size;
          }
          
          callback(posts);
      });
  },
  
  listenToReelsPosts: (callback: (posts: Post[]) => void): (() => void) => {
       const query = db.collection('posts')
                    .where('status', '==', 'approved')
                    .where('postType', '==', 'video')
                    .orderBy('createdAt', 'desc')
                    .limit(20);
      return query.onSnapshot(snapshot => {
          callback(snapshot.docs.map(toPost));
      });
  },

  listenToPost: (postId: string, callback: (post: Post | null) => void): (() => void) => {
    const postRef = db.collection('posts').doc(postId);
    
    return postRef.onSnapshot(async postDoc => {
        if (!postDoc.exists) {
            callback(null);
            return;
        }
        
        const post = toPost(postDoc);
        const commentsSnapshot = await postRef.collection('comments').orderBy('createdAt', 'asc').get();
        post.comments = commentsSnapshot.docs.map(toComment);
        
        callback(post);
    });
  },

  // --- Omitted many functions for brevity as they follow similar Firebase patterns. ---
  // A real implementation would have all the functions listed in geminiService.
  
  // A few more example implementations:
  
  createPost: async (postData: Partial<Post>, media: { mediaFile?: File | null, audioBlobUrl?: string | null, generatedImageBase64?: string | null }): Promise<void> => {
      const newPostRef = db.collection('posts').doc();
      const post: any = {
          ...postData,
          id: newPostRef.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          reactions: {},
          commentCount: 0,
      };

      if (media.mediaFile) {
          const filePath = `posts/${newPostRef.id}/${media.mediaFile.name}`;
          const fileSnapshot = await storage.ref(filePath).put(media.mediaFile);
          const url = await fileSnapshot.ref.getDownloadURL();
          if(media.mediaFile.type.startsWith('video/')) post.videoUrl = url;
          else post.imageUrl = url;
          post.postType = media.mediaFile.type.startsWith('video/') ? 'video' : 'image';
      } else if (media.audioBlobUrl) {
           const response = await fetch(media.audioBlobUrl);
           const blob = await response.blob();
           const filePath = `posts/${newPostRef.id}/voice.webm`;
           const fileSnapshot = await storage.ref(filePath).put(blob);
           post.audioUrl = await fileSnapshot.ref.getDownloadURL();
           post.postType = 'audio';
      } else if (media.generatedImageBase64) {
           const filePath = `posts/${newPostRef.id}/generated.jpg`;
           const fileSnapshot = await storage.ref(filePath).putString(media.generatedImageBase64, 'data_url');
           post.imageUrl = await fileSnapshot.ref.getDownloadURL();
           post.postType = 'image';
      } else if (!post.poll) {
           post.postType = 'text';
      }
      
      await newPostRef.set(post);
  },

  reactToPost: async (postId: string, userId: string, emoji: string): Promise<boolean> => {
    const postRef = db.collection('posts').doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return false;
    
    const reactions = doc.data()?.reactions || {};
    if (reactions[userId] === emoji) {
        // Un-react
        delete reactions[userId];
    } else {
        // React
        reactions[userId] = emoji;
    }

    await postRef.update({ reactions });
    return true;
  },

  // This is a placeholder for a complex function.
  getExplorePosts: (userId: string): Promise<Post[]> => Promise.resolve([]),
  getInjectableAd: (user: User): Promise<Post | null> => Promise.resolve(null),
  getInjectableStoryAd: (user: User): Promise<Story | null> => Promise.resolve(null),

  // Dummy implementations for the rest to avoid compilation errors
  getFriendRequests: async (userId: string): Promise<User[]> => { return []; },
  acceptFriendRequest: async (currentUserId: string, requestingUserId: string) => {},
  declineFriendRequest: async (currentUserId: string, requestingUserId: string) => {},
  checkFriendshipStatus: async (currentUserId: string, profileUserId: string): Promise<FriendshipStatus> => { return FriendshipStatus.NOT_FRIENDS; },
  addFriend: async (currentUserId: string, targetUserId: string): Promise<{ success: boolean; reason?: string }> => { return { success: true }; },
  unfriendUser: async (currentUserId: string, targetUserId: string) => {},
  cancelFriendRequest: async (currentUserId: string, targetUserId: string) => {},
  listenToAcceptedFriendRequests: (userId: string, callback: (acceptedRequests: any[]) => void) => { return () => {}; },
  finalizeFriendship: async (currentUserId: string, acceptedByUser: Author) => {},
  getAllUsersForAdmin: async (): Promise<User[]> => { return []; },
  getUsersByIds: async (userIds: string[]): Promise<User[]> => {
    if (userIds.length === 0) return [];
    const snapshot = await db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', userIds).get();
    return snapshot.docs.map(toUser);
  },
  getFriends: async(userId: string): Promise<User[]> => {
    const user = await firebaseService.getUserProfileById(userId);
    if (!user || !user.friendIds) return [];
    return firebaseService.getUsersByIds(user.friendIds);
  },
  getCommonFriends: async (userId1: string, userId2: string): Promise<User[]> => { return []; },
  searchUsers: async (query: string): Promise<User[]> => { return []; },
  updateProfile: async (userId: string, updates: Partial<User>) => {},
  updateProfilePicture: async (userId: string, base64: string, caption?: string, captionStyle?: Post['captionStyle']): Promise<{ updatedUser: User; newPost: Post } | null> => { return null; },
  updateCoverPhoto: async (userId: string, base64: string, caption?: string, captionStyle?: Post['captionStyle']): Promise<{ updatedUser: User; newPost: Post } | null> => { return null; },
  blockUser: async (currentUserId: string, targetUserId: string): Promise<boolean> => { return true; },
  unblockUser: async (currentUserId: string, targetUserId: string): Promise<boolean> => { return true; },
  deactivateAccount: async (userId: string): Promise<boolean> => { return true; },
  updateVoiceCoins: async (userId: string, amount: number): Promise<boolean> => { return true; },
  createComment: async (user: User, postId: string, commentData: { text?: string, imageFile?: File, duration?: number, audioBlob?: Blob, parentId?: string | null }): Promise<Comment | null> => { return null; },
  editComment: async (postId: string, commentId: string, newText: string) => {},
  deleteComment: async (postId: string, commentId: string) => {},
  reactToComment: async (postId: string, commentId: string, userId: string, emoji: string) => {},
  listenToNotifications: (userId: string, callback: (notifications: Notification[]) => void) => { return () => {}; },
  markNotificationsAsRead: async (userId: string, notificationIds: string[]) => {},
  trackAdView: async (campaignId: string) => {},
  trackAdClick: async (campaignId: string) => {},
  submitLead: async (leadData: Omit<Lead, 'id'>) => {},
  ensureChatDocumentExists: async (user1: User, user2: User) => {},
  getChatId: (user1Id: string, user2Id: string) => [user1Id, user2Id].sort().join('_'),
  listenToMessages: (chatId: string, callback: (messages: Message[]) => void) => { return () => {}; },
  listenToConversations: (userId: string, callback: (conversations: Conversation[]) => void) => { return () => {}; },
  sendMessage: async (chatId: string, sender: User, recipient: User, messageContent: Partial<Message>): Promise<Message | null> => { return null; },
  unsendMessage: async (chatId: string, messageId: string, userId: string) => {},
  reactToMessage: async (chatId: string, messageId: string, userId: string, emoji: string) => {},
  deleteChatHistory: async (chatId: string) => {},
  getChatSettings: async (chatId: string): Promise<any> => { return {}; },
  updateChatSettings: async (chatId: string, settings: any) => {},
  markMessagesAsRead: async (chatId: string, userId: string) => {},
  listenToLiveAudioRooms: (callback: (rooms: LiveAudioRoom[]) => void) => { return () => {}; },
  listenToLiveVideoRooms: (callback: (rooms: LiveVideoRoom[]) => void) => { return () => {}; },
  listenToRoom: (roomId: string, type: 'audio' | 'video', callback: (room: any) => void) => { return () => {}; },
  createLiveAudioRoom: async (host: User, topic: string): Promise<LiveAudioRoom | null> => { return null; },
  createLiveVideoRoom: async (host: User, topic: string): Promise<LiveVideoRoom | null> => { return null; },
  joinLiveAudioRoom: async (userId: string, roomId: string) => {},
  joinLiveVideoRoom: async (userId: string, roomId: string) => {},
  leaveLiveAudioRoom: async (userId: string, roomId: string) => {},
  leaveLiveVideoRoom: async (userId: string, roomId: string) => {},
  endLiveAudioRoom: async (userId: string, roomId: string) => {},
  endLiveVideoRoom: async (userId: string, roomId: string) => {},
  getAudioRoomDetails: async (roomId: string): Promise<LiveAudioRoom | null> => { return null; },
  raiseHandInAudioRoom: async (userId: string, roomId: string) => {},
  inviteToSpeakInAudioRoom: async (hostId: string, userId: string, roomId: string) => {},
  moveToAudienceInAudioRoom: async (hostId: string, userId: string, roomId: string) => {},
  getCampaignsForSponsor: async (sponsorId: string): Promise<Campaign[]> => { return []; },
  submitCampaignForApproval: async (campaignData: Omit<Campaign, 'id'|'views'|'clicks'|'status'|'transactionId'>, transactionId: string) => {},
  getRandomActiveCampaign: async (): Promise<Campaign | null> => { return null; },
  getStories: async (currentUserId: string): Promise<any[]> => { return []; },
  markStoryAsViewed: async (storyId: string, userId: string) => {},
  createStory: async (storyData: Partial<Story>, mediaFile: File | null): Promise<Story | null> => { return null; },
  getGroupById: async (groupId: string): Promise<Group | null> => { return null; },
  getSuggestedGroups: async (userId: string): Promise<Group[]> => { return []; },
  createGroup: async (creator: User, name: string, description: string, coverPhotoUrl: string, privacy: 'public' | 'private', requiresApproval: boolean, category: any): Promise<Group | null> => { return null; },
  joinGroup: async (userId: string, groupId: string, answers?: string[]): Promise<boolean> => { return true; },
  leaveGroup: async (userId: string, groupId: string): Promise<boolean> => { return true; },
  getPostsForGroup: async (groupId: string): Promise<Post[]> => { return []; },
  updateGroupSettings: async (groupId: string, settings: Partial<Group>): Promise<boolean> => { return true; },
  pinPost: async (groupId: string, postId: string): Promise<boolean> => { return true; },
  unpinPost: async (groupId: string): Promise<boolean> => { return true; },
  voteOnPoll: async (userId: string, postId: string, optionIndex: number): Promise<Post | null> => { return null; },
  markBestAnswer: async (userId: string, postId: string, commentId: string): Promise<Post | null> => { return null; },
  inviteFriendToGroup: async (groupId: string, friendId: string): Promise<boolean> => { return true; },
  getGroupChat: async (groupId: string): Promise<GroupChat | null> => { return null; },
  sendGroupChatMessage: async (groupId: string, sender: User, text: string): Promise<any> => { return {}; },
  getGroupEvents: async (groupId: string): Promise<Event[]> => { return []; },
  createGroupEvent: async (creator: User, groupId: string, title: string, description: string, date: string): Promise<Event | null> => { return null; },
  rsvpToEvent: async (userId: string, eventId: string): Promise<boolean> => { return true; },
  adminLogin: async (email: string, password: string): Promise<AdminUser | null> => { return null; },
  adminRegister: async (email: string, password: string): Promise<AdminUser | null> => { return null; },
  getAdminDashboardStats: async (): Promise<any> => { return {}; },
  updateUserRole: async (userId: string, newRole: 'admin' | 'user'): Promise<boolean> => { return true; },
  getPendingCampaigns: async (): Promise<Campaign[]> => { return []; },
  approveCampaign: async (campaignId: string) => {},
  rejectCampaign: async (campaignId: string, reason: string) => {},
  getAllPostsForAdmin: async (): Promise<Post[]> => { return []; },
  deletePostAsAdmin: async (postId: string): Promise<boolean> => { return true; },
  deleteCommentAsAdmin: async (commentId: string, postId: string): Promise<boolean> => { return true; },
  getPostById: async (postId: string): Promise<Post | null> => { return null; },
  getPendingReports: async (): Promise<Report[]> => { return []; },
  resolveReport: async (reportId: string, resolution: string) => {},
  banUser: async (userId: string): Promise<boolean> => { return true; },
  unbanUser: async (userId: string): Promise<boolean> => { return true; },
  warnUser: async (userId: string, message: string): Promise<boolean> => { return true; },
  suspendUserCommenting: async (userId: string, days: number): Promise<boolean> => { return true; },
  liftUserCommentingSuspension: async (userId: string): Promise<boolean> => { return true; },
  suspendUserPosting: async (userId: string, days: number): Promise<boolean> => { return true; },
  liftUserPostingSuspension: async (userId: string): Promise<boolean> => { return true; },
  getUserDetailsForAdmin: async (userId: string): Promise<any> => { return {}; },
  sendSiteWideAnnouncement: async (message: string): Promise<boolean> => { return true; },
  getAllCampaignsForAdmin: async (): Promise<Campaign[]> => { return []; },
  verifyCampaignPayment: async (campaignId: string, adminId: string): Promise<boolean> => { return true; },
  adminUpdateUserProfilePicture: async (userId: string, base64: string): Promise<User | null> => { return null; },
  reactivateUserAsAdmin: async (userId: string): Promise<boolean> => { return true; },
  promoteGroupMember: async (groupId: string, userToPromote: User, newRole: 'Admin' | 'Moderator'): Promise<boolean> => { return true; },
  demoteGroupMember: async (groupId: string, userToDemote: User, oldRole: 'Admin' | 'Moderator'): Promise<boolean> => { return true; },
  removeGroupMember: async (groupId: string, userToRemove: User): Promise<boolean> => { return true; },
  approveJoinRequest: async (groupId: string, userId: string) => {},
  rejectJoinRequest: async (groupId: string, userId: string) => {},
  approvePost: async (postId: string) => {},
  rejectPost: async (postId: string) => {},
  getLeadsForCampaign: async (campaignId: string): Promise<Lead[]> => { return []; },
};
