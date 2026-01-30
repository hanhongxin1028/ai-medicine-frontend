'use client';

import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import { 
  Send, Image as ImageIcon, X, Loader2, Bot, User, 
  PanelLeftClose, PanelLeftOpen, SquarePen, ThumbsUp, ThumbsDown, 
  Copy, RotateCw, Paperclip, Mic, FileText, Check, ChevronDown,
  MoreHorizontal, Pencil, Trash2, Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- Types ---
interface Citation {
  filename: string;
  content?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  citations?: Citation[];
}

interface UploadResponse {
  id: string;
  name: string;
  size: number;
  extension: string;
  mime_type: string;
  created_by: string;
  created_at: number;
}

interface DifyFileItem {
  type: 'image';
  transfer_method: 'local_file';
  upload_file_id: string;
}

interface ChatSession {
    id: string;
    title: string;
    group: string; // e.g. '今天'
    difyConversationId?: string;
}

// --- Components ---

// Modal Components
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden p-6 animate-in fade-in duration-200">
                {children}
            </div>
        </div>
    );
};

const RenameModal = ({ isOpen, onClose, onSave, initialName }: { isOpen: boolean, onClose: () => void, onSave: (name: string) => void, initialName: string }) => {
    const [name, setName] = useState(initialName);
    
    useEffect(() => {
        if (isOpen) setName(initialName);
    }, [isOpen, initialName]);

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">重命名会话</h3>
            <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-2">会话名称</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 outline-none transition-all text-gray-700 text-base"
                    autoFocus
                    style={{ fontSize: '16px' }}
                />
            </div>
            <div className="flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl font-medium transition-all shadow-sm"
                >
                    取消
                </button>
                <button 
                    onClick={() => onSave(name)}
                    disabled={!name.trim()}
                    className="px-5 py-2.5 bg-[#2962FF] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    保存
                </button>
            </div>
        </Modal>
    );
};

const DeleteModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">删除会话</h3>
            <p className="text-gray-500 mb-8 leading-relaxed">您确定要删除此会话吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl font-medium transition-all shadow-sm"
                >
                    取消
                </button>
                <button 
                    onClick={onConfirm}
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                    确认
                </button>
            </div>
        </Modal>
    );
};

// Sidebar / Drawer for Citations
const CitationDrawer = ({ isOpen, onClose, citation }: { isOpen: boolean, onClose: () => void, citation: Citation | null }) => {
    if (!isOpen || !citation) return null;
    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
             <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
             <div className="absolute inset-y-0 right-0 max-w-lg w-full flex">
                <div className="flex-1 bg-white shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-blue-600">
                            <FileText size={20} />
                            <h3 className="text-lg font-bold text-gray-900 truncate flex-1" title={citation.filename}>
                                {citation.filename}
                            </h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="prose prose-slate max-w-none">
                         <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-700 leading-relaxed font-mono text-sm whitespace-pre-wrap">
                            {citation.content || "暂无内容"}
                         </div>
                    </div>
                </div>
             </div>
        </div>
    );
};

