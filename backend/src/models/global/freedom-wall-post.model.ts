import mongoose, { Schema, Document, Model } from "mongoose";

export const FREEDOM_WALL_REACTION_TYPES = [
  "like",
  "love",
  "laugh",
  "wow",
  "sad",
] as const;
export type FreedomWallReactionType = (typeof FREEDOM_WALL_REACTION_TYPES)[number];

export interface IFreedomWallComment {
  _id: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
  isAnonymous: boolean;
  authorDisplayName: string;
  authorUserId?: string;
  attachments?: IFreedomWallAttachment[];
  reactions?: Record<FreedomWallReactionType, number>;
  /** actorId -> reaction type (one per actor) */
  reactionActors?: Map<string, FreedomWallReactionType>;
}

export interface IFreedomWallAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface IFreedomWallRepostSnapshot {
  /** The original/root post being reposted */
  rootPostId: string;
  authorDisplayName: string;
  createdAt: Date;
  content: string;
  attachments: IFreedomWallAttachment[];
}

export interface IFreedomWallPost {
  content: string;
  createdAt: Date;
  isAnonymous: boolean;
  authorUserId?: string;
  authorDisplayName: string;
  commentCount: number;
  views: number;
  reactions: Record<FreedomWallReactionType, number>;
  /** actorId -> reaction type (one per actor) */
  reactionActors: Map<string, FreedomWallReactionType>;
  /** actorId -> true (dedupe post views per actor) */
  viewActors: Map<string, boolean>;
  comments: IFreedomWallComment[];
  /** Uploaded media / files (URLs from chunk uploader) */
  attachments?: IFreedomWallAttachment[];
  /** Optional repost snapshot (immutable preview of original/root post) */
  repost?: IFreedomWallRepostSnapshot;
}

export interface IFreedomWallPostDocument extends IFreedomWallPost, Document {
  totalReactionCount(): number;
}

const emptyReactions = (): Record<FreedomWallReactionType, number> => ({
  like: 0,
  love: 0,
  laugh: 0,
  wow: 0,
  sad: 0,
});

/** Plain counts — do not spread Mongoose subdocs (spread often drops nested numbers). */
export function normalizeFreedomWallReactions(
  raw: unknown
): Record<FreedomWallReactionType, number> {
  const n = (v: unknown) => Math.max(0, Math.min(1e6, Math.floor(Number(v)) || 0));
  if (!raw || typeof raw !== "object") return emptyReactions();
  const r = raw as Record<string, unknown>;
  return {
    like: n(r.like),
    love: n(r.love),
    laugh: n(r.laugh),
    wow: n(r.wow),
    sad: n(r.sad),
  };
}

const AttachmentSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 255, trim: true },
    url: { type: String, required: true, maxlength: 2048, trim: true },
    type: { type: String, default: "", maxlength: 128 },
    size: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const RepostSnapshotSchema = new Schema(
  {
    rootPostId: { type: String, required: true, index: true },
    authorDisplayName: { type: String, required: true, maxlength: 120, trim: true },
    createdAt: { type: Date, required: true },
    content: { type: String, required: true, maxlength: 5000, trim: true, default: "" },
    attachments: { type: [AttachmentSchema], default: [] },
  },
  { _id: false }
);

const CommentSchema = new Schema(
  {
    body: { type: String, maxlength: 2000, trim: true, default: "" },
    createdAt: { type: Date, default: Date.now },
    isAnonymous: { type: Boolean, default: true },
    authorDisplayName: { type: String, default: "Anonymous" },
    authorUserId: { type: String },
    attachments: { type: [AttachmentSchema], default: [] },
    reactions: {
      type: {
        like: { type: Number, default: 0 },
        love: { type: Number, default: 0 },
        laugh: { type: Number, default: 0 },
        wow: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
      },
      default: () => ({
        like: 0,
        love: 0,
        laugh: 0,
        wow: 0,
        sad: 0,
      }),
    },
    reactionActors: {
      type: Map,
      of: {
        type: String,
        enum: FREEDOM_WALL_REACTION_TYPES,
      },
      default: () => new Map(),
    },
  },
  { _id: true }
);

