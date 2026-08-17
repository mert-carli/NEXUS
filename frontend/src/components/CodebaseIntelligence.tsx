import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { 
  Network, 
  Layers, 
  Code2, 
  Box, 
  FileText, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  CheckCircle2, 
  Activity, 
  Eye 
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, CodebaseIntelligenceData, IntelligenceNode } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'

export default function CodebaseIntelligence() {
  const { activeProject, setSelectedFileId } = useProjectStore()
  const navigate = useNavigate()

  const [data, setData] = useState<CodebaseIntelligenceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'graph' | 'metrics'>('graph')
  const [selectedNode, setSelectedNode] = useState<IntelligenceNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<IntelligenceNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLang, setSelectedLang] = useState<string>('all')

  // Canvas / Graph view state
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map())
  const animationFrameRef = useRef<number | null>(null)

  const fetchIntelligence = useCallback(async () => {
    if (!activeProject?.id) return
    setLoading(true)
    try {
      const res = await api.getIntelligence(activeProject.id)
      setData(res)
      initGraphPositions(res.graph.nodes)
    } catch (err) {
      console.error("Failed to load codebase intelligence:", err)
    } finally {
      setLoading(false)
    }
  }, [activeProject?.id])

  useEffect(() => {
    fetchIntelligence()
  }, [fetchIntelligence])

  // Initialize node positions with radial cluster layout
  const initGraphPositions = (nodes: IntelligenceNode[]) => {
    const map = new Map<string, { x: number; y: number; vx: number; vy: number }>()
    const count = nodes.length
    const radius = Math.min(Math.max(count * 18, 220), 480)
    
    // Group by directory or language
    const groups: { [key: string]: IntelligenceNode[] } = {}
    nodes.forEach(node => {
      const dir = node.path.split('/')[0] || 'root'
      if (!groups[dir]) groups[dir] = []
      groups[dir].push(node)
    })

    let groupIndex = 0
    const groupKeys = Object.keys(groups)
    const numGroups = groupKeys.length

    groupKeys.forEach((grp) => {
      const groupNodes = groups[grp]
      const grpAngle = (groupIndex / numGroups) * 2 * Math.PI
      const grpCenterX = Math.cos(grpAngle) * (radius * 0.65)
      const grpCenterY = Math.sin(grpAngle) * (radius * 0.65)

      groupNodes.forEach((node, i) => {
        const subAngle = (i / groupNodes.length) * 2 * Math.PI
        const subDist = 30 + Math.random() * (groupNodes.length > 5 ? 70 : 35)
        map.set(node.id, {
          x: grpCenterX + Math.cos(subAngle) * subDist,
          y: grpCenterY + Math.sin(subAngle) * subDist,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2
        })
      })
      groupIndex++
    })

    nodePositionsRef.current = map
  }

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!data) return []
    return data.graph.nodes.filter(n => {
      const matchSearch = !searchQuery || 
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.functions.some(f => f.toLowerCase().includes(searchQuery.toLowerCase())) ||
        n.classes.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchLang = selectedLang === 'all' || n.language.toLowerCase() === selectedLang.toLowerCase()
      return matchSearch && matchLang
    })
  }, [data, searchQuery, selectedLang])

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])

  // Connected node IDs for hovered or selected node
  const activeConnectedIds = useMemo(() => {
    const target = selectedNode || hoveredNode
    if (!target || !data) return null
    const set = new Set<string>([target.id])
    data.graph.links.forEach(l => {
      if (l.source === target.id) set.add(l.target)
      if (l.target === target.id) set.add(l.source)
    })
    return set
  }, [selectedNode, hoveredNode, data])

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particlePhase = 0

    const render = () => {
      particlePhase = (particlePhase + 0.02) % 1
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      ctx.save()
      // Center origin + pan + zoom
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y)
      ctx.scale(zoom, zoom)

      const positions = nodePositionsRef.current

      // Draw links
      data.graph.links.forEach(link => {
        const p1 = positions.get(link.source)
        const p2 = positions.get(link.target)
        if (!p1 || !p2) return

        const isSourceVisible = filteredNodeIds.has(link.source)
        const isTargetVisible = filteredNodeIds.has(link.target)
        if (!isSourceVisible && !isTargetVisible) return

        const isHighlighted = activeConnectedIds && (activeConnectedIds.has(link.source) && activeConnectedIds.has(link.target))
        const isDimmed = activeConnectedIds && !isHighlighted

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)

        if (isHighlighted) {
          ctx.strokeStyle = '#18A957'
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.9
        } else if (isDimmed) {
          ctx.strokeStyle = '#202832'
          ctx.lineWidth = 0.8
          ctx.globalAlpha = 0.15
        } else {
          ctx.strokeStyle = link.relation === 'import' ? '#3B82F6' : '#2A3644'
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.35
        }
        ctx.stroke()
        ctx.globalAlpha = 1

        // Signal particles along highlighted lines
        if (isHighlighted || (!activeConnectedIds && Math.random() < 0.2)) {
          const px = p1.x + (p2.x - p1.x) * particlePhase
          const py = p1.y + (p2.y - p1.y) * particlePhase
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fillStyle = '#18A957'
          ctx.fill()
        }
      })

      // Draw nodes
      data.graph.nodes.forEach(node => {
        const pos = positions.get(node.id)
        if (!pos) return

        const isVisible = filteredNodeIds.has(node.id)
        const isSelected = selectedNode?.id === node.id
        const isHovered = hoveredNode?.id === node.id
        const isConnected = activeConnectedIds?.has(node.id)
        const isDimmed = activeConnectedIds && !isConnected

        const nodeRadius = isSelected ? 9 : isHovered ? 8 : Math.min(Math.max(4 + (node.lines / 100), 4), 9)

        ctx.save()
        ctx.translate(pos.x, pos.y)

        // Glow ring for selected/connected
        if (isSelected || isHovered) {
          ctx.beginPath()
          ctx.arc(0, 0, nodeRadius + 5, 0, Math.PI * 2)
          ctx.fillStyle = isSelected ? 'rgba(24, 169, 87, 0.25)' : 'rgba(59, 130, 246, 0.25)'
          ctx.fill()
        }

        // Node Circle
        ctx.beginPath()
        ctx.arc(0, 0, nodeRadius, 0, Math.PI * 2)
        ctx.fillStyle = isDimmed ? '#1F2937' : node.color || '#8B949E'
        ctx.globalAlpha = isDimmed ? 0.2 : isVisible ? 1 : 0.3
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(0, 0, nodeRadius * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.globalAlpha = isDimmed ? 0.1 : 0.8
        ctx.fill()

        // Label
        if (zoom > 0.8 || isSelected || isHovered || isConnected) {
          ctx.font = `${isSelected || isHovered ? 'bold 11px' : '9px'} JetBrains Mono, monospace`
          ctx.fillStyle = isSelected ? '#18A957' : isHovered ? '#F3F4F6' : isDimmed ? 'rgba(139, 148, 158, 0.2)' : '#8B949E'
          ctx.textAlign = 'center'
          ctx.fillText(node.name, 0, nodeRadius + 12)
        }

        ctx.restore()
      })

      ctx.restore()
      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [data, zoom, pan, selectedNode, hoveredNode, filteredNodeIds, activeConnectedIds])

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !data) return

    if (isDraggingRef.current) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      })
      return
    }

    // Node hit testing
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - canvas.width / 2 - pan.x
    const mouseY = e.clientY - rect.top - canvas.height / 2 - pan.y

    const scaleX = mouseX / zoom
    const scaleY = mouseY / zoom

    const positions = nodePositionsRef.current
    let found: IntelligenceNode | null = null

    for (const node of data.graph.nodes) {
      const pos = positions.get(node.id)
      if (!pos) continue
      const dist = Math.hypot(pos.x - scaleX, pos.y - scaleY)
      if (dist < 12) {
        found = node
        break
      }
    }

    setHoveredNode(found)
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleCanvasClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode)
    } else if (!isDraggingRef.current) {
      setSelectedNode(null)
    }
  }

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.4), 2.5))
  }

  const handleResetGraph = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelectedNode(null)
    if (data) initGraphPositions(data.graph.nodes)
  }

  const handleInspectFile = (node: IntelligenceNode) => {
    setSelectedFileId(node.path)
    navigate('/code')
  }

  const handleExplainFile = (node: IntelligenceNode) => {
    navigate('/assistant', { state: { prefill: `Explain the architecture, key functions, and responsibility of file: ${node.path}` } })
  }

  const handleRefactorFile = (node: IntelligenceNode) => {
    navigate('/assistant', { state: { prefill: `Analyze ${node.path} and propose a clean, modular refactoring with type safety, error handling, and performance optimization.` } })
  }

  const handleFindUsages = (node: IntelligenceNode) => {
    navigate('/assistant', { state: { prefill: `Find all usages, imports, and references to ${node.path} and its functions across this project.` } })
  }

  const handleAskAboutFile = (node: IntelligenceNode) => {
    navigate('/assistant', { state: { prefill: `I have a question regarding ${node.path}: ` } })
  }

  const nodeDependencies = useMemo(() => {
    if (!selectedNode || !data) return []
    const outgoing = data.graph.links
      .filter(l => l.source === selectedNode.id)
      .map(l => {
        const targetNode = data.graph.nodes.find(n => n.id === l.target)
        return targetNode ? targetNode.name : l.target.split('/').pop() || l.target
      })
    return Array.from(new Set(outgoing))
  }, [selectedNode, data])

  if (!activeProject?.id) return null

  return (
    <div className="rounded-2xl border border-[#202832] bg-[#0D1117] overflow-hidden shadow-2xl transition-all duration-300">
      {/* ── Top Bar / Section Header ── */}
      <div className="border-b border-[#202832] bg-[#11161D] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6]">
            <Network className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-[#F3F4F6] uppercase font-mono">
                CODEBASE INTELLIGENCE
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6] font-mono border border-[#3B82F6]/20">
                AST & GRAPH
              </span>
            </div>
            <p className="text-[11px] text-[#8B949E]">Deep AST Structural Parser & Semantic Dependency Network</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#202832] bg-[#0D1117] p-0.5">
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'graph'
                  ? 'bg-[#18A957] text-white shadow-sm'
                  : 'text-[#8B949E] hover:text-[#F3F4F6]'
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              Semantic Map
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === 'metrics'
                  ? 'bg-[#18A957] text-white shadow-sm'
                  : 'text-[#8B949E] hover:text-[#F3F4F6]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Analytics & Index
            </button>
          </div>

          <button
            onClick={fetchIntelligence}
            disabled={loading}
            title="Refresh Intelligence"
            className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#18A957]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 4 Main Core Metrics Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#202832] border-b border-[#202832] bg-[#0D1117]/80">
        <div className="p-4 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8B949E]">Total Files</p>
            <p className="text-xl font-bold font-mono text-[#F3F4F6] tabular-nums">
              {data?.metrics.total_files.toLocaleString() || '...'}
            </p>
            <p className="text-[10px] text-[#8B949E]/70 font-mono">{data?.metrics.source_files || 0} source</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#18A957]/10 text-[#18A957] border border-[#18A957]/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8B949E]">ChromaDB Chunks</p>
            <p className="text-xl font-bold font-mono text-[#18A957] tabular-nums">
              {data?.metrics.total_chunks.toLocaleString() || '...'}
            </p>
            <p className="text-[10px] text-[#8B949E]/70 font-mono">Vectorized</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8B949E]">Functions</p>
            <p className="text-xl font-bold font-mono text-[#F3F4F6] tabular-nums">
              {data?.metrics.total_functions.toLocaleString() || '...'}
            </p>
            <p className="text-[10px] text-[#8B949E]/70 font-mono">AST Parsed</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-[#8B949E]">Classes & Types</p>
            <p className="text-xl font-bold font-mono text-[#F3F4F6] tabular-nums">
              {data?.metrics.total_classes.toLocaleString() || '...'}
            </p>
            <p className="text-[10px] text-[#8B949E]/70 font-mono">Interfaces / Structs</p>
          </div>
        </div>
      </div>

      {/* ── Index Progress & Language Bar ── */}
      <div className="p-5 border-b border-[#202832] bg-[#11161D]/50 space-y-4">
        {/* Index Status Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-mono uppercase font-semibold text-[#8B949E] flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#18A957]" /> ChromaDB Vector Index
            </span>
            <span className="font-mono font-bold text-[#18A957]">
              {data?.metrics.index_percentage || 0}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-[#202832] rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#18A957] via-[#22C55E] to-[#06B6D4] transition-all duration-700 shadow-sm shadow-[#18A957]/30"
              style={{ width: `${data?.metrics.index_percentage || 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8B949E]/70 mt-1">
            <span>Indexed {data?.metrics.indexed_files || 0} of {data?.metrics.source_files || 0} source files</span>
            <span>Cosine Similarity Space</span>
          </div>
        </div>

        {/* Languages Breakdown */}
        {data && data.languages.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#8B949E] uppercase mb-2">
              <span>Language Distribution</span>
              <span>{data.languages.length} Detected</span>
            </div>
            
            {/* Multi-segmented Bar */}
            <div className="flex h-2 rounded-full overflow-hidden gap-px mb-2.5 bg-[#202832]">
              {data.languages.map(lang => (
                <div
                  key={lang.name}
                  style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                  title={`${lang.name}: ${lang.count} files (${lang.percentage}%)`}
                />
              ))}
            </div>

            {/* Language Badges */}
            <div className="flex flex-wrap gap-2">
              {data.languages.map(lang => (
                <button
                  key={lang.name}
                  onClick={() => setSelectedLang(selectedLang === lang.name ? 'all' : lang.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                    selectedLang === lang.name
                      ? 'bg-[#202832] text-[#F3F4F6] border-[#18A957]/50'
                      : 'bg-[#0D1117] text-[#8B949E] border-[#202832] hover:border-[#8B949E]/40'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: lang.color }} />
                  <span className="font-medium text-[#F3F4F6]">{lang.name}</span>
                  <span className="text-[#8B949E]/70">{lang.percentage}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main View Content (Semantic Map Graph OR Deep Analytics) ── */}
      {activeTab === 'graph' ? (
        <div className="relative h-[480px] w-full bg-[#090C10] overflow-hidden" ref={containerRef}>
          {/* Graph Controls Toolbar Overlay */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8B949E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search file, func, class..."
                className="w-48 sm:w-64 rounded-lg border border-[#202832] bg-[#0D1117]/90 backdrop-blur-md pl-8 pr-3 py-1.5 text-xs text-[#F3F4F6] placeholder-[#8B949E]/50 focus:border-[#18A957]/50 focus:outline-none font-mono"
              />
            </div>

            {/* Reset / Zoom Controls */}
            <div className="flex items-center gap-1 rounded-lg border border-[#202832] bg-[#0D1117]/90 backdrop-blur-md p-0.5">
              <button
                onClick={() => handleZoom(0.2)}
                className="p-1 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleZoom(-0.2)}
                className="p-1 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleResetGraph}
                className="p-1 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
                title="Reset View"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Node Count & Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 text-[11px] font-mono text-[#8B949E] bg-[#0D1117]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#202832]">
            <span className="flex items-center gap-1 text-[#18A957]">
              ● <span className="text-[#F3F4F6]">{data?.graph.nodes.length || 0}</span> Nodes
            </span>
            <span className="flex items-center gap-1 text-[#3B82F6]">
              ━ <span className="text-[#F3F4F6]">{data?.graph.links.length || 0}</span> Links
            </span>
            <span className="text-[10px] text-[#8B949E]/60">Drag to Pan • Click Node to Inspect</span>
          </div>

          {/* Canvas Rendering Graph */}
          <canvas
            ref={canvasRef}
            width={900}
            height={480}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            className="h-full w-full cursor-grab active:cursor-grabbing"
          />

          {/* Sleek Node Detail Drawer / Inspector Card */}
          {selectedNode && (
            <div className="absolute top-3 right-3 bottom-3 z-20 w-84 rounded-2xl border border-[#202832] bg-[#0D1117]/98 backdrop-blur-xl p-4 shadow-2xl overflow-y-auto flex flex-col justify-between font-mono animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-[#202832]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3 w-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: selectedNode.color }} />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-[#F3F4F6] uppercase tracking-wider block truncate">
                        {selectedNode.name}
                      </span>
                      <span className="text-[10px] text-[#8B949E]">
                        {selectedNode.language.toUpperCase()} &bull; {selectedNode.lines} lines &bull; {selectedNode.chunks_count} chunks
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded-lg text-[#8B949E] hover:text-[#F3F4F6] hover:bg-[#202832] transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Path Pill */}
                <p className="text-[10px] text-[#8B949E] break-all bg-[#11161D] p-2 rounded-xl border border-[#202832]/80 select-all">
                  {selectedNode.path}
                </p>

                {/* FUNCTIONS Tree */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8B949E] block mb-1.5 tracking-wider">
                    FUNCTIONS ({selectedNode.functions.length})
                  </span>
                  {selectedNode.functions.length > 0 ? (
                    <div className="space-y-1 bg-[#11161D]/70 p-2.5 rounded-xl border border-[#202832]/60 text-[11px] max-h-32 overflow-y-auto">
                      {selectedNode.functions.map((fn, idx) => {
                        const isLast = idx === selectedNode.functions.length - 1
                        return (
                          <div key={fn} className="flex items-center gap-1.5 text-[#3B82F6] hover:text-[#60A5FA] transition-colors">
                            <span className="text-[#8B949E]/50 select-none">{isLast ? '└─' : '├─'}</span>
                            <span className="truncate">{fn}()</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#8B949E]/50 italic bg-[#11161D]/40 p-2 rounded-xl border border-[#202832]/40">
                      No standalone functions detected
                    </p>
                  )}
                </div>

                {/* DEPENDENCIES List */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#8B949E] block mb-1.5 tracking-wider">
                    DEPENDENCIES ({nodeDependencies.length})
                  </span>
                  {nodeDependencies.length > 0 ? (
                    <div className="space-y-1 bg-[#11161D]/70 p-2.5 rounded-xl border border-[#202832]/60 text-[11px] max-h-28 overflow-y-auto">
                      {nodeDependencies.map(dep => (
                        <div key={dep} className="flex items-center gap-1.5 text-[#10B981] hover:text-[#34D399] transition-colors">
                          <span className="text-[#8B949E]/50 select-none">&rarr;</span>
                          <span className="truncate">{dep}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#8B949E]/50 italic bg-[#11161D]/40 p-2 rounded-xl border border-[#202832]/40">
                      No internal project dependencies linked
                    </p>
                  )}
                </div>
              </div>

              {/* AI ACTIONS Grid */}
              <div className="pt-3 mt-4 border-t border-[#202832] space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#8B949E] block tracking-wider">
                  AI ACTIONS
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleExplainFile(selectedNode)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#11161D] border border-[#202832] hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10 text-[#3B82F6] text-[11px] font-semibold transition-all shadow-sm"
                  >
                    💡 Explain
                  </button>
                  <button
                    onClick={() => handleRefactorFile(selectedNode)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#11161D] border border-[#202832] hover:border-[#F59E0B]/50 hover:bg-[#F59E0B]/10 text-[#F59E0B] text-[11px] font-semibold transition-all shadow-sm"
                  >
                    ⚡ Refactor
                  </button>
                  <button
                    onClick={() => handleFindUsages(selectedNode)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#11161D] border border-[#202832] hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 text-[#8B5CF6] text-[11px] font-semibold transition-all shadow-sm"
                  >
                    🔍 Find usages
                  </button>
                  <button
                    onClick={() => handleAskAboutFile(selectedNode)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#11161D] border border-[#202832] hover:border-[#18A957]/50 hover:bg-[#18A957]/10 text-[#18A957] text-[11px] font-semibold transition-all shadow-sm"
                  >
                    💬 Ask NEXUS
                  </button>
                </div>
                <button
                  onClick={() => handleInspectFile(selectedNode)}
                  className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#18A957] hover:bg-[#18A957]/90 text-white text-[11px] font-bold transition-all shadow-md shadow-[#18A957]/15"
                >
                  <Eye className="h-3.5 w-3.5" /> Open in Explorer &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Deep Analytics & Structural Breakdown Table ── */
        <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#11161D] border border-[#202832] rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-3">
                Top Source Files by Complexity & Chunks
              </h3>
              <div className="space-y-2">
                {data?.graph.nodes
                  .sort((a, b) => b.chunks_count - a.chunks_count)
                  .slice(0, 7)
                  .map(node => (
                    <div key={node.id} className="flex items-center justify-between text-xs font-mono p-2 rounded bg-[#0D1117] border border-[#202832]/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: node.color }} />
                        <span className="text-[#F3F4F6] truncate max-w-xs">{node.path}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[#8B949E]">
                        <span>{node.lines} lines</span>
                        <span className="text-[#18A957] font-semibold">{node.chunks_count} chunks</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-[#11161D] border border-[#202832] rounded-xl p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-3">
                Architecture & Module Graph Summary
              </h3>
              <div className="space-y-3 text-xs text-[#8B949E]">
                <div className="flex justify-between p-2 rounded bg-[#0D1117] border border-[#202832]/60">
                  <span>Dependency Connections</span>
                  <span className="font-mono text-[#F3F4F6] font-semibold">{data?.graph.links.length || 0}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#0D1117] border border-[#202832]/60">
                  <span>Avg Functions / File</span>
                  <span className="font-mono text-[#F3F4F6] font-semibold">
                    {data && data.metrics.source_files > 0 ? (data.metrics.total_functions / data.metrics.source_files).toFixed(1) : 0}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#0D1117] border border-[#202832]/60">
                  <span>Avg Chunks / File</span>
                  <span className="font-mono text-[#F3F4F6] font-semibold">
                    {data && data.metrics.source_files > 0 ? (data.metrics.total_chunks / data.metrics.source_files).toFixed(1) : 0}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[#0D1117] border border-[#202832]/60">
                  <span>Vector Embedding Precision</span>
                  <span className="font-mono text-[#18A957] font-semibold">Cosine High (HNSW)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
