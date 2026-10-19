import { useCallback, useState } from 'react';
import {
  addUserComment,
  commentLikeKey,
  loadFacebookEngagement,
  saveSentMessage,
  setPostReaction,
  toggleCommentLike,
  toggleExpandedComments,
  togglePageFollowing,
  togglePageLike,
  togglePostLike,
  togglePostShare,
} from '@/lib/facebookPreviewStorage';

export const useFacebookEngagement = () => {
  const [engagement, setEngagement] = useState(loadFacebookEngagement);

  const getPostReaction = useCallback(
    (postId) => engagement.postReactions[postId] ?? null,
    [engagement.postReactions],
  );

  const isPostLiked = useCallback(
    (postId) => Boolean(engagement.postLikes[postId]),
    [engagement.postLikes],
  );

  const isPostShared = useCallback(
    (postId) => Boolean(engagement.postShares[postId]),
    [engagement.postShares],
  );

  const isCommentsExpanded = useCallback(
    (postId) => Boolean(engagement.expandedComments[postId]),
    [engagement.expandedComments],
  );

  const isCommentLiked = useCallback(
    (postId, commentId) => Boolean(engagement.commentLikes[commentLikeKey(postId, commentId)]),
    [engagement.commentLikes],
  );

  const getUserComments = useCallback(
    (postId) => engagement.userComments[postId] ?? [],
    [engagement.userComments],
  );

  const onSetPostReaction = useCallback((postId, reactionType) => {
    setEngagement((prev) => setPostReaction(prev, postId, reactionType));
  }, []);

  const onTogglePostLike = useCallback((postId) => {
    setEngagement((prev) => togglePostLike(prev, postId));
  }, []);

  const onTogglePostShare = useCallback((postId) => {
    setEngagement((prev) => togglePostShare(prev, postId));
  }, []);

  const onToggleCommentLike = useCallback((postId, commentId) => {
    setEngagement((prev) => toggleCommentLike(prev, postId, commentId));
  }, []);

  const onAddComment = useCallback((postId, text) => {
    setEngagement((prev) => addUserComment(prev, postId, text));
  }, []);

  const onToggleExpandedComments = useCallback((postId) => {
    setEngagement((prev) => toggleExpandedComments(prev, postId));
  }, []);

  const isFollowing = engagement.pageFollowing;
  const isPageLiked = engagement.pageLiked;
  const sentMessage = engagement.sentMessage;

  const onToggleFollowing = useCallback(() => {
    setEngagement((prev) => togglePageFollowing(prev));
  }, []);

  const onTogglePageLike = useCallback(() => {
    setEngagement((prev) => togglePageLike(prev));
  }, []);

  const onSendMessage = useCallback((text) => {
    setEngagement((prev) => saveSentMessage(prev, text));
  }, []);

  return {
    getPostReaction,
    isPostLiked,
    isPostShared,
    isCommentsExpanded,
    isCommentLiked,
    getUserComments,
    onSetPostReaction,
    onTogglePostLike,
    onTogglePostShare,
    onToggleCommentLike,
    onAddComment,
    onToggleExpandedComments,
    isFollowing,
    isPageLiked,
    sentMessage,
    onToggleFollowing,
    onTogglePageLike,
    onSendMessage,
  };
};

export default useFacebookEngagement;
