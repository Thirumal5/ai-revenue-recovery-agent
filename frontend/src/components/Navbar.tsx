import React, { useState, useEffect, useRef } from 'react';
import type { RecoveryCase } from './RecoveryCasesTable';

interface NavbarProps {
  activeTab: 'overview' | 'cases' | 'activity' | 'customers' | 'analytics' | 'settings';
  setActiveTab: (tab: 'overview' | 'cases' | 'activity' | 'customers' | 'analytics' | 'settings') => void;
  health: string;
  cases: RecoveryCase[];
}

export interface NotificationItem {
  id: string;
  type: 'NEW_CASE' | 'AI_DECISION' | 'SAFETY_BLOCKED' | 'TOOL_SUCCESS' | 'TOOL_FAILED' | 'ESCALATED' | 'RECOVERED';
  title: string;
  subtitle: string;
  caseId: string;
  timestamp: string;
  isRead: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, health, cases }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const navRef = useRef<HTMLDivElement>(null);
  const isHealthy = health.includes('running') || health.includes('ok');

  // Handle clicking outside / ESC key to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
        setShowAdminMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowAdminMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Dynamic header title and subtitle mapping
  const headerContent: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Overview',
      subtitle: 'Real-time intelligence for autonomous revenue recovery',
    },
    cases: {
      title: 'Recovery Cases',
      subtitle: 'Monitor, inspect and manage autonomous recovery workflows',
    },
    activity: {
      title: 'Agent Activity',
      subtitle: 'Real-time audit trail of autonomous agent decisions and executions',
    },
    customers: {
      title: 'Customers',
      subtitle: 'Customer recovery history, risk exposure, and revenue protection',
    },
    analytics: {
      title: 'Recovery Analytics',
      subtitle: 'Understand revenue risk, agent decisions, and recovery performance',
    },
    settings: {
      title: 'Settings',
      subtitle: 'RecoverXAI autonomous engine configuration & safety rules',
    },
  };

  const currentHeader = headerContent[activeTab] || headerContent.overview;

  // Derive notifications dynamically from real database cases and audit actions
  const notifications: NotificationItem[] = [];

  cases.forEach((c) => {
    // 1. Case creation event
    notifications.push({
      id: `case-created-${c.id}`,
      type: 'NEW_CASE',
      title: 'New Recovery Case Ingested',
      subtitle: `Event ${c.type} for ${c.customer?.email || 'customer'} (₹${c.amount.toFixed(2)})`,
      caseId: c.id,
      timestamp: c.createdAt,
      isRead: readNotificationIds.has(`case-created-${c.id}`),
    });

    // 2. Derive notifications from AgentAction logs
    (c.actions || []).forEach((act) => {
      let meta: any = {};
      try {
        meta = JSON.parse(act.metadata || '{}');
      } catch (e) {}

      if (act.actionType === 'AI_DECISION') {
        notifications.push({
          id: `ai-decision-${act.id}`,
          type: 'AI_DECISION',
          title: `AI Decision: ${meta.chosen_action || 'Action Chosen'}`,
          subtitle: meta.reasoning || `Reasoning generated for case RCV-${c.id.slice(0, 8)}`,
          caseId: c.id,
          timestamp: act.timestamp,
          isRead: readNotificationIds.has(`ai-decision-${act.id}`),
        });
      } else if (act.actionType === 'SAFETY_CHECK') {
        if (act.status !== 'SUCCESS') {
          notifications.push({
            id: `safety-blocked-${act.id}`,
            type: 'SAFETY_BLOCKED',
            title: 'Safety Action Blocked',
            subtitle: meta.reason || 'Customer contact cooldown or terminal state restriction active',
            caseId: c.id,
            timestamp: act.timestamp,
            isRead: readNotificationIds.has(`safety-blocked-${act.id}`),
          });
        }
      } else if (act.actionType === 'TOOL_EXECUTED') {
        if (act.status === 'SUCCESS') {
          notifications.push({
            id: `tool-success-${act.id}`,
            type: 'TOOL_SUCCESS',
            title: 'Tool Execution Succeeded',
            subtitle: `Executed ${meta.toolName || 'payment tool'} for RCV-${c.id.slice(0, 8)}`,
            caseId: c.id,
            timestamp: act.timestamp,
            isRead: readNotificationIds.has(`tool-success-${act.id}`),
          });
        } else {
          notifications.push({
            id: `tool-failed-${act.id}`,
            type: 'TOOL_FAILED',
            title: 'Tool Execution Failed',
            subtitle: act.aiReasoning || 'Tool execution encountered an error',
            caseId: c.id,
            timestamp: act.timestamp,
            isRead: readNotificationIds.has(`tool-failed-${act.id}`),
          });
        }
      }
    });

    if (c.status === 'ESCALATED') {
      notifications.push({
        id: `escalated-${c.id}`,
        type: 'ESCALATED',
        title: 'Case Escalated to Human Review',
        subtitle: `Human intervention required for RCV-${c.id.slice(0, 8)}`,
        caseId: c.id,
        timestamp: c.lastContactedAt || c.createdAt,
        isRead: readNotificationIds.has(`escalated-${c.id}`),
      });
    } else if (c.status === 'RECOVERED') {
      notifications.push({
        id: `recovered-${c.id}`,
        type: 'RECOVERED',
        title: 'Revenue Successfully Recovered',
        subtitle: `₹${c.amount.toFixed(2)} recovered for ${c.customer?.email || 'customer'}`,
        caseId: c.id,
        timestamp: c.lastContactedAt || c.createdAt,
        isRead: readNotificationIds.has(`recovered-${c.id}`),
      });
    }
  });

  // Sort newest first
  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadNotificationIds(allIds);
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'RECOVERED':
        return <span className="w-2 h-2 rounded-full bg-emerald-500"></span>;
      case 'TOOL_SUCCESS':
        return <span className="w-2 h-2 rounded-full bg-emerald-500"></span>;
      case 'ESCALATED':
      case 'TOOL_FAILED':
        return <span className="w-2 h-2 rounded-full bg-amber-500"></span>;
      case 'SAFETY_BLOCKED':
        return <span className="w-2 h-2 rounded-full bg-red-500"></span>;
      case 'AI_DECISION':
        return <span className="w-2 h-2 rounded-full bg-purple-500"></span>;
      default:
        return <span className="w-2 h-2 rounded-full bg-blue-500"></span>;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Dynamic title & subtitle */}
      <div>
        <h1 className="text-xl font-black text-slate-950 tracking-tight">{currentHeader.title}</h1>
        <p className="text-xs text-slate-500 font-medium">{currentHeader.subtitle}</p>
      </div>

      {/* Right: Active engine badge, Test Mode, Notification Bell, Admin avatar */}
      <div className="flex items-center gap-3" ref={navRef}>
        {/* Active Engine Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Autonomous Engine: Active</span>
        </div>

        {/* Razorpay Test Mode Badge */}
        <div className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
          <span>Razorpay Test Mode</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3 ml-2 border-l border-slate-200 pl-4 relative">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowAdminMenu(false);
              }}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-semibold relative cursor-pointer transition-colors"
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-950 text-xs uppercase tracking-wider">
                      Recent Activity
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-indigo-200">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">
                      No new activity
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                          !n.isRead ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        <div className="mt-1">{getNotificationIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs truncate">{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2">
                            {n.subtitle}
                          </p>
                          <span className="font-mono text-[10px] font-bold text-indigo-600 block mt-1">
                            RCV-{n.caseId.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 pt-2 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      setActiveTab('activity');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    View Agent Activity →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin Avatar ("A") */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAdminMenu(!showAdminMenu);
                setShowNotifications(false);
              }}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center cursor-pointer shadow-xs transition-colors"
              title="Admin Identity"
            >
              A
            </button>

            {/* Admin Profile Popover Dropdown (Option A) */}
            {showAdminMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                <div className="border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                      A
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-950">RecoverXAI Admin</div>
                      <div className="text-[11px] text-slate-400 font-medium">System Operator</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 font-medium mb-3">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Backend:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Autonomous Engine:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Environment:</span>
                    <span className="font-bold text-indigo-600">Razorpay Test Mode</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={() => {
                      setShowAdminMenu(false);
                      setActiveTab('settings');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 font-extrabold cursor-pointer transition-colors"
                  >
                    View Settings →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
