'use client';

import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { 
  Send, Image as ImageIcon, X, Loader2, Bot, User, 
  PanelLeftClose, SquarePen, ThumbsUp, ThumbsDown, 
  Copy, RotateCw, Paperclip, Mic, FileText, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- Types ---
interface Citation {
  filename: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  citations?: Citation[]; // 模拟引用数据结构
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

// --- Sidebar Component ---
const Sidebar = () => (
  <div className="w-[260px] h-full bg-[#FAFBFF] flex flex-col border-r border-[#E5E7EB] hidden md:flex shrink-0 font-sans">
    {/* Sidebar Header */}
    <div className="h-16 flex items-center justify-between px-4 mt-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center">
           <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className="font-bold text-gray-800 text-lg">AI药匣子</span>
      </div>
      <button className="text-gray-400 hover:text-gray-600">
        <PanelLeftClose size={20} />
      </button>
    </div>

    {/* New Chat Button */}
    <div className="px-4 mb-6 mt-4">
      <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-blue-600 font-medium text-sm rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow">
        <SquarePen size={18} />
        <span>发起新对话</span>
      </button>
    </div>

    {/* History List */}
    <div className="flex-1 overflow-y-auto px-4 space-y-1">
      <div className="px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">今天</div>
      <button className="w-full text-left px-3 py-2 bg-[#EFF4FF] text-blue-700 text-sm rounded-lg font-medium truncate border border-transparent">
        查询药物成分
      </button>
      <button className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-100 text-sm rounded-lg truncate transition-colors">
        了解用法 + 药物
      </button>
    </div>

    {/* Sidebar Footer */}
    {/* <div className="p-5 border-t border-gray-100 bg-[#FAFBFF]">
      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
        <span>POWERED BY</span>
        <span className="font-bold text-gray-700 font-mono tracking-tight">Dify</span>
      </div>
    </div> */}
  </div>
);

// --- Main Chat Page ---
export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
      // 保持为空，或者可以预置一些对话以配合截图效果
      // {
      //     id: 'demo-1',
      //     role: 'user',
      //     content: '这个药的成份是什么',
      //     imageUrl: 'https://via.placeholder.com/300' // 需要真实图片地址才能展示好
      // }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, imagePreview, isLoading]);

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

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const currentInput = input;
    const currentImage = selectedImage;
    const currentImagePreview = imagePreview;

    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    setIsLoading(true);

    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: currentInput,
      imageUrl: currentImagePreview || undefined,
    };

    setMessages((prev) => [...prev, newUserMsg]);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

    try {
      let uploadedFileId: string | null = null;
      if (currentImage) {
        uploadedFileId = await uploadImage(currentImage);
        if (!uploadedFileId) {
          setMessages((prev) => prev.filter(m => m.id !== aiMsgId && m.id !== userMsgId));
          setInput(currentInput);
          setIsLoading(false);
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
        body: JSON.stringify({ query: currentInput, files: filesPayload }),
      });

      if (!response.ok) throw new Error(`Chat API Error: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let aiContent = '';

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
                    if (data.event === 'message') {
                        aiContent += data.answer;
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
                            )
                        );
                    } else if (data.event === 'message_end' && data.metadata && data.metadata.retriever_resources) {
                        // 真实场景：如果有检索资源，通常在 message_end 中返回 metadata
                        // 这里我们尝试解析一下
                        /* 
                           注意：Dify 的 metadata.retriever_resources 类似于：
                           [{ "position": 1, "dataset_name": "...", "content": "..." }]
                        */
                         const resources = data.metadata.retriever_resources;
                         if (resources && resources.length > 0) {
                             const cites = resources.map((r: any) => ({ 
                                 filename: r.dataset_name || '文档' 
                             }));
                             setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === aiMsgId ? { ...msg, citations: cites } : msg
                                )
                            );
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
      
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative bg-white">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 z-30">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-white rounded border border-gray-200 overflow-hidden text-blue-600">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <span className="font-bold">AI药匣子</span>
           </div>
           <button><SquarePen size={20} className="text-gray-500"/></button>
        </div>

        {/* Chat Header (Desktop Refresh Icon) */}
        <div className="hidden md:block absolute top-4 right-4 z-20">
             <button title="Refresh" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                 <RotateCw size={18} />
             </button>
        </div>

        {/* Chat Scroll Area */}
        {/* 使用圆角容器模仿截图中的 "卡片" 感觉，如果body背景是灰色的话，这里让main背景也是灰色，中间放个白色大卡片会更像 */}
        {/* 但由于 Sidebar 是白色/浅灰，主区域也是白色，为了区分，我们让整体背景有一点点灰，主内容区纯白 */}
        
        <div className="flex-1 overflow-y-auto relative flex flex-col">
            
            <div className={`p-4 md:p-8 space-y-8 max-w-3xl mx-auto w-full flex-1 ${messages.length === 0 ? 'flex items-center justify-center' : 'pt-16'}`}>
                
                {messages.length === 0 && (
                    <div className="text-center space-y-6 opacity-0 animate-fadeIn" style={{ animation: 'fadeIn 0.5s forwards' }}>
                        <div className="inline-flex p-4 bg-white rounded-3xl shadow-sm border border-gray-100 mb-2">
                            <img src="/logo.jpg" alt="Logo" className="w-20 h-20 object-contain rounded-xl" />
                        </div>
                        {/* 模仿截图中的空白状态，可能没有大字，只有一个干净的界面 */}
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
                                    {/* Content Bubble - Text directly on background or in bubble? Screenshot shows just text for AI usually, or subtle bubble. 
                                        Screenshot shows AI answer: "感冒灵颗粒..." on the white background directly (no distinct bubble border usually in Dify default, but let's check).
                                        Actually, Dify default is usually just text for AI. I will keep it clean.
                                    */}
                                    <div className="prose prose-slate max-w-none text-gray-800 leading-7 text-[15px]">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                    
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
                                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer group/cite">
                                                        <div className="p-1 bg-gray-200 rounded text-gray-500 group-hover/cite:bg-blue-100 group-hover/cite:text-blue-600">
                                                            <FileText size={12} />
                                                        </div>
                                                        <span className="text-xs text-gray-600 font-medium">{cite.filename}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Bar */}
                                    {!isLoading && msg.content && (
                                       <div className="flex items-center gap-2 mt-4">
                                           <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
                                               <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-400 hover:text-gray-600 transition-all" title="点赞">
                                                   <ThumbsUp size={14} />
                                               </button>
                                               <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-400 hover:text-gray-600 transition-all" title="点踩">
                                                   <ThumbsDown size={14} />
                                               </button>
                                                <button 
                                                    className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-400 hover:text-gray-600 transition-all ml-1" 
                                                    title="复制"
                                                    onClick={() => copyToClipboard(msg.content, msg.id)}
                                                >
                                                    {copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                               </button>
                                               <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-400 hover:text-gray-600 transition-all" title="重新生成">
                                                   <RotateCw size={14} />
                                               </button>
                                           </div>
                                       </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex w-full justify-start items-start gap-4 animate-pulse">
                         <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                             <img src="/logo.jpg" alt="AI" className="w-full h-full object-cover" />
                         </div>
                         {/* Skeleton for loading text */}
                         <div className="space-y-3 w-full max-w-lg mt-2">
                             <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                             <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                         </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} className="h-8" />
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

                    <div className={`bg-white border transition-all duration-300 rounded-2xl flex flex-col shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] ${isLoading ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400'}`}>
                        
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="问问 AI 药匣子..."
                            disabled={isLoading}
                            className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 px-4 py-4 text-base"
                        />

                        <div className="flex items-center justify-between px-2 pb-2">
                            <div className="flex items-center gap-1">
                                <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={fileInputRef} 
                                        onChange={handleImageSelect}
                                />
                                <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="上传图片"
                                >
                                    <Paperclip size={20} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <Mic size={20} />
                                </button>
                            </div>

                            <button 
                                onClick={sendMessage}
                                disabled={isLoading || (!input.trim() && !selectedImage)}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                    input.trim() || selectedImage 
                                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5' 
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <Send size={18} />
                            </button>
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
