# TypeScript Best Practices - Avoiding `any`

## Why `any` is Bad

Using `any` defeats the purpose of TypeScript:

❌ **Loses Type Safety** - No compile-time error checking  
❌ **No IntelliSense** - IDE can't provide autocomplete  
❌ **Runtime Errors** - Bugs only discovered at runtime  
❌ **Hard to Refactor** - Changes break silently  
❌ **Poor Documentation** - Types don't document intent  

## Better Alternatives

### 1. Use `unknown` for Truly Unknown Types

**Bad:**
```typescript
function processData(data: any) {
  return data.value; // No type checking!
}
```

**Good:**
```typescript
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: number }).value; // Type-safe
  }
  throw new Error('Invalid data');
}
```

### 2. Define Proper Interfaces

**Bad:**
```typescript
function mapFill(fill: any): Fill {
  return {
    id: fill.id,
    price: fill.price,
  };
}
```

**Good:**
```typescript
interface PolymarketFill {
  id?: string;
  price?: string | number;
  // ... other fields
}

function mapFill(fill: PolymarketFill): Fill {
  return {
    id: fill.id ?? '',
    price: parseFloat(String(fill.price ?? 0)),
  };
}
```

### 3. Use Type Guards

**Bad:**
```typescript
function isFill(obj: any): boolean {
  return obj && obj.id && obj.price;
}
```

**Good:**
```typescript
function isFill(obj: unknown): obj is PolymarketFill {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('id' in obj || 'fill_id' in obj) &&
    'price' in obj
  );
}
```

### 4. Use Generic Types for Reusable Code

**Bad:**
```typescript
const cache = new LRUCache<string, any>();
```

**Good:**
```typescript
const cache = new LRUCache<string, Market>();
// or
function createCache<T>(): LRUCache<string, T> {
  return new LRUCache<string, T>();
}
```

### 5. Use Type Assertions Sparingly

**Bad:**
```typescript
const data = response.json() as any;
```

**Good:**
```typescript
interface ApiResponse {
  data: Market[];
  error?: string;
}

const data = (await response.json()) as ApiResponse;
```

## When `any` Might Be Acceptable

### 1. External API Payloads (Temporary)

When integrating with external APIs that don't have TypeScript types:

```typescript
// Acceptable: External API we don't control
interface UserSignedOrder {
  order: any; // ClobClient order - structure validated by Polymarket
  // TODO: Define proper ClobOrder type when available
}
```

**Better:** Define the type when possible:
```typescript
interface ClobOrder {
  tokenID: string;
  price: string;
  side: 0 | 1;
  size: string;
  // ... other fields
}
```

### 2. Zod Schema Validation

When using Zod, `z.any()` is acceptable because Zod validates at runtime:

```typescript
const schema = z.object({
  order: z.any(), // Validated by Zod, then typed
});
```

**Better:** Use Zod's type inference:
```typescript
const schema = z.object({
  order: z.object({
    tokenID: z.string(),
    price: z.string(),
  }),
});

type ValidatedOrder = z.infer<typeof schema>;
```

## Current Codebase Improvements

### ✅ Fixed: Cache Service
- **Before:** `LRUCache<string, any>`
- **After:** `LRUCache<string, Market>` (proper types)

### ✅ Fixed: Fill Adapter
- **Before:** `fill: any`, `data: any`
- **After:** `PolymarketFill` interface, proper type assertions

### ✅ Fixed: Error Handling
- **Before:** `error: any`
- **After:** `error: unknown` with type guards

### ⚠️ Acceptable: External API Payloads
- `UserSignedOrder.order: any` - External ClobClient payload
- `z.any()` in Zod schemas - Runtime validation

## Recommendations

1. **Never use `any` in new code** - Always define proper types
2. **Replace `any` gradually** - Fix existing code over time
3. **Use `unknown` for truly unknown types** - Forces type checking
4. **Define interfaces for external APIs** - Even if incomplete
5. **Use type guards** - Safe runtime type checking
6. **Leverage TypeScript's type inference** - Let TS infer when possible

## Tools

- **ESLint rule:** `@typescript-eslint/no-explicit-any` - Warns on `any` usage
- **TypeScript strict mode** - Catches more type errors
- **Type guards** - Runtime type checking
- **Zod/io-ts** - Runtime validation with type inference

