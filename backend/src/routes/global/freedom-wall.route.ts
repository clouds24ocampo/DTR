import { Router, Request, Response } from "express";
import protectRoute from "src/middleware/protectedRoute";
import {
  FreedomWallPost,
  FREEDOM_WALL_REACTION_TYPES,
  FreedomWallReactionType,
  serializeFreedomWallPost,
  sanitizeFreedomWallAttachments,
} from "../../models/global/freedom-wall-post.model";
import { FreedomWallNotification } from "../../models/global/freedom-wall-notification.model";

const router = Router();

const SORTS = ["newest", "oldest", "mostReacted", "mostViewed", "mostCommented", "random"] as const;
type Sort = (typeof SORTS)[number];

function emptyReactions(): Record<FreedomWallReactionType, number> {
  return { like: 0, love: 0, laugh: 0, wow: 0, sad: 0 };
}

/** Escape user input for safe use in MongoDB $regex */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** GET /api/freedom-wall/posts/search?q=... — search post body (case-insensitive) */
router.get("/posts/search", async (req: Request, res: Response) => {
  try {
    const raw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (raw.length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters" });
    }
    if (raw.length > 200) {
      return res.status(400).json({ message: "Query too long" });
    }
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 50);
    const skip = Math.min(Math.max(parseInt(String(req.query.skip), 10) || 0, 0), 5000);
    const posts = await FreedomWallPost.find({
      content: { $regex: escapeRegex(raw), $options: "i" },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const serialized = (posts as Record<string, unknown>[]).map((p) => {
      const doc = p as Record<string, unknown> & { _id: unknown };
      if (!doc.reactions) doc.reactions = emptyReactions();
      if (!doc.reactionActors) doc.reactionActors = new Map();
      return serializeFreedomWallPost(doc as Parameters<typeof serializeFreedomWallPost>[0]);
    });
    res.json({ posts: serialized, query: raw, hasMore: posts.length >= limit });
  } catch (e) {
    console.error("[freedom-wall] GET posts/search", e);
    res.status(500).json({ message: "Search failed" });
  }
});

/** GET /api/freedom-wall/posts/:id — fetch a single post by id */
router.get("/posts/:id", async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) return res.status(400).json({ message: "Missing post id" });
    if (id.length > 64) return res.status(400).json({ message: "Invalid post id" });

    const post = await FreedomWallPost.findById(id).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const doc = post as Record<string, unknown> & { _id: unknown };
    if (!doc.reactions) doc.reactions = emptyReactions();
    if (!doc.reactionActors) doc.reactionActors = new Map();

    return res.json({ post: serializeFreedomWallPost(doc as Parameters<typeof serializeFreedomWallPost>[0]) });
  } catch (e) {
    console.error("[freedom-wall] GET posts/:id", e);
    return res.status(500).json({ message: "Failed to load post" });
  }
});

