import { useCallback, useState } from 'react';
import {
  addUserComment,
  loadInstagramEngagement,
  toggleAccountFollowing,
  toggleCommentLike,
  toggleExpandedComments,
  togglePostLike,
  togglePostSave,
} from '@/lib/instagramPreviewStorage';

export const useInstagramEngagement = () => {
  const [engagement, setEngagement] = useState(loadInstagramEngagement);

  const isPostLiked = useCallback(
    (postId) => Boolean(engagement.postLikes[postId]),
    [engagement.postLikes],
  );

  const isPostSaved = useCallback(
    (postId) => Boolean(engagement.savedPosts[postId]),
    [engagement.savedPosts],
  );

  const isCommentsExpanded = useCallback(
    (postId) => Boolean(engagement.expandedComments[postId]),
    [engagement.expandedComments],
  );

  const isCommentLiked = useCallback(
    (postId, commentId) => Boolean(engagement.commentLikes[`${postId}:${commentId}`]),
    [engagement.commentLikes],
  );

  const getUserComments = useCallback(
    (postId) => engagement.userComments[postId] ?? [],
    [engagement.userComments],
  );

  const onTogglePostLike = useCallback((postId) => {
    setEngagement((prev) => togglePostLike(prev, postId));
  }, []);

  const onTogglePostSave = useCallback((postId) => {
    setEngagement((prev) => togglePostSave(prev, postId));
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

  const isFollowing = engagement.accountFollowing;

  const onToggleFollowing = useCallback(() => {
    setEngagement((prev) => toggleAccountFollowing(prev));
  }, []);

  return {
    isPostLiked,
    isPostSaved,
    isCommentsExpanded,
    isCommentLiked,
    getUserComments,
    onTogglePostLike,
    onTogglePostSave,
    onToggleCommentLike,
    onAddComment,
    onToggleExpandedComments,
    isFollowing,
    onToggleFollowing,
  };
};

export default useInstagramEngagement;