// 全局录音遮罩组件 - 使用 Portal 渲染到 body
const RecordingOverlay = ({ 
    isRecording, 
    currentText, 
    isCancelling 
}: { 
    isRecording: boolean; 
    currentText: string; 
    isCancelling: boolean;
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isRecording) return null;

    // 使用 createPortal 渲染到 body
    return ReactDOM.createPortal(
        <div 
            className="fixed inset-0 bg-black/85 flex flex-col"
            style={{ zIndex: 99999 }}
            onTouchMove={(e) => e.preventDefault()}
        >
            {/* 顶部文字显示区域 */}
            <div className="flex-shrink-0 pt-16 px-5">
                <div className={`w-full min-h-[140px] px-5 py-4 rounded-2xl transition-colors relative ${
                    isCancelling ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/10 border border-white/20'
                }`}>
                    {/* 左侧装饰条 */}
                    <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${
                        isCancelling ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                    
                    {/* 顶部状态提示 */}
                    <div className="flex items-center gap-2 mb-3 pl-4">
                        <div className={`w-2 h-2 rounded-full ${isCancelling ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                        <span className={`text-xs ${isCancelling ? 'text-red-400' : 'text-green-400'}`}>
                            {isCancelling ? '已取消' : '正在录音...'}
                        </span>
                    </div>
                    
                    <p className={`text-lg leading-relaxed pl-4 min-h-[60px] ${
                        isCancelling ? 'text-red-300 line-through opacity-60' : 'text-white'
                    }`}>
                        {currentText || <span className="text-white/40">正在聆听...</span>}
                    </p>

                    {/* 右下角波形动画 */}
                    <div className="absolute right-4 bottom-4 flex items-end gap-[3px]">
                        {[0, 1, 2, 3].map((i) => (
                            <div 
                                key={i} 
                                className={`w-[3px] rounded-full transition-colors ${isCancelling ? 'bg-red-400' : 'bg-green-400'}`}
                                style={{ 
                                    height: '8px',
                                    animation: isCancelling ? 'none' : `voiceWave 0.5s ease-in-out ${i * 0.1}s infinite alternate`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* 中间空白区域 - 显示操作提示 */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className={`text-center transition-all ${isCancelling ? 'scale-110' : ''}`}>
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 transition-all ${
                        isCancelling ? 'bg-red-500' : 'bg-white/10'
                    }`}>
                        {isCancelling ? (
                            <X size={40} className="text-white" />
                        ) : (
                            <Mic size={40} className="text-green-400" />
                        )}
                    </div>
                    <p className={`text-base font-medium ${isCancelling ? 'text-red-400' : 'text-white/70'}`}>
                        {isCancelling ? '松开取消发送' : '松开 发送'}
                    </p>
                </div>
            </div>

            {/* 底部取消区域提示 */}
            <div className={`flex-shrink-0 py-8 text-center transition-colors ${
                isCancelling ? 'bg-red-500/20' : ''
            }`}>
                <p className={`text-sm ${isCancelling ? 'text-red-400 font-medium' : 'text-white/40'}`}>
                    ↑ 上滑取消
                </p>
            </div>

            {/* 全局样式 */}
            <style>{`
                @keyframes voiceWave {
                    0% { height: 8px; }
                    100% { height: 24px; }
                }
            `}</style>
        </div>,
        document.body
    );
};

// 语音输入组件
interface VoiceInputProps {
    isVoiceMode: boolean;
    onSend: (text: string) => void;
}

const VoiceInput = ({ isVoiceMode, onSend }: VoiceInputProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [currentText, setCurrentText] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const fullTextRef = useRef('');
    const startYRef = useRef(0);

    // 禁用页面滚动和选择
    useEffect(() => {
        if (isRecording) {
            document.body.style.overflow = 'hidden';
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        };
    }, [isRecording]);

    const startRecording = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert('您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
            return;
        }

        if ('touches' in e) {
            startYRef.current = e.touches[0].clientY;
        } else {
            startYRef.current = e.clientY;
        }

        fullTextRef.current = '';
        setCurrentText('');
        setIsCancelling(false);

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN';

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            if (finalTranscript) {
                fullTextRef.current += finalTranscript;
            }
            
            setCurrentText(fullTextRef.current + interimTranscript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('请允许麦克风权限');
            }
            setIsRecording(false);
        };

        recognition.start();
        setIsRecording(true);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isRecording) return;
        e.preventDefault();
        
        let currentY: number;
        if ('touches' in e) {
            currentY = e.touches[0].clientY;
        } else {
            currentY = e.clientY;
        }
        
        const shouldCancel = startYRef.current - currentY > 80;
        setIsCancelling(shouldCancel);
    };

    const stopRecording = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        
        if (!isCancelling) {
            // 使用 currentText 而不是 fullTextRef，因为 currentText 包含临时识别结果
            const textToSend = currentText.trim() || fullTextRef.current.trim();
            if (textToSend) {
                onSend(textToSend);
            }
        }
        
        setIsRecording(false);
        fullTextRef.current = '';
        setCurrentText('');
        setIsCancelling(false);
    };

    if (!isVoiceMode) return null;

    return (
        <>
            {/* 按住说话按钮 */}
            <div
                onMouseDown={startRecording}
                onMouseMove={handleMove}
                onMouseUp={stopRecording}
                onMouseLeave={(e) => isRecording && stopRecording(e)}
                onTouchStart={startRecording}
                onTouchMove={handleMove}
                onTouchEnd={stopRecording}
                onTouchCancel={(e) => stopRecording(e as any)}
                onContextMenu={(e) => e.preventDefault()}
                className={`flex-1 py-3 rounded-xl text-center font-medium transition-all cursor-pointer ${
                    isRecording 
                    ? 'bg-gray-300 text-gray-700 scale-[0.98]' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
                style={{ 
                    touchAction: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent'
                }}
            >
                按住 说话
            </div>

            {/* 全屏录音遮罩 - Portal 到 body */}
            <RecordingOverlay 
                isRecording={isRecording}
                currentText={currentText}
                isCancelling={isCancelling}
            />
        </>
    );
};

// Dropdown Menu Component
interface DropdownProps {
    onRename: () => void;
    onDelete: () => void;
    onClose: () => void;
    positionClass?: string;
}

const ActionDropdown = ({ onRename, onDelete, onClose, positionClass = "top-full right-0 mt-1" }: DropdownProps) => {
    return (
        <div 
            className={`absolute ${positionClass} w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-[100] menu-dropdown`}
            onClick={(e) => e.stopPropagation()}
        >
            <button 
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onClose();
                    onRename(); 
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2"
            >
                <Pencil size={14} />
                <span>重命名</span>
            </button>
            <button 
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onClose();
                    onDelete(); 
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-2"
            >
                <Trash2 size={14} />
                <span>删除</span>
            </button>
        </div>
    );
};

// Sidebar Component
interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onRenameSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onNewChat: () => void;
}

const Sidebar = ({ 
    isOpen, 
    toggleSidebar, 
    sessions, 
    activeSessionId, 
    onSelectSession,
    onRenameSession,
    onDeleteSession,
    onNewChat
}: SidebarProps) => {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const groupedSessions = sessions.reduce((acc, session) => {
        if (!acc[session.group]) acc[session.group] = [];
        acc[session.group].push(session);
        return acc;
    }, {} as Record<string, ChatSession[]>);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                    onClick={toggleSidebar}
                />
            )}
            <div className={`
                fixed md:static inset-y-0 left-0 z-40
                w-[260px] h-full bg-[#FAFBFF] flex flex-col border-r border-[#E5E7EB] shrink-0 font-sans transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'}
            `}>
            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-4 mt-2 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
                        <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-gray-800 text-lg">AI药匣子</span>
                </div>
                <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <PanelLeftClose size={20} />
                </button>
            </div>

            {/* New Chat Button */}
            <div className="px-4 mb-6 mt-4">
                <button 
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-blue-600 font-medium text-sm rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow"
                >
                    <SquarePen size={18} />
                    <span>发起新对话</span>
                </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-2 relative z-10">
                {/* Menu Backdrop */}
                {openMenuId && (
                    <div 
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setOpenMenuId(null)}
                    />
                )}
                {Object.entries(groupedSessions).map(([group, groupSessions]) => (
                    <div key={group}>
                        <div className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{group}</div>
                        <div className="space-y-1">
                            {groupSessions.map(session => {
                                const isActive = activeSessionId === session.id;
                                const isMenuOpen = openMenuId === session.id;
                                return (
                                    <div key={session.id} className={`relative group ${isMenuOpen ? 'z-50' : ''}`}>
                                        <button 
                                            onClick={() => onSelectSession(session.id)}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium truncate border transition-colors pr-8 ${
                                                isActive 
                                                ? 'bg-[#EFF4FF] text-blue-700 border-transparent' 
                                                : 'text-gray-600 hover:bg-gray-100 border-transparent'
                                            }`}
                                        >
                                            {session.title}
                                        </button>
                                        
                                        {/* More Button: Visible on Hover or if Menu Open */}
                                        <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${isMenuOpen ? 'block' : 'block md:hidden md:group-hover:block'}`}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(isMenuOpen ? null : session.id);
                                                }}
                                                className={`p-1 rounded-md transition-colors ${isActive ? 'text-blue-500 hover:bg-blue-200' : 'text-gray-400 hover:bg-gray-200'}`}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>

                                        {/* Dropdown Menu */}
                                        {isMenuOpen && (
                                            <ActionDropdown 
                                                onRename={() => onRenameSession(session.id)}
                                                onDelete={() => onDeleteSession(session.id)}
                                                onClose={() => setOpenMenuId(null)}
                                                positionClass="top-8 right-0"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            </div>
        </>
    );
};

// --- Main Chat Page ---
export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);  // 语音/文字模式切换
  
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Modal State
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  
  // Breadcrumb dropdown state
  const [isBreadcrumbMenuOpen, setIsBreadcrumbMenuOpen] = useState(false);
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine group based on timestamp
  const getSessionGroup = (timestamp: number) => {
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      const isToday = date.getDate() === now.getDate() && 
                      date.getMonth() === now.getMonth() && 
                      date.getFullYear() === now.getFullYear();

      if (isToday) return '今天';
      if (diffDays <= 1) return '昨天';
      if (diffDays <= 7) return '过去7天';
      return '更早';
  };

  const fetchSessions = async () => {
      try {
          const res = await fetch('/api/conversations?limit=20');
          if (res.ok) {
              const data = await res.json();
              if (data.data) {
                  const mappedSessions: ChatSession[] = data.data.map((item: any) => ({
                      id: item.id,
                      title: item.name || '新对话',
                      group: getSessionGroup(item.updated_at),
                      difyConversationId: item.id
                  }));
                  setSessions(mappedSessions);
                  
                  // If no active session, select the first one if available
                  // Or do nothing and let user select? 
                  // Usually if it's empty, maybe auto-select first.
                  // But for now let's just update the list.
              }
          }
      } catch (e) {
          console.error("Failed to fetch sessions", e);
      }
  };

  useEffect(() => {
      fetchSessions();
  }, []);

  // --- Effect: Load Messages on Session Switch ---
  // 使用 ref 来跟踪当前是否正在发送消息，避免在流式响应过程中重新加载消息
  const isSendingRef = useRef(false);
  
  useEffect(() => {
    if (!activeSessionId) {
        setMessages([]);
        return;
    }
    
    // 如果正在发送消息，不要重新加载（避免清空正在接收的流式响应）
    if (isSendingRef.current) {
        return;
    }
    
    // Find the session object to check if it's a real backend session
    const session = sessions.find(s => s.id === activeSessionId);
    
    // 如果是新会话（没有 difyConversationId），不加载消息
    if (!session || !session.difyConversationId) {
        // 只在消息列表非空时才清空（避免用户正在输入时被清空）
        // 但如果是切换到其他未保存的会话，需要清空
        return; 
    }

    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/messages?conversation_id=${session.difyConversationId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.data) {
                    const history: Message[] = [];
                    // Dify returns newest first usually? "倒序返回". 
                    // We need to reverse it to show oldest at top.
                    const rawMessages = data.data.reverse();
                    
                    rawMessages.forEach((item: any) => {
                        // User message
                        history.push({
                            id: item.id + '-user',
                            role: 'user',
                            content: item.query,
                            imageUrl: item.message_files?.find((f: any) => f.type === 'image')?.url
                        });
                        
                        // Assistant message
                        if (item.answer) {
                            const cites: Citation[] = item.retriever_resources?.map((r: any) => ({
                                filename: r.document_name || '文档',
                                content: r.content
                            })) || [];
                            
                            history.push({
                                id: item.id + '-assistant',
                                role: 'assistant',
                                content: item.answer,
                                citations: cites
                            });
                        }
                    });
                    setMessages(history);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    loadMessages();
  }, [activeSessionId]); // 移除 sessions 依赖，避免 sessions 更新时重新加载


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreview, isLoading]);

  // Close breadcrumb menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (breadcrumbRef.current && !breadcrumbRef.current.contains(event.target as Node)) {
            setIsBreadcrumbMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleSessionAction = (action: 'rename' | 'delete', id: string) => {
      // 强制更新状态，确保弹窗显示
      setTimeout(() => {
        if (action === 'rename') {
            setRenameSessionId(id);
        } else if (action === 'delete') {
            setDeleteSessionId(id);
        }
      }, 0);
  };

  const handleRenameConfirm = async (newName: string) => {
    if (renameSessionId && newName.trim()) {
        const session = sessions.find(s => s.id === renameSessionId);
        if (session && session.difyConversationId) {
            try {
                const res = await fetch(`/api/conversations/${session.difyConversationId}/name`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
                if (res.ok) {
                    setSessions(prev => prev.map(s => s.id === renameSessionId ? { ...s, title: newName } : s));
                } else {
                    console.error("Failed to rename session");
                }
            } catch (e) {
                console.error("Rename error", e);
            }
        } else {
             // Local only update if not synced yet
             setSessions(prev => prev.map(s => s.id === renameSessionId ? { ...s, title: newName } : s));
        }
    }
    setRenameSessionId(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteSessionId) {
        const session = sessions.find(s => s.id === deleteSessionId);
        if (session && session.difyConversationId) {
            try {
                const res = await fetch(`/api/conversations/${session.difyConversationId}`, {
                     method: 'DELETE'
                });
                if (res.ok) {
                     setSessions(prev => prev.filter(s => s.id !== deleteSessionId));
                     if (activeSessionId === deleteSessionId) setActiveSessionId(null);
                }
            } catch (e) {
                 console.error("Delete error", e);
            }
        } else {
            // Local delete
            setSessions(prev => prev.filter(s => s.id !== deleteSessionId));
            if (activeSessionId === deleteSessionId) setActiveSessionId(null);
        }
    }
    setDeleteSessionId(null);
  };

  const handleNewChat = () => {
    // If we are already on a new empty chat, don't create another
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && !currentSession.difyConversationId && messages.length === 0) {
        return;
    }

    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
        id: newSessionId,
        title: '新对话',
        group: '今天',
        difyConversationId: undefined
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setMessages([]); // Clear messages for new view
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      setSelectedImage(file);
      const output = URL.createObjectURL(file);
      setImagePreview(output);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data: UploadResponse = await res.json();
      return data.id;
    } catch (error) {
      console.error('Upload Error:', error);
      return null;
    }
  };

  // 发送消息（可选直接传入文本，用于语音输入）
  const sendMessage = async (directText?: string) => {
    const messageText = directText !== undefined ? directText : input;
    if ((!messageText.trim() && !selectedImage) || isLoading) return;

    const currentInput = messageText;
    const currentImage = selectedImage;
    const currentImagePreview = imagePreview;

    // Get current session info
    const currentSession = sessions.find(s => s.id === activeSessionId);
    const conversationId = currentSession?.difyConversationId;

    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    setIsLoading(true);
    isSendingRef.current = true; // 标记正在发送，防止 useEffect 重新加载消息

    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: currentInput,
      imageUrl: currentImagePreview || undefined,
    };

    setMessages((prev) => [...prev, newUserMsg]);

    const aiMsgId = (Date.now() + 1).toString();
    // Add empty assistant message immediately to show avatar and loading state
    setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

    try {
      let uploadedFileId: string | null = null;
      if (currentImage) {
        uploadedFileId = await uploadImage(currentImage);
        if (!uploadedFileId) {
          // No AI message added yet, so just filter user message if needed
          setMessages((prev) => prev.filter(m => m.id !== userMsgId));
          setInput(currentInput);
          setIsLoading(false);
          isSendingRef.current = false;
          return;
        }
      }

      const filesPayload: DifyFileItem[] = uploadedFileId ? [{
        type: 'image',
        transfer_method: 'local_file',
        upload_file_id: uploadedFileId,
      }] : [];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            query: currentInput || (currentImage ? "分析图片" : ""), 
            files: filesPayload,
            conversation_id: conversationId 
        }),
      });

      if (!response.ok) throw new Error(`Chat API Error: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let aiContent = '';
      let conversationIdCaptured = false;
      let newConversationId: string | null = null;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        
        const lines = chunkValue.split('\n\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6).trim();
                if (jsonStr === '[DONE]') continue;
                try {
                    const data = JSON.parse(jsonStr);

                    // Capture conversation_id if available and not yet set
                    if (data.conversation_id && activeSessionId && !conversationId && !conversationIdCaptured) {
                        conversationIdCaptured = true;
                        newConversationId = data.conversation_id;
                        setSessions(prev => prev.map(s => 
                            s.id === activeSessionId ? { ...s, difyConversationId: data.conversation_id } : s
                        ));
                    }

                    if (data.event === 'message') {
                        aiContent += data.answer;
                        setMessages((prev) => {
                            const exists = prev.some(m => m.id === aiMsgId);
                            if (exists) {
                                return prev.map((msg) =>
                                    msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
                                );
                            } else {
                                return [...prev, { id: aiMsgId, role: 'assistant', content: aiContent }];
                            }
                        });
                    } else if (data.event === 'message_end') {
                         // 处理引用来源
                         if (data.metadata && data.metadata.retriever_resources) {
                             const resources = data.metadata.retriever_resources;
                             if (resources && resources.length > 0) {
                                 const cites = resources.map((r: any) => ({ 
                                     filename: r.document_name || '文档',
                                     content: r.content
                                 }));
                                 setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === aiMsgId ? { ...msg, citations: cites } : msg
                                    )
                                );
                             }
                         }
                         
                         // 消息结束后，如果是新会话，获取会话信息更新标题
                         if (newConversationId && activeSessionId) {
                             try {
                                 const convRes = await fetch(`/api/conversations`);
                                 if (convRes.ok) {
                                     const convData = await convRes.json();
                                     const conv = convData.data?.find((c: any) => c.id === newConversationId);
                                     if (conv && conv.name) {
                                         setSessions(prev => prev.map(s => 
                                             s.id === activeSessionId ? { ...s, title: conv.name } : s
                                         ));
                                     }
                                 }
                             } catch (e) {
                                 console.error('Failed to fetch conversation title', e);
                             }
                         }
                    }
                } catch (e) {}
            }
        }
      }
      
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: '服务暂时不可用，请稍后再试。' }]);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false; // 标记发送完成
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex w-full h-screen bg-[#F9FAFB] text-gray-900 font-sans overflow-hidden">
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onRenameSession={(id) => handleSessionAction('rename', id)}
        onDeleteSession={(id) => handleSessionAction('delete', id)}
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative bg-white transition-all duration-300">
        
        {/* Modals */}
        <RenameModal 
            isOpen={!!renameSessionId} 
            onClose={() => setRenameSessionId(null)} 
            onSave={handleRenameConfirm}
            initialName={sessions.find(s => s.id === renameSessionId)?.title || ''}
        />
        <DeleteModal 
            isOpen={!!deleteSessionId} 
            onClose={() => setDeleteSessionId(null)} 
            onConfirm={handleDeleteConfirm}
        />
        <CitationDrawer 
            isOpen={!!activeCitation}
            onClose={() => setActiveCitation(null)}
            citation={activeCitation}
        />

        {/* Top Bar for Desktop - Different when collapsed/expanded */}
        <div className="hidden md:flex items-center justify-between px-4 py-3 sticky top-0 z-20 bg-white">
            <div className="flex items-center gap-3">
                 {/* When closed, show Expand button and Breadcrumbs */}
                 {!isSidebarOpen && (
                    <div className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200" title="Expand Sidebar">
                             <PanelLeftOpen size={20} />
                        </button>
                        <div className="h-4 w-px bg-gray-200"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100">
                                <img src="/logo.jpg" alt="App" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-gray-300">/</span>
                            
                            {/* Breadcrumb with Dropdown */}
                            <div className="relative" ref={breadcrumbRef}>
                                <div 
                                    onClick={() => setIsBreadcrumbMenuOpen(!isBreadcrumbMenuOpen)}
                                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-md transition-colors select-none"
                                >
                                    <span className="font-semibold text-gray-700 text-sm">
                                        {activeSession ? activeSession.title : '新对话'}
                                    </span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                </div>
                                
                                {isBreadcrumbMenuOpen && activeSessionId && (
                                    <ActionDropdown 
                                        onRename={() => handleSessionAction('rename', activeSessionId)}
                                        onDelete={() => handleSessionAction('delete', activeSessionId)}
                                        onClose={() => setIsBreadcrumbMenuOpen(false)}
                                        positionClass="top-full left-0 mt-2"
                                    />
                                )}
                             </div>

                        </div>
                        <button 
                             onClick={handleNewChat}
                             className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ml-2"
                        >
                             <SquarePen size={18} />
                        </button>
                    </div>
                 )}
            </div>

            {/* Right side actions - Always visible */}
             <div className="flex items-center gap-2">
                 <button title="Refresh" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                     <RotateCw size={18} />
                 </button>
             </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 z-30">
           <div className="flex items-center gap-3">
             {/* 展开侧边栏按钮 */}
             <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="打开会话列表"
             >
                <PanelLeftOpen size={20} />
             </button>
             <div className="w-8 h-8 bg-white rounded border border-gray-200 overflow-hidden text-blue-600">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
             </div>
             
             {/* 手机端标题 - 可点击下拉菜单 */}
             <div className="relative">
                 <div 
                    onClick={() => activeSessionId && setIsBreadcrumbMenuOpen(!isBreadcrumbMenuOpen)}
                    className="flex items-center gap-1 font-bold select-none active:opacity-70"
                 >
                     <span className="truncate max-w-[150px]">
                         {activeSession?.title || 'AI药匣子'}
                     </span>
                     {activeSessionId && (
                        <ChevronDown size={16} className="text-gray-400" />
                     )}
                 </div>

                 {/* Dropdown Menu for Mobile Header - 直接内联渲染避免组件问题 */}
                 {isBreadcrumbMenuOpen && activeSessionId && (
                    <div 
                        className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-[100]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onTouchEnd={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                setIsBreadcrumbMenuOpen(false);
                                setRenameSessionId(activeSessionId);
                            }}
                            onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                setIsBreadcrumbMenuOpen(false);
                                setRenameSessionId(activeSessionId);
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2"
                        >
                            <Pencil size={14} />
                            <span>重命名</span>
                        </button>
                        <button 
                            onTouchEnd={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                setIsBreadcrumbMenuOpen(false);
                                setDeleteSessionId(activeSessionId);
                            }}
                            onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation(); 
                                setIsBreadcrumbMenuOpen(false);
                                setDeleteSessionId(activeSessionId);
                            }}
                            className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            <span>删除</span>
                        </button>
                    </div>
                )}
             </div>
           </div>
           <button onClick={handleNewChat}>
               <SquarePen size={20} className="text-gray-500"/>
           </button>
        </div>


        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto relative flex flex-col">
            
            <div className={`p-4 md:p-8 space-y-8 max-w-3xl mx-auto w-full flex-1 ${messages.length === 0 ? 'flex items-center justify-center' : ''}`}>
                
                {messages.length === 0 && (
                    <div className="text-center space-y-6 opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.5s forwards' }}>
                        <div className="inline-flex p-4 bg-white rounded-3xl shadow-sm border border-gray-100 mb-2">
                            <img src="/logo.jpg" alt="Logo" className="w-20 h-20 object-contain rounded-xl" />
                        </div>
                        {/* Empty state content */}
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex w-full group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {/* Avatar (Left for AI) */}
                        {msg.role === 'assistant' && (
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center mr-4 mt-1 border border-gray-100 overflow-hidden shadow-sm">
                                <img src="/logo.jpg" alt="AI" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start w-full'}`}>
                            {/* User details: Image and Text bubbles */}
                            {msg.role === 'user' ? (
                                <div className="flex flex-row-reverse items-start gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center border border-[#BBDEFB]">
                                       <User size={22} className="text-[#2196F3]" />
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {msg.imageUrl && (
                                            <div className="p-2 bg-[#E3F2FD] rounded-2xl rounded-tr-none border border-blue-100">
                                                <img src={msg.imageUrl} alt="Uploaded" className="max-w-[200px] rounded-lg object-cover" />
                                            </div>
                                        )}
                                        <div className="px-5 py-3 bg-[#E3F2FD] text-gray-800 rounded-2xl rounded-tr-sm">
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content || (msg.imageUrl ? '分析这张图片' : '')}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* AI Message Content */
                                <div className="w-full">
                                    {msg.content ? (
                                        <div className="prose prose-slate max-w-none text-gray-800 leading-7 text-[15px]">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 w-full max-w-lg mt-2 animate-pulse">
                                            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                        </div>
                                    )}

                                    {/* Citations Block */}
                                    {msg.citations && msg.citations.length > 0 && (
                                        <div className="mt-5">
                                             <div className="flex items-center gap-2 mb-2">
                                                <div className="h-px bg-gray-200 flex-1"></div>
                                                <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">引用来源</span>
                                                <div className="h-px bg-gray-200 flex-1"></div>
                                             </div>
                                            <div className="flex flex-wrap gap-2">
                                                {msg.citations.map((cite, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => setActiveCitation(cite)}
                                                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group/cite"
                                                    >
                                                        <div className="p-1 bg-gray-200 rounded text-gray-500 group-hover/cite:bg-blue-100 group-hover/cite:text-blue-600">
                                                            <FileText size={12} />
                                                        </div>
                                                        <span className="text-xs text-gray-600 font-medium">{cite.filename}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Bar removed */}

                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 md:px-8 md:pb-8 bg-white/80 backdrop-blur-sm sticky bottom-0 z-20">
                <div className="max-w-3xl mx-auto relative">
                     {/* Image Preview Overlay */}
                    {imagePreview && (
                        <div className="absolute bottom-full left-0 mb-4 ml-0 group animate-in slide-in-from-bottom-2 fade-in duration-300">
                            <div className="relative inline-block p-1 bg-white rounded-xl shadow-lg border border-gray-100">
                                <img src={imagePreview} alt="Preview" className="h-24 w-auto rounded-lg object-cover" />
                                <button onClick={removeImage} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-black transition-colors">
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={`bg-white border transition-all duration-300 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] ${isLoading ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400'}`}>
                        
                        {/* 输入区域：语音模式 或 文字模式 */}
                        <div className="flex items-center gap-2 p-2">
                            {/* 左侧：语音/键盘切换按钮 */}
                            <button 
                                onClick={() => setIsVoiceMode(!isVoiceMode)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
                                title={isVoiceMode ? "切换到键盘输入" : "切换到语音输入"}
                            >
                                {isVoiceMode ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                                        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
                                    </svg>
                                ) : (
                                    <Mic size={20} />
                                )}
                            </button>

                            {/* 中间：文字输入框 或 按住说话按钮 */}
                            {isVoiceMode ? (
                                <VoiceInput 
                                    isVoiceMode={isVoiceMode}
                                    onSend={(text) => {
                                        sendMessage(text);
                                    }}
                                />
                            ) : (
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder="问问 AI 药匣子..."
                                    disabled={isLoading}
                                    rows={1}
                                    className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 py-2 text-base resize-none min-h-[24px] max-h-[120px] overflow-y-auto"
                                    style={{ height: 'auto' }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                                    }}
                                />
                            )}

                            {/* 右侧按钮组 */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* 附件按钮 */}
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleImageSelect}
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="上传图片"
                                >
                                    <Plus size={20} />
                                </button>
                                
                                {/* 发送按钮：仅在文字模式下显示 */}
                                {!isVoiceMode && (
                                    <button 
                                        onClick={() => sendMessage()}
                                        data-send-btn
                                        disabled={isLoading || (!input.trim() && !selectedImage)}
                                        className={`p-2 rounded-full transition-all duration-200 ${
                                            input.trim() || selectedImage 
                                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        }`}
                                    >
                                        <Send size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-3">
                         <p className="text-[10px] text-gray-400">AI 的回答未必正确无误，请注意核查</p>
                    </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}