const FreedomWallPostSchema = new Schema<IFreedomWallPostDocument>(
  {
    content: { type: String, required: true, maxlength: 5000, trim: true, default: "" },
    createdAt: { type: Date, default: Date.now, index: true },
    isAnonymous: { type: Boolean, default: true },
    authorUserId: { type: String, index: true },
    authorDisplayName: { type: String, default: "Anonymous" },
    commentCount: { type: Number, default: 0, index: true },
    views: { type: Number, default: 0, min: 0, index: true },
    reactions: {
      type: {
        like: { type: Number, default: 0 },
        love: { type: Number, default: 0 },
        laugh: { type: Number, default: 0 },
        wow: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
      },
      default: emptyReactions,
    },
    reactionActors: {
      type: Map,
      of: {
        type: String,
        enum: FREEDOM_WALL_REACTION_TYPES,
      },
      default: () => new Map(),
    },
    viewActors: {
      type: Map,
      of: { type: Boolean },
      default: () => new Map(),
    },
    comments: { type: [CommentSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] }, // post-level
    repost: { type: RepostSnapshotSchema, required: false, default: undefined },
  },
  {
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        if (ret.reactionActors && ret.reactionActors instanceof Map) {
          ret.reactionActors = Object.fromEntries(ret.reactionActors);
        }
        if (ret.viewActors && ret.viewActors instanceof Map) {
          ret.viewActors = Object.fromEntries(ret.viewActors);
        }
        return ret;
      },
    },
  }
);

FreedomWallPostSchema.index({ createdAt: -1 });
FreedomWallPostSchema.index({ commentCount: -1 });
FreedomWallPostSchema.index({
  "reactions.like": -1,
  "reactions.love": -1,
  "reactions.laugh": -1,
  "reactions.wow": -1,
  "reactions.sad": -1,
});

FreedomWallPostSchema.methods.totalReactionCount = function (this: IFreedomWallPostDocument) {
  const r = this.reactions || emptyReactions();
  return (
    (r.like || 0) +
    (r.love || 0) +
    (r.laugh || 0) +
    (r.wow || 0) +
    (r.sad || 0)
  );
};

export const FreedomWallPost: Model<IFreedomWallPostDocument> =
  mongoose.models.FreedomWallPost ||
  mongoose.model<IFreedomWallPostDocument>("FreedomWallPost", FreedomWallPostSchema);

const MAX_ATTACHMENTS = 10;
export const MAX_COMMENT_ATTACHMENTS = 5;

/** Sanitize client-provided attachments (socket / REST) */
export function sanitizeFreedomWallAttachments(
  raw: unknown,
  maxCount: number = MAX_ATTACHMENTS
): IFreedomWallAttachment[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const cap = Math.min(Math.max(maxCount, 1), 50);
  const out: IFreedomWallAttachment[] = [];
  for (const item of raw.slice(0, cap)) {
    if (!item || typeof item !== "object") continue;
    const u = item as Record<string, unknown>;
    const url = typeof u.url === "string" ? u.url.trim() : "";
    if (
      (!url.startsWith("https://") && !url.startsWith("http://")) ||
      url.length > 2048
    )
      continue;
    const name = typeof u.name === "string" ? u.name.trim().slice(0, 255) : "file";
    const type = typeof u.type === "string" ? u.type.slice(0, 128) : "";
    const size = typeof u.size === "number" && u.size >= 0 ? Math.min(u.size, 1e12) : 0;
    out.push({ name: name || "file", url, type, size });
  }
  return out;
}

