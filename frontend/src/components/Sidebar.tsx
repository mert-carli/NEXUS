import { useUIStore } from '@/store/uiStore'
import { useProjectStore } from '@/store/projectStore'
import { useAgentStore } from '@/store/agentStore'
import { 
  Compass,
  FolderTree,
  Search,
  GitBranch,
  Network,
  Bot,
  Sparkles,
  Database,
  Activity,
  FileDiff,
  Terminal,
  ShieldCheck,
  Settings,
  Menu,
  X,
  FolderOpen,
  ChevronDown,
  Layers
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()
  const { activeProject, setOpenProjectModalOpen } = useProjectStore()
  const { status: agentStatus, steps } = useAgentStore()
  const navigate = useNavigate()
  const location = useLocation()

  const activeStepsCount = steps.filter(s => s.status === 'running').length

  const navGroups = [
    {
      title: 'PROJECT',
      items: [
        { name: 'Explorer', icon: FolderTree, path: '/code', action: () => navigate('/code') },
        { name: 'Search', icon: Search, path: '/code', action: () => navigate('/code') },
        { name: 'Git Repo', icon: GitBranch, path: '/code', action: () => navigate('/code') },
        { name: 'Codebase Map', icon: Network, path: '/dashboard', action: () => {
          navigate('/dashboard')
          window.scrollTo({ top: 350, behavior: 'smooth' })
        }},
      ],
    },
    {
      title: 'AI ENGINE',
      items: [
        { name: 'Assistant', icon: Bot, path: '/assistant', action: () => navigate('/assistant') },
        { 
          name: 'Agent', 
          icon: Sparkles, 
          path: '/assistant', 
          badge: agentStatus === 'IDLE' ? '● IDLE' : `● ${agentStatus}`,
          badgeColor: agentStatus === 'IDLE' ? 'text-[#8B5CF6]' : 'text-[#A78BFA] animate-pulse',
          action: () => navigate('/assistant') 
        },
        { 
          name: 'RAG Index', 
          icon: Database, 
          path: '/dashboard', 
          badge: activeProject ? (activeProject.index_status || 'NOT_INDEXED') : undefined,
          badgeColor: activeProject?.index_status === 'READY' ? 'text-[#18A957]' : 'text-[#F59E0B]',
          action: () => {
            navigate('/dashboard')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        },
        { 
          name: 'Operations', 
          icon: Activity, 
          path: '/assistant', 
          badge: activeStepsCount > 0 ? `${activeStepsCount} active` : undefined,
          badgeColor: activeStepsCount > 0 ? 'text-[#18A957]' : 'text-[#8B949E]/70',
          action: () => navigate('/assistant') 
        },
      ],
    },
    {
      title: 'DEVELOPMENT',
      items: [
        { 
          name: 'Changes', 
          icon: FileDiff, 
          path: '/assistant', 
          badge: activeProject?.git_is_dirty ? `${activeProject.git_modified_files_count || 1} dirty` : (activeProject?.is_git_repo ? 'clean' : undefined),
          badgeColor: activeProject?.git_is_dirty ? 'text-[#F59E0B]' : 'text-[#18A957]',
          action: () => navigate('/assistant') 
        },
        { name: 'Diff Editor', icon: Layers, path: '/assistant', action: () => navigate('/assistant') },
        { 
          name: 'Console', 
          icon: Terminal, 
          path: '/dashboard', 
          badge: '● LIVE',
          badgeColor: 'text-[#06B6D4]',
          action: () => {
            navigate('/dashboard')
            window.scrollTo({ top: 1200, behavior: 'smooth' })
          }
        },
      ],
    },
    {
      title: 'SECURITY',
      items: [
        { 
          name: 'Nexus Guard', 
          icon: ShieldCheck, 
          path: '/dashboard', 
          badge: '● ACTIVE',
          badgeColor: 'text-[#18A957]',
          action: () => {
            navigate('/dashboard')
            window.scrollTo({ top: 750, behavior: 'smooth' })
          }
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { 
          name: 'Health & Score', 
          icon: Activity, 
          path: '/dashboard', 
          badge: undefined,
          action: () => {
            navigate('/dashboard')
            window.scrollTo({ top: 950, behavior: 'smooth' })
          }
        },
        { name: 'Settings', icon: Settings, path: '/settings', action: () => navigate('/settings') },
      ],
    },
  ]

  return (
    <div
      className={`flex flex-col border-r border-[#202832] bg-[#0B0E14] transition-all duration-200 ${
        isSidebarCollapsed ? 'w-14' : 'w-64'
      } min-h-screen shrink-0 font-mono select-none`}
    >
      {/* Logo / Toggle */}
      <div className="flex h-14 items-center justify-between px-3.5 border-b border-[#202832] bg-[#11161D]">
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <img src="/Nexuxlogo.png" alt="NEXUS" className="h-6 w-6 object-contain drop-shadow" />
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wider text-[#F3F4F6]">NEXUS</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#18A957]/15 text-[#18A957] font-semibold border border-[#18A957]/30">
                CORE
              </span>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-1.5 rounded-lg hover:bg-[#202832] text-[#8B949E] hover:text-[#F3F4F6] transition-colors ${isSidebarCollapsed ? 'mx-auto' : ''}`}
        >
          {isSidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Project Switcher */}
      {!isSidebarCollapsed && (
        <div className="px-3 py-3 border-b border-[#202832] bg-[#0D1117]/60">
          {activeProject ? (
            <button
              onClick={() => setOpenProjectModalOpen(true)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#11161D] border border-[#202832] hover:border-[#18A957]/40 transition-all text-left group shadow-sm"
            >
              <FolderOpen className="h-4 w-4 text-[#18A957] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#F3F4F6] truncate">{activeProject.name}</p>
                <p className="text-[10px] text-[#8B949E]/70 truncate font-mono">{activeProject.git_branch ?? 'local'}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-[#8B949E]/40 group-hover:text-[#8B949E] shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => setOpenProjectModalOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#202832] hover:border-[#18A957]/40 text-xs text-[#8B949E] hover:text-[#F3F4F6] transition-all bg-[#0D1117]"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open Project…
            </button>
          )}
        </div>
      )}

      {/* Main Command Center Home Link */}
      <div className="p-2 border-b border-[#202832]/60">
        <button
          onClick={() => navigate('/dashboard')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            location.pathname === '/dashboard'
              ? 'bg-gradient-to-r from-[#18A957]/20 to-[#18A957]/5 text-[#18A957] border border-[#18A957]/30 shadow-sm'
              : 'text-[#8B949E] hover:text-[#F3F4F6] hover:bg-[#11161D]'
          } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
          title="Command Center"
        >
          <Compass className="h-4 w-4 shrink-0 text-[#18A957]" />
          {!isSidebarCollapsed && (
            <span className="flex-1 text-left uppercase tracking-wider text-[11px]">
              ⌂ COMMAND CENTER
            </span>
          )}
        </button>
      </div>

      {/* Navigation Group Sections */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-4 pr-1">
        {navGroups.map((group, idx) => (
          <div key={idx} className="px-2">
            {!isSidebarCollapsed && (
              <p className="px-3 text-[10px] font-bold text-[#8B949E]/60 tracking-widest uppercase mb-1 flex items-center justify-between">
                <span>{group.title}</span>
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path && item.name !== 'Codebase Map' && item.name !== 'RAG Index' && item.name !== 'Console' && item.name !== 'Nexus Guard' && item.name !== 'Health & Score'
                return (
                  <li key={item.name}>
                    <button
                      onClick={item.action}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-[#18A957]/10 text-[#18A957] font-semibold border border-[#18A957]/20'
                          : 'text-[#8B949E] hover:text-[#F3F4F6] hover:bg-[#11161D]'
                      } ${isSidebarCollapsed ? 'justify-center px-1' : ''}`}
                      title={isSidebarCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                        {!isSidebarCollapsed && (
                          <span className="text-[11px] truncate">
                            {item.name}
                          </span>
                        )}
                      </div>

                      {!isSidebarCollapsed && (item as any).badge && (
                        <span className={`text-[9px] font-mono shrink-0 ${(item as any).badgeColor || 'text-[#8B949E]'}`}>
                          {(item as any).badge}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Status / Version */}
      <div className="p-3 border-t border-[#202832] bg-[#07090D] flex items-center justify-between text-[10px] text-[#8B949E]/60">
        {!isSidebarCollapsed ? (
          <>
            <span className="flex items-center gap-1.5 text-[#18A957]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#18A957] animate-pulse" />
              SYSTEM ACTIVE
            </span>
            <span>v2.0 NASA-SPEC</span>
          </>
        ) : (
          <span className="h-2 w-2 rounded-full bg-[#18A957] mx-auto animate-pulse" />
        )}
      </div>
    </div>
  )
}
