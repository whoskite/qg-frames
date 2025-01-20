# Daily Login Feature Improvements

## Current System
The current daily login system provides basic login tracking functionality for users.

## Focused Improvements

### 1. Login Streak System
- Implement strict 24-hour login rule:
  - Users must login within 24 hours of their last login to maintain streak
  - Multiple logins within 24 hours count as single login
  - Streak resets if login occurs after 24-hour window
  - No grace period (strict enforcement)
- Streak Calculation Rules:
  - Streak increments only after 24 hours from last login
  - Early logins (before 24 hours) are recorded but don't increment streak
  - Late logins (after 24 hours) reset streak to 1
  - System tracks next eligible login time
- Time Window Management:
  - Track last login timestamp precisely
  - Calculate next eligible login time (last_login + 24 hours)
  - Store deadline for maintaining streak (last_login + 24 hours)

### 2. Analytics Dashboard
- Personal login statistics visualization:
  - Interactive graph showing login patterns
  - Daily/weekly/monthly view options
  - Streak history timeline
  - Login time distribution chart
- Key metrics display:
  - Current streak
  - Longest streak achieved
  - Total days logged in
  - Average login frequency
  - Login consistency score

### 3. Technical Improvements
- Optimize database queries for login tracking
- Implement caching for frequently accessed login data
- Add comprehensive logging for login statistics
- Implement automated testing for streak calculations
- Handle edge cases (server downtime, timezone changes)

### 4. Database Schema Updates
```sql
-- Main table for tracking user login statistics
CREATE TABLE user_login_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_login_timestamp TIMESTAMP WITH TIME ZONE,    -- Precise login time
    next_eligible_login TIMESTAMP WITH TIME ZONE,     -- When next login can increment streak
    streak_deadline TIMESTAMP WITH TIME ZONE,         -- When streak will reset if no login
    user_timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    total_logins INTEGER DEFAULT 0,
    first_login_date TIMESTAMP WITH TIME ZONE,
    wallet_address VARCHAR(42),
    wallet_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_streaks CHECK (current_streak >= 0 AND longest_streak >= 0),
    CONSTRAINT positive_logins CHECK (total_logins >= 0),
    CONSTRAINT valid_eth_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Detailed login history for analytics
CREATE TABLE login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    login_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    streak_at_login INTEGER NOT NULL,              -- Streak at time of login
    streak_incremented BOOLEAN NOT NULL,           -- Whether this login incremented streak
    hours_since_last_login FLOAT,                 -- Hours elapsed since last login
    login_source VARCHAR(50),
    ip_address VARCHAR(45),
    wallet_address VARCHAR(42),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT valid_streak CHECK (streak_at_login >= 0)
);

-- New table for wallet address history
CREATE TABLE wallet_address_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT valid_eth_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Index definitions for performance
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_timestamp ON login_history(login_timestamp);
CREATE INDEX idx_login_tracking_deadline ON user_login_tracking(streak_deadline);
CREATE INDEX idx_wallet_history_user_id ON wallet_address_history(user_id);
CREATE INDEX idx_wallet_history_address ON wallet_address_history(wallet_address);
```

Key improvements in this schema:
1. Added constraints to ensure data integrity
2. Added indexes for common query patterns
3. Added foreign key constraint to users table
4. Added fields for security and analytics
5. Added NOT NULL constraints where appropriate
6. Added CHECK constraints for positive numbers
7. Added UNIQUE constraint for user_id in tracking table
8. Added wallet address tracking and validation
9. Added historical wallet address tracking

### 5. API Endpoints
Core endpoints to be implemented:
- `GET /api/streak/status` - Get current streak info and next eligible login time
- `GET /api/streak/history` - Get login history
- `GET /api/streak/next-window` - Get next eligible login window
- `GET /api/analytics/login-patterns` - Get login pattern data
- `GET /api/analytics/streak-history` - Get historical streak data
- `GET /api/wallet/current` - Get user's current wallet address
- `POST /api/wallet/update` - Update user's wallet address
- `GET /api/wallet/history` - Get wallet address history

### 6. Security Considerations
- Implement rate limiting for login tracking
- Add validation for timezone manipulation
- Add audit logging for streak calculations
- Secure storage of timezone data
- Validate wallet address format and ownership
- Implement wallet address change cooldown period
- Log all wallet address changes
- Implement wallet address verification process

### 7. Streak Logic Pseudocode
```python
def handle_login(user_id, login_timestamp):
    user = get_user_tracking(user_id)
    
    if not user.last_login_timestamp:
        # First login ever
        initialize_streak(user, login_timestamp)
        return
    
    hours_since_last_login = calculate_hours_between(
        user.last_login_timestamp, 
        login_timestamp
    )
    
    if login_timestamp < user.next_eligible_login:
        # Too early - login recorded but streak not incremented
        record_login(user, login_timestamp, increment_streak=False)
        return
    
    if login_timestamp > user.streak_deadline:
        # Too late - streak resets
        reset_streak(user, login_timestamp)
        return
    
    # Perfect window - increment streak
    increment_streak(user, login_timestamp)
    
def initialize_streak(user, timestamp):
    user.current_streak = 1
    user.last_login_timestamp = timestamp
    user.next_eligible_login = timestamp + timedelta(hours=24)
    user.streak_deadline = timestamp + timedelta(hours=24)
    
def increment_streak(user, timestamp):
    user.current_streak += 1
    user.longest_streak = max(user.current_streak, user.longest_streak)
    update_login_windows(user, timestamp)
    
def reset_streak(user, timestamp):
    user.current_streak = 1
    update_login_windows(user, timestamp)
    
def update_login_windows(user, timestamp):
    user.last_login_timestamp = timestamp
    user.next_eligible_login = timestamp + timedelta(hours=24)
    user.streak_deadline = timestamp + timedelta(hours=24)
```

## Implementation Phases

### Phase 1: Core Streak System (2-3 weeks)
- Implement timezone-aware streak tracking
- Database schema updates
- Core streak calculation logic
- Basic API endpoints

### Phase 2: Analytics System (2-3 weeks)
- Data aggregation for analytics
- Graph visualization implementation
- Analytics API endpoints
- Frontend dashboard components

### Phase 3: Testing & Optimization (1-2 weeks)
- Performance improvements
- Edge case handling
- Comprehensive testing
- Security enhancements

Total estimated time: 5-8 weeks

## Technical Requirements
- Database migrations for new schema
- API endpoint implementation
- Frontend analytics dashboard
- Timezone handling library integration
- Testing suite updates

## Success Metrics
- Accurate streak tracking across timezones
- Improved user engagement
- Dashboard usage statistics
- System performance metrics

## Risks and Mitigation
1. Data Migration
   - Backup existing login data
   - Run migration in staging first
   - Plan for rollback if needed

2. Timezone Edge Cases
   - Comprehensive testing across timezone boundaries
   - Handle daylight savings transitions
   - Clear documentation of timezone rules

3. Performance
   - Implement efficient data aggregation
   - Cache frequently accessed data
   - Monitor system load

## Next Steps
1. Review and approve focused improvements
2. Begin implementation of timezone-aware streak system
3. Design analytics dashboard wireframes
4. Start database migration planning