# Git Strategy - Quick Reference

---

## 1. Branch Flow

```
feature/* → develop → release/* → main
hotfix/* → main → develop
```

---

## 2. Branch Types

| Type | Naming | Lifecycle |
|:-----|:-------|:----------|
| Feature | `feature/description` | 1-7 days |
| Bugfix | `bugfix/description` | 1-3 days |
| Release | `release/v1.0.0` | 1-2 days |
| Hotfix | `hotfix/v1.0.1-description` | 1-6 hours |

**Permanent:** `main` (production) + `develop` (integration)

---

## 3. Commit Format

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

**Scopes:** `auth`, `job`, `search`, `app`, `profile`, `notif`, `ai`, `web`, `mobile`, `gateway`, `shared`, `infra`

**Good:** `feat(auth): add JWT refresh`
**Bad:** `updated code`

---

## 4. PR Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code builds successfully
- [ ] All tests pass
- [ ] No merge conflicts
- [ ] Documentation updated

## Related Issues
Closes #[issue-number]
```

---

## 5. Release Steps

```bash
# 1. Create release branch
git checkout develop && git pull
git checkout -b release/v1.0.0

# 2. Update version files (CHANGELOG.md, version files)
git add .
git commit -m "chore(release): prepare v1.0.0"
git push origin release/v1.0.0

# 3. PR to main via GitHub UI

# 4. After approval, merge to main
git checkout main && git pull
git merge --no-ff release/v1.0.0
git push origin main

# 5. Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 6. Merge back to develop
git checkout develop && git pull
git merge --no-ff release/v1.0.0
git push origin develop

# 7. Delete branch
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

**Versions:** v0.1.0 (Week 4), v0.2.0 (Week 8), v0.3.0 (Week 13), v0.9.0 (Week 14), v1.0.0 (Week 16)

---

## 6. Hotfix Steps

```bash
# 1. Create from main
git checkout main && git pull
git checkout -b hotfix/v1.0.1-security

# 2. Fix and commit
git add .
git commit -m "fix(security): patch vulnerability"
git push origin hotfix/v1.0.1-security

# 3. PR to main via GitHub UI

# 4. After approval, merge to main
git checkout main && git pull
git merge --no-ff hotfix/v1.0.1-security
git push origin main

# 5. Merge back to develop
git checkout develop && git pull
git merge --no-ff hotfix/v1.0.1-security
git push origin develop
```

---

## 7. Conflict Resolution

**Rebase (preferred):**
```bash
git checkout feature/your-branch
git fetch origin
git rebase develop

# Resolve conflicts
git add <resolved-files>
git rebase --continue
git push --force-with-lease
```

**Merge (alternative):**
```bash
git checkout feature/your-branch
git merge develop

# Resolve conflicts once
git add <resolved-files>
git commit -m "merge: merge develop"
git push origin feature/your-branch
```

---

## 8. Emergency Commands

| Situation | Command |
|:----------|:---------|
| Undo last commit (keep changes) | `git reset --soft HEAD~1` |
| Undo last commit (discard changes) | `git reset --hard HEAD~1` |
| Discard file changes | `git checkout -- <file>` |
| Unstage file | `git reset HEAD <file>` |

---