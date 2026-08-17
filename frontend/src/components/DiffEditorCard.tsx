import { useState } from 'react';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import { useProjectStore } from '@/store/projectStore';

interface DiffEditorCardProps {
  filePath: string;
  searchStr: string;
  replaceStr: string;
  onTestFail?: (testOutput: string) => void;
}

export default function DiffEditorCard({ filePath, searchStr, replaceStr, onTestFail }: DiffEditorCardProps) {
  const [status, setStatus] = useState<'pending' | 'applying' | 'testing' | 'success' | 'test_error' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const { activeProject } = useProjectStore();

  const handleAccept = async () => {
    if (!activeProject) return;
    setStatus('applying');
    setErrorMsg('');

    try {
      // Get the current file to get the expected_hash
      const fileRes = await api.getFiles(activeProject.id);
      const targetFile = fileRes.files.find(f => f.relative_path === filePath || f.relative_path === filePath.replace(/\\/g, '/'));
      
      if (!targetFile) {
        throw new Error("File not found in project. Cannot apply edit safely.");
      }

      await api.applyEdit(activeProject.id, {
        file_path: filePath,
        search_text: searchStr,
        replace_text: replaceStr,
        expected_hash: targetFile.file_hash
      });

      // If project has test command, run it
      if (activeProject.test_command) {
        setStatus('testing');
        const testRes = await api.runTests(activeProject.id);
        if (testRes.success) {
          setStatus('success');
        } else {
          setStatus('test_error');
          setErrorMsg(testRes.output || "Tests failed");
          if (onTestFail) {
            onTestFail(testRes.output);
          }
        }
      } else {
        setStatus('success');
      }

    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || "Failed to apply edit");
    }
  };

  const handleReject = () => {
    setStatus('error');
    setErrorMsg('Edit Rejected by User');
  };

  return (
    <div className="mt-4 border border-[#202832] rounded-lg overflow-hidden bg-[#0D1117]">
      {/* Header */}
      <div className="bg-[#11161D] border-b border-[#202832] px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-mono text-[#F3F4F6]">{filePath}</span>
        
        {status === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded text-[11px] font-medium transition-colors"
            >
              <X className="h-3 w-3" />
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="flex items-center gap-1.5 px-2 py-1 bg-[#18A957]/10 text-[#18A957] hover:bg-[#18A957]/20 rounded text-[11px] font-medium transition-colors"
            >
              <Check className="h-3 w-3" />
              Accept
            </button>
          </div>
        )}
        
        {status === 'applying' && (
          <span className="text-xs text-[#8B949E] animate-pulse">Applying...</span>
        )}
        
        {status === 'testing' && (
          <span className="text-xs text-[#F59E0B] animate-pulse">Testing...</span>
        )}
        
        {status === 'success' && (
          <div className="flex items-center gap-1.5 text-[#18A957] text-[11px] font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Applied & Passed
          </div>
        )}
        
        {status === 'test_error' && (
          <div className="flex items-center gap-1.5 text-[#EF4444] text-[11px] font-medium">
            <X className="h-3.5 w-3.5" />
            Tests Failed
          </div>
        )}
      </div>

      {/* Diff View */}
      <div className="p-3 bg-[#0D1117] text-[11px] font-mono whitespace-pre overflow-x-auto leading-relaxed">
        {searchStr.split('\n').map((line, i) => (
          <div key={`del-${i}`} className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded-sm mb-[1px]">
            <span className="opacity-50 select-none mr-2">-</span>{line}
          </div>
        ))}
        {replaceStr.split('\n').map((line, i) => (
          <div key={`add-${i}`} className="text-[#18A957] bg-[#18A957]/10 px-2 py-0.5 rounded-sm mt-[1px]">
            <span className="opacity-50 select-none mr-2">+</span>{line}
          </div>
        ))}
      </div>

      {/* Error / Test Output Message */}
      {(status === 'error' || status === 'test_error') && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-xs text-red-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
