# Best Practice Analysis: Component Reset on Prop Change

## Current Approach

```tsx
useEffect(() => {
  reset();
  setHasCheckedAccess(false);
  setHasCheckedAvailability(false);
  setHasFetchedPreview(false);
}, [marketId, reset]);
```

## ✅ Best Practice: Use `key` Prop

**The React way to handle "reset everything when X changes" is using a `key` prop.**

### Why `key` is Best Practice:

1. **Idiomatic React** - This is the intended use case for `key`
2. **Automatic cleanup** - React handles unmount/remount automatically
3. **No manual state management** - All state (component + hooks) resets naturally
4. **No dependency array issues** - No need to track dependencies
5. **Simpler code** - Less code, less complexity

### Implementation:

```tsx
// In parent component
<RecommendationCard
  key={marketId}  // ← Add this
  marketId={marketId}
  team1Name={team1Name}
  team2Name={team2Name}
/>
```

### What Happens:

- When `marketId` changes, React sees different `key`
- React unmounts the old component instance
- React mounts a new component instance
- All state is fresh (component state + hook state)
- No need for manual reset logic

### Trade-offs:

**Pros:**
- ✅ Simplest solution
- ✅ No dependency array issues
- ✅ Guaranteed clean state
- ✅ React handles everything

**Cons:**
- ⚠️ Component remounts (loses any animations in progress)
- ⚠️ Hook re-initializes (but that's what we want)

## Alternative: Current useEffect Approach

### When to Use:

- When you need to preserve some state across market changes
- When remounting is expensive (rare)
- When you need fine-grained control over what resets

### Issues with Current Approach:

1. **Dependency array stability** - `reset` must be stable
2. **Manual state management** - Easy to forget to reset something
3. **More code** - More to maintain
4. **Potential bugs** - If `reset` isn't stable, you get errors

## Recommendation

**Use `key` prop** - It's the React best practice for this use case.

The current `useEffect` approach works, but:
- It's more complex
- It's more error-prone
- It's not the idiomatic React solution

## Implementation Steps

1. Add `key={marketId}` to parent component
2. Remove the reset `useEffect` (or keep it as a safety net)
3. Component will automatically reset on market change

