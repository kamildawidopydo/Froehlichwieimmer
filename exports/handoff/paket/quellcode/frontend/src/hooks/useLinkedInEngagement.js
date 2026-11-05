import { useCallback, useState } from 'react';
import {
  addUserComment,
  commentLikeKey,
  loadLinkedInEngagement,
  saveSentMessage,
  setPostReaction,
  toggleCommentLike,
  toggleCompanyFollowing,
  toggleExpandedComments,
  togglePostLike,
  togglePostRepost,
} from '@/lib/linkedinPreviewStorage';

export const useLinkedInEngagement = () => {
  const [engagement, setEngagement] = useState(loadLinkedInEngagement);

  const getPostReaction = useCallback(
    (postId) => engagement.postReactions[postId] ?? null,
    [engagement.postReactions],
  );

  const isPostLiked = useCallback(
    (postId) => Boolean(engagement.postLikes[postId]),
    [engagement.postLikes],
  );

  const isPostReposted = useCallback(
    (postId) => Boolean(engagement.postReposts[postId]),
    [engagement.postReposts],
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

  const onTogglePostRepost = useCallback((postId) => {
    setEngagement((prev) => togglePostRepost(prev, postId));
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

  const isFollowing = engagement.companyFollowing;
  const sentMessage = engagement.sentMessage;

  const onToggleFollowing = useCallback(() => {
    setEngagement((prev) => toggleCompanyFollowing(prev));
  }, []);

  const onSendMessage = useCallback((text) => {
    setEngagement((prev) => saveSentMessage(prev, text));
  }, []);

  return {
    getPostReaction,
    isPostLiked,
    isPostReposted,
    isCommentsExpanded,
    isCommentLiked,
    getUserComments,
    onSetPostReaction,
    onTogglePostLike,
    onTogglePostRepost,
    onToggleCommentLike,
    onAddComment,
    onToggleExpandedComments,
    isFollowing,
    sentMessage,
    onToggleFollowing,
    onSendMessage,
  };
};

export default useLinkedInEngagement;
