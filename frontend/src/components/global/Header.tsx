/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Search, X, User, Briefcase, FileText, Building2, Calendar, ClipboardList, Layout } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "./notification/NotificationBell";
import NotificationList from "./notification/NotificationList";
import FloatingBreakStats from "./FloatingBreakStats";
import logo from "../../assets/logo/Logox.png";
import { useNotifications } from "../../hooks/useNotifications";
import { searchGlobal, SearchResult } from "../../api/global/search.api";
import useAuthStore from "../../stores/auth/auth.store";
import { MENU_MAP } from "./SideBarMenu";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

// Normalize role to match MENU_MAP keys
const normalizeRole = (position: string[] | string | undefined): string => {
  if (!position) return "user";

  // If it's an array, take the first element (active role)
  const posString = Array.isArray(position) ? position[0] : position;
  if (!posString) return "user";

  const normalized = posString.trim();
  const lowerNormalized = normalized.toLowerCase();

  // Handle case-insensitive matching for known roles
  if (lowerNormalized === "hr") return "HR";
  if (lowerNormalized === "workforce") return "Workforce";
  if (lowerNormalized === "team leader") return "Team Leader";
  if (lowerNormalized === "employee") return "Employee";
  if (lowerNormalized === "frontline / agent roles" || lowerNormalized === "frontline/agent roles") return "Frontline / Agent Roles";
  if (lowerNormalized === "specialized agent roles") return "Specialized Agent Roles";
  if (lowerNormalized === "supervisory & management roles" || lowerNormalized === "supervisory and management roles") return "Supervisory & Management Roles";
  if (lowerNormalized === "support & back-office roles" || lowerNormalized === "support and back-office roles" || lowerNormalized === "support & backoffice roles") return "Support & Back-Office Roles";

  // Robust check for Team Leader (handles case and dash variations)
  if (/team\s*leader/.test(lowerNormalized)) {
    if (/field/.test(lowerNormalized)) return "Team Leader - Field";
    if (/operation/.test(lowerNormalized)) return "Team Leader - Operation";
  }

  // Robust check for Employee roles
  if (/employee/.test(lowerNormalized)) {
    if (/field/.test(lowerNormalized)) return "Employee - Field";
    if (/operation/.test(lowerNormalized)) return "Employee - Operation";
  }

  // Return as-is if it matches a key, otherwise default to "user"
  return normalized in MENU_MAP ? normalized : "user";
};

// Get allowed paths for the current role
const getAllowedPaths = (role: string): string[] => {
  const menuItems = MENU_MAP[role] || [];
  const paths: string[] = [];

  menuItems.forEach((item) => {
    if (Array.isArray(item.id)) {
      paths.push(...item.id);
    } else {
      paths.push(item.id);
    }
  });

  return paths;
};

// Check if a path is allowed for the current role
const isPathAllowed = (path: string, allowedPaths: string[]): boolean => {
  // Check exact match
  if (allowedPaths.includes(path)) return true;

  // Check if path starts with any allowed path (for nested routes)
  return allowedPaths.some((allowedPath) => {
    // Handle root path
    if (allowedPath === "/" && path === "/") return true;
    // Check if path starts with allowed path (but not just a prefix)
    if (allowedPath !== "/" && path.startsWith(allowedPath)) {
      // Ensure it's a complete segment match (e.g., "/department" matches "/department/123" but not "/departmental")
      const nextChar = path[allowedPath.length];
      return !nextChar || nextChar === "/" || nextChar === "?";
    }
    return false;
  });
};

