import moment from "moment-timezone";
// Enforce Philippine Standard Time (UTC+8) across backend
moment.tz.setDefault("Asia/Manila");

import { appConfig } from "src/config/app.config";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import express from "express";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import path from "path";
import { errorHandler } from "./utils/global/error";
import connectToMongoDB from "./db/db.connect";
import { repairUtcActiveEntries } from "./utils/global/repair-dtr";
import { DefaultEventsMap, Server, Socket } from "socket.io";
import "dotenv/config";
import "./dtr.cron";
import { Conversation } from "./models/global/messaging/conversation.model";
import {
  FreedomWallPost,
  FREEDOM_WALL_REACTION_TYPES,
  FreedomWallReactionType,
  serializeFreedomWallPost,
  sanitizeFreedomWallAttachments,
  MAX_COMMENT_ATTACHMENTS,
  normalizeFreedomWallReactions,
  type IFreedomWallAttachment,
} from "./models/global/freedom-wall-post.model";
import { FreedomWallNotification } from "./models/global/freedom-wall-notification.model";

// Applicantion routes
import quizRoutes from "./routes/applicant/quiz.route";

// Global Import routes
import authRoute from "./routes/auth/auth.route";
import dtrRoute from "./routes/global/dtr.route";
import declinedEntryRoute from "./routes/global/declined-entry.route";
import scheduleRoute from "./routes/global/schedule.route";
import userRoute from "./routes/workforce/user.route";
import deviceRoute from "./routes/workforce/device.route";
import reportRoute from "./routes/global/report.route";
import progressReportRoute from "./routes/global/progress-report.route";
import messagesRoute from "./routes/global/messaging/messaging.route";
import notificationRoute from "./routes/global/notification.route";
import searchRoute from "./routes/global/search.route";
import freedomWallRoute from "./routes/global/freedom-wall.route";

// HR Import routes
import jobRoute from "./routes/hr/job/job.route";
import categoryRoute from "./routes/hr/job/job-category.route";
import applicationRoute from "./routes/hr/job/job-application.route";
import documentRoute from "./routes/hr/document/document.route";
import performanceRoute from "./routes/hr/performance.route";

// Workforce Import routes
import departmentRoute from "./routes/global/department.route";
import leaveRoute from "./routes/global/leave.route";
import workplaceRoute from "./routes/workforce/workplace.route";
import payrollRoute from "./routes/hr/payroll/payroll.route";

const app = express();
// Behind host nginx -> container nginx: trust both hops so req.ip (rate limits) is the real client.
app.set("trust proxy", 2);
const PORT = process.env.PORT || 9001;

// Configure CORS
const parseAllowedOrigins = (raw?: string): string[] => {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return [parsed];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const allowedOriginsList = parseAllowedOrigins(process.env.CORS_ORIGINS);
const socketOriginsList = parseAllowedOrigins(process.env.SOCKET_ORIGINS || process.env.CORS_ORIGINS);

app.use(
  cors({
    // Never reflect arbitrary origins with credentials; set CORS_ORIGINS explicitly
    origin: allowedOriginsList.filter((o) => o !== "*"),
    credentials: true,
  })
);

// Middleware
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(express.json({ limit: appConfig.http.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: appConfig.http.bodyLimit }));
app.use(cookieParser());

// Routes
app.get("/check", (req, res) => {
  res.json({ message: "Hello, this is HRMS Server!" });
});

// Application Routes
app.use("/api/quizzes", quizRoutes);
app.use("/api/applications", applicationRoute);

// Global Routes
app.use("/api/messaging", messagesRoute);
app.use("/api/schedule", scheduleRoute);
app.use("/api/dtr", dtrRoute);
app.use("/api/declined-entry", declinedEntryRoute);
app.use("/api/report", reportRoute);
app.use("/api/progress", progressReportRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/search", searchRoute);
app.use("/api/freedom-wall", freedomWallRoute);
app.use("/api/auth", authRoute);

// Hr Management Routes
app.use("/api/users", userRoute);
app.use("/api/jobs", jobRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/document", documentRoute);
app.use("/api/payroll", payrollRoute);
app.use("/api/performance", performanceRoute);

// Workforce Management Routes
app.use("/api/departments", departmentRoute);
app.use("/api/leave", leaveRoute);
app.use("/api/workplaces", workplaceRoute);
app.use("/api/device", deviceRoute);

// Global error handler
app.use(errorHandler);

// ---------- HTTP + Socket.IO
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin:
      socketOriginsList.length > 0 && !socketOriginsList.includes("*")
        ? socketOriginsList
        : false,
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
  },
  transports: ["websocket"],
});

