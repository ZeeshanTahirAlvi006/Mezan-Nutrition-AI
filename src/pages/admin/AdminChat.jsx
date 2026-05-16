import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import admin from '../../api/adminClient';
import { Ban, Trash2 } from 'lucide-react';

const AdminChat = () => {
  const [searchParams] = useSearchParams();
  const userIdFilter = searchParams.get('userId');

  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);

  const loadSessions = async () => {
    const { data } = await admin.listChatSessions({
      page: 1,
      limit: 20,
      userId: userIdFilter || undefined,
    });
    setSessions(data.sessions);
  };

  useEffect(() => {
    loadSessions();
  }, [userIdFilter]);

  const loadThread = async (sessionId) => {
    setSelectedId(sessionId);
    const { data } = await admin.getChatMessages(sessionId);
    setThread(data);
  };

  const deactivate = async () => {
    if (!selectedId) return;
    await admin.updateChatSession(selectedId, { isActive: false });
    loadSessions();
    loadThread(selectedId);
  };

  const deleteSession = async () => {
    if (!selectedId || !window.confirm('Delete entire session?')) return;
    await admin.deleteChatSession(selectedId);
    setSelectedId(null);
    setThread(null);
    loadSessions();
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    await admin.deleteChatMessage(messageId);
    loadThread(selectedId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Chat moderation</h2>
      {userIdFilter && (
        <p className="text-sm text-slate-400">Filtered by user ID: {userIdFilter}</p>
      )}

      <div className="flex gap-4 min-h-[500px]">
        <div className="w-80 shrink-0 bg-slate-800 border border-slate-700 rounded-2xl overflow-y-auto max-h-[600px]">
          {sessions.map((s) => (
            <button
              key={s._id}
              type="button"
              onClick={() => loadThread(s._id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-700 hover:bg-slate-700/50 ${
                selectedId === s._id ? 'bg-emerald-500/10' : ''
              }`}
            >
              <p className="text-white text-sm font-medium truncate">{s.title}</p>
              <p className="text-xs text-slate-500 truncate">{s.user?.email}</p>
              {!s.isActive && <span className="text-xs text-red-400">Inactive</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl flex flex-col min-h-[500px]">
          {!thread ? (
            <p className="text-slate-500 m-auto">Select a session</p>
          ) : (
            <>
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{thread.session.title}</p>
                  <p className="text-xs text-slate-400">{thread.session.user?.email}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={deactivate} className="p-2 text-amber-400 hover:bg-slate-700 rounded-lg" title="Deactivate">
                    <Ban className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={deleteSession} className="p-2 text-red-400 hover:bg-slate-700 rounded-lg" title="Delete session">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread.messages.map((m) => (
                  <div key={m._id} className="group relative bg-slate-900/50 rounded-lg p-3 pr-10">
                    <span className="text-xs text-emerald-400 uppercase">{m.role}</span>
                    <p className="text-slate-200 text-sm mt-1 whitespace-pre-wrap">{m.content?.slice(0, 500)}</p>
                    <button
                      type="button"
                      onClick={() => deleteMessage(m._id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