/** Serialize post for API/socket (plain object) */
export function serializeFreedomWallPost(doc: IFreedomWallPostDocument | Record<string, unknown>) {
  const o =
    typeof (doc as IFreedomWallPostDocument).toObject === "function"
      ? (doc as IFreedomWallPostDocument).toObject()
      : { ...doc };
  const reactions = normalizeFreedomWallReactions(o.reactions);
  const totalReactions =
    reactions.like + reactions.love + reactions.laugh + reactions.wow + reactions.sad;
  const views = Math.max(0, Math.floor(Number(o.views)) || 0);
  let reactionActors: Record<string, string> = {};
  if (o.reactionActors instanceof Map) {
    reactionActors = Object.fromEntries(o.reactionActors);
  } else if (o.reactionActors && typeof o.reactionActors === "object") {
    reactionActors = o.reactionActors as Record<string, string>;
  }
  const attachments = Array.isArray(o.attachments)
    ? (o.attachments as IFreedomWallAttachment[]).map((a) => ({
        name: String(a.name || "").slice(0, 255),
        url: String(a.url || "").slice(0, 2048),
        type: String(a.type || ""),
        size: typeof a.size === "number" ? a.size : 0,
      }))
    : [];

  const rawRepost = (o as { repost?: unknown }).repost;
  const repost =
    rawRepost && typeof rawRepost === "object"
      ? (() => {
          const r = rawRepost as Record<string, unknown>;
          const rootPostId = typeof r.rootPostId === "string" ? r.rootPostId : "";
          if (!rootPostId) return undefined;
          const authorDisplayName =
            typeof r.authorDisplayName === "string" && r.authorDisplayName.trim()
              ? r.authorDisplayName.trim().slice(0, 120)
              : "Anonymous";
          const createdAt =
            r.createdAt instanceof Date ? r.createdAt : new Date(String(r.createdAt || ""));
          const content =
            typeof r.content === "string" ? r.content.trim().slice(0, 5000) : "";
          const repostAttachments = sanitizeFreedomWallAttachments(r.attachments, MAX_ATTACHMENTS);
          return {
            rootPostId,
            authorDisplayName,
            createdAt: isNaN(createdAt.getTime()) ? new Date() : createdAt,
            content,
            attachments: repostAttachments,
          };
        })()
      : undefined;
  return {
    _id: String(o._id),
    content: o.content,
    createdAt: o.createdAt,
    isAnonymous: o.isAnonymous,
    authorUserId: o.authorUserId,
    authorDisplayName: o.authorDisplayName,
    commentCount: o.commentCount ?? 0,
    views,
    reactions,
    totalReactions,
    reactionActors,
    comments: (o.comments || []).map(
      (c: {
        _id: unknown;
        body: string;
        createdAt: Date;
        isAnonymous: boolean;
        authorDisplayName: string;
        authorUserId?: string;
        attachments?: IFreedomWallAttachment[];
        reactions?: Record<FreedomWallReactionType, number>;
        reactionActors?: Map<string, FreedomWallReactionType> | Record<string, string>;
      }) => {
        const reactions = normalizeFreedomWallReactions(c.reactions || {});
        let reactionActors: Record<string, string> = {};
        if (c.reactionActors instanceof Map) {
          reactionActors = Object.fromEntries(c.reactionActors);
        } else if (c.reactionActors && typeof c.reactionActors === "object") {
          reactionActors = c.reactionActors as Record<string, string>;
        }
        const commentTotalReactions =
          reactions.like + reactions.love + reactions.laugh + reactions.wow + reactions.sad;
        return {
          _id: String(c._id),
          body: c.body ?? "",
          createdAt: c.createdAt,
          isAnonymous: c.isAnonymous,
          authorDisplayName: c.authorDisplayName,
          authorUserId: c.authorUserId,
          reactions,
          totalReactions: commentTotalReactions,
          reactionActors,
          attachments: Array.isArray(c.attachments)
            ? sanitizeFreedomWallAttachments(c.attachments, MAX_COMMENT_ATTACHMENTS)
            : [],
        };
      }
    ),
    attachments,
    repost,
  };
}