// Middleware: Auth
io.use((socket, next) => {
  // Identity comes from a verified JWT, never from a client-supplied userId
  try {
    const token = socket.handshake.auth?.token;
    const decoded = jwt.verify(String(token), process.env.JWT_SECRET as string) as { accountId?: string };
    if (decoded.accountId) {
      socket.data.userId = decoded.accountId;
      return next();
    }
  } catch {}
  return next(new Error("Authentication error"));
});

// Utility: Log any data passing through the socket
function logSocketData(
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  // Log all incoming events (except some built-ins)
  socket.onAny((event, ...args) => {
    if (!["ping", "pong"].includes(event)) {
      console.log(`[IN] [${event}]`);
    }
  });

  // Monkey-patch emit to log all outgoing events
  const originalEmit = socket.emit;
  socket.emit = function (event, ...args) {
    if (!["ping", "pong"].includes(event)) {
      console.log(`[OUT] [${event}]`);
    }
    return originalEmit.apply(this, [event, ...args]);
  };
}

io.on("connection", (socket) => {
  logSocketData(socket);

  const userId = socket.data.userId; // always string or undefined

  if (!userId) {
    console.warn(
      "[Socket] Connection rejected: No userId provided in handshake auth."
    );
    socket.disconnect(true); // disconnect invalid sockets
    return;
  }

  // Always join user room
  const roomName = `user:${userId}`;
  socket.join(roomName);

  console.log(`[Socket] User connected: ${userId}, joined room: ${roomName}`);
  socket.emit("ready");

  // Handle typing:start event
  socket.on("typing:start", async (payload: { conversationId: string; userId: string; userName: string }) => {
    try {
      const { conversationId, userName } = payload;
      const typingUserId = userId;

      // Get conversation to find participants
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        console.warn(`[Socket] Conversation ${conversationId} not found for typing event`);
        return;
      }

      const participants: string[] = conversation.participants || [];

      // Broadcast typing event to all participants except the sender
      participants.forEach((participantId) => {
        if (participantId !== typingUserId) {
          io.to(`user:${participantId}`).emit("typing:start", {
            conversationId,
            userId: typingUserId,
            userName,
          });
        }
      });

      console.log(`[Socket] User ${typingUserId} is typing in conversation ${conversationId}`);
    } catch (error) {
      console.error("[Socket] Error handling typing:start:", error);
    }
  });

  // Handle typing:stop event
  socket.on("typing:stop", async (payload: { conversationId: string; userId: string }) => {
    try {
      const { conversationId } = payload;
      const typingUserId = userId;

      // Get conversation to find participants
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        console.warn(`[Socket] Conversation ${conversationId} not found for typing stop event`);
        return;
      }

      const participants: string[] = conversation.participants || [];

      // Broadcast typing stop event to all participants except the sender
      participants.forEach((participantId) => {
        if (participantId !== typingUserId) {
          io.to(`user:${participantId}`).emit("typing:stop", {
            conversationId,
            userId: typingUserId,
          });
        }
      });

      console.log(`[Socket] User ${typingUserId} stopped typing in conversation ${conversationId}`);
    } catch (error) {
      console.error("[Socket] Error handling typing:stop:", error);
    }
  });

  // (Optional) Listen for disconnects for cleanup/logging
  socket.on("disconnect", (reason) => {
    console.log(`[Socket] User ${userId} disconnected (${reason})`);
  });
});

