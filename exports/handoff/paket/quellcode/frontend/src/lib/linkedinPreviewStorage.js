const STORAGE_KEY = 'br_linkedin_preview_engagement_v2';

export const REACTION_TYPES = ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'];

const emptyState = () => ({
  postLikes: {},
  postReactions: {},
  postReposts: {},
  commentLikes: {},
  userComments: {},
  expandedComments: {},
  companyFollowing: false,
  sentMessage: null,
});

export const loadLinkedInEngagement = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem('br_linkedin_preview_engagement_v1');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          postLikes: parsed.postLikes ?? {},
          postReactions: {},
          postReposts: {},
          commentLikes: parsed.commentLikes ?? {},
          userComments: parsed.userComments ?? {},
          expandedComments: {},
          companyFollowing: Boolean(parsed.companyFollowing),
          sentMessage: parsed.sentMessage ?? null,
        };
      }
      return emptyState();
    }
    const parsed = JSON.parse(raw);
    return {
      postLikes: parsed.postLikes ?? {},
      postReactions: parsed.postReactions ?? {},
      postReposts: parsed.postReposts ?? {},
      commentLikes: parsed.commentLikes ?? {},
      userComments: parsed.userComments ?? {},
      expandedComments: parsed.expandedComments ?? {},
      companyFollowing: Boolean(parsed.companyFollowing),
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

export const togglePostRepost = (state, postId) => {
  const next = { ...state, postReposts: { ...state.postReposts } };
  if (next.postReposts[postId]) delete next.postReposts[postId];
  else next.postReposts[postId] = true;
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

export const toggleCompanyFollowing = (state) => {
  const next = { ...state, companyFollowing: !state.companyFollowing };
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
