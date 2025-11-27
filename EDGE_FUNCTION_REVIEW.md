# Edge Function Review: `send-fcm-notification-v1`

## 📋 Executive Summary

**Overall Assessment**: ✅ **Good** - The code is well-structured with solid error handling, but there are several improvements needed for production readiness.

**Critical Issues**: 2  
**High Priority**: 3  
**Medium Priority**: 4  
**Low Priority**: 2

---

## 🔴 Critical Issues

### 1. **Security: Sensitive Data Logging**
**Location**: Lines 17, 51-54, 61, 210

**Issue**: The current implementation logs sensitive data:
- Full request body (line 17) - may contain tokens/secrets
- Service account key (truncated but still risky)
- Full FCM message payload (line 210)

**Your Code**: ✅ **FIXED** - Only logs keys, not full body
```typescript
console.log("🔥 Request body keys:", Object.keys(body || {}));
```

**Recommendation**: ✅ **Keep your approach** - This is much safer.

---

### 2. **FCM API Compliance: Priority Field**
**Location**: Line 173

**Issue**: `priority: "HIGH"` should be lowercase `"high"` for FCM v1 API.

**Current Code**:
```typescript
android: {
  priority: "HIGH", // ❌ Should be lowercase
```

**Your Code**: ✅ **FIXED**
```typescript
android: {
  priority: "high", // ✅ Correct
```

**FCM v1 API Spec**: Priority must be `"normal"` or `"high"` (lowercase strings).

---

## 🟠 High Priority Issues

### 3. **Missing Buddy Name Resolution**
**Location**: Lines 155-157

**Issue**: Current code doesn't resolve buddy name from Supabase if not provided.

**Your Code**: ✅ **IMPROVED** - Robust buddy name resolution:
```typescript
// Extract from data first
let buddyName = extractBuddyNameFromData(data);

// Fallback to Supabase lookup
if (!buddyName) {
  const resolveId = data?.buddyId ?? data?.senderId ?? data?.userId ?? null;
  if (resolveId) {
    buddyName = await resolveBuddyNameFromSupabase(resolveId);
  }
}
```

**Recommendation**: ✅ **Adopt your approach** - Much more robust.

---

### 4. **Online Check Threshold Too Strict**
**Location**: Line 104

**Issue**: `RECENT_SECONDS = 60` may be too strict, causing missed notifications.

**Your Code**: ✅ **IMPROVED**
```typescript
const RECENT_SECONDS = 120; // slightly forgiving threshold
```

**Recommendation**: ✅ **Use 120 seconds** - Better balance between avoiding spam and ensuring delivery.

---

### 5. **Missing Collapse Key**
**Location**: FCM message structure

**Issue**: Without `collapse_key`, multiple notifications for the same buddy won't collapse.

**Your Code**: ✅ **ADDED**
```typescript
android: {
  collapse_key: payloadData.buddyId || "messages",
  // ...
},
apns: {
  headers: {
    "apns-collapse-id": payloadData.buddyId ?? "messages",
  },
}
```

**Recommendation**: ✅ **Critical for notification grouping** - Prevents notification spam.

---

## 🟡 Medium Priority Issues

### 6. **Base64 Encoding Not Binary-Safe**
**Location**: Line 310-312

**Issue**: Current `base64UrlEncode` uses `btoa()` which can fail with non-ASCII characters.

**Your Code**: ✅ **IMPROVED** - Binary-safe implementation:
```typescript
function base64UrlEncodeFromBuffer(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
```

**Recommendation**: ✅ **Use binary-safe version** - More robust for edge cases.

---

### 7. **TTL Too Short**
**Location**: Line 174

**Issue**: `ttl: "120s"` may be too short for devices in deep Doze mode.

**Your Code**: ✅ **IMPROVED**
```typescript
ttl: "3600s", // 1 hour - gives device time to wake from Doze
```

**Recommendation**: ✅ **Use 3600s** - Better for reliability, especially after long idle periods.

---

### 8. **Error Handling in Online Check**
**Location**: Lines 132-134

**Issue**: Error handling could be more specific.

**Your Code**: ✅ **IMPROVED**
```typescript
} catch (err) {
  console.warn("⚠️ Error checking online status; proceeding with FCM:", String(err));
}
```

**Recommendation**: ✅ **Use `String(err)`** - Prevents logging object references.

---

### 9. **Missing Validation for Service Account**
**Location**: Line 52

**Issue**: Should validate service account structure before parsing.

**Your Code**: ✅ **IMPROVED**
```typescript
serviceAccount = JSON.parse(serviceAccountKey);
if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
  throw new Error("Service account missing client_email or private_key");
}
```

**Recommendation**: ✅ **Add validation** - Fails fast with clear error.

---

## 🟢 Low Priority / Suggestions

### 10. **Logging Improvements**
**Your Code**: ✅ **Better** - More structured logging with emojis for quick scanning.

**Recommendation**: Consider adding request ID for tracing across logs.

---

### 11. **Type Safety**
**Issue**: Using `any` for serviceAccount and other types.

**Recommendation**: Define interfaces:
```typescript
interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface FCMRequestBody {
  to: string;
  notification?: { title?: string; body?: string };
  data?: Record<string, unknown>;
  checkOnlineStatus?: boolean;
  forceSend?: boolean;
}
```

---

## ✅ What Your Code Does Well

1. **Security**: ✅ No sensitive data in logs
2. **Error Handling**: ✅ Comprehensive try-catch blocks
3. **Buddy Name Resolution**: ✅ Robust fallback chain
4. **FCM Compliance**: ✅ Correct priority format, collapse keys
5. **Code Organization**: ✅ Clear separation of concerns
6. **Documentation**: ✅ Good inline comments

---

## 📝 Recommended Changes Summary

### Must Fix (Before Production):
1. ✅ Use your logging approach (keys only, not full body)
2. ✅ Fix priority to lowercase `"high"`
3. ✅ Add collapse_key for notification grouping
4. ✅ Increase TTL to 3600s
5. ✅ Add buddy name resolution from Supabase

### Should Fix (High Priority):
6. ✅ Use binary-safe base64 encoding
7. ✅ Increase online check threshold to 120s
8. ✅ Add service account validation

### Nice to Have:
9. Add TypeScript interfaces for type safety
10. Add request ID for log tracing
11. Consider rate limiting for FCM calls

---

## 🔄 Migration Checklist

When updating the Edge Function:

- [ ] Replace logging to use keys only
- [ ] Fix `priority: "HIGH"` → `priority: "high"`
- [ ] Add `collapse_key` to Android payload
- [ ] Add `apns-collapse-id` to iOS headers
- [ ] Increase TTL from 120s to 3600s
- [ ] Add buddy name resolution logic
- [ ] Use binary-safe base64 encoding
- [ ] Increase online check threshold to 120s
- [ ] Add service account validation
- [ ] Test with real FCM tokens
- [ ] Verify notification grouping works
- [ ] Test after 24h idle period

---

## 🎯 Final Verdict

**Your code is significantly better** than the current implementation in:
- Security (no sensitive logging)
- Robustness (buddy name resolution)
- FCM compliance (correct API usage)
- Reliability (better TTL, collapse keys)

**Recommendation**: ✅ **Adopt your version** with the minor suggestions above.



