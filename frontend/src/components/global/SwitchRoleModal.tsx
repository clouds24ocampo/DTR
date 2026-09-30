import { useState } from "react";
import { X, Users, Check } from "lucide-react";
import useAuthStore from "../../stores/auth/auth.store";
import { motion, AnimatePresence } from "framer-motion";

interface SwitchRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SwitchRoleModal({ isOpen, onClose }: SwitchRoleModalProps) {
    const { account, switchRole } = useAuthStore();
    const [loadingRole, setLoadingRole] = useState<string | null>(null);

    // Use position array directly
    const availableRoles = account?.position || [];

    const handleSwitch = async (role: string) => {
        if (role === account?.position?.[0]) {
            onClose();
            return;
        }

        setLoadingRole(role);
        try {
            const success = await switchRole(role);
            if (success) {
                onClose();
            }
        } finally {
            setLoadingRole(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-white rounded-lg shadow-2xl max-w-sm w-full overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Users size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">Switch Account</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-slate-600 mb-6 text-sm">
                                Select a role to switch your account context. This will update your access permissions and dashboard view.
                            </p>

                            <div className="space-y-2">
                                {availableRoles.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">No other roles available.</p>
                                ) : (
                                    availableRoles.map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => handleSwitch(role)}
                                            disabled={loadingRole !== null}
                                            className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${account?.position?.[0] === role
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-700"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${account?.position?.[0] === role ? "bg-blue-600" : "bg-slate-300"}`} />
                                                <span className="font-semibold">{role}</span>
                                            </div>

                                            {loadingRole === role ? (
                                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            ) : account?.position?.[0] === role ? (
                                                <Check size={20} className="text-blue-600" />
                                            ) : null}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