/** GET /api/freedom-wall/leaderboard/uploaders?limit=10 — top posters (includes anonymous grouped by displayName) */
router.get("/leaderboard/uploaders", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 10, 1), 50);
    const rows = await FreedomWallPost.aggregate([
      {
        $addFields: {
          leaderboardUploaderKey: {
            $cond: [
              { $and: [{ $ne: ["$authorUserId", null] }, { $ne: ["$authorUserId", ""] }] },
              "$authorUserId",
              {
                $concat: [
                  "anon:",
                  {
                    $ifNull: ["$authorDisplayName", "Anonymous"],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$leaderboardUploaderKey",
          posts: { $sum: 1 },
          authorUserId: { $first: "$authorUserId" },
          authorDisplayName: { $first: "$authorDisplayName" },
        },
      },
      { $sort: { posts: -1 } },
      { $limit: limit },
    ]);

    res.json({
      uploaders: (rows as Array<Record<string, unknown>>).map((r) => ({
        key: String(r._id),
        authorUserId: r.authorUserId != null ? String(r.authorUserId) : undefined,
        authorDisplayName:
          typeof r.authorDisplayName === "string" && r.authorDisplayName.trim()
            ? r.authorDisplayName
            : String(r._id).startsWith("anon:")
              ? String(r._id).slice("anon:".length) || "Anonymous"
              : "Anonymous",
        posts: Math.max(0, Math.floor(Number(r.posts)) || 0),
      })),
    });
  } catch (e) {
    console.error("[freedom-wall] GET leaderboard/uploaders", e);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
});

/** GET /api/freedom-wall/leaderboard/uploader-posts?key=... — posts for a given uploader key (authorUserId or anon:DisplayName) */
router.get("/leaderboard/uploader-posts", async (req: Request, res: Response) => {
  try {
    const key = typeof req.query.key === "string" ? req.query.key.trim() : "";
    if (!key) return res.status(400).json({ message: "Missing uploader key" });
    if (key.length > 200) return res.status(400).json({ message: "Invalid uploader key" });

    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 50);
    const skip = Math.min(Math.max(parseInt(String(req.query.skip), 10) || 0, 0), 5000);

    const isAnonKey = key.startsWith("anon:");
    const anonName = isAnonKey ? key.slice("anon:".length).trim() : "";

    const filter = isAnonKey
      ? {
          $and: [
            { $or: [{ authorUserId: null }, { authorUserId: "" }, { authorUserId: { $exists: false } }] },
            { authorDisplayName: anonName || "Anonymous" },
          ],
        }
      : { authorUserId: key };

    const posts = await FreedomWallPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const serialized = (posts as Record<string, unknown>[]).map((p) => {
      const doc = p as Record<string, unknown> & { _id: unknown };
      if (!doc.reactions) doc.reactions = emptyReactions();
      if (!doc.reactionActors) doc.reactionActors = new Map();
      return serializeFreedomWallPost(doc as Parameters<typeof serializeFreedomWallPost>[0]);
    });

    res.json({ posts: serialized, key, hasMore: posts.length >= limit });
  } catch (e) {
    console.error("[freedom-wall] GET leaderboard/uploader-posts", e);
    res.status(500).json({ message: "Failed to load uploader posts" });
  }
});

/** GET /api/freedom-wall/notifications — signed-in user’s Freedom Wall activity */
router.get("/notifications", protectRoute, async (req: Request, res: Response) => {
  try {
    const account = (req as { account?: { _id: unknown } }).account;
    const userId = account?._id != null ? String(account._id) : "";
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 100, 1), 200);
    const rows = await FreedomWallNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      notifications: rows.map((r) => ({
        id: String(r._id),
        kind: r.kind,
        postId: r.postId,
        postExcerpt: r.postExcerpt || "",
        type: r.reactionType,
        commentExcerpt: r.commentExcerpt || "",
        authorDisplayName: r.authorDisplayName || "Someone",
        at: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
      })),
    });
  } catch (e) {
    console.error("[freedom-wall] GET notifications", e);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

/** DELETE /api/freedom-wall/notifications — clear all for signed-in user */
router.delete("/notifications", protectRoute, async (req: Request, res: Response) => {
  try {
    const account = (req as { account?: { _id: unknown } }).account;
    const userId = account?._id != null ? String(account._id) : "";
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await FreedomWallNotification.deleteMany({ userId });
    res.json({ deleted: result.deletedCount ?? 0 });
  } catch (e) {
    console.error("[freedom-wall] DELETE notifications", e);
    res.status(500).json({ message: "Failed to clear notifications" });
  }
});

/** GET /api/freedom-wall/posts/mine — signed-in user’s named posts only */
router.get("/posts/mine", protectRoute, async (req: Request, res: Response) => {
  try {
    const account = (req as { account?: { _id: unknown } }).account;
    const userId = account?._id != null ? String(account._id) : "";
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 50);
    const skip = Math.min(Math.max(parseInt(String(req.query.skip), 10) || 0, 0), 5000);
    const posts = await FreedomWallPost.find({ authorUserId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const serialized = (posts as Record<string, unknown>[]).map((p) => {
      const doc = p as Record<string, unknown> & { _id: unknown };
      if (!doc.reactions) doc.reactions = emptyReactions();
      if (!doc.reactionActors) doc.reactionActors = new Map();
      return serializeFreedomWallPost(doc as Parameters<typeof serializeFreedomWallPost>[0]);
    });
    res.json({ posts: serialized, hasMore: posts.length >= limit });
  } catch (e) {
    console.error("[freedom-wall] GET posts/mine", e);
    res.status(500).json({ message: "Failed to load your posts" });
  }
});

/** GET /api/freedom-wall/posts — paginate with skip + limit (default limit 20) */
router.get("/posts", async (req: Request, res: Response) => {
  try {
    const sort = (req.query.sort as string) || "newest";
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 50);
    const skip = Math.min(Math.max(parseInt(String(req.query.skip), 10) || 0, 0), 5000);

    if (!SORTS.includes(sort as Sort)) {
      return res.status(400).json({ message: "Invalid sort" });
    }

    let posts: unknown[];

    if (sort === "random") {
      const count = await FreedomWallPost.countDocuments();
      if (count === 0) {
        posts = [];
      } else {
        const sampleSize = Math.min(skip + limit, count);
        posts = await FreedomWallPost.aggregate([
          { $sample: { size: sampleSize } },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ]);
      }
    } else if (sort === "newest") {
      posts = await FreedomWallPost.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else if (sort === "oldest") {
      posts = await FreedomWallPost.find()
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else if (sort === "mostCommented") {
      posts = await FreedomWallPost.find()
        .sort({ commentCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else if (sort === "mostViewed") {
      posts = await FreedomWallPost.find()
        .sort({ views: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } else {
      // mostReacted — sum of reaction fields
      posts = await FreedomWallPost.aggregate([
        {
          $addFields: {
            totalReactions: {
              $add: [
                { $ifNull: ["$reactions.like", 0] },
                { $ifNull: ["$reactions.love", 0] },
                { $ifNull: ["$reactions.laugh", 0] },
                { $ifNull: ["$reactions.wow", 0] },
                { $ifNull: ["$reactions.sad", 0] },
              ],
            },
          },
        },
        { $sort: { totalReactions: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
    }

    const serialized = (posts as Record<string, unknown>[]).map((p) => {
      const doc = p as Record<string, unknown> & { _id: unknown };
      if (!doc.reactions) doc.reactions = emptyReactions();
      if (!doc.reactionActors) doc.reactionActors = new Map();
      return serializeFreedomWallPost(doc as Parameters<typeof serializeFreedomWallPost>[0]);
    });

    res.json({ posts: serialized, hasMore: posts.length >= limit });
  } catch (e) {
    console.error("[freedom-wall] GET posts", e);
    res.status(500).json({ message: "Failed to load posts" });
  }
});

/** POST /api/freedom-wall/posts — optional REST create */
router.post("/posts", async (req: Request, res: Response) => {
  try {
    const { content, isAnonymous, authorUserId, authorDisplayName, actorId, attachments } =
      req.body || {};
    const text =
      typeof content === "string" ? content.trim().slice(0, 5000) : "";
    const att = sanitizeFreedomWallAttachments(attachments);
    if (!text && att.length === 0) {
      return res.status(400).json({ message: "content or at least one attachment required" });
    }
    const body = text || (att.length > 0 ? "." : "");
    const post = await FreedomWallPost.create({
      content: body,
      isAnonymous: !!isAnonymous,
      authorUserId: authorUserId || undefined,
      authorDisplayName:
        typeof authorDisplayName === "string" && authorDisplayName.trim()
          ? authorDisplayName.trim().slice(0, 120)
          : "Anonymous",
      reactions: emptyReactions(),
      reactionActors: new Map(),
      comments: [],
      commentCount: 0,
      attachments: att,
    });
    res.status(201).json({ post: serializeFreedomWallPost(post), actorId });
  } catch (e) {
    console.error("[freedom-wall] POST posts", e);
    res.status(500).json({ message: "Failed to create post" });
  }
});

export default router;
