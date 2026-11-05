const STORAGE_KEY = 'br_instagram_preview_engagement_v1';

const emptyState = () => ({
  postLikes: {},
  savedPosts: {},
  commentLikes: {},
  userComments: {},
  expandedComments: {},
  accountFollowing: false,
});

export const loadInstagramEngagement = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      postLikes: parsed.postLikes ?? {},
      savedPosts: parsed.savedPosts ?? {},
      commentLikes: parsed.commentLikes ?? {},
      userComments: parsed.userComments ?? {},
      expandedComments: parsed.expandedComments ?? {},
      accountFollowing: Boolean(parsed.accountFollowing),
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

export const togglePostLike = (state, postId) => {
  const next = { ...state, postLikes: { ...state.postLikes } };
  if (next.postLikes[postId]) delete next.postLikes[postId];
  else next.postLikes[postId] = true;
  save(next);
  return next;
};

export const togglePostSave = (state, postId) => {
  const next = { ...state, savedPosts: { ...state.savedPosts } };
  if (next.savedPosts[postId]) delete next.savedPosts[postId];
  else next.savedPosts[postId] = true;
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

export const toggleAccountFollowing = (state) => {
  const next = { ...state, accountFollowing: !state.accountFollowing };
  save(next);
  return next;
};
