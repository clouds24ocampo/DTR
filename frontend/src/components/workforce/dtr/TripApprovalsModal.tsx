import { CheckCircle, XCircle, MapPin, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { fetchPendingTripApprovals, updateTripApproval } from "../../../api/global/dtr/dtr.api";
import { toast } from "react-hot-toast";
import { ModalHeader } from "../../global/modals/ModalHeader";
import { modalVariants } from "../../../utils/global/motionVariants";


interface TripApproval {
    dtrId: string;
    userId: any;
    date: string;
    sessionIndex: number;
    entryIndex: number;
    entry: {
        type: string;
        startTime: string;
        endTime?: string;
        tripType: string;
        tripReason: string;
        tripCategory: "Whole day" | "Half day";
        halfDayType?: "Morning" | "Afternoon";
        duration: string;
        status: string;
        approvalStatus: string;
    };
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        idNumber: string;
        position: string;
    };
}

export default function TripApprovalsModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [pendingTrips, setPendingTrips] = useState<TripApproval[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);

    const loadPendingTrips = async () => {
        setLoading(true);
        try {
            const response = await fetchPendingTripApprovals();
            setPendingTrips(response.pendingTrips);
        } catch (error: any) {
            toast.error(error?.message || "Failed to load pending trips");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadPendingTrips();
        }
    }, [isOpen]);

    const handleApproval = async (
        trip: TripApproval,
        approvalStatus: "approved" | "rejected" | "converted"
    ) => {
        const processId = `${trip.dtrId}-${trip.sessionIndex}-${trip.entryIndex}`;
        setProcessing(processId);

        try {
            await updateTripApproval({
                dtrId: trip.dtrId,
                sessionIndex: trip.sessionIndex,
                entryIndex: trip.entryIndex,
                approvalStatus,
            });

            const actionMsg =
                approvalStatus === "approved" ? "approved" :
                    approvalStatus === "rejected" ? "rejected" : "converted to work";

            toast.success(
                `Trip ${actionMsg} successfully`
            );

            // Reload the list
            await loadPendingTrips();
        } catch (error: any) {
            toast.error(error?.message || "Failed to process approval");
        } finally {
            setProcessing(null);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm !mt-0">
                <motion.div
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 max-h-[90vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ModalHeader
                        title="Trip Approvals"
                        subtitle="Review and approve employee trip credits"
                        onClose={onClose}
                    />

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-100 border-t-blue-600 mb-4" />
                                <p className="text-slate-500 font-medium">Loading pending trips...</p>
                            </div>
                        ) : pendingTrips.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="h-20 w-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle className="h-10 w-10" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">All Caught Up!</h3>
                                <p className="text-slate-500">No pending trip approvals at the moment.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingTrips.map((trip) => {
                                    const processId = `${trip.dtrId}-${trip.sessionIndex}-${trip.entryIndex}`;
                                    const isProcessing = processing === processId;
                                    const hoursToCredit = trip.entry.tripCategory === "Whole day" ? 8 : 4;

                                    return (
                                        <motion.div
                                            key={processId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="card-dashboard hover:shadow-md transition-all active:scale-[0.99]"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                {/* Trip Info */}
                                                <div className="flex-1 space-y-4">
                                                    {/* Employee Info Header */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm border border-blue-200 shadow-sm">
                                                            {trip.user?.firstName?.charAt(0)}
                                                            {trip.user?.lastName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 leading-none mb-1">
                                                                {trip.user?.firstName} {trip.user?.lastName}
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                                                <span className="font-medium text-blue-600">{trip.user?.position}</span>
                                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                                <span>ID: {trip.user?.idNumber}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Stats Grid */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</span>
<div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                                                                 <MapPin className="h-3.5 w-3.5 text-blue-500" />
                                                                {trip.entry.tripType}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</span>
<div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                                                                 <Calendar className="h-3.5 w-3.5 text-purple-500" />
                                                                {trip.date}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</span>
<div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                                                                 <Clock className="h-3.5 w-3.5 text-green-500" />
                                                                {trip.entry.tripCategory}
                                                                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-lg ml-1 border border-green-200">
                                                                    {hoursToCredit}h
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time</span>
<div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                                                                 <Clock className="h-3.5 w-3.5 text-orange-500" />
                                                                {trip.entry.startTime}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reason Block */}
                                                    <div className="bg-slate-50 rounded-lg p-3 border border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Reason / Destination</span>
                                                        <p className="text-sm text-gray-700 leading-relaxed italic">
                                                            "{trip.entry.tripReason}"
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex md:flex-col gap-2 justify-center md:border-l md:border-gray-100 md:pl-4">
                                                    <button
                                                        onClick={() => handleApproval(trip, "approved")}
                                                        disabled={isProcessing}
                                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none font-bold text-sm shadow-sm whitespace-nowrap"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproval(trip, "rejected")}
                                                        disabled={isProcessing}
                                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none font-bold text-sm shadow-sm whitespace-nowrap"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between">
                        <div className="text-sm text-slate-500 font-medium">
                            <span className="text-blue-600 font-bold">{pendingTrips.length}</span> pending contribution{pendingTrips.length !== 1 ? "s" : ""}
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-all font-bold text-sm"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
