# Frontend Integration Updates Guide

This guide describes the new API endpoints and updates made to the Zealy Alert Bot backend to support the **Blacklist System**, **User Premium Settings**, and **Global Sprint Pool** management.

---

## 1. User Model Schema Updates

The `User` schema has been updated with new fields. The full model structure is now:

```typescript
{
  _id: string;
  name: string;
  username: string;
  telegram_chat_id: string;
  blocked: boolean;      // User alert subscription status
  blacklisted: boolean;  // [NEW] Persistent admin blacklist status
  isAdmin: boolean;      // [NEW] User is administrator
  premium: boolean;      // [NEW] User is premium (unlimited sprints; non-premium capped at 5)
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. API Endpoint Changes & Additions

### A. Repurposed: User Blocking / Blacklisting
To block/blacklist a user from receiving any notifications persistently, use the existing block endpoint. The backend now toggles **both** `blocked` and `blacklisted` fields to prevent users from bypassing the block via the Telegram `/start` command.

* **Endpoint**: `PUT /api/users/:telegram_chat_id/block`
* **Request Body**:
  ```json
  {
    "blocked": true
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "User blocked successfully",
    "data": {
      "telegram_chat_id": "123456789",
      "blocked": true,
      "blacklisted": true
    }
  }
  ```

---

### B. NEW: Toggle User Premium Status
Sets a user's premium status. Premium users can monitor unlimited personal sprints, while non-premium users are restricted to a maximum of 5.

* **Endpoint**: `PUT /api/users/:telegram_chat_id/premium`
* **Method**: `PUT`
* **Request Body**:
  ```json
  {
    "premium": true
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "User premium status updated to true",
    "data": {
      "telegram_chat_id": "123456789",
      "premium": true
    }
  }
  ```

---

### C. NEW: Get All Global Sprints
Lists all sprints currently registered in the Global Sprint Pool. Sprints in this pool trigger notifications to **all** active users.

* **Endpoint**: `GET /api/admin/global-sprints`
* **Method**: `GET`
* **Response**:
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "_id": "...",
        "url": "https://zealy.io/cw/global-sprint/questboard",
        "title": "Global Sprint Title",
        "isGlobal": true,
        "userIds": []
      }
    ]
  }
  ```

---

### D. NEW: Add/Promote a Sprint to Global Pool
Adds a new sprint URL directly to the global pool, or flags an existing personal sprint as global.

* **Endpoint**: `POST /api/admin/global-sprints`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "url": "https://zealy.io/cw/sprint-slug/questboard"
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "Sprint successfully added/updated in global pool",
    "data": {
      "url": "https://zealy.io/cw/sprint-slug/questboard",
      "title": "Sprint Title",
      "isGlobal": true
    }
  }
  ```

---

### E. NEW: Remove a Sprint from Global Pool
Removes the `isGlobal` flag from a sprint. If no individual users are monitoring this sprint (i.e. `userIds` is empty), the sprint is deleted completely from the scraper.

* **Endpoint**: `DELETE /api/admin/global-sprints`
* **Method**: `DELETE`
* **Request Body / Query Parameters**:
  ```json
  {
    "url": "https://zealy.io/cw/sprint-slug/questboard"
  }
  ```
* **Response**:
  ```json
  {
    "success": true,
    "message": "Sprint removed from global pool, remains monitored by users"
  }
  ```

---

## 3. Integration Examples

### Toggling Premium Status in React
```javascript
async function toggleUserPremium(telegramChatId, premium) {
  const res = await fetch(`https://zealy-quest-alert-bot.onrender.com/api/users/${telegramChatId}/premium`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ premium })
  });
  
  const data = await res.json();
  if (data.success) {
    console.log(`Premium updated: ${data.data.premium}`);
  }
}
```

### Adding a Global Sprint in React
```javascript
async function addGlobalSprint(url) {
  const res = await fetch(`https://zealy-quest-alert-bot.onrender.com/api/admin/global-sprints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  
  const data = await res.json();
  if (data.success) {
    console.log(`Added global sprint: ${data.data.title}`);
  } else {
    alert(`Error: ${data.error}`);
  }
}
```
