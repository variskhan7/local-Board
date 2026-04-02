import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Clock, Tag, User, Trash2, CheckCircle, RefreshCw, Star } from 'lucide-react';
import { Ad } from '../types';
import { cn } from '../lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface AdCardProps {
  key?: string | number;
  ad: Ad;
  onViewEnquiries?: (adId: string) => void;
  onEnquire?: (ad: Ad) => void;
}

export default function AdCard({ ad, onViewEnquiries, onEnquire }: AdCardProps) {
  const isOwner = auth.currentUser?.uid === ad.uid;
  const isExpired = ad.expires_at.toDate() < new Date();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClose = async () => {
    if (!isOwner) return;
    setIsUpdating(true);
    const path = `ads/${ad.id}`;
    try {
      await updateDoc(doc(db, 'ads', ad.id), { status: 'closed' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    setIsUpdating(true);
    const path = `ads/${ad.id}`;
    try {
      await deleteDoc(doc(db, 'ads', ad.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRenew = async () => {
    if (!isOwner) return;
    setIsUpdating(true);
    const path = `ads/${ad.id}`;
    try {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      await updateDoc(doc(db, 'ads', ad.id), { 
        expires_at: Timestamp.fromDate(newExpiry),
        status: 'active'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn(
      "group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden",
      ad.featured && "ring-2 ring-amber-400 bg-amber-50/30",
      ad.status === 'closed' && "opacity-75 grayscale"
    )}>
      {ad.featured && (
        <div className="absolute top-3 right-3 bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3 fill-current" />
          Featured
        </div>
      )}

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
            <Tag className="w-3 h-3" />
            {ad.category}
          </span>
          <span className="text-lg font-bold text-slate-900">
            {ad.price === 0 ? 'Free' : `$${ad.price.toLocaleString()}`}
          </span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {ad.title}
        </h3>
        
        <p className="text-slate-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
          {ad.description}
        </p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-6">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(ad.posted_at.toDate(), { addSuffix: true })}
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {ad.enquiry_count || 0} enquiries
          </div>
          {isOwner && (
            <div className="flex items-center gap-1.5 text-blue-600 font-medium">
              <User className="w-3.5 h-3.5" />
              Your ad
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {ad.status === 'active' && !isExpired ? (
            <>
              {!isOwner && onEnquire && (
                <button
                  onClick={() => onEnquire(ad)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enquire
                </button>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={handleClose}
                    disabled={isUpdating}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Close
                  </button>
                  {onViewEnquiries && (
                    <button
                      onClick={() => onViewEnquiries(ad.id)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Enquiries"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <span className="flex-1 text-center py-2 px-4 rounded-lg bg-slate-100 text-slate-500 font-semibold text-sm uppercase tracking-wider">
                {ad.status === 'closed' ? 'Closed' : 'Expired'}
              </span>
              {isOwner && (
                <button
                  onClick={handleRenew}
                  disabled={isUpdating}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Renew for 30 days"
                >
                  <RefreshCw className={cn("w-5 h-5", isUpdating && "animate-spin")} />
                </button>
              )}
            </div>
          )}
          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isUpdating}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Ad"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Ad"
        message="Are you sure you want to delete this classified ad? This action cannot be undone."
        confirmText="Delete"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
