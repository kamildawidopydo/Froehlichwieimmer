const STORAGE_KEY = 'br_facebook_preview_engagement_v3';

export const FB_REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

const emptyState = () => ({
  postLikes: {},
  postReactions: {},
  postShares: {},
  commentLikes: {},
  userComments: {},
  expandedComments: {},
  pageFollowing: false,
  pageLiked: false,
  sentMessage: null,
});

export const loadFacebookEngagement = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const v2 = localStorage.getItem('br_facebook_preview_engagement_v2');
      if (v2) {
        const parsed = JSON.parse(v2);
        return {
          postLikes: parsed.postLikes ?? {},
          postReactions: parsed.postReactions ?? {},
          postShares: parsed.postShares ?? {},
          commentLikes: parsed.commentLikes ?? {},
          userComments: parsed.userComments ?? {},
          expandedComments: parsed.expandedComments ?? {},
          pageFollowing: Boolean(parsed.pageFollowing),
          pageLiked: false,
          sentMessage: parsed.sentMessage ?? null,
        };
      }
      const legacy = localStorage.getItem('br_facebook_preview_engagement_v1');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          postLikes: parsed.postLikes ?? {},
          postReactions: {},
          postShares: {},
          commentLikes: parsed.commentLikes ?? {},
          userComments: parsed.userComments ?? {},
          expandedComments: {},
          pageFollowing: Boolean(parsed.pageFollowing),
          pageLiked: Boolean(parsed.pageLiked),
          sentMessage: parsed.sentMessage ?? null,
        };
      }
      return emptyState();
    }
    const parsed = JSON.parse(raw);
    return {
      postLikes: parsed.postLikes ?? {},
      postReactions: parsed.postReactions ?? {},
      postShares: parsed.postShares ?? {},
      commentLikes: parsed.commentLikes ?? {},
      userComments: parsed.userComments ?? {},
      expandedComments: parsed.expandedComments ?? {},
      pageFollowing: Boolean(parsed.pageFollowing),
      pageLiked: Boolean(parsed.pageLiked),
      sentMessage: parsed.sentMessage ?? null,
    };
  } catch {
    return emptyState();
  }
};

const save = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
};

export const commentLikeKey = (postId, commentId) => `${postId}:${commentId}`;

export const setPostReaction = (state, postId, reactionType) => {
  const next = {
    ...state,
    postReactions: { ...state.postReactions },
    postLikes: { ...state.postLikes },
  };
  if (!reactionType || next.postReactions[postId] === reactionType) {
    delete next.postReactions[postId];
    delete next.postLikes[postId];
  } else {
    next.postReactions[postId] = reactionType;
    next.postLikes[postId] = true;
  }
  save(next);
  return next;
};

export const togglePostLike = (state, postId) => {
  if (state.postReactions[postId]) {
    return setPostReaction(state, postId, null);
  }
  return setPostReaction(state, postId, 'like');
};

export const togglePostShare = (state, postId) => {
  const next = { ...state, postShares: { ...state.postShares } };
  if (next.postShares[postId]) delete next.postShares[postId];
  else next.postShares[postId] = true;
  save(next);
  return next;
};

export const toggleCommentLike = (state, postId, commentId) => {
  const key = commentLikeKey(postId, commentId);
  const next = { ...state, commentLikes: { ...state.commentLikes } };
  if (next.commentLikes[key]) delete next.commentLikes[key];
  else next.commentLikes[key] = true;
  save(next);
  return next;
};

export const addUserComment = (state, postId, text) => {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const entry = {
    id: `local-${Date.now()}`,
    author: 'Sie',
    publishedAt: 'Gerade eben',
    text: trimmed,
    isLocal: true,
  };
  const list = [...(state.userComments[postId] ?? []), entry];
  const next = {
    ...state,
    userComments: { ...state.userComments, [postId]: list },
  };
  save(next);
  return next;
};

export const toggleExpandedComments = (state, postId) => {
  const next = { ...state, expandedComments: { ...state.expandedComments } };
  next.expandedComments[postId] = !next.expandedComments[postId];
  save(next);
  return next;
};

export const togglePageFollowing = (state) => {
  const next = { ...state, pageFollowing: !state.pageFollowing };
  save(next);
  return next;
};

export const togglePageLike = (state) => {
  const next = { ...state, pageLiked: !state.pageLiked };
  save(next);
  return next;
};

export const saveSentMessage = (state, text) => {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const next = {
    ...state,
    sentMessage: { text: trimmed, sentAt: new Date().toISOString() },
  };
  save(next);
  return next;
};
