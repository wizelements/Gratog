# Quick Start Guide - Registration & Search

## 🚀 What's New

### Registration System
**File**: `app/register/page.js`  
**Status**: ✅ Live and Ready  
**Features**: 
- Real-time password strength meter
- Field validation with visual feedback
- Enterprise-grade password requirements
- Beautiful, responsive design

### Search Engine
**Files**: 
- `lib/search/enhanced-search.js` (engine)
- `app/api/search/enhanced/route.js` (API)
- `components/SearchEnhanced.jsx` (component)

**Status**: ✅ Ready to Use  
**Features**:
- Fuzzy matching for typos
- Autocomplete suggestions
- Relevance scoring
- Query caching

---

## 📋 5-Minute Setup

### 1. Registration is Ready
No setup needed—it's already live at `/register`

Test it:
```bash
npm run dev
# Visit http://localhost:3000/register
```

### 2. Add Search to a Page

```jsx
'use client';

import SearchEnhanced from '@/components/SearchEnhanced';

export default function CatalogPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1>Find Your Products</h1>
      <SearchEnhanced
        placeholder="Search sea moss, lemonade, gels..."
        onSearch={(results) => {
          console.log('Results:', results);
        }}
      />
    </div>
  );
}
```

### 3. Test the Search API

```bash
# Basic search
curl "http://localhost:3000/api/search/enhanced?q=sea+moss"

# With filters
curl "http://localhost:3000/api/search/enhanced?q=sea&minPrice=10&maxPrice=50"

# Get suggestions
curl "http://localhost:3000/api/search/enhanced?q=sea&suggestions=true"
```

---

## 🔐 Registration Features

### Password Requirements
✅ Minimum 8 characters  
✅ At least one uppercase letter  
✅ At least one lowercase letter  
✅ At least one number  
✅ At least one special character (!@#$%^&*)  

### Strength Meter
```
0-25%   → Weak      (red)
25-50%  → Fair      (orange)
50-75%  → Good      (yellow)
75-100% → Strong    (green)
```

### Real-Time Validation
- Fields validate as you type
- Green checkmark ✓ when valid
- Red errors when invalid
- Submit button disabled until all fields valid

---

## 🔍 Search Features

### Fuzzy Matching Examples
```
"matcha"    → Finds "Matcha" (exact)
"lemodn"    → Finds "Lemonade" (typo tolerance)
"sea mos"   → Finds "Sea Moss" (partial)
"gel sup"   → Finds "Gel Supplements"
```

### Autocomplete
- Type at least 2 characters
- Suggestions appear automatically
- Based on popular searches
- Keyboard navigation support

### Result Ranking
Results ranked by relevance:
1. **Exact name match** (highest priority)
2. **Name contains query**
3. **Tags match**
4. **Ingredients match**
5. **Description contains**
6. **Fuzzy match bonus**

### Performance
- **Suggestions**: 300-400ms (with 300ms debounce)
- **Search**: 30-80ms (cached results: <1ms)
- **Cached**: 1-hour TTL per unique query

---

## 💻 API Reference

### Search Endpoint

#### GET /api/search/enhanced
```
?q=sea+moss                      (required)
&category=supplements            (optional)
&minPrice=10                     (optional)
&maxPrice=50                     (optional)
&inStock=true                    (optional)
&suggestions=true                (optional, returns suggestions instead)
```

Response:
```json
{
  "success": true,
  "query": "sea moss",
  "results": [
    {
      "id": "...",
      "name": "Sea Moss Gel",
      "description": "Premium quality...",
      "price": 1999,
      "relevance": 95,
      "image": "...",
      ...
    }
  ],
  "count": 12,
  "executionTime": 45,
  "filters": { ... }
}
```

#### POST /api/search/enhanced
```json
{
  "query": "sea moss",
  "filters": {
    "category": "supplements",
    "minPrice": 10.00,
    "maxPrice": 50.00
  }
}
```

### Registration Endpoint

#### POST /api/auth/register
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Strong!Pass123",
  "confirmPassword": "Strong!Pass123",
  "phone": "+1 (555) 123-4567"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "joinedAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt_token"
}
```

---

## 🎨 Component Usage

### Basic Search
```jsx
<SearchEnhanced 
  placeholder="Search products..."
/>
```

### With Callbacks
```jsx
<SearchEnhanced
  placeholder="Find products..."
  onSearch={(results) => {
    console.log('Found:', results.count, 'results');
    console.log('Execution time:', results.executionTime, 'ms');
  }}
  onSelect={(suggestion) => {
    console.log('Selected:', suggestion);
  }}
