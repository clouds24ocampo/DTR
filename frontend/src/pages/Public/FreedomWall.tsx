import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Heart,
  Laugh,
  Sparkles,
  Frown,
  ThumbsUp,
  Send,
  ArrowLeft,
  MessageCircle,
  LogIn,
  X,
  Bell,
  Trophy,
  Trash2,
  Search,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Upload,
  Loader2,
  Paperclip,
  FileText,
  Repeat2,
  Pencil,
} from "lucide-react";
import { uploadFileInChunks } from "../../utils/global/chunkUploader";
import useAuthStore from "../../stores/auth/auth.store";
import Masonry from "react-masonry-css";
import { motion } from "framer-motion";

const ACTOR_ID_KEY = "freedom_wall_actor_id";
const API = import.meta.env.VITE_API_URL as string;
const SORTS_BASE = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "mostReacted", label: "Most reacted" },
  { value: "mostCommented", label: "Most commented" },
  { value: "random", label: "Random" },
] as const;

const SORT_MINE = { value: "mine", label: "My posts" } as const;

type SortBase = (typeof SORTS_BASE)[number]["value"];
type Sort = SortBase | typeof SORT_MINE.value;

type Reactions = { like: number; love: number; laugh: number; wow: number; sad: number };

export type WallAttachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

export type WallPost = {
  _id: string;
  content: string;
  createdAt: string;
  isAnonymous: boolean;
  authorDisplayName: string;
  authorUserId?: string;
  commentCount: number;
  views?: number;
  reactions: Reactions;
  totalReactions: number;
  reactionActors: Record<string, string>;
  repost?: {
    rootPostId: string;
    authorDisplayName: string;
    createdAt: string;
    content: string;
    attachments: WallAttachment[];
  };
  comments?: {
    _id: string;
    body: string;
    createdAt: string;
    isAnonymous: boolean;
    authorDisplayName: string;
  authorUserId?: string;
  reactions?: Reactions;
  totalReactions?: number;
  reactionActors?: Record<string, string>;
    attachments?: WallAttachment[];
  }[];
  attachments?: WallAttachment[];
};

export type WallNotify =
  | {
      kind: "reaction";
      postId: string;
      postExcerpt: string;
      type: keyof Reactions;
      at: number;
      id: string;
    }
  | {
      kind: "comment";
      postId: string;
      postExcerpt: string;
      commentExcerpt: string;
      authorDisplayName: string;
      at: number;
      id: string;
    };

function getOrCreateActorId(): string {
  try {
    let id = localStorage.getItem(ACTOR_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `g-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ACTOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `g-${Date.now()}`;
  }
}

const FREEDOM_WALL_UPLOAD_FOLDER = "hrms/freedom-wall";
const FREEDOM_WALL_COMMENT_UPLOAD_FOLDER = "hrms/freedom-wall/comments";
const MAX_WALL_ATTACHMENTS = 10;
const MAX_COMMENT_ATTACHMENTS = 5;
const MAX_WALL_FILE_BYTES = 500 * 1024 * 1024; // 500 MB (chunked upload)
const MAX_COMMENT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per comment attachment
/** Posts per request — more load as user scrolls */
const FEED_PAGE_SIZE = 18;
const SCROLL_LOAD_THRESHOLD_PX = 520;

const ACCEPT_WALL_FILES =
  "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.zip";

/** New wall posts: images, documents, and video. Comments can still use video. */
const ACCEPT_POST_IMAGE_AND_FILE =
  "image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,application/zip,application/octet-stream,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic,.mp4";

const POST_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);

const POST_IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
  "avif",
]);

function isAllowedPostAttachment(file: File): boolean {
  // Allow any video type for posts (size is checked elsewhere)
  if (file.type.startsWith("video/")) return true;
  if (file.type.startsWith("image/")) return true;
  if (POST_FILE_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (POST_IMAGE_EXT.has(ext)) return true;
  return ["pdf", "doc", "docx", "xls", "xlsx", "zip", "txt", "csv"].includes(ext);
}

function isImageType(mime: string) {
  return /^image\//i.test(mime);
}
function isVideoType(mime: string) {
  return /^video\//i.test(mime);
}

function SmoothWallImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  return (
    <div
      className={`fw-smooth-media w-full overflow-hidden rounded-lg ${ready ? "fw-smooth-media--ready" : ""}`}
    >
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onLoad={() => setReady(true)}
      />
    </div>
  );
}

function SmoothWallVideo({
  src,
  className,
  videoProps,
}: {
  src: string;
  className?: string;
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
}) {
  const [ready, setReady] = useState(false);
  return (
    <div
      className={`fw-smooth-media w-full overflow-hidden rounded-lg ${ready ? "fw-smooth-media--ready" : ""}`}
    >
      <video
        src={src}
        className={`block w-full max-w-full h-auto ${className ?? ""}`}
        onLoadedData={() => setReady(true)}
        {...videoProps}
      />
    </div>
  );
}

const CAROUSEL_AUTO_MS = 2000;

function WallAttachmentCarousel({
  postId,
  attachments,
}: {
  postId: string;
  attachments: WallAttachment[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = attachments.length;

  useEffect(() => {
    setIndex(0);
  }, [postId]);

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, CAROUSEL_AUTO_MS);
    return () => clearInterval(t);
  }, [n, paused, postId]);

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + n) % n);
  };

  const slide = (a: WallAttachment, active: boolean) => (
    <div className="min-w-full shrink-0 px-0.5">
      <div className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/50">
        {isImageType(a.type) ? (
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
            <SmoothWallImg
              src={a.url}
              alt={a.name}
              className="block w-full h-auto"
            />
          </a>
        ) : isVideoType(a.type) ? (
          active ? (
            <SmoothWallVideo
              src={a.url}
              className="w-full bg-black"
              videoProps={{
                loop: true,
                controls: true,
                preload: "metadata",
                playsInline: true,
                autoPlay: true,
                muted: true,
              }}
            />
          ) : (
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[8rem] items-center justify-center bg-black/90 text-xs text-slate-400"
            >
              ▶ Video — tap to open
            </a>
          )
        ) : (
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[4rem] items-center gap-2 p-3 text-sm text-cyan-400 hover:underline"
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{a.name}</span>
          </a>
        )}
      </div>
    </div>
  );

  if (n === 1) {
    const a = attachments[0];
    return (
      <div className="overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/50">
        {isImageType(a.type) ? (
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
            <SmoothWallImg src={a.url} alt={a.name} className="block w-full h-auto" />
          </a>
        ) : isVideoType(a.type) ? (
          <SmoothWallVideo
            src={a.url}
            className="w-full bg-black"
            videoProps={{
              loop: true,
              controls: true,
              preload: "auto",
              playsInline: true,
              autoPlay: true,
              muted: true,
            }}
          />
        ) : (
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 text-sm text-cyan-400 hover:underline"
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{a.name}</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-lg border border-slate-700/80 bg-slate-900/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        window.setTimeout(() => setPaused(false), 2500);
      }}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {attachments.map((a, i) => (
            <React.Fragment key={`${postId}-car-${i}`}>{slide(a, i === index)}</React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-0.5 border-t border-slate-700/60 bg-slate-900/80 px-0.5 py-0.5 sm:gap-1 sm:px-1 sm:py-1.5">
        <button
          type="button"
          aria-label="Previous"
          className="rounded-md p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white sm:p-1"
          onClick={() => go(-1)}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          {attachments.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1} of ${n}`}
              aria-current={i === index}
              className={`rounded-full transition-all duration-300${
                i === index
                  ? "h-1 w-3 bg-cyan-500 sm:h-1.5 sm:w-5"
                  : "h-1 !w-3 bg-slate-600 hover:bg-slate-500 sm:h-1.5 sm:w-10"
              }`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next"
          className="rounded-md p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white sm:p-1"
          onClick={() => go(1)}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
      <p className="border-t border-slate-700/40 px-2 py-0.5 text-center text-[9px] leading-tight text-slate-500 sm:py-1 sm:text-[10px] sm:leading-normal">
        {index + 1} / {n}
        {paused ? " · paused" : ` · auto ${CAROUSEL_AUTO_MS / 1000}s`}
      </p>
    </div>
  );
}

function normalizeWallPostReactions(p: WallPost): WallPost {
  const n = (v: unknown) => Math.max(0, Math.floor(Number(v)) || 0);
  const r = p.reactions || ({} as Reactions);
  const reactions: Reactions = {
    like: n(r.like),
    love: n(r.love),
    laugh: n(r.laugh),
    wow: n(r.wow),
    sad: n(r.sad),
  };
  const totalReactions =
    reactions.like + reactions.love + reactions.laugh + reactions.wow + reactions.sad;
  return { ...p, reactions, totalReactions };
}

const REACTION_CONFIG: { type: keyof Reactions; icon: React.ReactNode; label: string }[] = [
  { type: "like", icon: <ThumbsUp className="h-3 w-3 shrink-0" strokeWidth={2} />, label: "Like" },
  { type: "love", icon: <Heart className="h-3 w-3 shrink-0" strokeWidth={2} />, label: "Love" },
  { type: "laugh", icon: <Laugh className="h-3 w-3 shrink-0" strokeWidth={2} />, label: "Laugh" },
  { type: "wow", icon: <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2} />, label: "Wow" },
  { type: "sad", icon: <Frown className="h-3 w-3 shrink-0" strokeWidth={2} />, label: "Sad" },
];

