# user_locations Table - ACTUAL Usage

## ✅ WHERE geohash_lvl2 and geohash_lvl3 ARE USED:

### 1. NearbyService.getNearbyUsers() 
**File**: `src/modules/nearby/NearbyService.ts` (line 155-158)
```typescript
.from('user_locations')
.select('user_id, last_active, geohash_lvl2, geohash_lvl3')
.or(`geohash_lvl2.eq.${geohashes.lvl2},geohash_lvl3.eq.${geohashes.lvl3}`)
```
**Purpose**: Finds nearby users for the "Nearby" screen
**Used by**: NearbyScreen component (accessed via navigation)

### 2. NearbyService.updateUserLocation()
**File**: `src/modules/nearby/NearbyService.ts` (line 115-116)
```typescript
.upsert({
  user_id: userId,
  geohash_lvl2: geohashes.lvl2,
  geohash_lvl3: geohashes.lvl3,
  last_active: new Date().toISOString(),
})
```
**Purpose**: Stores user's geohash when location is updated
**Used by**: NearbyScreen when user enables "nearby discovery"

---

## ❌ WHERE geohash_lvl2 and geohash_lvl3 are NOT USED:

### 1. Text Whisprs (LiveWhisprsScreen)
- **NO LONGER USES geohash**
- Now uses country-based filtering (Regional/Global)
- Does NOT query user_locations table

### 2. Audio Whisprs (liveWhispersService)
- Uses geohash BUT stores it in `whisprs` table (not user_locations)
- Does NOT query user_locations table

---

## 📊 SUMMARY:

**user_locations table is ONLY used for:**
- NearbyScreen feature (finding nearby users)

**What it stores:**
- `user_id` (primary key)
- `geohash_lvl2` (for nearby user discovery)
- `geohash_lvl3` (for nearby user discovery)
- `last_active` (activity tracking)
- `geo_bucket` (old, can be removed)

**What it does NOT store:**
- `latitude` / `longitude` (not needed - geohash calculated client-side)

---

## ✅ MIGRATION NEEDED:

1. Add `geohash_lvl2` and `geohash_lvl3` columns
2. Remove `geo_bucket` column
3. Create indexes on geohash columns

**That's it!** Simple and focused.

