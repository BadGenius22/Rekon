# Order Types & Time-In-Force Reference

## Order Types

### Market Order

- Executes immediately at the best available price
- No price guarantee - fills at current market price
- Best for: Quick execution when price is less important than speed

### Limit Order

- Executes only at specified price or better
- Can remain in order book if price not reached
- Best for: Price control, willing to wait for execution

### Stop-Loss Order

- Triggers when price reaches specified level
- Converts to market/limit order after trigger
- Best for: Risk management, limiting losses

### Take-Profit Order

- Triggers when price reaches profit target
- Converts to market/limit order after trigger
- Best for: Locking in profits automatically

### Trailing Order

- Follows price movement with offset
- Adjusts trigger price as market moves favorably
- Best for: Capturing trends while protecting profits

### Iceberg Order

- Large order split into smaller visible portions
- Only shows visible size in order book
- Best for: Large orders without market impact

## Time-In-Force Options

### GTC (Good Till Cancel)

- Order remains active until filled or manually cancelled
- Stays in order book indefinitely
- **Use when**: You want to wait for your price, no urgency

### IOC (Immediate Or Cancel)

- Fills immediately at best available prices
- Cancels any unfilled portion immediately
- Partial fills are allowed
- **Use when**: You want immediate execution, partial fills acceptable

### FOK (Fill Or Kill)

- Must fill completely or cancel entirely
- No partial fills allowed
- All-or-nothing execution
- **Use when**: You need complete execution or nothing

### FAK (Fill And Kill)

- Fills as much as possible at best available prices
- Cancels any remaining unfilled portion immediately
- Partial fills are allowed (same as IOC)
- **Use when**: You want immediate execution, partial fills acceptable
- **Note**: Functionally equivalent to IOC in most systems

### GTD (Good Till Date)

- Order remains active until specified expiration date/time
- Automatically cancels after expiration
- Requires `expireTime` field to be set
- **Use when**: You want time-limited orders

## Comparison Table

| Time-In-Force | Partial Fills | Remains in Book | Auto-Cancel  |
| ------------- | ------------- | --------------- | ------------ |
| GTC           | ✅ Yes        | ✅ Yes          | ❌ No        |
| IOC           | ✅ Yes        | ❌ No           | ✅ Immediate |
| FOK           | ❌ No         | ❌ No           | ✅ Immediate |
| FAK           | ✅ Yes        | ❌ No           | ✅ Immediate |
| GTD           | ✅ Yes        | ✅ Yes          | ✅ At expiry |

## Common Use Cases

### Quick Market Entry

```typescript
{
  type: "market",
  timeInForce: "FAK", // or "IOC"
  amount: 100
}
```

### Price-Controlled Entry

```typescript
{
  type: "limit",
  price: 0.50,
  timeInForce: "GTC",
  amount: 100
}
```

### All-or-Nothing Execution

```typescript
{
  type: "limit",
  price: 0.50,
  timeInForce: "FOK",
  amount: 100
}
```

### Time-Limited Order

```typescript
{
  type: "limit",
  price: 0.50,
  timeInForce: "GTD",
  expireTime: "2024-12-31T23:59:59Z",
  amount: 100
}
```