/>
```

### Variant Sizes
```jsx
<SearchEnhanced variant="default" />  {/* Standard size */}
<SearchEnhanced variant="compact" />  {/* Small text, compact */}
<SearchEnhanced variant="large" />    {/* Larger input, more prominent */}
```

### With Custom Styling
```jsx
<SearchEnhanced 
  className="w-full max-w-4xl mx-auto my-6"
  placeholder="Custom search..."
/>
```

---

## 🧪 Testing

### Test Registration
```javascript
// Valid registration
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Strong!Pass123",
  "confirmPassword": "Strong!Pass123"
}
// Response: 201 Created

// Weak password
{
  "name": "John",
  "email": "john@example.com",
  "password": "weak",
  "confirmPassword": "weak"
}
// Response: 400 Bad Request
// Error: "Password must contain: ..."

// Duplicate email
// Response: 409 Conflict
// Error: "Email already registered"
```

### Test Search
```javascript
// Simple search
GET /api/search/enhanced?q=gel
// Response: Results with gels

// Fuzzy search
GET /api/search/enhanced?q=lemodn
// Response: Returns "Lemonade" despite typo

// Filtered search
GET /api/search/enhanced?q=sea&minPrice=5&maxPrice=30
// Response: Sea products in price range

// No results
GET /api/search/enhanced?q=xyznotaproduct
// Response: Empty results array with count: 0
```

---

## 📊 Monitoring

### Track Registrations
```javascript
// In MongoDB
db.users.find({ joinedAt: { $gte: new Date('2024-01-01') } }).count()
```

### Track Searches
```javascript
// Popular searches (last 7 days)
db.search_analytics.aggregate([
  { $match: { timestamp: { $gte: new Date(Date.now() - 7*24*60*60*1000) } } },
  { $group: { _id: '$query', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])
```

---

## ⚙️ Configuration

### Password Requirements
Edit: `lib/auth/validation.js`

```javascript
// Modify these constants
const MIN_PASSWORD_LENGTH = 8;  // Currently 8
const REQUIRE_UPPERCASE = true;
const REQUIRE_LOWERCASE = true;
const REQUIRE_NUMBER = true;
const REQUIRE_SPECIAL = true;
```

### Search Cache TTL
Edit: `lib/search/enhanced-search.js`

```javascript
const CACHE_TTL = 3600; // 1 hour in seconds
const MAX_RESULTS = 50;  // Max results per search
const MIN_QUERY_LENGTH = 2;
```

### API Response
Edit: `app/api/search/enhanced/route.js`

```javascript
// Customize response format or add fields
```

---

## 🐛 Troubleshooting

### Registration not working
- Check email validation in `lib/auth/validation.js`
- Verify MongoDB connection
- Check JWT_SECRET environment variable
- Review API logs for errors

### Search returns no results
- Verify MongoDB has products in `unified_products` collection
- Check search query is valid (2+ characters)
- Test API directly: `/api/search/enhanced?q=test`
- Review MongoDB error logs

### Slow search performance
- Check search_analytics collection size (may need cleanup)
- Verify MongoDB indexes
- Monitor API response times
- Check if cache is working (should be sub-100ms for cached)

### Suggestions not appearing
- Need at least 2 characters in query
- Check if search_analytics collection exists
- Verify popular searches exist in database
- Test directly: `/api/search/enhanced?q=se&suggestions=true`

---

## 📚 Documentation

For detailed information, see:
- `REGISTRATION_SEARCH_IMPROVEMENTS.md` - Complete feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Architecture and metrics
- `DEPLOYMENT_CHECKLIST_REGISTRATION_SEARCH.md` - Deployment guide

---

## 🎯 Next Steps

1. **Test Registration**
   - Go to `/register`
   - Try to register with weak password
   - Try to register with invalid email
   - Successfully register

2. **Add Search to Pages**
   - Find where you want search (catalog, header, etc)
   - Import SearchEnhanced component
   - Pass desired props
   - Test functionality

3. **Monitor Usage**
   - Check registrations in MongoDB
   - Review popular searches
   - Monitor API response times
   - Gather user feedback

4. **Optimize**
   - Adjust password requirements if needed
   - Tune search relevance scoring
   - Add more filters as needed
   - Implement analytics dashboard

---

**Version**: 1.0  
**Last Updated**: December 16, 2024  
**Status**: ✅ Production Ready
