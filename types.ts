

export interface Author {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
}

export interface User extends Author {
    email: string;
    password?: string; // Should not be sent to client
    bio: string;
    coverPhotoUrl: string; // FIX: Added missing property
    work?: string;
    education?: string;
    currentCity?: string;
    hometown?: string;
    relationshipStatus?: 'Single' | 'In a relationship' | 'Engaged' | 'Married' | "It's complicated" | 'Prefer not to say';
    voiceCoins: number;
    friendIds: string[];
    blockedUserIds: string[];
    privacySettings: {
        postVisibility: 'public' | 'friends';
        friendRequestPrivacy: 'everyone' | 'friends_of_friends';
    };
    notificationSettings: {
        likes: boolean;
        comments: boolean;
        friendRequests: boolean;
        campaignUpdates: boolean;
        groupPosts: boolean;
    };
    role: 'user' | 'admin';
    isDeactivated?: boolean;
    isBanned?: boolean;
    onlineStatus: 'online' | 'offline';
    lastActiveTimestamp?: string;
    commentingSuspendedUntil?: string;
    postingSuspendedUntil?: string;
    friendshipStatus?: FriendshipStatus; // For friend suggestions
}

export interface Post {
    id: string;
    author: Author;
    caption: string;
    captionStyle?: {
        fontFamily: string;
        fontWeight: 'normal' | 'bold';
        fontStyle: 'normal' | 'italic';
    };
    audioUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    duration: number;
    createdAt: string;
    reactions: { [userId: string]: string }; // userId: emoji
    commentCount: number;
    comments: Comment[];
    // Sponsorship
    isSponsored?: boolean;
    sponsorName?: string;
    campaignId?: string;
    websiteUrl?: string;
    allowDirectMessage?: boolean;
    allowLeadForm?: boolean;
    sponsorId?: string;
    sponsorAvatar?: string;
    // Special post types
    postType?: 'audio' | 'image' | 'video' | 'text' | 'profile_picture_change' | 'cover_photo_change' | 'announcement' | 'question';
    newPhotoUrl?: string; // For profile/cover photo change posts
    imagePrompt?: string; // For AI generated images
    // Group related
    groupId?: string;
    groupName?: string;
    status?: 'pending' | 'approved';
    poll?: Poll;
    bestAnswerId?: string;
}

export interface Comment {
    id: string;
    author: Author;
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
    duration: number;
    createdAt: string;
    reactions: { [userId: string]: string };
    postId: string;
    parentId: string | null;
    type: 'text' | 'image' | 'audio';
}

export enum AppView {
    AUTH,
    FEED,
    EXPLORE,
    REELS,
    CREATE_POST,
    CREATE_REEL,
    CREATE_COMMENT,
    PROFILE,
    SETTINGS,
    POST_DETAILS,
    FRIENDS,
    SEARCH_RESULTS,
    CONVERSATIONS,
    ADS_CENTER,
    ROOMS_HUB,
    ROOMS_LIST,
    LIVE_ROOM,
    VIDEO_ROOMS_LIST,
    LIVE_VIDEO_ROOM,
    GROUPS_HUB,
    GROUP_PAGE,
    MANAGE_GROUP,
    GROUP_CHAT,
    GROUP_EVENTS,
    CREATE_EVENT,
    CREATE_STORY,
    STORY_VIEWER,
    STORY_PRIVACY,
    GROUP_INVITE,
    MOBILE_MENU
}

export enum FriendshipStatus {
    NOT_FRIENDS = 'not_friends',
    REQUEST_SENT = 'request_sent',
    PENDING_APPROVAL = 'pending_approval',
    FRIENDS = 'friends',
}

export enum VoiceState {
    IDLE = 'idle',
    LISTENING = 'listening',
    PROCESSING = 'processing',
}

export enum AuthMode {
    LOGIN,
    SIGNUP_FULLNAME,
    SIGNUP_USERNAME,
    SIGNUP_EMAIL,
    SIGNUP_PASSWORD,
    SIGNUP_CONFIRM_PASSWORD,
}

export enum RecordingState {
    IDLE,
    RECORDING,
    PREVIEW,
    UPLOADING,
    POSTED,
}