// ---------- Freedom Wall namespace (guests + logged-in; no mandatory userId)
const freedomIo = io.of("/freedom-wall");
freedomIo.use((socket, next) => {
  // Guests allowed; userId is only trusted when it comes from a verified JWT
  const auth = (socket.handshake.auth || {}) as { token?: string };
  let verifiedUserId: string | undefined;
  if (typeof auth.token === "string" && auth.token) {
    try {
      const decoded = jwt.verify(auth.token, process.env.JWT_SECRET as string) as { accountId?: string };
      if (decoded?.accountId) verifiedUserId = String(decoded.accountId);
    } catch {}
  }
  socket.data.userId = verifiedUserId;
  socket.data.actorId = verifiedUserId ?? `guest:${socket.id}`;
  next();
});

function emptyFreedomReactions(): Record<FreedomWallReactionType, number> {
  return { like: 0, love: 0, laugh: 0, wow: 0, sad: 0 };
}

freedomIo.on("connection", (socket) => {
  socket.on("freedom-wall:join", () => {
    socket.join("freedom-wall");
    if (socket.data.userId) {
      socket.join(`freedom-wall:user:${socket.data.userId}`);
    }
    socket.emit("freedom-wall:joined");
  });

  socket.on(
    "freedom-wall:edit",
    async (payload: {
      postId?: string;
      content?: string;
      isAnonymous?: boolean;
      authorDisplayName?: string;
      attachments?: unknown;
    }) => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;

        const postId = typeof payload?.postId === "string" ? payload.postId.trim() : "";
        if (!postId) return;

        const post = await FreedomWallPost.findById(postId);
        if (!post || String(post.authorUserId || "") !== String(userId)) return;

        const rawContent = typeof payload?.content === "string" ? payload.content.trim() : "";
        if (rawContent.length > 5000) return;

        const attachments = sanitizeFreedomWallAttachments(payload?.attachments);
        const hasAttachments = attachments.length > 0;
        const hasText = rawContent.length > 0;
        if (!hasText && !hasAttachments) return;

        const isAnonymous = payload.isAnonymous !== false;
        const nextAuthorUserId = isAnonymous ? undefined : userId;
        const nextAuthorDisplayName =
          !isAnonymous
            ? typeof payload.authorDisplayName === "string" && payload.authorDisplayName.trim()
              ? payload.authorDisplayName.trim().slice(0, 120)
              : "Member"
            : "Anonymous";

        post.isAnonymous = isAnonymous;
        post.authorUserId = nextAuthorUserId as any;
        post.authorDisplayName = nextAuthorDisplayName as any;
        post.attachments = attachments as any;
        post.content = hasText ? rawContent.slice(0, 5000) : hasAttachments ? "." : "";

        post.markModified("isAnonymous");
        post.markModified("authorUserId");
        post.markModified("authorDisplayName");
        post.markModified("attachments");
        post.markModified("content");
        await post.save();

        const updated = serializeFreedomWallPost(post);
        socket.emit("freedom-wall:updated", updated);
        freedomIo.to("freedom-wall").emit("freedom-wall:updated", updated);
      } catch (e) {
        console.error("[freedom-wall] edit", e);
      }
    }
  );

  socket.on(
    "freedom-wall:repost",
    async (payload: {
      postId?: string;
      caption?: string;
      isAnonymous?: boolean;
      authorDisplayName?: string;
    }) => {
      try {
        const requestedId = typeof payload?.postId === "string" ? payload.postId.trim() : "";
        if (!requestedId) return;

        const requested = await FreedomWallPost.findById(requestedId).lean();
        if (!requested) return;

        const requestedRepost = (requested as { repost?: { rootPostId?: unknown } }).repost;
        const rootId =
          requestedRepost && typeof requestedRepost.rootPostId === "string" && requestedRepost.rootPostId.trim()
            ? requestedRepost.rootPostId.trim()
            : String((requested as { _id: unknown })._id);

        const root =
          rootId === requestedId ? requested : await FreedomWallPost.findById(rootId).lean();
        if (!root) return;

        const rawCaption = typeof payload?.caption === "string" ? payload.caption.trim() : "";
        const caption = rawCaption.slice(0, 5000);
        const hasCaption = caption.length > 0;

        const hasUser = Boolean(socket.data.userId);
        const isAnonymous = !hasUser || payload.isAnonymous !== false;
        const authorUserId = !isAnonymous && socket.data.userId ? socket.data.userId : undefined;

        let authorDisplayName = "Anonymous";
        if (!isAnonymous && socket.data.userId) {
          authorDisplayName =
            typeof payload.authorDisplayName === "string" && payload.authorDisplayName.trim()
              ? payload.authorDisplayName.trim().slice(0, 120)
              : "Member";
        }

        const rootContent = typeof (root as { content?: unknown }).content === "string" ? (root as any).content : "";
        const rootAuthorDisplayName =
          typeof (root as { authorDisplayName?: unknown }).authorDisplayName === "string" && (root as any).authorDisplayName.trim()
            ? (root as any).authorDisplayName.trim().slice(0, 120)
            : "Anonymous";
        const rootCreatedAtRaw = (root as { createdAt?: unknown }).createdAt;
        const rootCreatedAt =
          rootCreatedAtRaw instanceof Date ? rootCreatedAtRaw : new Date(String(rootCreatedAtRaw || ""));
        const rootAttachments = sanitizeFreedomWallAttachments((root as any).attachments);

        const repostSnapshot = {
          rootPostId: String((root as { _id: unknown })._id),
          authorDisplayName: rootAuthorDisplayName,
          createdAt: isNaN(rootCreatedAt.getTime()) ? new Date() : rootCreatedAt,
          content: String(rootContent || "").slice(0, 5000),
          attachments: rootAttachments,
        };

        const post = await FreedomWallPost.create({
          content: hasCaption ? caption : ".",
          isAnonymous,
          authorUserId: isAnonymous ? undefined : authorUserId,
          authorDisplayName,
          views: 0,
          viewActors: new Map(),
          reactions: emptyFreedomReactions(),
          reactionActors: new Map(),
          comments: [],
          commentCount: 0,
          attachments: [],
          repost: repostSnapshot,
        });

        freedomIo.to("freedom-wall").emit("freedom-wall:new", serializeFreedomWallPost(post));
      } catch (e) {
        console.error("[freedom-wall] repost", e);
      }
    }
  );

  socket.on("freedom-wall:view", async (payload: { postId?: string }) => {
    try {
      const postId = payload?.postId;
      if (!postId) return;
      const actorId = socket.data.actorId as string;
      if (!actorId) return;

      const post = await FreedomWallPost.findById(postId);
      if (!post) return;

      const actors =
        post.viewActors instanceof Map
          ? new Map(post.viewActors)
          : new Map(Object.entries((post.viewActors as Record<string, boolean>) || {}));

      if (actors.has(actorId)) return;
      actors.set(actorId, true);

      post.viewActors = actors as any;
      post.views = Math.max(0, (Number(post.views) || 0) + 1);
      post.markModified("viewActors");
      post.markModified("views");
      await post.save();

      const viewPayload = { postId: String(post._id), views: Math.max(0, Math.floor(Number(post.views)) || 0) };
      socket.emit("freedom-wall:view", viewPayload);
      freedomIo.to("freedom-wall").emit("freedom-wall:view", viewPayload);
    } catch (e) {
      console.error("[freedom-wall] view", e);
    }
  });

  socket.on(
    "freedom-wall:post",
    async (payload: {
      content?: string;
      isAnonymous?: boolean;
      authorDisplayName?: string;
      authorUserId?: string;
      attachments?: unknown;
    }) => {
      try {
        const content =
          typeof payload?.content === "string" ? payload.content.trim() : "";
        const attachments = sanitizeFreedomWallAttachments(payload?.attachments);
        const hasAttachments = attachments.length > 0;
        const hasText = content.length > 0 && content.length <= 5000;
        if (!hasText && !hasAttachments) return;
        if (content.length > 5000) return;
        const hasUser = Boolean(socket.data.userId);
        const isAnonymous = !hasUser || payload.isAnonymous !== false;
        const authorUserId =
          !isAnonymous && socket.data.userId ? socket.data.userId : undefined;
        let authorDisplayName = "Anonymous";
        if (!isAnonymous && socket.data.userId) {
          authorDisplayName =
            typeof payload.authorDisplayName === "string" &&
            payload.authorDisplayName.trim()
              ? payload.authorDisplayName.trim().slice(0, 120)
              : "Member";
        }
        const body =
          hasText ? content.slice(0, 5000) : hasAttachments ? "." : "";
        const post = await FreedomWallPost.create({
          content: body,
          isAnonymous,
          authorUserId: isAnonymous ? undefined : authorUserId,
          authorDisplayName,
          views: 0,
          viewActors: new Map(),
          reactions: emptyFreedomReactions(),
          reactionActors: new Map(),
          comments: [],
          commentCount: 0,
          attachments,
        });
        freedomIo
          .to("freedom-wall")
          .emit("freedom-wall:new", serializeFreedomWallPost(post));
      } catch (e) {
        console.error("[freedom-wall] post", e);
      }
    }
  );

  socket.on(
  "freedom-wall:react",
  async (payload: { postId?: string; type?: string }) => {
      try {
        const postId = payload?.postId;
        const type = payload?.type as FreedomWallReactionType;
        if (!postId || !FREEDOM_WALL_REACTION_TYPES.includes(type)) return;
        const actorId = socket.data.actorId as string;
        const post = await FreedomWallPost.findById(postId);
        if (!post) return;
        const actors =
          post.reactionActors instanceof Map
            ? new Map(post.reactionActors)
            : new Map(
                Object.entries(
                  (post.reactionActors as Record<string, string>) || {}
                ) as [string, FreedomWallReactionType][]
              );
        const prev = actors.get(actorId);
        const reactions = normalizeFreedomWallReactions(post.reactions);
        if (prev === type) {
          reactions[type] = Math.max(0, (reactions[type] || 0) - 1);
          actors.delete(actorId);
        } else {
          if (prev && FREEDOM_WALL_REACTION_TYPES.includes(prev)) {
            reactions[prev] = Math.max(0, (reactions[prev] || 0) - 1);
          }
          reactions[type] = (reactions[type] || 0) + 1;
          actors.set(actorId, type);
        }
        post.reactions = reactions;
        post.reactionActors = actors;
        post.markModified("reactions");
        post.markModified("reactionActors");
        await post.save();
        const reactionsPlain = {
          like: Number(post.reactions?.like) || 0,
          love: Number(post.reactions?.love) || 0,
          laugh: Number(post.reactions?.laugh) || 0,
          wow: Number(post.reactions?.wow) || 0,
          sad: Number(post.reactions?.sad) || 0,
        };
        const totalReactions = FREEDOM_WALL_REACTION_TYPES.reduce(
          (s, k) => s + reactionsPlain[k],
          0
        );
        const actorsPlain = Object.fromEntries(post.reactionActors || new Map());
        const reactionPayload = {
          postId: String(post._id),
          reactions: reactionsPlain,
          reactionActors: actorsPlain,
          totalReactions,
        };
        // Sender may not be in room yet (join race) — always echo so counts update
        socket.emit("freedom-wall:reaction", reactionPayload);
        freedomIo.to("freedom-wall").emit("freedom-wall:reaction", reactionPayload);
        const authorId = post.authorUserId ? String(post.authorUserId) : "";
        if (
          authorId &&
          authorId !== String(socket.data.userId || "") &&
          prev !== type
        ) {
          const excerpt = (post.content || "").slice(0, 80);
          try {
            const doc = await FreedomWallNotification.create({
              userId: authorId,
              kind: "reaction",
              postId: String(post._id),
              postExcerpt: excerpt,
              reactionType: type,
            });
            freedomIo.to(`freedom-wall:user:${authorId}`).emit("freedom-wall:notify", {
              kind: "reaction",
              postId: String(post._id),
              postExcerpt: excerpt,
              type,
              notificationId: String(doc._id),
              at: doc.createdAt.getTime(),
            });
          } catch (err) {
            console.error("[freedom-wall] notify reaction", err);
            freedomIo.to(`freedom-wall:user:${authorId}`).emit("freedom-wall:notify", {
              kind: "reaction",
              postId: String(post._id),
              postExcerpt: excerpt,
              type,
            });
          }
        }
      } catch (e) {
        console.error("[freedom-wall] react", e);
      }
    }
  );

  socket.on(
    "freedom-wall:comment-react",
    async (payload: { postId?: string; commentId?: string; type?: string }) => {
      try {
        const postId = payload?.postId;
        const commentId = payload?.commentId;
        const type = payload?.type as FreedomWallReactionType;
        if (!postId || !commentId || !FREEDOM_WALL_REACTION_TYPES.includes(type)) return;
        const actorId = socket.data.actorId as string;
        const post = await FreedomWallPost.findById(postId);
        if (!post) return;
        const comment = (post.comments as any).id
          ? (post.comments as any).id(commentId)
          : (post.comments as any[]).find(
              (c: any) => String(c._id) === String(commentId)
            );
        if (!comment) return;

        const rawActors = comment.reactionActors;
        const actors = new Map<string, FreedomWallReactionType>(
          rawActors instanceof Map
            ? (rawActors as Map<string, FreedomWallReactionType>)
            : (Object.entries(
                (rawActors as Record<string, string>) || {}
              ) as [string, FreedomWallReactionType][])
        );
        const prev: FreedomWallReactionType | undefined = actors.get(actorId);
        const reactions = normalizeFreedomWallReactions(comment.reactions);
        if (prev === type) {
          reactions[type] = Math.max(0, (reactions[type] || 0) - 1);
          actors.delete(actorId);
        } else {
          if (prev && FREEDOM_WALL_REACTION_TYPES.includes(prev)) {
            reactions[prev] = Math.max(0, (reactions[prev] || 0) - 1);
          }
          reactions[type] = (reactions[type] || 0) + 1;
          actors.set(actorId, type);
        }
        comment.reactions = reactions;
        comment.reactionActors = actors as any;
        post.markModified("comments");
        await post.save();

        const reactionsPlain = {
          like: Number(reactions.like) || 0,
          love: Number(reactions.love) || 0,
          laugh: Number(reactions.laugh) || 0,
          wow: Number(reactions.wow) || 0,
          sad: Number(reactions.sad) || 0,
        };
        const totalReactions = FREEDOM_WALL_REACTION_TYPES.reduce(
          (s, k) => s + reactionsPlain[k],
          0
        );
        const actorsPlain = Object.fromEntries(actors || new Map());
        const reactionPayload = {
          postId: String(post._id),
          commentId: String(comment._id),
          reactions: reactionsPlain,
          reactionActors: actorsPlain,
          totalReactions,
        };
        socket.emit("freedom-wall:comment-reaction", reactionPayload);
        freedomIo.to("freedom-wall").emit("freedom-wall:comment-reaction", reactionPayload);
      } catch (e) {
        console.error("[freedom-wall] comment-react", e);
      }
    }
  );

  socket.on("freedom-wall:delete", async (payload: { postId?: string }) => {
    try {
      const userId = socket.data.userId as string | undefined;
      if (!userId) return;
      const postId = payload?.postId;
      if (!postId) return;
      const post = await FreedomWallPost.findById(postId);
      if (!post || String(post.authorUserId || "") !== String(userId)) return;
      await FreedomWallPost.deleteOne({ _id: postId });
      freedomIo.to("freedom-wall").emit("freedom-wall:deleted", { postId: String(postId) });
    } catch (e) {
      console.error("[freedom-wall] delete", e);
    }
  });

  socket.on(
    "freedom-wall:comment",
    async (payload: {
      postId?: string;
      body?: string;
      isAnonymous?: boolean;
      authorDisplayName?: string;
      attachments?: unknown;
    }) => {
      try {
        const postId = payload?.postId;
        const body =
          typeof payload?.body === "string" ? payload.body.trim().slice(0, 2000) : "";
        const attachments = sanitizeFreedomWallAttachments(
          payload?.attachments,
          MAX_COMMENT_ATTACHMENTS
        );
        if (!postId || (!body && attachments.length === 0)) return;
        const hasUser = Boolean(socket.data.userId);
        const isAnonymous = !hasUser || payload.isAnonymous !== false;
        let authorDisplayName = "Anonymous";
        if (!isAnonymous && socket.data.userId) {
          authorDisplayName =
            typeof payload.authorDisplayName === "string" &&
            payload.authorDisplayName.trim()
              ? payload.authorDisplayName.trim().slice(0, 120)
              : "Member";
        }
        const post = await FreedomWallPost.findById(postId);
        if (!post) return;
        post.comments.push({
          body,
          createdAt: new Date(),
          isAnonymous,
          authorDisplayName,
          authorUserId: isAnonymous ? undefined : socket.data.userId,
          attachments,
        } as never);
        post.commentCount = (post.commentCount || 0) + 1;
        await post.save();
        const last = post.comments[post.comments.length - 1];
        const att = Array.isArray((last as { attachments?: unknown }).attachments)
          ? (last as { attachments: IFreedomWallAttachment[] }).attachments
          : [];
        freedomIo.to("freedom-wall").emit("freedom-wall:comment", {
          postId: String(post._id),
          commentCount: post.commentCount,
          comment: {
            _id: String(last._id),
            body: last.body,
            createdAt: last.createdAt,
            isAnonymous: last.isAnonymous,
            authorDisplayName: last.authorDisplayName,
            attachments: att.map((a) => ({
              name: a.name,
              url: a.url,
              type: a.type,
              size: a.size,
            })),
          },
        });
        const authorId = post.authorUserId ? String(post.authorUserId) : "";
        if (authorId && authorId !== String(socket.data.userId || "")) {
          const postExcerpt = (post.content || "").slice(0, 80);
          const commentExcerpt =
            body.slice(0, 120) ||
            (attachments[0]?.name ? `📎 ${attachments[0].name}` : "(attachment)");
          try {
            const doc = await FreedomWallNotification.create({
              userId: authorId,
              kind: "comment",
              postId: String(post._id),
              postExcerpt,
              commentExcerpt,
              authorDisplayName: last.authorDisplayName,
            });
            freedomIo.to(`freedom-wall:user:${authorId}`).emit("freedom-wall:notify", {
              kind: "comment",
              postId: String(post._id),
              postExcerpt,
              commentExcerpt,
              authorDisplayName: last.authorDisplayName,
              notificationId: String(doc._id),
              at: doc.createdAt.getTime(),
            });
          } catch (err) {
            console.error("[freedom-wall] notify comment", err);
            freedomIo.to(`freedom-wall:user:${authorId}`).emit("freedom-wall:notify", {
              kind: "comment",
              postId: String(post._id),
              postExcerpt,
              commentExcerpt,
              authorDisplayName: last.authorDisplayName,
            });
          }
        }
      } catch (e) {
        console.error("[freedom-wall] comment", e);
      }
    }
  );
});

const startServer = async () => {
  try {
    await connectToMongoDB();
    await repairUtcActiveEntries();
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

startServer();
