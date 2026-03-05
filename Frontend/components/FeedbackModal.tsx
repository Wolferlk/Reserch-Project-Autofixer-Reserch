import { useState } from 'react';
import { FeedbackEvent } from '@/types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackEvent) => void;
  chosenId: string;
  type: 'shop' | 'product' | 'tool';
  errorType?: string;
}

export default function FeedbackModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  chosenId, 
  type: _type, 
  errorType 
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState({
    solved: false,
    user_rating: 5,
    comment: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const feedbackData: FeedbackEvent = {
      chosen_id: chosenId,
      error_type: errorType || 'General',
      solved: feedback.solved,
      user_rating: feedback.user_rating,
      comment: feedback.comment.trim() || undefined
    };

    onSubmit(feedbackData);
    onClose();
    
    // Reset form
    setFeedback({
      solved: false,
      user_rating: 5,
      comment: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            Give Feedback
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Solved Status */}
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-4">
              Was this helpful?
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="solved"
                  checked={feedback.solved === true}
                  onChange={() => setFeedback(prev => ({ ...prev, solved: true }))}
                  className="w-5 h-5 bg-white/5 border border-white/20 text-green-500 focus:ring-2 focus:ring-green-400/50"
                />
                <span className="text-sm text-green-400 group-hover:text-green-300 transition-colors">✅ Yes, helpful</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="solved"
                  checked={feedback.solved === false}
                  onChange={() => setFeedback(prev => ({ ...prev, solved: false }))}
                  className="w-5 h-5 bg-white/5 border border-white/20 text-red-500 focus:ring-2 focus:ring-red-400/50"
                />
                <span className="text-sm text-red-400 group-hover:text-red-300 transition-colors">❌ Not helpful</span>
              </label>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-4">
              Rating (1-5 stars)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedback(prev => ({ ...prev, user_rating: star }))}
                  className="text-3xl hover:scale-110 transition-transform duration-200"
                >
                  {star <= feedback.user_rating ? (
                    <span className="text-yellow-400 drop-shadow-lg">★</span>
                  ) : (
                    <span className="text-white/30">★</span>
                  )}
                </button>
              ))}
            </div>
            <span className="text-sm text-white/60 mt-2 block">
              {feedback.user_rating} out of 5 stars
            </span>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-semibold text-white/90 mb-3">
              Additional Comments (Optional)
            </label>
            <textarea
              id="comment"
              value={feedback.comment}
              onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your experience or suggestions..."
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 backdrop-blur-sm"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