export default function FreedomWall() {
  const account = useAuthStore((s) => s.account);
  const login = useAuthStore((s) => s.login);
  const loginLoading = useAuthStore((s) => s.loginLoading);
  const actorId = useMemo(() => getOrCreateActorId(), []);
  const socketRef = useRef<Socket | null>(null);
  const viewCountedPostIdsRef = useRef<Set<string>>(new Set());
  const viewObserverRef = useRef<IntersectionObserver | null>(null);
  const registerPostForViewRef = useRef<(postId: string, el: HTMLElement | null) => void>(() => {});
  const [connected, setConnected] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const sortRef = useRef(sort);
  sortRef.current = sort;
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const feedLoadingMoreRef = useRef(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [content, setContent] = useState("");
  const [postAnonymous, setPostAnonymous] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentAttachmentDrafts, setCommentAttachmentDrafts] = useState<Record<string, WallAttachment[]>>(
    {}
  );
  const [commentUploadingPostId, setCommentUploadingPostId] = useState<string | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const commentFilePostIdRef = useRef<string | null>(null);
  const [commentAnonymous, setCommentAnonymous] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<WallNotify[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const [postAttachments, setPostAttachments] = useState<WallAttachment[]>([]);
  const [postUploading, setPostUploading] = useState(false);
  const [postUploadError, setPostUploadError] = useState<string | null>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const scrollToPostAfterLoadRef = useRef<{ postId: string; expandComments: boolean } | null>(null);
  const modalBackdropRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopFeedScrollRef = useRef<HTMLDivElement>(null);
  const [showMobileBackToTop, setShowMobileBackToTop] = useState(false);
  const [showDesktopBackToTop, setShowDesktopBackToTop] = useState(false);
  const FEED_BACK_TOP_AFTER = 280;

  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [repostTargetPostId, setRepostTargetPostId] = useState<string | null>(null);
  const [repostCaption, setRepostCaption] = useState("");
  const [repostAnonymous, setRepostAnonymous] = useState(true);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetPost, setEditTargetPost] = useState<WallPost | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editAnonymous, setEditAnonymous] = useState(false);
  const [editAttachments, setEditAttachments] = useState<WallAttachment[]>([]);
  const [editUploading, setEditUploading] = useState(false);
  const [editUploadError, setEditUploadError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<"reacted" | "views" | "uploaders">("reacted");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardMostReactedPosts, setLeaderboardMostReactedPosts] = useState<WallPost[]>([]);
  const [leaderboardMostViewedPosts, setLeaderboardMostViewedPosts] = useState<WallPost[]>([]);
  const [leaderboardTopUploaders, setLeaderboardTopUploaders] = useState<
    Array<{ key: string; authorDisplayName: string; authorUserId?: string; posts: number }>
  >([]);
  const [leaderboardSelectedUploader, setLeaderboardSelectedUploader] = useState<{
    key: string;
    authorDisplayName: string;
    authorUserId?: string;
    posts: number;
  } | null>(null);
  const [leaderboardUploaderPosts, setLeaderboardUploaderPosts] = useState<WallPost[]>([]);
  const [leaderboardUploaderPostsLoading, setLeaderboardUploaderPostsLoading] = useState(false);
  const [leaderboardUploaderPostsError, setLeaderboardUploaderPostsError] = useState<string | null>(null);

  // Comment reactions — stored in DB, per comment; we track only current actor's choice
  const [commentReactions, setCommentReactions] = useState<Record<string, keyof Reactions | undefined>>({});
  const [openCommentReactionPickerId, setOpenCommentReactionPickerId] = useState<string | null>(null);
  const commentLongPressTimerRef = useRef<number | null>(null);

  /** lg+ = desktop sidebar layout; <lg = mobile sticky + single scroll (one post list in DOM) */
  const [desktopLayout, setDesktopLayout] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const fn = () => setDesktopLayout(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const tryLoadMoreFeed = useCallback(() => {
    if (!feedHasMore || feedLoadingMoreRef.current || loading) return;
    const el =
      desktopLayout && desktopFeedScrollRef.current
        ? desktopFeedScrollRef.current
        : mobileScrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_LOAD_THRESHOLD_PX;
    if (!nearBottom) return;
    feedLoadingMoreRef.current = true;
    setFeedLoadingMore(true);
    const skip = posts.length;
    const params: Record<string, string | number> = { limit: FEED_PAGE_SIZE, skip };
    const appendNormalized = (list: WallPost[]) => {
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p._id));
        const merged = [...prev];
        for (const p of list.map(normalizeWallPostReactions)) {
          if (!seen.has(p._id)) {
            seen.add(p._id);
            merged.push(p);
          }
        }
        return merged;
      });
    };
    (async () => {
      try {
        if (searchApplied.trim().length >= 2) {
          const { data } = await axios.get<{ posts: WallPost[]; hasMore?: boolean }>(
            `${API}/api/freedom-wall/posts/search`,
            {
              params: { q: searchApplied.trim(), ...params },
              withCredentials: true,
            }
          );
          appendNormalized(data.posts || []);
          setFeedHasMore(data.hasMore !== false && (data.posts?.length || 0) >= FEED_PAGE_SIZE);
        } else if (sortRef.current === "mine") {
          const { data } = await axios.get<{ posts: WallPost[]; hasMore?: boolean }>(
            `${API}/api/freedom-wall/posts/mine`,
            { params, withCredentials: true }
          );
          appendNormalized(data.posts || []);
          setFeedHasMore(data.hasMore !== false && (data.posts?.length || 0) >= FEED_PAGE_SIZE);
        } else {
          const { data } = await axios.get<{ posts: WallPost[]; hasMore?: boolean }>(
            `${API}/api/freedom-wall/posts`,
            { params: { sort: sortRef.current, ...params }, withCredentials: true }
          );
          appendNormalized(data.posts || []);
          setFeedHasMore(data.hasMore !== false && (data.posts?.length || 0) >= FEED_PAGE_SIZE);
        }
      } catch {
        setFeedHasMore(false);
      } finally {
        feedLoadingMoreRef.current = false;
        setFeedLoadingMore(false);
      }
    })();
  }, [feedHasMore, loading, posts.length, searchApplied, desktopLayout]);

  const onMobileScroll = useCallback(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    setShowMobileBackToTop(el.scrollTop > FEED_BACK_TOP_AFTER);
    tryLoadMoreFeed();
  }, [tryLoadMoreFeed]);

  const onDesktopFeedScroll = useCallback(() => {
    const el = desktopFeedScrollRef.current;
    if (!el) return;
    setShowDesktopBackToTop(el.scrollTop > FEED_BACK_TOP_AFTER);
    tryLoadMoreFeed();
  }, [tryLoadMoreFeed]);

  const displayName = account
    ? [account.firstName, account.lastName].filter(Boolean).join(" ") || account.email
    : "";

  const sortOptions = useMemo(
    () => (account ? [...SORTS_BASE, SORT_MINE] : [...SORTS_BASE]),
    [account]
  );

  const loadFreedomWallNotifications = useCallback(async () => {
    if (!account?._id) {
      setNotifications([]);
      return;
    }
    setNotifLoading(true);
    try {
      const { data } = await axios.get<{
        notifications: Array<{
          id: string;
          kind: string;
          postId: string;
          postExcerpt: string;
          type?: keyof Reactions;
          commentExcerpt?: string;
          authorDisplayName?: string;
          at: number;
        }>;
      }>(`${API}/api/freedom-wall/notifications`, { params: { limit: 100 }, withCredentials: true });
      const list: WallNotify[] = [];
      for (const n of data.notifications || []) {
        if (n.kind === "reaction" && n.type) {
          list.push({
            kind: "reaction",
            id: n.id,
            postId: n.postId,
            postExcerpt: n.postExcerpt || "",
            type: n.type,
            at: n.at,
          });
        } else if (n.kind === "comment") {
          list.push({
            kind: "comment",
            id: n.id,
            postId: n.postId,
            postExcerpt: n.postExcerpt || "",
            commentExcerpt: n.commentExcerpt || "",
            authorDisplayName: n.authorDisplayName || "Someone",
            at: n.at,
          });
        }
      }
      setNotifications(list);
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, [account?._id]);

  useEffect(() => {
    loadFreedomWallNotifications();
  }, [loadFreedomWallNotifications]);

  const clearAllNotifications = useCallback(async () => {
    if (!account?._id) {
      setNotifications([]);
      return;
    }
    try {
      await axios.delete(`${API}/api/freedom-wall/notifications`, { withCredentials: true });
      setNotifications([]);
      toast.success("Notifications cleared");
    } catch {
      toast.error("Could not clear notifications");
    }
  }, [account?._id]);

  const fetchPosts = useCallback(async (s: Sort) => {
    setLoading(true);
    setFeedHasMore(true);
    feedLoadingMoreRef.current = false;
    try {
      const params = { limit: FEED_PAGE_SIZE, skip: 0 };
      if (s === "mine") {
        const { data } = await axios.get<{ posts: WallPost[]; hasMore?: boolean }>(
          `${API}/api/freedom-wall/posts/mine`,
          { params, withCredentials: true }
        );
        const list = (data.posts || []).map(normalizeWallPostReactions);
        setPosts(list);
        setFeedHasMore(data.hasMore !== false && list.length >= FEED_PAGE_SIZE);
      } else {
        const { data } = await axios.get<{ posts: WallPost[]; hasMore?: boolean }>(
          `${API}/api/freedom-wall/posts`,
          { params: { sort: s, ...params }, withCredentials: true }
        );
        const list = (data.posts || []).map(normalizeWallPostReactions);
        setPosts(list);
        setFeedHasMore(data.hasMore !== false && list.length >= FEED_PAGE_SIZE);
      }
    } catch {
      setPosts([]);
      setFeedHasMore(false);
      if (s === "mine") {
        toast.error("Sign in to view your posts.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSearchApplied("");
      fetchPosts(sort);
      return;
    }
    setLoading(true);
    setSearchApplied(trimmed);
    setFeedHasMore(true);
    feedLoadingMoreRef.current = false;
    try {
      const { data } = await axios.get<{ posts: WallPost[]; hasMore?: boolean }>(
        `${API}/api/freedom-wall/posts/search`,
        { params: { q: trimmed, limit: FEED_PAGE_SIZE, skip: 0 }, withCredentials: true }
      );
      const list = (data.posts || []).map(normalizeWallPostReactions);
      setPosts(list);
      setFeedHasMore(data.hasMore !== false && list.length >= FEED_PAGE_SIZE);
    } catch {
      setPosts([]);
      setFeedHasMore(false);
      toast.error("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [fetchPosts, sort]);

  useEffect(() => {
    if (searchApplied) return;
    fetchPosts(sort);
  }, [sort, fetchPosts, searchApplied]);

  useEffect(() => {
    const t = searchInput.trim();
    if (t.length === 0) {
      if (searchApplied) {
        setSearchApplied("");
        fetchPosts(sort);
      }
      return;
    }
    if (t.length < 2) return;
    const id = setTimeout(() => runSearch(t), 320);
    return () => clearTimeout(id);
  }, [searchInput, runSearch, searchApplied, sort, fetchPosts]);

  useEffect(() => {
    if (!account && sort === "mine") setSort("newest");
  }, [account, sort]);

  useEffect(() => {
    if (!highlightPostId) return;
    const t = window.setTimeout(() => setHighlightPostId(null), 4500);
    return () => window.clearTimeout(t);
  }, [highlightPostId]);

  /** After loading posts (e.g. switched to Newest), scroll to pending post */
  useEffect(() => {
    const pending = scrollToPostAfterLoadRef.current;
    if (!pending || loading) return;
    const el = document.getElementById(`freedom-wall-post-${pending.postId}`);
    if (el) {
      scrollToPostAfterLoadRef.current = null;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [posts, loading]);

  const goToPostFromNotification = useCallback(
    (postId: string, expandComments: boolean, opts?: { allowPrependIfMissing?: boolean }) => {
      const allowPrependIfMissing = opts?.allowPrependIfMissing !== false;
      setNotifOpen(false);
      setHighlightPostId(postId);
      if (expandComments) {
        setExpandedComments((e) => ({ ...e, [postId]: true }));
      }
      const runScroll = () => {
        const el = document.getElementById(`freedom-wall-post-${postId}`);
        if (el) {
          scrollToPostAfterLoadRef.current = null;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          return true;
        }
        return false;
      };
      requestAnimationFrame(() => {
        if (runScroll()) return;
        const inList = posts.some((p) => p._id === postId);
        if (!inList) {
          (async () => {
            try {
              const { data } = await axios.get<{ post: WallPost }>(
                `${API}/api/freedom-wall/posts/${postId}`,
                { withCredentials: true }
              );
              const fetched = data?.post ? normalizeWallPostReactions(data.post) : null;
              if (fetched?._id) {
                scrollToPostAfterLoadRef.current = { postId, expandComments };
                if (allowPrependIfMissing) {
                  setPosts((prev) => {
                    if (prev.some((p) => p._id === fetched._id)) return prev;
                    return [fetched, ...prev];
                  });
                } else {
                  // Avoid "popup at top": append the fetched post so order feels natural,
                  // then scroll to it once it mounts.
                  setPosts((prev) => {
                    if (prev.some((p) => p._id === fetched._id)) return prev;
                    return [...prev, fetched];
                  });
                  setTimeout(runScroll, 50);
                }
                return;
              }
            } catch {
              // fall back to switching sort so the user can scroll-load it
            }
            scrollToPostAfterLoadRef.current = { postId, expandComments };
            setSort("newest");
            toast.success("Loading that post…", { duration: 2500 });
          })();
        } else {
          setTimeout(runScroll, 100);
        }
      });
    },
    [posts]
  );

  useEffect(() => {
    if (account) setPostAnonymous(false);
  }, [account?._id]);

  useEffect(() => {
    if (account) setRepostAnonymous(false);
  }, [account?._id]);

  useEffect(() => {
    const socket = io(`${API}/freedom-wall`, {
      path: "/socket.io",
      transports: ["websocket"],
      withCredentials: true,
      auth: {
        token: localStorage.getItem("auth-token") || undefined,
      },
    });
    socketRef.current = socket;
    const onConnect = () => {
      setConnected(true);
      socket.emit("freedom-wall:join");
    };
    const onDisconnect = () => setConnected(false);
    const onNew = (post: WallPost) => {
      const normalized = normalizeWallPostReactions(post);
      setPosts((prev) => {
        if (prev.some((p) => p._id === post._id)) return prev;
        if (sortRef.current === "mine") {
          if (account?._id && post.authorUserId === account._id) return [normalized, ...prev];
          return prev;
        }
        if (sortRef.current === "newest") return [normalized, ...prev];
        return [normalized, ...prev];
      });
    };
    const onReaction = (payload: {
      postId: string;
      reactions: Reactions;
      reactionActors: Record<string, string>;
      totalReactions: number;
    }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p._id === payload.postId
            ? normalizeWallPostReactions({
                ...p,
                reactions: payload.reactions,
                reactionActors: payload.reactionActors,
                totalReactions: payload.totalReactions,
              })
            : p
        )
      );
    };
    const onComment = (payload: {
      postId: string;
      commentCount: number;
      comment: WallPost["comments"] extends (infer C)[] | undefined ? C : never;
    }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id !== payload.postId) return p;
          const comments = [...(p.comments || []), payload.comment];
          return { ...p, commentCount: payload.commentCount, comments };
        })
      );
    };
    const onCommentReaction = (payload: {
      postId: string;
      commentId: string;
      reactions: Reactions;
      reactionActors: Record<string, string>;
      totalReactions: number;
    }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id !== payload.postId) return p;
          const comments = (p.comments || []).map((c) =>
            c._id === payload.commentId
              ? {
                  ...c,
                  reactions: payload.reactions,
                  reactionActors: payload.reactionActors,
                  totalReactions: payload.totalReactions,
                }
              : c
          );
          return { ...p, comments };
        })
      );
      // Update local marker for current actor
      const mine = payload.reactionActors?.[actorId] as keyof Reactions | undefined;
      setCommentReactions((prev) => ({
        ...prev,
        [payload.commentId]: mine,
      }));
    };
    const onDeleted = (payload: { postId: string }) => {
      setPosts((prev) => prev.filter((p) => p._id !== payload.postId));
    };
    const onUpdated = (post: WallPost) => {
      const normalized = normalizeWallPostReactions(post);
      setPosts((prev) => prev.map((p) => (p._id === normalized._id ? { ...p, ...normalized } : p)));
    };
    const onNotify = (payload: {
      kind: string;
      postId: string;
      postExcerpt?: string;
      type?: keyof Reactions;
      commentExcerpt?: string;
      authorDisplayName?: string;
      notificationId?: string;
      at?: number;
    }) => {
      const id =
        payload.notificationId ||
        `${payload.kind}-${payload.postId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const at = typeof payload.at === "number" ? payload.at : Date.now();
      if (payload.kind === "reaction" && payload.type) {
        const item: WallNotify = {
          kind: "reaction" as const,
          postId: payload.postId,
          postExcerpt: payload.postExcerpt || "",
          type: payload.type,
          at,
          id,
        };
        setNotifications((n) => {
          if (n.some((x) => x.id === id)) return n;
          return [item, ...n].slice(0, 100);
        });
      } else if (payload.kind === "comment") {
        const item: WallNotify = {
          kind: "comment" as const,
          postId: payload.postId,
          postExcerpt: payload.postExcerpt || "",
          commentExcerpt: payload.commentExcerpt || "",
          authorDisplayName: payload.authorDisplayName || "Someone",
          at,
          id,
        };
        setNotifications((n) => {
          if (n.some((x) => x.id === id)) return n;
          return [item, ...n].slice(0, 100);
        });
      }
    };
    const onView = (payload: { postId: string; views: number }) => {
      const postId = payload?.postId;
      if (!postId) return;
      const views = Math.max(0, Math.floor(Number(payload.views)) || 0);
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, views } : p))
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("freedom-wall:new", onNew);
    socket.on("freedom-wall:reaction", onReaction);
    socket.on("freedom-wall:comment", onComment);
    socket.on("freedom-wall:comment-reaction", onCommentReaction);
    socket.on("freedom-wall:deleted", onDeleted);
    socket.on("freedom-wall:updated", onUpdated);
    socket.on("freedom-wall:notify", onNotify);
    socket.on("freedom-wall:view", onView);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("freedom-wall:new", onNew);
      socket.off("freedom-wall:reaction", onReaction);
      socket.off("freedom-wall:comment", onComment);
      socket.off("freedom-wall:comment-reaction", onCommentReaction);
      socket.off("freedom-wall:deleted", onDeleted);
      socket.off("freedom-wall:updated", onUpdated);
      socket.off("freedom-wall:notify", onNotify);
      socket.off("freedom-wall:view", onView);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [actorId, account?._id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // One observer for all post cards; per-session dedupe via Set.
    if (viewObserverRef.current) {
      viewObserverRef.current.disconnect();
      viewObserverRef.current = null;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const postId = el.dataset.fwPostId || "";
          if (!postId) continue;
          if (viewCountedPostIdsRef.current.has(postId)) continue;
          viewCountedPostIdsRef.current.add(postId);
          socket.emit("freedom-wall:view", { postId });
          obs.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    viewObserverRef.current = obs;

    registerPostForViewRef.current = (postId: string, el: HTMLElement | null) => {
      if (!el) return;
      if (viewCountedPostIdsRef.current.has(postId)) return;
      el.dataset.fwPostId = postId;
      obs.observe(el);
    };

    return () => {
      obs.disconnect();
      viewObserverRef.current = null;
      registerPostForViewRef.current = () => {};
    };
  }, [connected]);

  useEffect(() => {
    if (!loginModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLoginModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [loginModalOpen]);

  useEffect(() => {
    if (!editModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [editModalOpen]);

  useEffect(() => {
    if (!leaderboardOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeaderboardOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [leaderboardOpen]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const [mostReactedRes, mostViewedRes, uploadersRes] = await Promise.allSettled([
        axios.get<{ posts: WallPost[] }>(`${API}/api/freedom-wall/posts`, {
          params: { sort: "mostReacted", limit: 10, skip: 0 },
          withCredentials: true,
        }),
        axios.get<{ posts: WallPost[] }>(`${API}/api/freedom-wall/posts`, {
          params: { sort: "mostViewed", limit: 10, skip: 0 },
          withCredentials: true,
        }),
        axios.get<{
          uploaders: Array<{ key: string; authorDisplayName: string; authorUserId?: string; posts: number }>;
        }>(`${API}/api/freedom-wall/leaderboard/uploaders`, {
          params: { limit: 10 },
          withCredentials: true,
        }),
      ]);

      if (mostReactedRes.status === "fulfilled") {
        setLeaderboardMostReactedPosts((mostReactedRes.value.data.posts || []).map(normalizeWallPostReactions));
      } else {
        setLeaderboardMostReactedPosts([]);
      }

      if (mostViewedRes.status === "fulfilled") {
        setLeaderboardMostViewedPosts((mostViewedRes.value.data.posts || []).map(normalizeWallPostReactions));
      } else {
        setLeaderboardMostViewedPosts([]);
      }

      if (uploadersRes.status === "fulfilled") {
        setLeaderboardTopUploaders(uploadersRes.value.data.uploaders || []);
      } else {
        setLeaderboardTopUploaders([]);
      }

      if (mostReactedRes.status === "rejected" || mostViewedRes.status === "rejected" || uploadersRes.status === "rejected") {
        setLeaderboardError("Some leaderboard sections failed to load. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setLeaderboardError("Failed to load leaderboard. Please try again.");
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!leaderboardOpen) return;
    void loadLeaderboard();
  }, [leaderboardOpen, loadLeaderboard]);

  useEffect(() => {
    if (leaderboardOpen) return;
    setLeaderboardSelectedUploader(null);
    setLeaderboardUploaderPosts([]);
    setLeaderboardUploaderPostsError(null);
    setLeaderboardUploaderPostsLoading(false);
  }, [leaderboardOpen]);

  useEffect(() => {
    if (leaderboardTab !== "uploaders") {
      setLeaderboardSelectedUploader(null);
      setLeaderboardUploaderPosts([]);
      setLeaderboardUploaderPostsError(null);
      setLeaderboardUploaderPostsLoading(false);
    }
  }, [leaderboardTab]);

  const loadLeaderboardUploaderPosts = useCallback(async (uploaderKey: string) => {
    setLeaderboardUploaderPostsLoading(true);
    setLeaderboardUploaderPostsError(null);
    try {
      const { data } = await axios.get<{ posts: WallPost[] }>(
        `${API}/api/freedom-wall/leaderboard/uploader-posts`,
        { params: { key: uploaderKey, limit: 30, skip: 0 }, withCredentials: true }
      );
      setLeaderboardUploaderPosts((data?.posts || []).map(normalizeWallPostReactions));
    } catch (e) {
      console.error(e);
      setLeaderboardUploaderPosts([]);
      setLeaderboardUploaderPostsError("Failed to load uploader posts. Please try again.");
    } finally {
      setLeaderboardUploaderPostsLoading(false);
    }
  }, []);

  const addPostFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => {
      if (!isAllowedPostAttachment(f)) {
        toast.error(`${f.name}: only images and files (no video) on posts`);
        return false;
      }
      return true;
    });
    if (list.length === 0) return;
    setPostUploadError(null);
    const room = MAX_WALL_ATTACHMENTS - postAttachments.length;
    if (room <= 0) {
      toast.error(`Max ${MAX_WALL_ATTACHMENTS} files per post`);
      return;
    }
    const toAdd = list.slice(0, room);
    for (const file of toAdd) {
      if (file.size > MAX_WALL_FILE_BYTES) {
        toast.error(`${file.name} is too large (max 500MB)`);
        return;
      }
    }
    setPostUploading(true);
    try {
      const newItems: WallAttachment[] = [];
      for (const file of toAdd) {
        const url = await uploadFileInChunks(file, FREEDOM_WALL_UPLOAD_FOLDER);
        const u = typeof url === "string" ? url.trim() : "";
        if (!u.startsWith("https://") && !u.startsWith("http://")) {
          throw new Error("Upload did not return a valid URL");
        }
        newItems.push({
          name: file.name,
          url: u,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
      }
      setPostAttachments((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error(err);
      setPostUploadError("Upload failed. Check network or uploader config (VITE_UPLOADER_API_URL).");
      toast.error("Upload failed");
    } finally {
      setPostUploading(false);
      if (postFileInputRef.current) postFileInputRef.current.value = "";
    }
  };

  const openEditModal = (post: WallPost) => {
    if (!account) return;
    setEditTargetPost(post);
    const isAttachmentOnlyCaption =
      post.content?.trim() === "." && (post.attachments?.length ?? 0) > 0;
    const isRepostNoCaption = Boolean(post.repost) && post.content?.trim() === ".";
    setEditCaption(isAttachmentOnlyCaption || isRepostNoCaption ? "" : (post.content || ""));
    setEditAnonymous(Boolean(post.isAnonymous));
    setEditAttachments([...(post.attachments || [])]);
    setEditUploadError(null);
    setEditModalOpen(true);
  };

  const addEditFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => {
      if (!isAllowedPostAttachment(f)) {
        toast.error(`${f.name}: unsupported file type`);
        return false;
      }
      return true;
    });
    if (list.length === 0) return;
    setEditUploadError(null);
    const room = MAX_WALL_ATTACHMENTS - editAttachments.length;
    if (room <= 0) {
      toast.error(`Max ${MAX_WALL_ATTACHMENTS} files per post`);
      return;
    }
    const toAdd = list.slice(0, room);
    for (const file of toAdd) {
      if (file.size > MAX_WALL_FILE_BYTES) {
        toast.error(`${file.name} is too large (max 500MB)`);
        return;
      }
    }
    setEditUploading(true);
    try {
      const newItems: WallAttachment[] = [];
      for (const file of toAdd) {
        const url = await uploadFileInChunks(file, FREEDOM_WALL_UPLOAD_FOLDER);
        const u = typeof url === "string" ? url.trim() : "";
        if (!u.startsWith("https://") && !u.startsWith("http://")) {
          throw new Error("Upload did not return a valid URL");
        }
        newItems.push({
          name: file.name,
          url: u,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
      }
      setEditAttachments((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error(err);
      setEditUploadError("Upload failed. Check network or uploader config (VITE_UPLOADER_API_URL).");
      toast.error("Upload failed");
    } finally {
      setEditUploading(false);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socketRef.current?.connected || !account?._id) return;
    const post = editTargetPost;
    if (!post?._id) return;
    const text = editCaption.trim().slice(0, 5000);
    const att = editAttachments.filter((a) => a.url && (a.url.startsWith("http://") || a.url.startsWith("https://")));
    if ((!text && att.length === 0) || editUploading) return;
    const contentToSend = text || (att.length > 0 ? "." : "");
    socketRef.current.emit("freedom-wall:edit", {
      postId: post._id,
      content: contentToSend,
      isAnonymous: editAnonymous,
      authorDisplayName: editAnonymous ? "Anonymous" : displayName,
      attachments: att,
    });
    setEditModalOpen(false);
    setEditTargetPost(null);
  };

  const submitPost = (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    const att = postAttachments.filter((a) => a.url && (a.url.startsWith("http://") || a.url.startsWith("https://")));
    if ((!text && att.length === 0) || !socketRef.current?.connected || postUploading) {
      if (postAttachments.length > 0 && att.length === 0) {
        toast.error("Attachments missing valid URLs. Upload again.");
      }
      return;
    }
    const isAnonymous = !account || postAnonymous;
    const caption = text || (att.length > 0 ? "." : "");
    socketRef.current.emit("freedom-wall:post", {
      content: caption,
      isAnonymous,
      authorDisplayName: isAnonymous ? "Anonymous" : displayName,
      authorUserId: isAnonymous ? undefined : account?._id,
      attachments: att,
    });
    setContent("");
    setPostAttachments([]);
    setPostUploadError(null);
    if (!text && att.length > 0) toast.success("Posted");
  };

  const toggleReaction = (postId: string, type: keyof Reactions) => {
    if (!socketRef.current?.connected) return;
    // Optimistic update so counts move immediately (server still authorizes & persists)
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== postId) return p;
        const r: Reactions = {
          like: p.reactions?.like ?? 0,
          love: p.reactions?.love ?? 0,
          laugh: p.reactions?.laugh ?? 0,
          wow: p.reactions?.wow ?? 0,
          sad: p.reactions?.sad ?? 0,
        };
        const actors = { ...(p.reactionActors || {}) };
        const prevType = actors[actorId] as keyof Reactions | undefined;
        if (prevType === type) {
          r[type] = Math.max(0, r[type] - 1);
          delete actors[actorId];
        } else {
          if (prevType && prevType in r) {
            r[prevType] = Math.max(0, r[prevType] - 1);
          }
          r[type] = r[type] + 1;
          actors[actorId] = type;
        }
        const totalReactions =
          r.like + r.love + r.laugh + r.wow + r.sad;
        return { ...p, reactions: r, reactionActors: actors, totalReactions };
      })
    );
    socketRef.current.emit("freedom-wall:react", { postId, type });
  };

  const addCommentFiles = async (postId: string, files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    const current = commentAttachmentDrafts[postId] || [];
    const room = MAX_COMMENT_ATTACHMENTS - current.length;
    if (room <= 0) {
      toast.error(`Max ${MAX_COMMENT_ATTACHMENTS} files per comment`);
      return;
    }
    const toAdd = list.slice(0, room);
    for (const file of toAdd) {
      if (file.size > MAX_COMMENT_FILE_BYTES) {
        toast.error(`${file.name} is too large (max 10MB per file in comments)`);
        return;
      }
    }
    setCommentUploadingPostId(postId);
    try {
      const newItems: WallAttachment[] = [];
      for (const file of toAdd) {
        const url = await uploadFileInChunks(file, FREEDOM_WALL_COMMENT_UPLOAD_FOLDER);
        if (!url.startsWith("https://")) throw new Error("Invalid upload URL");
        newItems.push({
          name: file.name,
          url,
          type: file.type || "application/octet-stream",
          size: file.size,
        });
      }
      setCommentAttachmentDrafts((d) => ({
        ...d,
        [postId]: [...(d[postId] || []), ...newItems],
      }));
    } catch (e) {
      console.error(e);
      toast.error("Comment upload failed");
    } finally {
      setCommentUploadingPostId(null);
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
      commentFilePostIdRef.current = null;
    }
  };

  const submitComment = (postId: string) => {
    const body = (commentDrafts[postId] || "").trim();
    const attachments = commentAttachmentDrafts[postId] || [];
    if ((!body && attachments.length === 0) || !socketRef.current?.connected || commentUploadingPostId)
      return;
    const isAnonymous = !account || commentAnonymous;
    socketRef.current.emit("freedom-wall:comment", {
      postId,
      body: body || "",
      isAnonymous,
      authorDisplayName: isAnonymous ? "Anonymous" : displayName,
      attachments,
    });
    setCommentDrafts((d) => ({ ...d, [postId]: "" }));
    setCommentAttachmentDrafts((d) => {
      const next = { ...d };
      delete next[postId];
      return next;
    });
  };

  const toggleCommentReaction = (postId: string, commentId: string, type: keyof Reactions) => {
    if (!socketRef.current?.connected) return;
    setCommentReactions((prev) => {
      const prevType = prev[commentId];
      if (prevType === type) {
        const next = { ...prev };
        delete next[commentId];
        return next;
      }
      return { ...prev, [commentId]: type };
    });
    setOpenCommentReactionPickerId(null);
    socketRef.current.emit("freedom-wall:comment-react", { postId, commentId, type });
  };

  const deletePost = (postId: string) => {
    if (!account || !socketRef.current?.connected) return;
    if (!window.confirm("Delete this post permanently?")) return;
    socketRef.current.emit("freedom-wall:delete", { postId });
  };

  const openRepostModal = (post: WallPost) => {
    const rootId = post.repost?.rootPostId || post._id;
    setRepostTargetPostId(rootId);
    setRepostCaption("");
    setRepostAnonymous(!account);
    setRepostModalOpen(true);
  };

  const submitRepost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socketRef.current?.connected) return;
    const postId = repostTargetPostId;
    if (!postId) return;
    const caption = repostCaption.trim().slice(0, 5000);
    const isAnonymous = !account || repostAnonymous;
    socketRef.current.emit("freedom-wall:repost", {
      postId,
      caption,
      isAnonymous,
      authorDisplayName: isAnonymous ? "Anonymous" : displayName,
    });
    setRepostModalOpen(false);
    setRepostTargetPostId(null);
    setRepostCaption("");
  };

  const handleLoginModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = await login({ email: loginEmail.trim(), password: loginPassword });
    if (result.success) {
      setLoginModalOpen(false);
      setLoginPassword("");
    } else {
      setLoginError(result.message || "Sign in failed");
    }
  };

  const unreadCount = notifications.length;

  const getTotalReactions = useCallback((p: WallPost) => {
    const r = p.reactions as Partial<Reactions> | undefined;
    const sum =
      (Number(r?.like) || 0) +
      (Number(r?.love) || 0) +
      (Number(r?.laugh) || 0) +
      (Number(r?.wow) || 0) +
      (Number(r?.sad) || 0);
    if (sum > 0) return sum;
    const actors = p.reactionActors as Record<string, string> | undefined;
    return actors ? Object.keys(actors).length : 0;
  }, []);

  const getPostExcerpt = useCallback((p: WallPost) => {
    const raw = (p.content || "").trim();
    const content = raw === "." ? "" : raw;
    if (content) return content.length > 90 ? `${content.slice(0, 90)}…` : content;
    const hasFiles = (p.attachments?.length ?? 0) > 0 || (p.repost?.attachments?.length ?? 0) > 0;
    return hasFiles ? "Attachment(s)" : "(No text)";
  }, []);

  const composerPanel = (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-700/80 bg-slate-800/60 p-3 shadow-xl sm:p-4 lg:min-h-0 lg:flex-1">
      <h2 className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-cyan-400/90 sm:mb-3 sm:text-sm">
        Share something
      </h2>
      <form onSubmit={submitPost} className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3 lg:flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Optional caption…"
          rows={3}
          maxLength={5000}
          className="min-h-[72px] w-full flex-1 resize-y rounded-xl border border-slate-600 bg-slate-900/90 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:min-h-[88px] lg:min-h-[100px]"
        />
        <div className="shrink-0 space-y-2 rounded-xl border border-dashed border-cyan-900/40 bg-slate-900/40 p-3">
          <p className="text-[11px] leading-snug text-slate-400">
            <span className="font-medium text-cyan-400/90">Image, video, or file</span> — (no message required).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={postFileInputRef}
              type="file"
              multiple
              accept={ACCEPT_POST_IMAGE_AND_FILE}
              className="hidden"
              disabled={postUploading || postAttachments.length >= MAX_WALL_ATTACHMENTS}
              onChange={(e) => e.target.files && void addPostFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={postUploading || postAttachments.length >= MAX_WALL_ATTACHMENTS || !connected}
              onClick={() => postFileInputRef.current?.click()}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {postUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {postUploading ? "Uploading…" : "Add image, video, or file"}
            </button>
            <span className="text-[11px] text-slate-500">
              <Paperclip className="mr-1 inline h-3 w-3 align-middle" aria-hidden />
              Images + video + PDF, Word, Excel, zip… · up to {MAX_WALL_ATTACHMENTS}
            </span>
          </div>
          {postUploadError && (
            <p className="text-xs text-amber-400">{postUploadError}</p>
          )}
          {postAttachments.length > 0 && (
            <ul className="flex flex-col gap-2">
              {postAttachments.map((a, i) => (
                <li
                  key={`${a.url}-${i}`}
                  className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    {isImageType(a.type) ? (
                      <SmoothWallImg
                        src={a.url}
                        alt=""
                        className="max-h-32 max-w-full rounded-md object-contain"
                      />
                    ) : isVideoType(a.type) ? (
                      <SmoothWallVideo
                        src={a.url}
                        className="max-h-40 max-w-full rounded-md bg-black"
                        videoProps={{
                          loop: true,
                          controls: true,
                          preload: "metadata",
                          autoPlay: true,
                          muted: true,
                          playsInline: true,
                        }}
                      />
                    ) : (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {a.name}
                      </a>
                    )}
                    <p className="mt-1 truncate text-slate-500" title={a.name}>
                      {a.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={postUploading}
                    onClick={() => setPostAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-300"
                    aria-label="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {account && (
          <div className="shrink-0 space-y-1">
            <p className="text-xs text-slate-400">
              Posting as <span className="font-medium text-cyan-300">{displayName}</span>
              {postAnonymous ? " (hidden — anonymous)" : ""}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={postAnonymous}
                onChange={(e) => setPostAnonymous(e.target.checked)}
                className="rounded border-slate-500 bg-slate-800 text-cyan-500"
              />
              Post anonymously (hide my name)
            </label>
          </div>
        )}
        {!account && (
          <div className="shrink-0 rounded-xl border border-slate-600/80 bg-slate-900/60 px-3 py-3">
            <p className="text-xs leading-relaxed text-slate-400">
              By default, posts are <span className="font-medium text-slate-300">anonymous</span>. Sign in
              to publish with your account name, delete your own posts, and get notified when others react
              or comment.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoginError(null);
                setLoginModalOpen(true);
              }}
              className="mt-3 inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-950/40 px-4 py-2.5 text-sm font-semibold text-cyan-200 shadow-sm transition-colors hover:bg-cyan-900/50 hover:text-white active:scale-[0.99]"
            >
              <LogIn className="h-4 w-4 shrink-0" aria-hidden />
              Sign in to post with your name
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={(!content.trim() && postAttachments.length === 0) || !connected || postUploading}
          className="min-h-[44px] shrink-0 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4 shrink-0" aria-hidden />
          {postAttachments.length > 0 && !content.trim()
            ? "Post image / file"
            : content.trim() || postAttachments.length > 0
              ? "Post to wall"
              : "Add text or attach a file"}
        </button>
      </form>
      {account && (
        <p className="mt-3 shrink-0 border-t border-slate-700/80 pt-3 text-xs text-slate-500 sm:mt-4">
          Comments: {commentAnonymous ? "Anonymous" : displayName} —{" "}
          <button
            type="button"
            className="text-cyan-400 underline"
            onClick={() => setCommentAnonymous((v) => !v)}
          >
            toggle
          </button>
        </p>
      )}
    </section>
  );

  const masonryBreakpointCols = { default: 5, 1536: 4, 1280: 3, 1024: 2, 640: 1 } as const;

  const postSkeletonCards = useMemo(
    () =>
      [
        { lines: 3, mediaH: 0 },
        { lines: 2, mediaH: 96 },
        { lines: 4, mediaH: 0 },
        { lines: 2, mediaH: 128 },
        { lines: 3, mediaH: 0 },
        { lines: 5, mediaH: 72 },
        { lines: 2, mediaH: 0 },
        { lines: 4, mediaH: 0 },
        { lines: 3, mediaH: 88 },
        { lines: 2, mediaH: 0 },
      ] as const,
    []
  );

  const postListInner =
    loading ? (
      <div className="min-h-[200px]" aria-busy="true" aria-label="Loading posts">
        <Masonry
          breakpointCols={masonryBreakpointCols}
          className="freedom-wall-masonry"
          columnClassName="freedom-wall-masonry_column"
        >
          {postSkeletonCards.map((card, i) => (
            <motion.article
              key={`fw-sk-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-full rounded-xl border border-slate-700/50 bg-slate-800/40 p-3 shadow-lg sm:p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="h-3 w-[28%] max-w-[7rem] rounded-md bg-slate-600/40 animate-pulse" />
                <div className="h-3 w-14 shrink-0 rounded-md bg-slate-600/30 animate-pulse" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: card.lines }, (_, j) => (
                  <div
                    key={j}
                    className="h-2.5 rounded-md bg-slate-600/35 animate-pulse"
                    style={{ width: j === card.lines - 1 ? `${60 + (j * 11) % 35}%` : "100%" }}
                  />
                ))}
              </div>
              {card.mediaH > 0 ? (
                <div
                  className="mt-3 w-full rounded-lg bg-slate-600/25 animate-pulse"
                  style={{ minHeight: card.mediaH }}
                />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-700/40 pt-3">
                {Array.from({ length: 5 }, (_, j) => (
                  <div
                    key={j}
                    className="h-6 w-9 rounded-md bg-slate-600/30 animate-pulse"
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-3 w-20 rounded-md bg-slate-600/25 animate-pulse" />
                <div className="h-3 w-16 rounded-md bg-slate-600/20 animate-pulse" />
              </div>
            </motion.article>
          ))}
        </Masonry>
      </div>
    ) : posts.length === 0 ? (
      <p className="py-10 text-center text-sm text-slate-500 sm:py-14 lg:py-16">
        {searchApplied
          ? `No posts match “${searchApplied}”. Try other words or clear search.`
          : "No posts yet. Be the first."}
      </p>
    ) : (
      <>
      <Masonry
        breakpointCols={masonryBreakpointCols}
        className="freedom-wall-masonry"
        columnClassName="freedom-wall-masonry_column"
      >
        {posts.map((post, i) => {
          const myReaction = post.reactionActors?.[actorId];
          const isMine = Boolean(account?._id && post.authorUserId === account._id);
          const isAttachmentOnlyCaption =
            post.content?.trim() === "." && (post.attachments?.length ?? 0) > 0;
          const isRepostNoCaption = Boolean(post.repost) && post.content?.trim() === ".";
          const showTextBlock =
            Boolean(post.content) && !isAttachmentOnlyCaption && !isRepostNoCaption;
          return (
            <motion.article
              id={`freedom-wall-post-${post._id}`}
              key={post._id}
              layout={false}
              ref={(el) => {
                registerPostForViewRef.current(post._id, el as unknown as HTMLElement | null);
              }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.42,
                delay: Math.min(i * 0.035, 0.28),
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`w-full max-w-full rounded-xl border border-slate-700/90 bg-slate-800/80 p-3 shadow-lg backdrop-blur-sm sm:p-4 ${
                highlightPostId === post._id ? "freedom-wall-post-highlight" : ""
              }`}
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2 text-xs text-slate-400">
                <span className="min-w-0 font-medium text-cyan-300/90 break-words">{post.authorDisplayName}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <time className="whitespace-nowrap" dateTime={post.createdAt}>
                    {new Date(post.createdAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </time>
                  {isMine && (
                    <button
                      type="button"
                      onClick={() => openEditModal(post)}
                      disabled={!connected}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/90 text-slate-200 hover:bg-slate-800 disabled:opacity-50 sm:h-8 sm:w-8"
                      title="Edit my post"
                      aria-label="Edit post"
                    >
                      <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openRepostModal(post)}
                    disabled={!connected}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/90 text-slate-200 hover:bg-slate-800 disabled:opacity-50 sm:h-8 sm:w-8"
                    title="Repost"
                    aria-label="Repost"
                  >
                    <Repeat2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                  {isMine && (
                    <button
                      type="button"
                      onClick={() => deletePost(post._id)}
                      disabled={!connected}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-900/50 text-red-300 hover:bg-red-950/50 disabled:opacity-50 sm:h-8 sm:w-8"
                      title="Delete my post"
                      aria-label="Delete post"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {post.repost ? (
                <div
                  className="mb-2 cursor-pointer rounded-xl border border-slate-700/70 bg-slate-900/40 p-3 transition-colors hover:border-cyan-600/40 hover:bg-slate-900/55 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  role="button"
                  tabIndex={0}
                  aria-label="View original post"
                  onClick={() => goToPostFromNotification(post.repost!.rootPostId, false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToPostFromNotification(post.repost!.rootPostId, false);
                    }
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                      <Repeat2 className="h-3 w-3" aria-hidden />
                      Reposted
                    </span>
                    <time className="text-[10px] text-slate-500" dateTime={post.repost.createdAt}>
                      {new Date(post.repost.createdAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                  <p className="text-xs font-medium text-slate-300 break-words">
                    {post.repost.authorDisplayName}
                  </p>
                  {post.repost.content && post.repost.content.trim() !== "." ? (
                    <p className="mt-1 break-words whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                      {post.repost.content}
                    </p>
                  ) : null}
                  {(post.repost.attachments?.length ?? 0) > 0 ? (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <WallAttachmentCarousel
                        postId={`${post._id}-repost-${post.repost.rootPostId}`}
                        attachments={post.repost.attachments}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showTextBlock ? (
                <p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                  {post.content}
                </p>
              ) : null}
              {(post.attachments?.length ?? 0) > 0 && (
                <div className={`${showTextBlock ? "mt-2" : ""}`}>
                  <WallAttachmentCarousel postId={post._id} attachments={post.attachments!} />
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-0.5 border-t border-slate-700/80 pt-2">
                {REACTION_CONFIG.map(({ type, icon, label }) => (
                  <motion.button
                    key={type}
                    type="button"
                    title={label}
                    onClick={() => toggleReaction(post._id, type)}
                    disabled={!connected}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 520, damping: 28 }}
                    className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center gap-0.5 rounded-md border px-1.5 py-0 text-[10px] font-medium tabular-nums leading-none transition-colors duration-200 touch-manipulation sm:h-6 sm:min-h-0 sm:px-1 sm:text-[10px] ${
                      myReaction === type
                        ? "border-cyan-500/80 bg-cyan-950/40 text-cyan-200"
                        : "border-slate-600/90 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {icon}
                    <span className="min-w-[0.65rem] text-center">{post.reactions?.[type] ?? 0}</span>
                  </motion.button>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{post.commentCount} comments</span>
                  <button
                    type="button"
                    className="text-cyan-400 hover:underline"
                    onClick={() => setExpandedComments((e) => ({ ...e, [post._id]: !e[post._id] }))}
                  >
                    {expandedComments[post._id] ? "Hide" : "Show"} / reply
                  </button>
                </div>
                <div className="inline-flex shrink-0 items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  <span className="tabular-nums">{post.views ?? 0}</span>
                </div>
              </div>
              {expandedComments[post._id] && (
                <div className="mt-3 space-y-2 border-t border-slate-700/60 pt-3">
                  {(post.comments || []).map((c) => {
                    const selectedReaction =
                      commentReactions[c._id] ||
                      (c.reactionActors?.[actorId] as keyof Reactions | undefined);
                    const counts = c.reactions;
                    const totalCommentReactions =
                      (counts?.like ?? 0) +
                      (counts?.love ?? 0) +
                      (counts?.laugh ?? 0) +
                      (counts?.wow ?? 0) +
                      (counts?.sad ?? 0);
                    return (
                    <div
                      key={c._id}
                      className="group relative rounded-lg bg-slate-900/50 px-2 py-1.5 text-xs break-words"
                      onMouseLeave={() => setOpenCommentReactionPickerId((id) => (id === c._id ? null : id))}
                      onTouchStart={() => {
                        if (commentLongPressTimerRef.current) {
                          window.clearTimeout(commentLongPressTimerRef.current);
                        }
                        commentLongPressTimerRef.current = window.setTimeout(() => {
                          setOpenCommentReactionPickerId(c._id);
                        }, 400);
                      }}
                      onTouchEnd={() => {
                        if (commentLongPressTimerRef.current) {
                          window.clearTimeout(commentLongPressTimerRef.current);
                          commentLongPressTimerRef.current = null;
                        }
                      }}
                    >
                      <span className="font-medium text-slate-400">{c.authorDisplayName}</span>
                      {c.body ? <p className="mt-0.5 text-slate-200">{c.body}</p> : null}
                      {(c.attachments?.length ?? 0) > 0 && (
                        <div className={`space-y-1.5 ${c.body ? "mt-2" : "mt-1"}`}>
                          {c.attachments!.map((a, i) => (
                            <div
                              key={`${c._id}-catt-${i}`}
                              className="overflow-hidden rounded-md border border-slate-700/80 bg-slate-950/50"
                            >
                              {isImageType(a.type) ? (
                                <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
                                  <SmoothWallImg
                                    src={a.url}
                                    alt=""
                                    className="block w-full h-auto"
                                  />
                                </a>
                              ) : isVideoType(a.type) ? (
                                <SmoothWallVideo
                                  src={a.url}
                                  className="w-full bg-black"
                                  videoProps={{
                                    loop: true,
                                    controls: true,
                                    preload: "auto",
                                    playsInline: true,
                                    autoPlay: true,
                                    muted: true,
                                  }}
                                />
                              ) : (
                                <a
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 p-2 text-cyan-400 hover:underline"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  <span className="min-w-0 truncate">{a.name}</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                        {totalCommentReactions > 0 && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5">
                            {(["like", "love", "laugh", "wow", "sad"] as (keyof Reactions)[])
                              .filter((t) => (counts?.[t] ?? 0) > 0)
                              .map((t) => (
                                <span key={t}>
                                  {t === "like"
                                    ? "👍"
                                    : t === "love"
                                      ? "❤️"
                                      : t === "laugh"
                                        ? "😂"
                                        : t === "wow"
                                          ? "✨"
                                          : "😢"}{" "}
                                  {counts?.[t] ?? 0}
                                </span>
                              ))}
                          </div>
                        )}
                        {selectedReaction ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5">
                            <span>
                              {selectedReaction === "like"
                                ? "👍"
                                : selectedReaction === "love"
                                  ? "❤️"
                                  : selectedReaction === "laugh"
                                    ? "😂"
                                    : selectedReaction === "wow"
                                      ? "✨"
                                      : "😢"}
                            </span>
                            <span>You reacted</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">Tap & hold or hover to react</span>
                        )}
                      </div>
                      {/* Desktop hover picker (lg+) and mobile long-press picker.
                          On desktop, anchor near the bottom-left of the comment card. */}
                      <div
                        className={`pointer-events-none absolute left-2 bottom-1 z-10 transform opacity-0 transition-opacity duration-150 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 ${
                          openCommentReactionPickerId === c._id
                            ? "pointer-events-auto opacity-100"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-1 rounded-full border border-slate-600 bg-slate-900/95 px-2 py-1 shadow-lg">
                          {REACTION_CONFIG.map(({ type, icon, label }) => (
                            <button
                              key={type}
                              type="button"
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                                selectedReaction === type
                                  ? "bg-cyan-600 text-white"
                                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                              }`}
                              title={label}
                              onClick={() => toggleCommentReaction(post._id, c._id, type)}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )})}
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT_WALL_FILES}
                    className="hidden"
                    disabled={commentUploadingPostId !== null}
                    onChange={(e) => {
                      const pid = commentFilePostIdRef.current;
                      if (pid && e.target.files) void addCommentFiles(pid, e.target.files);
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <input
                        type="text"
                        value={commentDrafts[post._id] || ""}
                        onChange={(e) => setCommentDrafts((d) => ({ ...d, [post._id]: e.target.value }))}
                        placeholder="Add a comment…"
                        className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                        maxLength={2000}
                      />
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={
                            !connected ||
                            commentUploadingPostId !== null ||
                            (commentAttachmentDrafts[post._id]?.length ?? 0) >= MAX_COMMENT_ATTACHMENTS
                          }
                          onClick={() => {
                            commentFilePostIdRef.current = post._id;
                            commentFileInputRef.current?.click();
                          }}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                          title="Attach photos, video, or files"
                          aria-label="Attach file"
                        >
                          {commentUploadingPostId === post._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Paperclip className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => submitComment(post._id)}
                          disabled={
                            !connected ||
                            commentUploadingPostId !== null ||
                            (!(commentDrafts[post._id] || "").trim() &&
                              (commentAttachmentDrafts[post._id]?.length ?? 0) === 0)
                          }
                          className="min-h-[44px] shrink-0 rounded-lg bg-slate-700 px-4 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50 sm:min-w-[4rem]"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                    {(commentAttachmentDrafts[post._id]?.length ?? 0) > 0 && (
                      <ul className="flex flex-wrap gap-2">
                        {commentAttachmentDrafts[post._id]!.map((a, i) => (
                          <li
                            key={`${a.url}-${i}`}
                            className="flex max-w-full items-center gap-1 rounded-md border border-slate-600 bg-slate-900/90 px-2 py-1 text-[10px] text-slate-300"
                          >
                            <span className="min-w-0 truncate" title={a.name}>
                              {isImageType(a.type) ? "🖼 " : isVideoType(a.type) ? "▶ " : "📎 "}
                              {a.name}
                            </span>
                            <button
                              type="button"
                              disabled={commentUploadingPostId !== null}
                              onClick={() =>
                                setCommentAttachmentDrafts((d) => ({
                                  ...d,
                                  [post._id]: (d[post._id] || []).filter((_, j) => j !== i),
                                }))
                              }
                              className="shrink-0 text-slate-500 hover:text-red-400"
                              aria-label="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[10px] text-slate-600">
                      Up to {MAX_COMMENT_ATTACHMENTS} attachments · images, video, or files · max 10MB each
                    </p>
                  </div>
                </div>
              )}
            </motion.article>
          );
        })}
      </Masonry>
      {feedLoadingMore ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8" aria-busy>
          <Loader2 className="h-7 w-7 animate-spin text-cyan-500/70" aria-hidden />
          <span className="text-xs text-slate-500">Loading more…</span>
        </div>
      ) : null}
      {!feedHasMore && posts.length > 0 ? (
        <p className="pb-6 pt-2 text-center text-[11px] text-slate-600">You&apos;ve reached the end</p>
      ) : null}
    </>
    );

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[100vw] flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 [padding-bottom:env(safe-area-inset-bottom,0px)]">
      {/* Login modal */}
      {loginModalOpen && (
        <div
          ref={modalBackdropRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="freedom-wall-login-title"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === modalBackdropRef.current) setLoginModalOpen(false);
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-600 bg-slate-900 shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
              <h2 id="freedom-wall-login-title" className="text-lg font-semibold text-white">
                Sign in
              </h2>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLoginModalSubmit} className="space-y-4 p-4 sm:p-6">
              {loginError && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {loginError}
                </p>
              )}
              <div>
                <label htmlFor="fw-login-email" className="mb-1 block text-xs font-medium text-slate-400">
                  Email
                </label>
                <input
                  id="fw-login-email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="fw-login-password" className="mb-1 block text-xs font-medium text-slate-400">
                  Password
                </label>
                <input
                  id="fw-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
              >
                {loginLoading ? "Signing in…" : "Sign in"}
              </button>
              <p className="text-center text-xs text-slate-500">
                <Link to="/login" className="text-cyan-400 hover:underline" onClick={() => setLoginModalOpen(false)}>
                  Full login page
                </Link>
                {" · "}
                Forgot password? Use the full login page.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="freedom-wall-edit-title"
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditModalOpen(false);
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-600 bg-slate-900 shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
              <h2 id="freedom-wall-edit-title" className="text-lg font-semibold text-white">
                Edit post
              </h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="space-y-3 p-4 sm:p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Caption</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Optional caption…"
                  className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {account && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">
                    Posting as <span className="font-medium text-cyan-300">{displayName}</span>
                    {editAnonymous ? " (hidden — anonymous)" : ""}
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={editAnonymous}
                      onChange={(e) => setEditAnonymous(e.target.checked)}
                      className="rounded border-slate-500 bg-slate-800 text-cyan-500"
                    />
                    Post anonymously (hide my name)
                  </label>
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-dashed border-cyan-900/40 bg-slate-900/40 p-3">
                <p className="text-[11px] leading-snug text-slate-400">
                  <span className="font-medium text-cyan-400/90">Attachments</span> — add/remove to replace.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT_POST_IMAGE_AND_FILE}
                    className="hidden"
                    disabled={editUploading || editAttachments.length >= MAX_WALL_ATTACHMENTS}
                    onChange={(e) => e.target.files && void addEditFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    disabled={editUploading || editAttachments.length >= MAX_WALL_ATTACHMENTS || !connected}
                    onClick={() => editFileInputRef.current?.click()}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {editUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Upload className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    {editUploading ? "Uploading…" : "Add / replace files"}
                  </button>
                  <span className="text-[11px] text-slate-500">Up to {MAX_WALL_ATTACHMENTS}</span>
                </div>
                {editUploadError && <p className="text-xs text-amber-400">{editUploadError}</p>}
                {editAttachments.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {editAttachments.map((a, i) => (
                      <li
                        key={`${a.url}-${i}`}
                        className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          {isImageType(a.type) ? (
                            <SmoothWallImg
                              src={a.url}
                              alt=""
                              className="max-h-32 max-w-full rounded-md object-contain"
                            />
                          ) : isVideoType(a.type) ? (
                            <SmoothWallVideo
                              src={a.url}
                              className="max-h-40 max-w-full rounded-md bg-black"
                              videoProps={{
                                loop: true,
                                controls: true,
                                preload: "metadata",
                                autoPlay: true,
                                muted: true,
                                playsInline: true,
                              }}
                            />
                          ) : (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {a.name}
                            </a>
                          )}
                          <p className="mt-1 truncate text-slate-500" title={a.name}>
                            {a.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={editUploading}
                          onClick={() => setEditAttachments((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-300"
                          aria-label="Remove attachment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={(!editCaption.trim() && editAttachments.length === 0) || !connected || editUploading}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
              >
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Repost modal */}
      {repostModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="freedom-wall-repost-title"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRepostModalOpen(false);
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-600 bg-slate-900 shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
              <h2 id="freedom-wall-repost-title" className="text-lg font-semibold text-white">
                Repost
              </h2>
              <button
                type="button"
                onClick={() => setRepostModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitRepost} className="space-y-3 p-4 sm:p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Add a caption (optional)
                </label>
                <textarea
                  value={repostCaption}
                  onChange={(e) => setRepostCaption(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Why are you reposting this?"
                  className="w-full resize-y rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              {account ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">
                    Reposting as <span className="font-medium text-cyan-300">{displayName}</span>
                    {repostAnonymous ? " (hidden — anonymous)" : ""}
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={repostAnonymous}
                      onChange={(e) => setRepostAnonymous(e.target.checked)}
                      className="rounded border-slate-500 bg-slate-800 text-cyan-500"
                    />
                    Repost anonymously (hide my name)
                  </label>
                </div>
              ) : (
                <p className="text-xs text-slate-500">You’ll repost as Anonymous (not signed in).</p>
              )}
              <button
                type="submit"
                disabled={!connected || !repostTargetPostId}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
              >
                Repost
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile: sticky header + search. Desktop (lg): static bar above sidebar + feed */}
      <div className="sticky top-0 z-30 shrink-0 border-b border-slate-700/80 bg-slate-950/95 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md [padding-top:max(0.5rem,env(safe-area-inset-top))] lg:static lg:z-auto lg:shadow-none">
      <header className="z-20 flex flex-col gap-2 border-b border-slate-700/80 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:px-4 sm:py-3 lg:border-b-0">
        <div className="flex min-w-0 w-full items-center gap-2 sm:w-auto sm:flex-1 sm:gap-3">
          <Link
            to="/login"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-2 text-sm text-slate-200 hover:bg-slate-800 min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-3 touch-manipulation"
            aria-label="Back to login"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold tracking-tight text-white sm:flex-initial sm:text-left sm:text-lg">
            Freedom Wall
          </h1>
          {/* Mobile: keep Live + notif in header row so sort can be full-width below */}
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            {account && (
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-800 touch-manipulation"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} new` : ""}`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-slate-950">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-1.5 text-[10px] font-medium leading-none sm:text-xs ${
                connected ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-200"
              }`}
            >
              {connected ? "Live" : "…"}
            </span>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {account && (
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              className="relative hidden min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-800 sm:inline-flex"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} new` : ""}`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-slate-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}
          <span
            className={`hidden shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
              connected ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-200"
            }`}
          >
            {connected ? "Live" : "…"}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial sm:min-w-0">
            <label htmlFor="fw-sort" className="sr-only">
              Sort
            </label>
            <select
              id="fw-sort"
              value={sort}
              onChange={(e) => {
                setSearchInput("");
                setSearchApplied("");
                setSort(e.target.value as Sort);
              }}
              className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs text-white focus:ring-2 focus:ring-cyan-500 sm:max-w-[11rem] sm:flex-initial sm:text-sm"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="border-t border-slate-700/50 bg-slate-900/90 px-3 py-2 sm:px-4 lg:border-t-0 lg:bg-slate-950/95">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search posts by content…"
              autoComplete="off"
              className="w-full min-h-[44px] rounded-xl border border-slate-600 bg-slate-800 py-2 pl-10 pr-10 text-base text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:min-h-[42px] sm:text-sm"
              enterKeyHint="search"
              aria-label="Search wall posts"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchApplied("");
                  fetchPosts(sort);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setLeaderboardOpen(true)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 text-slate-200 hover:bg-slate-800"
            aria-label="Open leaderboard"
            title="Leaderboard"
          >
            <Trophy className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {searchApplied ? (
          <p className="mt-1.5 text-center text-[11px] text-slate-500">
            Showing results for &ldquo;{searchApplied}&rdquo; ·{" "}
            <button
              type="button"
              className="text-cyan-400 hover:underline"
              onClick={() => {
                setSearchInput("");
                setSearchApplied("");
                fetchPosts(sort);
              }}
            >
              Clear
            </button>
          </p>
        ) : searchInput.trim().length === 1 ? (
          <p className="mt-1.5 text-center text-[11px] text-slate-500">Type at least 2 characters</p>
        ) : null}
      </div>
      </div>

      {/* Notifications: fixed panel so it works from mobile header bell + desktop bell */}
      {account && notifOpen && (
        <>
          <div
            className="fixed inset-0 z-[45] bg-black/50 sm:bg-black/20"
            aria-hidden
            onClick={() => setNotifOpen(false)}
          />
          <div
            className="fixed left-3 right-3 top-[max(5.25rem,calc(env(safe-area-inset-top)+4.5rem))] z-50 flex max-h-[min(72vh,26rem)] flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl sm:left-auto sm:right-4 sm:top-16 sm:w-[min(calc(100vw-2rem),20rem)]"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-3 py-2.5">
              <span className="text-sm font-semibold text-white">Activity on your posts</span>
              <button
                type="button"
                className="text-xs text-cyan-400 hover:underline disabled:opacity-50"
                disabled={notifLoading || notifications.length === 0}
                onClick={() => clearAllNotifications()}
              >
                Clear all
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {notifLoading ? (
                <>
                  {Array.from({ length: 6 }, (_, i) => (
                    <li key={`notif-sk-${i}`} className="mb-2 list-none px-1" aria-hidden>
                      <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3">
                        <div className="mb-2 h-2.5 w-2/3 max-w-[12rem] rounded bg-slate-600/35 animate-pulse" />
                        <div className="h-2 w-full rounded bg-slate-600/25 animate-pulse" />
                        <div className="mt-1.5 h-2 w-4/5 rounded bg-slate-600/20 animate-pulse" />
                      </div>
                    </li>
                  ))}
                </>
              ) : notifications.length === 0 ? (
                <li className="px-2 py-6 text-center text-xs text-slate-500">
                  No notifications yet. When someone reacts or comments on a post you published with your name,
                  you&apos;ll see it here.
                </li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id} className="mb-2 list-none">
                    <button
                      type="button"
                      onClick={() => goToPostFromNotification(n.postId, n.kind === "comment")}
                      className="w-full rounded-lg border border-slate-700/80 bg-slate-800/50 px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:border-cyan-600/50 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 touch-manipulation"
                    >
                      {n.kind === "reaction" ? (
                        <>
                          <span className="font-medium text-cyan-300">New reaction</span>
                          <span className="text-slate-500"> · {n.type}</span>
                          <p className="mt-1 line-clamp-2 text-slate-400">&ldquo;{n.postExcerpt}&rdquo;</p>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-cyan-300">{n.authorDisplayName}</span>
                          <span className="text-slate-500"> commented</span>
                          <p className="mt-1 line-clamp-2 text-slate-400">{n.commentExcerpt}</p>
                        </>
                      )}
                      <p className="mt-1 text-[10px] text-slate-600">{new Date(n.at).toLocaleString()}</p>
                      <p className="mt-1.5 text-[10px] font-medium text-cyan-500/90">View post →</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}

      {/* Leaderboard modal */}
      {leaderboardOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="freedom-wall-leaderboard-title"
          className="fixed inset-0 z-[115] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLeaderboardOpen(false);
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-600 bg-slate-900 shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-slate-700 bg-slate-900/95 px-4 py-3 backdrop-blur">
              <div className="flex min-w-0 items-center gap-2">
                <Trophy className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden />
                <h2 id="freedom-wall-leaderboard-title" className="min-w-0 truncate text-lg font-semibold text-white">
                  Leaderboard
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setLeaderboardTab("reacted")}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                    leaderboardTab === "reacted"
                      ? "bg-cyan-600 text-white"
                      : "border border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Most reacted
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardTab("views")}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                    leaderboardTab === "views"
                      ? "bg-cyan-600 text-white"
                      : "border border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Most views
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardTab("uploaders")}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                    leaderboardTab === "uploaders"
                      ? "bg-cyan-600 text-white"
                      : "border border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Top uploaders
                </button>
              </div>

              <div className="mt-4">
                {leaderboardLoading ? (
                  <p className="text-sm text-slate-500">Loading leaderboard…</p>
                ) : leaderboardError ? (
                  <p className="text-sm text-amber-300">{leaderboardError}</p>
                ) : leaderboardTab === "uploaders" && leaderboardSelectedUploader ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setLeaderboardSelectedUploader(null);
                        setLeaderboardUploaderPosts([]);
                        setLeaderboardUploaderPostsError(null);
                        setLeaderboardUploaderPostsLoading(false);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                      Back
                    </button>

                    <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-3">
                      <p className="text-xs text-slate-400">Uploader</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-cyan-300">
                        {leaderboardSelectedUploader.authorDisplayName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {leaderboardSelectedUploader.posts} post{leaderboardSelectedUploader.posts === 1 ? "" : "s"}
                      </p>
                    </div>

                    {leaderboardUploaderPostsLoading ? (
                      <p className="text-sm text-slate-500">Loading uploads…</p>
                    ) : leaderboardUploaderPostsError ? (
                      <p className="text-sm text-amber-300">{leaderboardUploaderPostsError}</p>
                    ) : leaderboardUploaderPosts.length === 0 ? (
                      <p className="text-sm text-slate-500">No posts found for this uploader.</p>
                    ) : (
                      <ol className="space-y-2">
                        {leaderboardUploaderPosts.map((p, idx) => (
                          <li key={p._id}>
                            <button
                              type="button"
                              onClick={() => {
                                setLeaderboardOpen(false);
                                goToPostFromNotification(p._id, false, { allowPrependIfMissing: false });
                              }}
                              className="w-full rounded-xl border border-slate-700/80 bg-slate-800/40 px-3 py-2.5 text-left transition-colors hover:border-cyan-600/50 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            >
                              <p className="text-xs text-slate-400">
                                #{idx + 1} · <span className="font-medium text-cyan-300">{p.authorDisplayName}</span>
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-sm text-slate-200">{getPostExcerpt(p)}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="h-3 w-3" aria-hidden />
                                  {Number(p.views) || 0}
                                </span>
                                <span className="tabular-nums">{getTotalReactions(p)} reactions</span>
                                <span className="ml-auto">{new Date(p.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="mt-1.5 text-[10px] font-medium text-cyan-500/90">View post →</p>
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) : leaderboardTab === "reacted" ? (
                  leaderboardMostReactedPosts.length === 0 ? (
                    <p className="text-sm text-slate-500">No posts loaded yet.</p>
                  ) : (
                    <ol className="space-y-2">
                      {leaderboardMostReactedPosts.map((p, idx) => (
                        <li
                          key={p._id}
                          className="rounded-xl border border-slate-700/80 bg-slate-800/40"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setLeaderboardOpen(false);
                              goToPostFromNotification(p._id, false, { allowPrependIfMissing: false });
                            }}
                            className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:border-cyan-600/50 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">
                                #{idx + 1} · <span className="font-medium text-cyan-300">{p.authorDisplayName}</span>
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-sm text-slate-200">{getPostExcerpt(p)}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-semibold text-white">{getTotalReactions(p)}</p>
                              <p className="text-[10px] text-slate-500">reactions</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )
                ) : leaderboardTab === "views" ? (
                  leaderboardMostViewedPosts.length === 0 ? (
                    <p className="text-sm text-slate-500">No posts loaded yet.</p>
                  ) : (
                    <ol className="space-y-2">
                      {leaderboardMostViewedPosts.map((p, idx) => (
                        <li
                          key={p._id}
                          className="rounded-xl border border-slate-700/80 bg-slate-800/40"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setLeaderboardOpen(false);
                              goToPostFromNotification(p._id, false, { allowPrependIfMissing: false });
                            }}
                            className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:border-cyan-600/50 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">
                                #{idx + 1} · <span className="font-medium text-cyan-300">{p.authorDisplayName}</span>
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-sm text-slate-200">{getPostExcerpt(p)}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-semibold text-white">{Number(p.views) || 0}</p>
                              <p className="text-[10px] text-slate-500">views</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )
                ) : leaderboardTopUploaders.length === 0 ? (
                  <p className="text-sm text-slate-500">No posts loaded yet.</p>
                ) : (
                  <ol className="space-y-2">
                    {leaderboardTopUploaders.map((u, idx) => (
                      <li
                        key={u.key}
                        className="rounded-xl border border-slate-700/80 bg-slate-800/40"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setLeaderboardSelectedUploader(u);
                            void loadLeaderboardUploaderPosts(u.key);
                          }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:border-cyan-600/50 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">#{idx + 1}</p>
                            <p className="truncate text-sm font-medium text-cyan-300">{u.authorDisplayName}</p>
                            <p className="mt-1 text-[10px] font-medium text-cyan-500/90">View uploads →</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-semibold text-white">{u.posts}</p>
                            <p className="text-[10px] text-slate-500">posts</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!desktopLayout ? (
        <main className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          <div
            id="freedom-wall-feed"
            ref={mobileScrollRef}
            onScroll={onMobileScroll}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth [padding-bottom:max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="box-border mx-auto w-full max-w-[100vw] px-3 py-4 sm:px-4 sm:py-5">
              <div className="mx-auto mb-6 max-w-3xl">{composerPanel}</div>
              {postListInner}
            </div>
          </div>
          <button
            type="button"
            aria-label="Back to top"
            className={`pointer-events-none absolute bottom-4 right-3 z-20 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full border border-cyan-500/40 bg-slate-900/95 text-cyan-300 opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-950/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95 touch-manipulation sm:bottom-5 sm:right-4 ${
              showMobileBackToTop ? "pointer-events-auto translate-y-0 opacity-100" : ""
            }`}
            onClick={() => mobileScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ChevronUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </main>
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <aside className="order-first flex w-full shrink-0 flex-col border-b border-slate-600 bg-slate-900/95 lg:order-last lg:h-full lg:max-h-none lg:min-h-0 lg:w-[min(100%,22rem)] lg:min-w-[18rem] lg:max-w-[24rem] lg:shrink-0 lg:self-stretch lg:border-b-0 lg:border-l lg:border-slate-600">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 lg:h-full lg:min-h-0 lg:py-4">
              {composerPanel}
            </div>
          </aside>
          <main className="relative order-last flex min-h-0 min-w-0 w-full flex-1 flex-col lg:order-first lg:min-h-0">
            <div
              id="freedom-wall-feed"
              ref={desktopFeedScrollRef}
              onScroll={onDesktopFeedScroll}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth"
            >
              <div className="box-border w-full max-w-[100vw] px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-6">
                {postListInner}
              </div>
            </div>
            <button
              type="button"
              aria-label="Back to top"
              className={`pointer-events-none absolute bottom-4 right-3 z-20 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full border border-cyan-500/40 bg-slate-900/95 text-cyan-300 opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-950/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 active:scale-95 ${
                showDesktopBackToTop ? "pointer-events-auto translate-y-0 opacity-100" : ""
              }`}
              onClick={() => desktopFeedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <ChevronUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </main>
        </div>
      )}
    </div>
  );
}
