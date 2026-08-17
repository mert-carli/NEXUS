from pathlib import Path
from typing import Optional, Dict, Any
import git

def get_git_info(project_path: Path) -> Dict[str, Any]:
    """
    Safely inspects if a directory is a Git repository,
    returning branch, commit, dirty status, and modified file count.
    Never throws exceptions; returns fallback data if not a repo.
    """
    result = {
        "is_git_repo": False,
        "git_branch": None,
        "git_commit_hash": None,
        "git_commit_message": None,
        "git_is_dirty": False,
        "git_modified_files_count": 0
    }

    try:
        repo = git.Repo(project_path, search_parent_directories=False)
        result["is_git_repo"] = True

        # Active branch or detached HEAD
        try:
            result["git_branch"] = repo.active_branch.name
        except TypeError:
            result["git_branch"] = "DETACHED_HEAD"
        except Exception:
            result["git_branch"] = "main"

        # Latest commit
        try:
            head_commit = repo.head.commit
            result["git_commit_hash"] = head_commit.hexsha[:8]
            result["git_commit_message"] = head_commit.message.strip().split("\n")[0]
        except Exception:
            result["git_commit_hash"] = None
            result["git_commit_message"] = None

        # Dirty status & modified file count
        try:
            is_dirty = repo.is_dirty(untracked_files=True)
            result["git_is_dirty"] = is_dirty
            
            # Count modified + untracked files
            diff_index = repo.index.diff(None)
            untracked = repo.untracked_files
            result["git_modified_files_count"] = len(diff_index) + len(untracked)
        except Exception:
            result["git_is_dirty"] = False
            result["git_modified_files_count"] = 0

    except git.InvalidGitRepositoryError:
        pass
    except Exception:
        pass

    return result
