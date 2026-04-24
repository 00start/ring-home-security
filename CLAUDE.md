# Worktree Safety (MANDATORY)

Multiple Claude sessions may run as parallel worktrees on this repo. These rules
prevent data loss from stash/rebase collisions across worktrees.

1. **Never work on `main`.** Every worktree must start on a fresh feature branch:
   `git worktree add ./wt -b feat/my-task origin/main` — not `main`.
2. **Never use `git stash`.** The stash stack is shared across all worktrees.
   Use `git commit -m "WIP: checkpoint"` instead — it stays on your branch.
3. **Never use `git rebase`.** Use `git merge origin/main` to update your branch.
4. **Push rejection recovery:** `git fetch && git merge origin/main` once.
   If rejected again, open a PR — do not loop.
5. **Never run `git reset --hard`, `git checkout -- .`, or `git clean`** on
   shared branches. These destroy uncommitted work in the worktree.
