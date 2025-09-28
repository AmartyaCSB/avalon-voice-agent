# Avalon Game - Complete Demo Test Plan

## 🔧 **Pre-Testing Setup**

### 1. Supabase Database Updates
Run these SQL scripts in Supabase SQL Editor in order:

1. **ENHANCED_SUPABASE_SCHEMA.sql** - Adds game state persistence tables
2. **QUICK_CHAT_FIX.sql** - Fixes chat functionality issues

### 2. Environment Check
- ✅ Vercel deployment: `https://aeonic.earth`
- ✅ Custom domain working
- ✅ Google OAuth configured
- ✅ Supabase connection active

---

## 🎮 **Demo Test Flow**

### **Phase 1: Authentication & Profile Setup**
1. **Visit**: `https://aeonic.earth`
2. **Test Google Sign-in**: Should redirect and create user
3. **Check Supabase**: User should appear in `auth.users` and `public.users`
4. **Create Profile**: Navigate to `/profiles`, create persona
5. **Verify**: Profile saved in `public.player_profiles`

### **Phase 2: Lobby System**
1. **Create Room**: Use "Create Room" button
2. **Verify Room Creation**: Check `public.game_rooms` table
3. **Test Room Code**: Share and join with another user/tab
4. **Test Chat**: Send messages, verify they appear in `public.chat_messages`
5. **Test Chat Real-time**: Messages should appear instantly

### **Phase 3: Game Initialization**
1. **Start Game**: Host clicks "Start Game" (need 5+ players)
2. **Voice Agent**: Should redirect to voice narration
3. **Role Assignment**: Use voice agent to assign roles
4. **Return to Game**: Click "Return to Game" button
5. **Verify Database**: Check `public.role_assignments` table

### **Phase 4: Quest System**
1. **Quest Display**: Should show Quest System with role panel
2. **Role Information**: Verify role panel shows correct abilities
3. **Team Selection**: Leader selects team for quest
4. **Team Voting**: All players vote on team
5. **Mission Execution**: Selected players vote success/fail
6. **Quest Progression**: Verify quest completion tracking

### **Phase 5: End-to-End Verification**
1. **Game State Persistence**: Refresh page, game state should persist
2. **Multiple Quests**: Complete 2-3 quests to test full flow
3. **Win Conditions**: Test good/evil victory scenarios
4. **Chat During Game**: Verify chat works during quest phases

---

## 🐛 **Known Issues to Test**

### Chat Functionality
- [ ] Messages sending properly
- [ ] Messages appearing in real-time
- [ ] User names displaying correctly
- [ ] Message history loading

### Database Persistence
- [ ] Game state saving between page refreshes
- [ ] Role assignments persisting
- [ ] Chat history maintained
- [ ] Room state consistency

### Voice Agent Integration
- [ ] Role assignment working
- [ ] Narration functioning without server
- [ ] Return flow to game working
- [ ] Assignment data passing correctly

---

## 🔍 **Debugging Checklist**

### If Chat Not Working:
1. Check browser console for errors
2. Verify Supabase RLS policies
3. Check `public.chat_messages` table structure
4. Test with Supabase SQL:
   ```sql
   SELECT * FROM public.chat_messages ORDER BY created_at DESC LIMIT 10;
   ```

### If Game State Not Persisting:
1. Verify new tables created: `role_assignments`, `quest_state`, `game_state`
2. Check function exists: `initialize_game_state`
3. Test manual function call in Supabase

### If Authentication Issues:
1. Check Google OAuth redirect URIs
2. Verify Supabase auth settings
3. Test user creation trigger

---

## ✅ **Success Criteria**

A successful demo should demonstrate:

1. **Complete User Flow**: Sign up → Profile → Lobby → Game → Victory
2. **Real-time Multiplayer**: Chat, game state, role reveals
3. **Persistent State**: Game continues after page refresh
4. **Voice Integration**: Seamless role assignment and return
5. **Authentic Avalon**: Proper rules, roles, and win conditions

---

## 🚀 **Next Steps After Demo**

1. **Merlin Assassination**: Add end-game assassination mechanic
2. **Advanced Features**: Spectator mode, reconnection handling
3. **Performance**: Optimize for larger player counts
4. **Mobile**: Responsive design improvements
5. **Analytics**: Game statistics and player history
