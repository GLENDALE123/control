import React, { useState } from 'react';
import { Comment, UserProfile } from '../types';

interface CommentsSectionProps {
    comments: Comment[];
    onAddComment: (text: string) => void;
    canComment?: boolean;
    currentUserProfile?: UserProfile | null;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ comments, onAddComment, canComment = true, currentUserProfile }) => {
    const [newComment, setNewComment] = useState('');

    const submitComment = () => {
        if (newComment.trim() && canComment) {
            onAddComment(newComment);
            setNewComment('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitComment();
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitComment();
        }
    };

    return (
        <div className="mt-6 border-t dark:border-slate-700 pt-4">
            <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-4">댓글 ({comments.length})</h4>
            <div className="space-y-4 mb-4">
                {comments.map(comment => {
                    const isUnread = currentUserProfile && comment.readBy && !comment.readBy.includes(currentUserProfile.uid);
                    return (
                        <div key={comment.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-200 dark:bg-primary-700 flex items-center justify-center font-bold text-primary-700 dark:text-primary-200 text-sm">
                                {comment.user.charAt(0)}
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-gray-800 dark:text-slate-200">{comment.user}</span>
                                        {isUnread && (
                                            <span className="w-2 h-2 bg-blue-500 rounded-full" title="새 댓글"></span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">{new Date(comment.date).toLocaleString('ko-KR')}</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{comment.text}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <form onSubmit={handleSubmit} className="flex items-start space-x-3">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                 <div className="flex-1">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={canComment ? "댓글을 추가하세요... (Enter로 전송, Shift+Enter로 줄바꿈)" : "댓글을 작성할 권한이 없습니다."}
                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800"
                        rows={2}
                        disabled={!canComment}
                        lang="ko"
                    ></textarea>
                    {canComment && <button type="submit" className="mt-2 bg-primary-600 text-white px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-primary-700">댓글 달기</button>}
                 </div>
            </form>
        </div>
    );
};

export default CommentsSection;