export type ScrollState = 'up' | 'down' | 'none';

export interface Notification {
    id: string;
    user: Author;
    type: 'like' | 'comment' | 'friend_request' | 'friend_request_approved' | 'campaign_approved' | 'campaign_rejected' | 'group_post' | 'group_join_request' | 'group_request_approved' | 'admin_announcement' | 'admin_warning';
    post?: { id: string, caption?: string };
    read: boolean;
    createdAt: string;
    // Optional fields
    campaignName?: string;
    rejectionReason?: string;
    groupId?: string;
    groupName?: string;
    message?: string;
}

export interface Campaign {
    id: string;
    sponsorId: string;
    sponsorName: string;
    caption: string;
    budget: number;
    views: number;
    clicks: number;
    status: 'pending' | 'active' | 'finished' | 'rejected';
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    websiteUrl?: string;
    allowDirectMessage: boolean;
    allowLeadForm: boolean;
    createdAt: string;
    paymentStatus: 'pending' | 'verified' | 'failed';
    paymentVerifiedBy?: string;
    transactionId: string;
    adType: 'feed' | 'story';
    targeting: {
        location?: string;
        gender?: 'Male' | 'Female' | 'All';
        ageRange?: string;
        interests?: string[];
    }
}

export interface NLUResponse {
    intent: string;
    slots?: { [key: string]: string | number };
}

export type ChatTheme = 'default' | 'sunset' | 'ocean' | 'forest' | 'classic';

export interface Message {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'audio';
  text?: string;
  mediaUrl?: string;
  duration?: number;
  createdAt: string;
  isDeleted?: boolean;
  reactions?: { [userId: string]: string };
  replyTo?: ReplyInfo;
}

export interface Conversation {
  peer: User;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface ChatSettings {
  theme: ChatTheme;
}

export interface LiveAudioRoom {
    id: string;
    topic: string;
    host: User;
    speakers: User[];
    listeners: User[];
    raisedHands: string[];
    createdAt: string;
}

export interface LiveVideoRoom {
    id: string;
    topic: string;
    host: User;
    participants: VideoParticipantState[];
    createdAt: string;
}

export interface VideoParticipantState extends User {
    isMuted: boolean;
    isCameraOff: boolean;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    coverPhotoUrl: string;
    creator: User;
    admins: User[];
    moderators: User[];
    members: User[];
    memberCount: number;
    privacy: 'public' | 'private';
    requiresApproval: boolean;
    createdAt: string;
    category: GroupCategory;
    joinQuestions?: string[];
    joinRequests?: JoinRequest[];
    pendingPosts?: Post[];
    invitedUserIds?: string[];
    pinnedPostId?: string;
    topContributorIds?: string[];
}

export interface Event {
    id: string;
    groupId: string;
    title: string;
    description: string;
    date: string; // ISO string
    creator: User;
    attendees: User[];
}

export interface GroupChat {
    id: string; // Same as groupId
    messages: (Message & { sender: User })[];
}

export interface JoinRequest {
    user: User;
    answers?: string[];
    requestedAt: string;
}

export type GroupCategory = 'General' | 'Food' | 'Gaming' | 'Music' | 'Technology' | 'Travel' | 'Art & Culture' | 'Sports';

// FIX: Added missing type definition for GroupRole.
export type GroupRole = 'Admin' | 'Moderator' | 'Top Contributor';

export interface MusicTrack {
    id: string;
    title: string;
    artist: string;
    language: 'bangla' | 'hindi';
    url: string;
}

export interface Story {
    id: string;
    author: Author;
    type: 'image' | 'video' | 'text' | 'voice';
    contentUrl?: string; // for image, video, voice
    text?: string; // for text
    textStyle?: StoryTextStyle;
    duration: number; // in seconds
    createdAt: string;
    viewedBy: string[];
    music?: MusicTrack;
    privacy: StoryPrivacy;
    isSponsored?: boolean;
    sponsorName?: string;
    sponsorAvatar?: string;
    ctaLink?: string;
}

export interface StoryTextStyle {
    name: string;
    backgroundColor: string;
    fontFamily: string;
    color: