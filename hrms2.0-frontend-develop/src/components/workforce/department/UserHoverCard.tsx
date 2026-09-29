import { motion, AnimatePresence } from "framer-motion";
import { Mail, Briefcase } from "lucide-react";
import { UserLite, displayUserName } from "../../../utils/department/helpers.utils";

interface Props {
    user: UserLite;
    visible: boolean;
}

export default function UserHoverCard({ user, visible }: Props) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 p-4 z-[100] pointer-events-none"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-lg font-bold border-2 border-white shadow-sm">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt={displayUserName(user)} className="h-full w-full object-cover" />
                            ) : (
                                <span>{(user.firstName?.[0] || user.username?.[0] || "?").toUpperCase()}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{displayUserName(user)}</h4>
                            <p className="text-[11px] text-blue-600 font-semibold truncate">{user.position || "Staff"}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="truncate">{user.email || "No email"}</span>
                        </div>
                        {user.username && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Briefcase className="w-3 h-3 text-gray-400" />
                                <span className="truncate">@{user.username}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className={`w-2 h-2 rounded-full ${user.status === 'active' || user.status === true ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="capitalize">{user.status === 'active' || user.status === true ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>

                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white" />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
