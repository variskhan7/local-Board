import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Enquiry } from '../types';
import { X, MessageSquare, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnquiryListProps {
  adId: string;
  onClose: () => void;
}

export default function EnquiryList({ adId, onClose }: EnquiryListProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'ads', adId, 'enquiries'),
      orderBy('sent_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Enquiry[];
      setEnquiries(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `ads/${adId}/enquiries`);
    });

    return () => unsubscribe();
  }, [adId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Enquiries</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p>No enquiries yet.</p>
            </div>
          ) : (
            enquiries.map(enquiry => (
              <div key={enquiry.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <User className="w-4 h-4 text-blue-600" />
                    {enquiry.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(enquiry.sent_at.toDate(), { addSuffix: true })}
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                  {enquiry.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
