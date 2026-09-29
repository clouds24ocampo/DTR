/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, LogOut, X, RefreshCcw } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/auth/auth.store";
import { getMenuItems } from "./SideBarMenu";
import LogoutModal from "./LogoutModal";
import SwitchRoleModal from "./SwitchRoleModal";
import { AnimatePresence, motion } from "framer-motion";
import Avatar from "avatox";

// Helper function to check if avatar is a valid image URL
const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  // Check if it's a valid URL (http/https) or data URL
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/") ||
    url.startsWith("/")
  );
};

interface SidebarProps {
  activeTab?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const LS_KEY = "sidebar:collapsed";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const { account, logoutUser } = useAuthStore();

  // Safely get the active role (first position) whether it's an array or string
  const role = useMemo(() => {
    if (Array.isArray(account?.position) && account.position.length > 0) {
      return account.position[0];
    }
    if (typeof account?.position === "string") {
      return account.position;
    }
    return "user";
  }, [account?.position]);

  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "false");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const { mainItems, managementItems } = useMemo(() => {
    const all = getMenuItems(role);
    const main: any[] = [];
    const mgmt: any[] = [];
    for (const i of all) {
      (i.section === "management" ? mgmt : main).push(i);
    }
    return { mainItems: main, managementItems: mgmt };
  }, [role]);

  const handleLogout = useCallback(() => logoutUser(), [logoutUser]);
  const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim() || "User";
  const hasValidImage = account?.profilePicture && isValidImageUrl(account.profilePicture);
  const avatarSrc = hasValidImage ? account.profilePicture : undefined;
  const avatarClassName = hasValidImage
    ? ""
    : "!bg-gradient-to-br !from-blue-500 !to-slate-600";

  const handleProfileClick = useCallback(() => {
    navigate("/profile");
    onClose?.(); // close sidebar on mobile
  }, [navigate, onClose]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <AnimatePresence>
        {(isOpen || typeof window !== "undefined") && (
          <motion.aside
            initial={{ x: "-100%", opacity: 0 }}
            animate={{
              x: 0,
              opacity: 1,
              width: collapsed ? "4rem" : "16rem",
            }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onAnimationComplete={() => setSidebarReady(true)}
            className={[
              "fixed top-0 left-0 z-50 bg-slate-900 text-white flex-col h-[100dvh] shadow-xl shadow-blue-500/10 lg:static lg:shadow-none border-r border-slate-700/50",
              isOpen ? "flex" : "hidden",
              "lg:flex",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-2 border-b border-slate-700 flex-shrink-0">
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    key="menu-title"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="px-2 text-sm font-semibold"
                  >
                    Menu
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Close Button for Mobile */}
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Collapse Button for Desktop */}
              <button
                type="button"
                onClick={() => {
                  setSidebarReady(false);
                  setCollapsed(!collapsed);
                }}
                className="hidden lg:inline-flex items-center justify-center rounded-lg hover:bg-slate-700/80 p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Scrollable Menu */}
            <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-hide">
              <motion.ul
                className="space-y-3"
                variants={listVariants}
                initial="hidden"
                animate={sidebarReady ? "visible" : "hidden"}
              >
                {mainItems.map((item) => (
                  <SidebarLink
                    key={String(item.id)}
                    item={item}
                    collapsed={collapsed}
                    onClick={onClose}
                    variants={itemVariants}
                  />
                ))}

                {managementItems.length > 0 && (
                  <motion.li
                    variants={itemVariants}
                    className="pt-5 text-xs select-none"
                  >
                    <div className="flex items-center gap-2 px-3">
                      <div className="h-px flex-1 bg-slate-600" />
                      {!collapsed && (
                        <motion.span
                          key="mgmt-title"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.3 }}
                          className="text-xs uppercase tracking-wider text-slate-400"
                        >
                          Management
                        </motion.span>
                      )}
                      <div className="h-px flex-1 bg-slate-600" />
                    </div>
                  </motion.li>
                )}

                {managementItems.map((item) => (
                  <SidebarLink
                    key={String(item.id)}
                    item={item}
                    collapsed={collapsed}
                    onClick={onClose}
                    variants={itemVariants}
                  />
                ))}
              </motion.ul>
            </nav>

            {/* Footer */}
            {role !== "public" && (
              <div className="border-t border-slate-700 p-2 flex-shrink-0">
                <div className={[
                  "flex items-center gap-2 p-3 rounded-lg mb-2 bg-slate-800/80 border border-slate-700/50",
                ].join(" ")}>
                  <motion.div
                    layout
                    transition={{ duration: 0.3 }}
                    className={[
                      "flex items-center gap-3 flex-1 cursor-pointer",
                      collapsed && "justify-center",
                    ].join(" ")}
                    onClick={handleProfileClick}
                  >
                    <Avatar
                      src={avatarSrc}
                      name={fullName}
                      size="lg"
                      className={avatarClassName}
                    />

                    <AnimatePresence>
                      {!collapsed && (
                        <motion.div
                          key="profile-info"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 min-w-0"
                        >
                          <div className="text-sm font-medium truncate">
                            {fullName}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {role}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Switch Role Button - integrated in profile card */}
                  <AnimatePresence>
                    {!collapsed && Array.isArray(account?.position) && account.position.length > 1 && (
                      <motion.button
                        key="switch-btn"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSwitchModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Switch Role"
                        aria-label="Switch Role"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    "text-slate-300 hover:bg-slate-700/80 hover:text-white",
                    collapsed && "justify-center",
                  ].join(" ")}
                  title={collapsed ? "Sign out" : undefined}
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        key="logout-label"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium"
                      >
                        Sign out
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                {/* Separate switch button removed as it's now integrated in profile card */}

              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence >

      <SwitchRoleModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
      />

      <LogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

const SidebarLink: React.FC<{
  item: any;
  collapsed: boolean;
  onClick?: () => void;
  variants?: any;
}> = ({ item, collapsed, onClick, variants }) => (
  <motion.li className="text-xs" variants={variants}>
    <NavLink
      to={Array.isArray(item.id) ? item.id[0] : item.id}
      className={({ isActive }) =>
        [
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
          isActive
            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
            : "text-slate-300 hover:bg-slate-700/80 hover:text-white",
        ].join(" ")
      }
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      onClick={onClick}
    >
      <motion.div
        initial={false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.2 }}
      >
        <item.icon className="w-5 h-5 shrink-0" />
      </motion.div>

      <motion.span
        key={collapsed ? "hidden" : "visible"}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: collapsed ? 0 : 1, x: collapsed ? -5 : 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.2 }}
        className={collapsed ? "sr-only" : "font-medium"}
      >
        {item.label}
      </motion.span>
    </NavLink>
  </motion.li>
);

export default React.memo(Sidebar);
