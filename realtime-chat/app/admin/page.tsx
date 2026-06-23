'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../providers';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { 
  BarChart3, Users, MessageSquare, ArrowLeft, RotateCw, 
  Sun, Moon, ShieldAlert, Clock, Activity, MessageCircle, Hash, 
  TrendingUp, User, Globe
} from 'lucide-react';

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  status: string;
  last_seen: string;
}

interface Room {
  id: string;
  name: string;
  is_dm: boolean;
  created_at: string;
}

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_type?: string;
}

export default function AdminDashboard() {
  const { user, theme, setTheme } = useAuth();
  const router = useRouter();

  // Data states
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const loadData = async () => {
    try {
      setRefreshing(true);
      
      // 1. Fetch profiles
      const { data: dbProfiles } = await insforge.database
        .from('profiles')
        .select('*');
      
      const profileMapping: Record<string, Profile> = {};
      if (dbProfiles) {
        dbProfiles.forEach((p: any) => {
          profileMapping[p.id] = p;
        });
      }
      setProfiles(profileMapping);

      // 2. Fetch rooms
      const { data: dbRooms } = await insforge.database
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false });
      setRooms(dbRooms || []);

      // 3. Fetch messages (limit to 2000 for calculation performance)
      const { data: dbMessages } = await insforge.database
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);
      setMessages(dbMessages || []);

      // 4. Fetch room members
      const { data: dbMembers } = await insforge.database
        .from('room_members')
        .select('*');
      setRoomMembers(dbMembers || []);

    } catch (error) {
      console.error('Failed to load admin analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse">Loading Analytics Console...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // Calculations
  // ==========================================

  const totalUsers = Object.keys(profiles).length;
  const onlineUsers = Object.values(profiles).filter(p => p.status === 'online').length;
  const totalRooms = rooms.length;
  const totalDMs = rooms.filter(r => r.is_dm).length;
  const totalChannels = rooms.filter(r => !r.is_dm).length;
  const totalMessages = messages.length;

  // Average messages per user
  const avgMessagesPerUser = totalUsers > 0 ? (totalMessages / totalUsers).toFixed(1) : '0.0';
  // Average messages per room
  const avgMessagesPerRoom = totalRooms > 0 ? (totalMessages / totalRooms).toFixed(1) : '0.0';

  // Messages per room distribution
  const messagesPerRoomMap: Record<string, number> = {};
  messages.forEach(msg => {
    messagesPerRoomMap[msg.room_id] = (messagesPerRoomMap[msg.room_id] || 0) + 1;
  });

  const roomsActivity = rooms.map(room => {
    const msgCount = messagesPerRoomMap[room.id] || 0;
    const memberCount = roomMembers.filter(m => m.room_id === room.id).length;
    return {
      ...room,
      msgCount,
      memberCount
    };
  }).sort((a, b) => b.msgCount - a.msgCount);

  // Top chatters
  const messagesPerUserMap: Record<string, number> = {};
  messages.forEach(msg => {
    messagesPerUserMap[msg.sender_id] = (messagesPerUserMap[msg.sender_id] || 0) + 1;
  });

  const topChatters = Object.values(profiles).map(profile => {
    const msgCount = messagesPerUserMap[profile.id] || 0;
    return {
      ...profile,
      msgCount
    };
  }).sort((a, b) => b.msgCount - a.msgCount)
    .filter(u => u.msgCount > 0 || u.status === 'online');

  // Chart data: Messages sent per day (Last 7 days)
  const getChartData = () => {
    const last7Days: { dateStr: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      last7Days.push({ dateStr, label, count: 0 });
    }

    messages.forEach(msg => {
      if (!msg.created_at) return;
      const msgDate = msg.created_at.split('T')[0];
      const dayBucket = last7Days.find(bucket => bucket.dateStr === msgDate);
      if (dayBucket) {
        dayBucket.count++;
      }
    });

    return last7Days;
  };

  const chartData = getChartData();
  const maxDayCount = Math.max(...chartData.map(d => d.count), 5);

  // SVG Chart Dimensions & Computations
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = chartData.map((d, index) => {
    const x = paddingX + (index / (chartData.length - 1)) * chartWidth;
    const y = height - paddingY - (d.count / maxDayCount) * chartHeight;
    return { x, y, label: d.label, count: d.count };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  // Filter lists based on search
  const filteredChatters = topChatters.filter(c => 
    c.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRooms = roomsActivity.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format timestamp helper
  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const renderAvatar = (name: string, status: string, avatarUrl?: string) => {
    const firstLetter = name ? name.charAt(0).toUpperCase() : '?';
    
    // Choose color based on name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const bgStyle = { backgroundColor: `hsl(${h}, 60%, 40%)` };

    return (
      <div className="relative flex-shrink-0">
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
          style={bgStyle}
        >
          {firstLetter}
        </div>
        {status === 'online' && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950"></span>
        )}
      </div>
    );
  };

  return (
    <div className="admin-layout-wrapper">
      <style>{`
        /* 1. Reset and variables */
        :root {
          --glass-bg: rgba(24, 24, 27, 0.6);
          --glass-border: rgba(255, 255, 255, 0.05);
          --glass-glow: rgba(99, 102, 241, 0.05);
        }

        /* 2. Container Layouts */
        .admin-layout-wrapper {
          min-height: 100vh;
          background-color: #09090b;
          color: #f4f4f5;
          display: flex;
          flex-direction: column;
          width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
          font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
        }

        .admin-container {
          width: 100%;
          max-width: 1280px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 24px;
          padding-right: 24px;
          box-sizing: border-box;
        }

        .admin-header {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding-top: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          gap: 16px;
          box-sizing: border-box;
          z-index: 10;
        }

        .admin-main {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding-top: 24px;
          padding-bottom: 32px;
          box-sizing: border-box;
          z-index: 10;
        }

        /* 3. Header Brand Styles */
        .admin-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-brand-icon {
          width: 44px;
          height: 44px;
          background-color: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(99, 102, 241, 0.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .admin-brand-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.025em;
          line-height: 1.2;
        }

        .admin-brand-subtitle {
          font-size: 0.75rem;
          color: #a1a1aa;
          margin-top: 2px;
        }

        .admin-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .admin-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #d4d4d8;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .admin-btn:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .admin-btn-icon-only {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          color: #d4d4d8;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .admin-btn-icon-only:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        /* 4. Grids definition */
        .admin-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 1024px) {
          .admin-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .admin-metrics-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-mid-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 1024px) {
          .admin-mid-grid {
            grid-template-columns: 1fr;
          }
        }

        .admin-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .admin-bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        /* 5. Glass Cards */
        .admin-glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          border: 1px solid var(--glass-border);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .admin-glass-card:hover {
          border-color: rgba(99, 102, 241, 0.2);
        }

        .admin-glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at top left, var(--glass-glow), transparent 60%);
          pointer-events: none;
        }

        .admin-card-body {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        /* 6. Card Contents */
        .admin-card-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }

        .admin-card-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-card-value {
          font-size: 1.875rem;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.25;
          margin-top: 2px;
          letter-spacing: -0.02em;
        }

        .admin-card-sub {
          font-size: 0.6875rem;
          color: #a1a1aa;
          font-weight: 500;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-card-sub.success {
          color: #34d399;
        }

        .admin-card-sub.indigo {
          color: #818cf8;
        }

        .admin-card-icon-container {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        /* 7. Grid Alignment Classes */
        .h-aligned-card {
          height: 420px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 24px;
        }

        .card-header-aligned {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .card-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          font-weight: 700;
          color: #e4e4e7;
        }

        .card-header-badge {
          font-size: 0.625rem;
          font-weight: 700;
          color: #a1a1aa;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 2px 8px;
          border-radius: 6px;
        }

        /* 8. Pulsing dot */
        .activity-pulse {
          position: relative;
        }
        .activity-pulse::after {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border: 2px solid #10b981;
          border-radius: 9999px;
          opacity: 0;
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(0.7);
            opacity: 0.8;
          }
          80%, 100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        /* 9. Leaderboard items styles */
        .admin-list-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          max-height: 280px;
          box-sizing: border-box;
          padding-right: 4px;
        }

        .admin-list-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          transition: background-color 0.2s ease;
          box-sizing: border-box;
        }

        .admin-list-item:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }

        .admin-item-rank {
          font-size: 0.75rem;
          font-weight: 900;
          color: #52525b;
          width: 20px;
          text-align: center;
        }

        .admin-item-avatar-wrapper {
          flex-shrink: 0;
        }

        .admin-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .admin-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .admin-item-name {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #e4e4e7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-item-value {
          font-size: 0.75rem;
          font-weight: 900;
          color: #818cf8;
          flex-shrink: 0;
        }

        .admin-item-subtext {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.625rem;
          color: #52525b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-top: 2px;
        }

        .admin-item-bar-bg {
          width: 100%;
          height: 6px;
          background-color: #18181b;
          border-radius: 99px;
          margin-top: 8px;
          overflow: hidden;
        }

        .admin-item-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(to right, #6366f1, #8b5cf6);
        }

        .admin-item-bar-fill.violet {
          background: linear-gradient(to right, #8b5cf6, #d946ef);
        }

        /* 10. Operations logs logs styles */
        .admin-log-item {
          display: flex;
          gap: 10px;
          align-items: start;
          padding: 8px 10px;
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          box-sizing: border-box;
        }

        .admin-log-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .admin-log-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .admin-log-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: #e4e4e7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-log-time {
          font-size: 0.625rem;
          color: #52525b;
          flex-shrink: 0;
        }

        .admin-log-room {
          font-size: 0.625rem;
          font-weight: 600;
          color: #818cf8;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-log-msg {
          font-size: 0.75rem;
          color: #d4d4d8;
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 11. Search component Fallback */
        .admin-search-section {
          width: 100%;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }

        .admin-search-container {
          width: 100%;
          max-width: 448px;
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 6px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-sizing: border-box;
        }

        .admin-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 6px 12px;
          font-size: 0.875rem;
          color: #ffffff;
          box-sizing: border-box;
        }

        .admin-search-input::placeholder {
          color: #52525b;
        }

        /* 12. SVG specific lines */
        .svg-grid-line {
          stroke: rgba(255, 255, 255, 0.03);
          stroke-width: 1;
        }

        .chart-glow-path {
          filter: drop-shadow(0px 4px 8px rgba(99, 102, 241, 0.4));
        }

        /* Scrollbars */
        .admin-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .admin-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 99px;
        }
        .admin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 99px;
        }
        .admin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 640px) {
          .admin-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
        }
      `}</style>

      {/* Background glow orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none"></div>

      {/* Header Panel */}
      <header className="admin-header admin-container">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="admin-brand-title">Console Analytics</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 activity-pulse"></span>
                Demo Admin
              </span>
            </div>
            <p className="admin-brand-subtitle">Real-time statistics & engagement metrics for Lets Ping</p>
          </div>
        </div>

        <div className="admin-actions">
          <button
            onClick={() => router.push('/chat')}
            className="admin-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </button>
          
          <button
            onClick={loadData}
            disabled={refreshing}
            className="admin-btn-icon-only"
            title="Refresh Data"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-main admin-container">
        
        {/* Metric Cards Grid */}
        <section className="admin-metrics-grid">
          
          {/* Card 1: Users */}
          <div className="admin-glass-card">
            <div className="admin-card-body">
              <div className="admin-card-text">
                <span className="admin-card-title">Total Users</span>
                <span className="admin-card-value">{totalUsers}</span>
                <span className="admin-card-sub success">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse"></span>
                  {onlineUsers} active now
                </span>
              </div>
              <div className="admin-card-icon-container bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 2: Rooms */}
          <div className="admin-glass-card">
            <div className="admin-card-body">
              <div className="admin-card-text">
                <span className="admin-card-title">Rooms & DMs</span>
                <span className="admin-card-value">{totalRooms}</span>
                <span className="admin-card-sub">
                  {totalChannels} Channels • {totalDMs} DMs
                </span>
              </div>
              <div className="admin-card-icon-container bg-violet-500/10 text-violet-400 border border-violet-500/10">
                <Hash className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 3: Messages */}
          <div className="admin-glass-card">
            <div className="admin-card-body">
              <div className="admin-card-text">
                <span className="admin-card-title">Messages Exchanged</span>
                <span className="admin-card-value">{totalMessages}</span>
                <span className="admin-card-sub">
                  Last 2,000 logs processed
                </span>
              </div>
              <div className="admin-card-icon-container bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 4: Average load */}
          <div className="admin-glass-card">
            <div className="admin-card-body">
              <div className="admin-card-text">
                <span className="admin-card-title">Engagement Density</span>
                <span className="admin-card-value">{avgMessagesPerUser}</span>
                <span className="admin-card-sub indigo">
                  <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                  avg messages / user
                </span>
              </div>
              <div className="admin-card-icon-container bg-amber-500/10 text-amber-400 border border-amber-500/10">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

        </section>

        {/* Mid section: Graph and Latest event feed */}
        <section className="admin-mid-grid">
          
          {/* SVG Line Graph */}
          <div className="admin-glass-card h-aligned-card">
            <div className="card-header-aligned">
              <div className="card-header-title">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Message Volume Trend</span>
              </div>
              <span className="card-header-badge">LAST 7 DAYS</span>
            </div>

            <div className="w-full flex-1 flex items-center justify-center pt-2 min-h-0">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-full">
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* X Axis Line */}
                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const yVal = paddingY + ratio * chartHeight;
                  return (
                    <line 
                      key={index} 
                      x1={paddingX} 
                      y1={yVal} 
                      x2={width - paddingX} 
                      y2={yVal} 
                      className="svg-grid-line" 
                    />
                  );
                })}

                {/* Draw Gradient Fill Area */}
                {areaPath && (
                  <path d={areaPath} fill="url(#chart-area-grad)" />
                )}

                {/* Draw Area Line Path */}
                {linePath && (
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="rgb(99, 102, 241)" 
                    strokeWidth={2} 
                    className="chart-glow-path" 
                  />
                )}

                {/* Dots and Labels */}
                {points.map((p, index) => (
                  <g key={index} className="group">
                    {/* Hover circular overlay */}
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={7} 
                      fill="rgba(99, 102, 241, 0.2)" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity" 
                    />
                    {/* Center point dot */}
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r={3.5} 
                      fill="rgb(99, 102, 241)" 
                      stroke="#09090b" 
                      strokeWidth={1.5} 
                    />
                    {/* Floating Value Popup */}
                    <text 
                      x={p.x} 
                      y={p.y - 8} 
                      textAnchor="middle" 
                      fill="#ffffff" 
                      fontSize="9" 
                      fontWeight="bold"
                      className="opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      {p.count}
                    </text>
                    {/* X-axis labels */}
                    <text 
                      x={p.x} 
                      y={height - 4} 
                      textAnchor="middle" 
                      fill="#71717a" 
                      fontSize="9.5" 
                      fontWeight="600"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Real-time Message Log */}
          <div className="admin-glass-card h-aligned-card">
            <div className="card-header-aligned">
              <div className="card-header-title">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Latest Operations</span>
              </div>
              <span className="card-header-badge" style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.1)' }}>LIVE</span>
            </div>

            <div className="flex-1 overflow-y-auto admin-scrollbar pr-1 flex flex-col gap-3 min-h-0">
              {messages.slice(0, 15).map((msg, index) => {
                const senderProfile = profiles[msg.sender_id];
                const senderName = senderProfile?.display_name || 'System / Bot';
                const roomObj = rooms.find(r => r.id === msg.room_id);
                const roomName = roomObj ? (roomObj.is_dm ? 'Direct Message' : `# ${roomObj.name}`) : 'Unknown room';

                return (
                  <div key={msg.id || index} className="admin-log-item">
                    {renderAvatar(senderName, senderProfile?.status || 'offline')}
                    <div className="admin-log-details">
                      <div className="admin-log-meta">
                        <span className="admin-log-name">{senderName}</span>
                        <span className="admin-log-time">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="admin-log-room">{roomName}</p>
                      <p className="admin-log-msg">
                        {msg.content?.startsWith('[E2EE]:') ? (
                          <span className="text-zinc-500 italic">🔒 Encrypted content</span>
                        ) : msg.attachment_type?.startsWith('audio/') ? (
                          <span className="text-emerald-400 italic">🎵 Sent a voice note</span>
                        ) : (
                          msg.content
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                  No activity logs available.
                </div>
              )}
            </div>
          </div>

        </section>

        {/* Search controls */}
        <section className="admin-search-section">
          <div className="admin-search-container">
            <input 
              type="text" 
              placeholder="Search user logs or rooms..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>
        </section>

        {/* Bottom Section: Active Rooms and User Leaderboard */}
        <section className="admin-bottom-grid">
          
          {/* Leaderboard: Top Chatters */}
          <div className="admin-glass-card h-aligned-card">
            <div className="card-header-aligned">
              <div className="card-header-title">
                <User className="w-4 h-4 text-emerald-400" />
                <span>User Activity Leaderboard</span>
              </div>
              <span className="card-header-badge">{filteredChatters.length} Users</span>
            </div>

            <div className="admin-list-container admin-scrollbar">
              {filteredChatters.map((chatter, index) => {
                const totalSent = chatter.msgCount;
                const percentage = totalMessages > 0 ? (totalSent / totalMessages) * 100 : 0;
                
                return (
                  <div key={chatter.id} className="admin-list-item">
                    <div className="admin-item-rank">#{index + 1}</div>
                    <div className="admin-item-avatar-wrapper">
                      {renderAvatar(chatter.display_name, chatter.status)}
                    </div>
                    <div className="admin-item-info">
                      <div className="admin-item-header">
                        <span className="admin-item-name">{chatter.display_name}</span>
                        <span className="admin-item-value">{totalSent} msgs</span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="admin-item-bar-bg">
                        <div 
                          className="admin-item-bar-fill"
                          style={{ width: `${Math.max(4, percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredChatters.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic py-6">
                  No active users match search query.
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard: Most Active Rooms */}
          <div className="admin-glass-card h-aligned-card">
            <div className="card-header-aligned">
              <div className="card-header-title">
                <Globe className="w-4 h-4 text-violet-400" />
                <span>Room Engagement Tracker</span>
              </div>
              <span className="card-header-badge">{filteredRooms.length} Rooms</span>
            </div>

            <div className="admin-list-container admin-scrollbar">
              {filteredRooms.map((room, index) => {
                const totalSent = room.msgCount;
                const percentage = totalMessages > 0 ? (totalSent / totalMessages) * 100 : 0;
                const roomLabel = room.is_dm ? 'Direct Message' : 'Group Channel';

                return (
                  <div key={room.id} className="admin-list-item">
                    <div className="admin-item-rank">#{index + 1}</div>
                    <div className="admin-item-avatar-wrapper">
                      <div className="w-9 h-9 rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/10 flex items-center justify-center font-black text-sm shadow-inner flex-shrink-0">
                        {room.is_dm ? 'DM' : '#'}
                      </div>
                    </div>
                    <div className="admin-item-info">
                      <div className="admin-item-header">
                        <span className="admin-item-name">{room.name}</span>
                        <span className="admin-item-value">{totalSent} msgs</span>
                      </div>
                      <div className="admin-item-subtext">
                        <span>{roomLabel}</span>
                        <span>{room.memberCount} members</span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="admin-item-bar-bg">
                        <div 
                          className="admin-item-bar-fill violet"
                          style={{ width: `${Math.max(4, percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredRooms.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic py-6">
                  No active rooms match search query.
                </div>
              )}
            </div>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-t border-white/[0.03] mt-auto">
        Lets Ping Console Analytics • Built with Dark Glassmorphic Aesthetics
      </footer>
    </div>
  );
}
