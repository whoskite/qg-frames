import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, User, Star, MessageSquare, Heart, ChevronLeft, ChevronRight, Search, RefreshCw, Users, Award } from 'lucide-react';
import type { FrameContext } from "@farcaster/frame-core";
import { getAllLeaderboardUsers, getUserLeaderboardData, initializeUserInLeaderboard, type LeaderboardUser } from '../services/leaderboardService';

type UserRanking = LeaderboardUser;
type SortField = 'score' | 'quoteCount' | 'likeCount' | 'shareCount' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

interface LeaderboardProps {
  context?: FrameContext;
}

interface LeaderboardStats {
  totalUsers: number;
  totalQuotes: number;
  totalLikes: number;
  totalShares: number;
  averageScore: number;
  topScore: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ context }) => {
  const [allUsers, setAllUsers] = useState<UserRanking[]>([]);
  const [displayUsers, setDisplayUsers] = useState<UserRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<UserRanking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [usingMockData, setUsingMockData] = useState(false);
  const [stats, setStats] = useState<LeaderboardStats>({
    totalUsers: 0,
    totalQuotes: 0,
    totalLikes: 0,
    totalShares: 0,
    averageScore: 0,
    topScore: 0
  });
  const usersPerPage = 10;

  // Function to handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Function to handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Function to toggle stats view
  const toggleStats = () => {
    setShowStats(!showStats);
  };

  // Function to handle sorting
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Calculate statistics from all users
  const calculateStats = (users: UserRanking[]) => {
    if (users.length === 0) return;
    
    const totalUsers = users.length;
    const totalQuotes = users.reduce((sum, user) => sum + (user.quoteCount || 0), 0);
    const totalLikes = users.reduce((sum, user) => sum + (user.likeCount || 0), 0);
    const totalShares = users.reduce((sum, user) => sum + (user.shareCount || 0), 0);
    const totalScore = users.reduce((sum, user) => sum + user.score, 0);
    const averageScore = Math.round(totalScore / totalUsers);
    const topScore = users.length > 0 ? users[0].score : 0;
    
    setStats({
      totalUsers,
      totalQuotes,
      totalLikes,
      totalShares,
      averageScore,
      topScore
    });
  };

  // Function to refresh leaderboard data
  const refreshLeaderboard = async () => {
    setIsRefreshing(true);
    setUsingMockData(false);
    
    try {
      const leaderboardUsers = await getAllLeaderboardUsers();
      
      // Check if we're using mock data by looking at the first user's FID
      // Mock data starts with FID 1, 2, 3, etc.
      if (leaderboardUsers.length > 0 && leaderboardUsers[0].fid <= 10 && 
          leaderboardUsers[0].username === "quotelover") {
        setUsingMockData(true);
        console.log("Using mock leaderboard data due to Firebase permission issues");
      }
      
      setAllUsers(leaderboardUsers);
      calculateStats(leaderboardUsers);
      
      // Update current user rank if needed
      if (context?.user?.fid) {
        const currentFid = context.user.fid;
        const currentUser = leaderboardUsers.find(user => user.fid === currentFid);
        
        if (currentUser) {
          setCurrentUserRank(currentUser);
        } else if (currentUserRank) {
          // Recalculate rank based on new data
          const rank = leaderboardUsers.filter(user => user.score > currentUserRank.score).length + 1;
          setCurrentUserRank({
            ...currentUserRank,
            rank
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing leaderboard:", error);
      setUsingMockData(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort users based on current sort field and direction
  const sortUsers = (users: UserRanking[]): UserRanking[] => {
    return [...users].sort((a, b) => {
      let comparison = 0;
      
      // Handle different sort fields
      switch (sortField) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'quoteCount':
          comparison = (a.quoteCount || 0) - (b.quoteCount || 0);
          break;
        case 'likeCount':
          comparison = (a.likeCount || 0) - (b.likeCount || 0);
          break;
        case 'shareCount':
          comparison = (a.shareCount || 0) - (b.shareCount || 0);
          break;
        case 'lastUpdated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        default:
          comparison = a.score - b.score;
      }
      
      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Filter and paginate users
  useEffect(() => {
    if (allUsers.length > 0) {
      // Filter users based on search query
      const filteredUsers = searchQuery 
        ? allUsers.filter(user => 
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allUsers;
      
      // Sort users
      const sortedUsers = sortUsers(filteredUsers);
      
      // Update ranks based on sorted order if sorting by score
      if (sortField === 'score' && sortDirection === 'desc') {
        sortedUsers.forEach((user, index) => {
          user.rank = index + 1;
        });
      }
      
      // Calculate total pages
      const pages = Math.ceil(sortedUsers.length / usersPerPage);
      setTotalPages(pages);
      
      // Get users for current page
      const startIndex = (currentPage - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      setDisplayUsers(sortedUsers.slice(startIndex, endIndex));
    }
  }, [allUsers, currentPage, searchQuery, sortField, sortDirection]);

  useEffect(() => {
    // Function to fetch user data from Farcaster and calculate rankings
    const fetchUserRankings = async () => {
      setIsLoading(true);
      setUsingMockData(false);
      
      try {
        // Get all users from leaderboard service
        const leaderboardUsers = await getAllLeaderboardUsers();
        
        // Check if we're using mock data by looking at the first user's FID
        // Mock data starts with FID 1, 2, 3, etc.
        if (leaderboardUsers.length > 0 && leaderboardUsers[0].fid <= 10 && 
            leaderboardUsers[0].username === "quotelover") {
          setUsingMockData(true);
          console.log("Using mock leaderboard data due to Firebase permission issues");
        }
        
        setAllUsers(leaderboardUsers);
        calculateStats(leaderboardUsers);
        
        // If we have a current user from context, find their rank or initialize them
        if (context?.user?.fid) {
          const currentFid = context.user.fid;
          
          // Check if user is already in the leaderboard users
          const currentUser = leaderboardUsers.find(user => user.fid === currentFid);
          
          if (currentUser) {
            setCurrentUserRank(currentUser);
          } else {
            try {
              // Get user data from leaderboard or initialize if not exists
              let userData = await getUserLeaderboardData(currentFid);
              
              if (!userData) {
                try {
                  // Initialize user in leaderboard
                  await initializeUserInLeaderboard(
                    currentFid,
                    context.user.username || `user${currentFid}`,
                    context.user.displayName || `User ${currentFid}`,
                    context.user.pfpUrl || null
                  );
                  
                  // Fetch the newly created user data
                  userData = await getUserLeaderboardData(currentFid);
                } catch (initError) {
                  console.error("Error initializing user:", initError);
                }
              }
              
              if (userData) {
                // Calculate rank based on score
                const rank = leaderboardUsers.filter(user => user.score > userData.score).length + 1;
                setCurrentUserRank({
                  ...userData,
                  rank
                });
              }
            } catch (userDataError) {
              console.error("Error getting user data:", userDataError);
            }
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching user rankings:", error);
        setIsLoading(false);
        setUsingMockData(true);
      }
    };

    fetchUserRankings();
  }, [context?.user?.fid, context?.user?.username, context?.user?.displayName, context?.user?.pfpUrl]);

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bottom-16 bg-black z-40">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-white/10">
          <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
          <h2 className="text-xl font-semibold text-white">Leaderboard</h2>
          <div className="ml-auto flex items-center space-x-2">
            <button 
              onClick={toggleStats}
              className="p-2 rounded-full text-white hover:bg-white/10"
              title="View Statistics"
            >
              <Award className="w-5 h-5" />
            </button>
            <button 
              onClick={refreshLeaderboard}
              disabled={isRefreshing}
              className={`p-2 rounded-full text-white hover:bg-white/10 ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Leaderboard"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="flex items-center bg-white/10 rounded-full px-3 py-1">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearch}
                className="bg-transparent text-white text-sm outline-none w-32"
              />
            </div>
          </div>
        </div>

        {/* Mock Data Warning */}
        {usingMockData && (
          <div className="bg-yellow-900/50 p-2 text-center border-b border-yellow-700">
            <p className="text-yellow-300 text-xs">
              Using demo data. Firebase permissions are required to access real leaderboard data.
            </p>
          </div>
        )}

        {/* Statistics Panel (conditionally rendered) */}
        {showStats && (
          <div className="bg-white/5 p-4 border-b border-white/10">
            <h3 className="text-sm font-medium text-white mb-3">Community Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <Users className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-xs text-gray-300">Total Users</span>
                </div>
                <div className="text-white font-bold text-lg">{stats.totalUsers.toLocaleString()}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <Star className="w-4 h-4 text-purple-400 mr-2" />
                  <span className="text-xs text-gray-300">Total Quotes</span>
                </div>
                <div className="text-white font-bold text-lg">{stats.totalQuotes.toLocaleString()}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <Heart className="w-4 h-4 text-red-400 mr-2" />
                  <span className="text-xs text-gray-300">Total Likes</span>
                </div>
                <div className="text-white font-bold text-lg">{stats.totalLikes.toLocaleString()}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <MessageSquare className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-xs text-gray-300">Total Shares</span>
                </div>
                <div className="text-white font-bold text-lg">{stats.totalShares.toLocaleString()}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <Award className="w-4 h-4 text-yellow-400 mr-2" />
                  <span className="text-xs text-gray-300">Top Score</span>
                </div>
                <div className="text-white font-bold text-lg">{stats.topScore.toLocaleString()}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center mb-1">
                  <Trophy className="w-4 h-4 text-yellow-500 mr-2" />
                  <span className="text-xs text-gray-300">Average Score</span>
                </div>
                <div className="text-white font-bold text-lg">{stats.averageScore.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Scoring explanation */}
        <div className="bg-white/5 p-3 border-b border-white/10">
          <h3 className="text-sm font-medium text-white mb-2">How to Earn Points:</h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center">
              <Star className="w-3 h-3 text-purple-400 mr-1" />
              <span className="text-gray-300">Create Quote: 10pts</span>
            </div>
            <div className="flex items-center">
              <Heart className="w-3 h-3 text-red-400 mr-1" />
              <span className="text-gray-300">Receive Like: 2pts</span>
            </div>
            <div className="flex items-center">
              <MessageSquare className="w-3 h-3 text-blue-400 mr-1" />
              <span className="text-gray-300">Get Share: 5pts</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="p-4">
              {/* Users list */}
              <div className="bg-white/5 rounded-lg mb-4">
                <div className="grid grid-cols-12 text-xs text-gray-400 p-3 border-b border-white/10">
                  <div className="col-span-1 font-medium">Rank</div>
                  <div className="col-span-7 font-medium">User</div>
                  <div className="col-span-4 font-medium">
                    <div className="flex justify-end items-center">
                      <div className="flex flex-col">
                        <button 
                          onClick={() => handleSort('score')} 
                          className="flex items-center justify-end hover:text-white"
                        >
                          Score{renderSortIndicator('score')}
                        </button>
                        <div className="flex space-x-2 mt-1">
                          <button 
                            onClick={() => handleSort('quoteCount')} 
                            className="flex items-center hover:text-white"
                          >
                            <Star className="w-3 h-3 text-purple-400 mr-1" />
                            {renderSortIndicator('quoteCount')}
                          </button>
                          <button 
                            onClick={() => handleSort('likeCount')} 
                            className="flex items-center hover:text-white"
                          >
                            <Heart className="w-3 h-3 text-red-400 mr-1" />
                            {renderSortIndicator('likeCount')}
                          </button>
                          <button 
                            onClick={() => handleSort('shareCount')} 
                            className="flex items-center hover:text-white"
                          >
                            <MessageSquare className="w-3 h-3 text-blue-400 mr-1" />
                            {renderSortIndicator('shareCount')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {displayUsers.length > 0 ? (
                  displayUsers.map((user) => (
                    <motion.div
                      key={user.fid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (user.rank ? (user.rank % 10) * 0.05 : 0) }}
                      className={`grid grid-cols-12 items-center p-3 border-b border-white/5 last:border-0 ${
                        context?.user?.fid === user.fid ? 'bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="col-span-1">
                        {user.rank && user.rank <= 3 && sortField === 'score' && sortDirection === 'desc' ? (
                          <div className={`flex items-center justify-center w-7 h-7 rounded-full font-bold 
                            ${user.rank === 1 ? 'bg-yellow-500 text-black' : 
                              user.rank === 2 ? 'bg-gray-300 text-black' : 
                              'bg-amber-700 text-white'}`}>
                            {user.rank}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">{sortField === 'score' && sortDirection === 'desc' ? user.rank : '-'}</span>
                        )}
                      </div>
                      <div className="col-span-7 flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.displayName} className="w-8 h-8 rounded-full" />
                          ) : (
                            <User className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.displayName}</div>
                          <div className="text-gray-400 text-xs">@{user.username}</div>
                        </div>
                      </div>
                      <div className="col-span-4 text-right">
                        <div className="text-white font-bold">{user.score.toLocaleString()}</div>
                        <div className="flex justify-end space-x-2 text-xs text-gray-400">
                          <span className="flex items-center">
                            <Star className="w-3 h-3 text-purple-400 mr-1" />
                            {user.quoteCount}
                          </span>
                          <span className="flex items-center">
                            <Heart className="w-3 h-3 text-red-400 mr-1" />
                            {user.likeCount}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="w-3 h-3 text-blue-400 mr-1" />
                            {user.shareCount}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    {searchQuery ? 'No users match your search' : 'No users found in the leaderboard'}
                  </div>
                )}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 space-x-2">
                  <button 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-full ${currentPage === 1 ? 'text-gray-600' : 'text-white hover:bg-white/10'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="text-white text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <button 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-full ${currentPage === totalPages ? 'text-gray-600' : 'text-white hover:bg-white/10'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {/* Current user's rank if not visible in current page */}
              {currentUserRank && !displayUsers.some(user => user.fid === currentUserRank.fid) && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-white mb-2">Your Ranking:</h3>
                  <div className="bg-blue-900/20 rounded-lg p-3">
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-1">
                        <span className="text-gray-400 font-medium">{currentUserRank.rank}</span>
                      </div>
                      <div className="col-span-7 flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                          {currentUserRank.profileImage ? (
                            <img src={currentUserRank.profileImage} alt={currentUserRank.displayName} className="w-8 h-8 rounded-full" />
                          ) : (
                            <User className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{currentUserRank.displayName}</div>
                          <div className="text-gray-400 text-xs">@{currentUserRank.username}</div>
                        </div>
                      </div>
                      <div className="col-span-4 text-right">
                        <div className="text-white font-bold">{currentUserRank.score.toLocaleString()}</div>
                        <div className="flex justify-end space-x-2 text-xs text-gray-400">
                          <span className="flex items-center">
                            <Star className="w-3 h-3 text-purple-400 mr-1" />
                            {currentUserRank.quoteCount}
                          </span>
                          <span className="flex items-center">
                            <Heart className="w-3 h-3 text-red-400 mr-1" />
                            {currentUserRank.likeCount}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="w-3 h-3 text-blue-400 mr-1" />
                            {currentUserRank.shareCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 