const Header: React.FC<HeaderProps> = ({ title, onMenuClick }) => {
  const [open, setOpen] = useState(false);
  const [showBreakStats, setShowBreakStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { account } = useAuthStore();

  const isDtrPage = ["/workforce-dtr-tracking", "/dtr-tracking"].includes(location.pathname);
  const role = normalizeRole(account?.position);
  const showStatusButton = role === "Workforce" || role === "HR";

  useEffect(() => {
    if (isDtrPage) {
      setShowBreakStats(true);
    }
  }, [isDtrPage]);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      notifPanelRef.current &&
      !notifPanelRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setOpen(false);
    }
    if (
      searchRef.current &&
      !searchRef.current.contains(event.target as Node) &&
      searchInputRef.current &&
      !searchInputRef.current.contains(event.target as Node)
    ) {
      setShowSearchResults(false);
    }
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "employee":
        return <User className="w-4 h-4" />;
      case "job":
        return <Briefcase className="w-4 h-4" />;
      case "document":
        return <FileText className="w-4 h-4" />;
      case "department":
        return <Building2 className="w-4 h-4" />;
      case "schedule":
        return <Calendar className="w-4 h-4" />;
      case "report":
        return <ClipboardList className="w-4 h-4" />;
      case "module":
      case "page":
        return <Layout className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "employee":
        return "Employees";
      case "job":
        return "Jobs";
      case "document":
        return "Documents";
      case "department":
        return "Departments";
      case "schedule":
        return "Schedule";
      case "report":
        return "Reports";
      case "module":
      case "page":
        return "Modules";
      default:
        return "Results";
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchGlobal(query);

      // Filter results based on user's role and MENU_MAP
      const role = normalizeRole(account?.position);
      const allowedPaths = getAllowedPaths(role);

      const filteredResults = response.results.filter((result) => {
        // Allow modules/pages to be visible if they are in the allowed paths or generally accessible
        // (Assuming logic for static modules is handled by backend or they are safe)
        // For strict RBAC, verify link against allowedPaths
        return isPathAllowed(result.link, allowedPaths);
      });

      setSearchResults(filteredResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [account?.position]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [handleSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    navigate(result.link);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  }, [navigate]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [handleClickOutside]);

  return (
    <header
      className={clsx(
        "bg-white/95 border-b border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sticky top-0 z-30 backdrop-blur-sm"
      )}
    >
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Burger icon visible on mobile */}
          <button
            className="lg:hidden p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 focus:outline-none flex-shrink-0"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <img src={logo} alt="App Logo" className="w-7 h-auto sm:w-8 flex-shrink-0" />
            <h1 className="hidden sm:block text-base sm:text-xl font-semibold text-slate-900 truncate">
              HR Management
            </h1>
          </div>

          <h2 className="hidden md:block text-base lg:text-lg font-medium text-slate-500 ml-2 md:ml-4 truncate">
            {title}
          </h2>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 relative flex-shrink-0">

          {/* Break Stats Toggle */}
          {showStatusButton && (
            <motion.button
              className={clsx(
                "p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 flex-shrink-0 hidden md:block border border-slate-300 rounded-xl",
                showBreakStats && "text-slate-900 bg-slate-100 border-slate-300 rounded-xl"
              )}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowBreakStats(!showBreakStats)}
              title="Workforce Status"
            >
              <p className="px-2 sm:px-3 font-medium text-sm">
                Status
              </p>
            </motion.button>
          )}
          {/* Search */}
          <div className="relative hidden md:block" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 z-10" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search employees, jobs, documents..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchResults(true);
                }
              }}
              className="w-40 rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:w-56"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && (searchResults.length > 0 || isSearching) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 8 }}
                  transition={{
                    type: "spring" as const,
                    stiffness: 220,
                    damping: 26,
                  }}
                  className="absolute right-0 mt-2 w-80 lg:w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/60 z-50 max-h-96 overflow-y-auto"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="p-2 border-b border-slate-200/80">
                        <p className="text-xs text-slate-500 font-medium">
                          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                        </p>
                      </div>
                      <div className="py-1">
                        {Object.entries(
                          searchResults.reduce((acc, result) => {
                            const type = result.type;
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(result);
                            return acc;
                          }, {} as Record<string, SearchResult[]>)
                        ).map(([type, results]) => (
                          <div key={type} className="border-b border-slate-200/80 last:border-0">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                              {getTypeLabel(type)}
                            </div>
                            {results.map((result) => (
                              <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleResultClick(result)}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                              >
                                <div className="mt-0.5 text-slate-400 group-hover:text-blue-500 transition-colors">
                                  {getTypeIcon(result.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-sm font-medium text-slate-900 truncate">
                                      {result.title}
                                    </span>
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                                      {getTypeLabel(result.type)}
                                    </span>
                                  </div>
                                  {result.subtitle && (
                                    <p className="text-xs text-slate-500 truncate">
                                      {result.subtitle}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No results found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <motion.button
            ref={buttonRef}
            className="relative py-1.5 sm:p-2 text-slate-500 hover:text-slate-900 flex-shrink-0"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="notifications-panel"
            onClick={() => setOpen((v) => !v)}
          >
            <NotificationBell count={unreadCount} />
          </motion.button>

          <AnimatePresence>
            {open && (
              <motion.div
                ref={notifPanelRef}
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 8 }}
                transition={{
                  type: "spring" as const,
                  stiffness: 220,
                  damping: 26,
                }}
                className="absolute right-0 mt-2 sm:mt-5 z-20 w-80 sm:w-96 max-w-[calc(100vw-2rem)]"
              >
                <NotificationList
                  items={notifications}
                  onMarkRead={markAsRead}
                  onMarkAllRead={markAllAsRead}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <FloatingBreakStats isOpen={showBreakStats} onClose={() => setShowBreakStats(false)} />
    </header>
  );
};

const MemoizedHeader = React.memo(Header);
MemoizedHeader.displayName = "Header";

export default MemoizedHeader;
