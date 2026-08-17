import { create } from 'zustand'
import type { ProjectData, ProjectListItem, FileTreeNode } from '@/services/api'

interface ProjectStore {
  // Project list
  projects: ProjectListItem[]
  setProjects: (projects: ProjectListItem[]) => void

  // Active project
  activeProject: ProjectData | null
  setActiveProject: (project: ProjectData | null) => void

  // File explorer state
  selectedFileId: string | null
  setSelectedFileId: (id: string | null) => void

  fileTree: FileTreeNode[]
  setFileTree: (tree: FileTreeNode[]) => void

  // Scanning state
  isScanning: boolean
  setIsScanning: (scanning: boolean) => void

  // Open project modal
  isOpenProjectModalOpen: boolean
  setOpenProjectModalOpen: (open: boolean) => void

  // Code jump
  jumpToLine: number | null
  setJumpToLine: (line: number | null) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),

  activeProject: null,
  setActiveProject: (project) => set({ activeProject: project }),

  selectedFileId: null,
  setSelectedFileId: (id) => set({ selectedFileId: id }),

  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),

  isScanning: false,
  setIsScanning: (scanning) => set({ isScanning: scanning }),

  isOpenProjectModalOpen: false,
  setOpenProjectModalOpen: (open) => set({ isOpenProjectModalOpen: open }),

  jumpToLine: null,
  setJumpToLine: (line) => set({ jumpToLine: line }),
}))
